import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { Database } from '../db/client';
import {
  User,
  Session,
  JWTPayload,
  AuthTokens,
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  PASSWORD_MIN_LENGTH,
  BCRYPT_COST,
} from '../types/auth';

export class AuthService {
  constructor(
    private db: Database,
    private jwtSecret: string,
    private tokenExpiry = '15m',
    private refreshExpiry = '7d'
  ) {}

  private getEncoder() {
    return new TextEncoder().encode(this.jwtSecret);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }

  async register(input: RegisterInput): Promise<User> {
    const validation = this.validatePassword(input.password);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const existing = await this.db.prepare('SELECT id FROM users WHERE email = ?')
      .bind(input.email.toLowerCase())
      .first<User>();

    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await this.hashPassword(input.password);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(
      'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, input.email.toLowerCase(), passwordHash, now, now).run();

    return { id, email: input.email.toLowerCase(), password_hash: passwordHash, created_at: now, updated_at: now };
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.db.prepare('SELECT * FROM users WHERE email = ?')
      .bind(input.email.toLowerCase())
      .first<User>();

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await this.verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    return await this.generateTokens(user);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!user) {
      throw new Error('User not found');
    }

    const valid = await this.verifyPassword(input.currentPassword, user.password_hash);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    const validation = this.validatePassword(input.newPassword);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const newHash = await this.hashPassword(input.newPassword);
    const now = new Date().toISOString();

    await this.db.prepare(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'
    ).bind(newHash, now, userId).run();
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const accessExp = now + 15 * 60; // 15 minutes
    const refreshExp = now + 7 * 24 * 60 * 60; // 7 days

    const accessToken = await new SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(accessExp)
      .sign(this.getEncoder());

    const refreshToken = await new SignJWT({ sub: user.id, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(refreshExp)
      .sign(this.getEncoder());

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.getEncoder());
      return payload as unknown as JWTPayload;
    } catch {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.getEncoder());
      return { sub: payload.sub as string };
    } catch {
      return null;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) return null;

    const user = await this.getUserById(payload.sub);
    if (!user) return null;

    return await this.generateTokens(user);
  }

  setAuthCookies(headers: Headers, tokens: AuthTokens): void {
    const isProduction = this.jwtSecret !== 'dev-jwt-secret-change-in-production';

    headers.append('Set-Cookie', [
      `access_token=${tokens.accessToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      `Max-Age=${15 * 60}`,
      'Path=/',
    ].join('; '));

    headers.append('Set-Cookie', [
      `refresh_token=${tokens.refreshToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      `Max-Age=${7 * 24 * 60 * 60}`,
      'Path=/',
    ].join('; '));
  }

  clearAuthCookies(headers: Headers): void {
    headers.append('Set-Cookie', [
      'access_token=',
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Max-Age=0',
      'Path=/',
    ].join('; '));

    headers.append('Set-Cookie', [
      'refresh_token=',
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Max-Age=0',
      'Path=/',
    ].join('; '));
  }

  extractTokenFromCookie(cookieHeader: string | null, name: string): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
    return match ? match[2] : null;
  }
}