import { Database } from '../db/client';
import {
  Board,
  Column,
  BoardWithColumns,
  CreateBoardInput,
  UpdateBoardInput,
  CreateColumnInput,
  UpdateColumnInput,
  DEFAULT_COLUMNS,
} from '../types/boards';

export class BoardService {
  constructor(private db: Database) {}

  async createBoard(userId: string, input: CreateBoardInput): Promise<BoardWithColumns> {
    const boardId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(
      'INSERT INTO boards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(boardId, userId, input.name, input.description || null, now, now).run();

    // Create default columns
    for (const col of DEFAULT_COLUMNS) {
      const columnId = crypto.randomUUID();
      await this.db.prepare(
        'INSERT INTO columns (id, board_id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(columnId, boardId, col.name, col.position, now, now).run();
    }

    const board = await this.getBoardWithColumns(boardId, userId);
    if (!board) throw new Error('Failed to create board');
    return board;
  }

  async getBoardWithColumns(boardId: string, userId: string): Promise<BoardWithColumns | null> {
    const board = await this.db.prepare(
      'SELECT * FROM boards WHERE id = ? AND user_id = ?'
    ).bind(boardId, userId).first<Board>();

    if (!board) return null;

    const columns = await this.db.prepare(
      'SELECT * FROM columns WHERE board_id = ? ORDER BY position'
    ).bind(boardId).all<Column>();

    return { ...board, columns: columns.results };
  }

  async getBoards(userId: string): Promise<Board[]> {
    const result = await this.db.prepare(
      'SELECT * FROM boards WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(userId).all<Board>();

    return result.results;
  }

  async updateBoard(boardId: string, userId: string, input: UpdateBoardInput): Promise<Board | null> {
    const board = await this.db.prepare(
      'SELECT * FROM boards WHERE id = ? AND user_id = ?'
    ).bind(boardId, userId).first<Board>();

    if (!board) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (updates.length === 0) return board;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(boardId, userId);

    await this.db.prepare(
      `UPDATE boards SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).bind(...values).run();

    return this.db.prepare('SELECT * FROM boards WHERE id = ?').bind(boardId).first<Board>();
  }

  async deleteBoard(boardId: string, userId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'DELETE FROM boards WHERE id = ? AND user_id = ?'
    ).bind(boardId, userId).run();

    return result.meta.rows_written > 0;
  }

  async createColumn(input: CreateColumnInput): Promise<Column> {
    const columnId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(
      'INSERT INTO columns (id, board_id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(columnId, input.boardId, input.name, input.position, now, now).run();

    const column = await this.db.prepare('SELECT * FROM columns WHERE id = ?').bind(columnId).first<Column>();
    if (!column) throw new Error('Failed to create column');
    return column;
  }

  async updateColumn(columnId: string, input: UpdateColumnInput): Promise<Column | null> {
    const column = await this.db.prepare('SELECT * FROM columns WHERE id = ?').bind(columnId).first<Column>();
    if (!column) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.position !== undefined) {
      updates.push('position = ?');
      values.push(input.position);
    }

    if (updates.length === 0) return column;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(columnId);

    await this.db.prepare(
      `UPDATE columns SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return this.db.prepare('SELECT * FROM columns WHERE id = ?').bind(columnId).first<Column>();
  }

  async deleteColumn(columnId: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM columns WHERE id = ?').bind(columnId).run();
    return result.meta.rows_written > 0;
  }

  async getColumns(boardId: string): Promise<Column[]> {
    const result = await this.db.prepare(
      'SELECT * FROM columns WHERE board_id = ? ORDER BY position'
    ).bind(boardId).all<Column>();

    return result.results;
  }
}