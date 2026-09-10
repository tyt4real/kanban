import { Database } from '../db/client';
import { SmtpConfig } from '../types/settings';
import { NotificationPayload, createTaskCompletedEmail } from '../types/notifications';
import nodemailer from 'nodemailer';

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private config: SmtpConfig | null = null;

  constructor(private db: Database) {}

  async initialize(): Promise<void> {
    const settings = await this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).bind('smtp_config').first<{ value: string }>();

    if (settings) {
      this.config = JSON.parse(settings.value);
      this.createTransporter();
    }
  }

  private createTransporter(): void {
    if (!this.config) return;

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.port === 465,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });
  }

  async updateConfig(config: SmtpConfig): Promise<void> {
    this.config = config;
    this.createTransporter();
    await this.db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    ).bind('smtp_config', JSON.stringify(config), new Date().toISOString()).run();
  }

  async getConfig(): Promise<SmtpConfig | null> {
    if (this.config) return this.config;

    const settings = await this.db.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).bind('smtp_config').first<{ value: string }>();

    if (settings) {
      this.config = JSON.parse(settings.value);
      this.createTransporter();
    }

    return this.config;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return { success: false, message: 'SMTP not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection successful' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Connection failed' };
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, message: 'SMTP not configured' };
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject: 'Kanban Board - Test Email',
        text: 'This is a test email from your Kanban board. SMTP configuration is working correctly!',
      });
      return { success: true, message: 'Test email sent successfully' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to send email' };
    }
  }

  async sendTaskCompletedNotification(payload: NotificationPayload): Promise<void> {
    const config = await this.getConfig();
    if (!config || !this.transporter) {
      console.log('SMTP not configured, skipping email notification');
      return;
    }

    // Get user email from the board owner
    const board = await this.db.prepare(
      `SELECT u.email FROM users u
       JOIN boards b ON u.id = b.user_id
       WHERE b.id = (SELECT board_id FROM tasks WHERE id = ?)`
    ).bind(payload.taskId).first<{ email: string }>();

    if (!board?.email) {
      console.warn('No user email found for task completion notification');
      return;
    }

    const email = createTaskCompletedEmail({ ...payload, userEmail: board.email });

    try {
      await this.transporter.sendMail({
        from: config.from,
        to: board.email,
        subject: email.subject,
        text: email.text,
      });
      console.log(`Task completion email sent for task ${payload.taskId}`);
    } catch (err) {
      console.error('Failed to send task completion email:', err);
    }
  }
}