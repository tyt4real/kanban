import { D1Database, D1ExecResult } from '@cloudflare/workers-types';

export interface Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  dump(): Promise<ArrayBuffer>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = any>(): Promise<D1Result<T>>;
}

export interface D1Result<T = any> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export function createDbClient(db: D1Database): Database {
  return {
    prepare: (query: string) => db.prepare(query),
    exec: (query: string) => db.exec(query),
    dump: () => db.dump(),
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}