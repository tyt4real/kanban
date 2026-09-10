import { Database } from '../db/client';
import {
  Task,
  TaskWithCategory,
  Category,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  TaskFilters,
} from '../types/tasks';
import { WebhookService } from './webhooks';
import { NotificationService } from './notifications';

export class TaskService {
  constructor(
    private db: Database,
    private webhookService: WebhookService,
    private notificationService: NotificationService
  ) {}

  async createTask(input: CreateTaskInput): Promise<TaskWithCategory> {
    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get the max position for the column
    const maxPosResult = await this.db.prepare(
      'SELECT COALESCE(MAX(position), -1) as maxPos FROM tasks WHERE column_id = ?'
    ).bind(input.columnId).first<{ maxPos: number }>();

    const position = input.position ?? (maxPosResult?.maxPos ?? -1) + 1;

    await this.db.prepare(
      `INSERT INTO tasks (id, board_id, column_id, category_id, title, description, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(taskId, input.boardId, input.columnId, input.categoryId || null, input.title, input.description || null, position, now, now).run();

    const task = await this.getTaskWithCategory(taskId);

    // Check if category is AI agent and trigger webhook
    if (task?.category?.is_ai_agent) {
      await this.webhookService.triggerWebhook(task, 'created');
    }

    return task!;
  }

  async getTaskWithCategory(taskId: string): Promise<TaskWithCategory | null> {
    const task = await this.db.prepare(
      `SELECT t.*, c.id as category_id, c.name as category_name, c.color as category_color, c.is_ai_agent as category_is_ai_agent
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`
    ).bind(taskId).first<any>();

    if (!task) return null;

    return {
      id: task.id,
      board_id: task.board_id,
      column_id: task.column_id,
      category_id: task.category_id,
      title: task.title,
      description: task.description,
      position: task.position,
      created_at: task.created_at,
      updated_at: task.updated_at,
      category: task.category_id ? {
        id: task.category_id,
        user_id: '', // Not needed for frontend
        name: task.category_name,
        color: task.category_color,
        is_ai_agent: task.category_is_ai_agent,
        created_at: '',
        updated_at: '',
      } : null,
      webhook_status: undefined, // Will be fetched separately if needed
    };
  }

  async getTasks(boardId: string, filters: TaskFilters = {}): Promise<TaskWithCategory[]> {
    let query = `
      SELECT t.*, c.id as category_id, c.name as category_name, c.color as category_color, c.is_ai_agent as category_is_ai_agent
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.board_id = ?
    `;
    const params: any[] = [boardId];

    if (filters.columnId) {
      query += ' AND t.column_id = ?';
      params.push(filters.columnId);
    }
    if (filters.categoryId) {
      query += ' AND t.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters.search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY t.position';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const result = await this.db.prepare(query).bind(...params).all<any>();

    return result.results.map(task => ({
      id: task.id,
      board_id: task.board_id,
      column_id: task.column_id,
      category_id: task.category_id,
      title: task.title,
      description: task.description,
      position: task.position,
      created_at: task.created_at,
      updated_at: task.updated_at,
      category: task.category_id ? {
        id: task.category_id,
        user_id: '',
        name: task.category_name,
        color: task.category_color,
        is_ai_agent: task.category_is_ai_agent,
        created_at: '',
        updated_at: '',
      } : null,
    }));
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskWithCategory | null> {
    const existing = await this.db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first<Task>();
    if (!existing) return null;

    const oldCategoryId = existing.category_id;
    const oldColumnId = existing.column_id;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.columnId !== undefined) {
      updates.push('column_id = ?');
      values.push(input.columnId);
    }
    if (input.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(input.categoryId);
    }
    if (input.position !== undefined) {
      updates.push('position = ?');
      values.push(input.position);
    }

    if (updates.length === 0) {
      return this.getTaskWithCategory(taskId);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(taskId);

    await this.db.prepare(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const task = await this.getTaskWithCategory(taskId);

    // Check for AI agent category change
    if (task && input.categoryId !== undefined && input.categoryId !== oldCategoryId) {
      if (task.category?.is_ai_agent) {
        await this.webhookService.triggerWebhook(task, 'moved_to_ai_category');
      }
    }

    // Check for move to Finished column (trigger email notification)
    if (task && input.columnId !== undefined && input.columnId !== oldColumnId) {
      const newColumn = await this.db.prepare('SELECT name FROM columns WHERE id = ?').bind(input.columnId).first<{ name: string }>();
      if (newColumn?.name === 'Finished') {
        const board = await this.db.prepare('SELECT name FROM boards WHERE id = ?').bind(task.board_id).first<{ name: string }>();
        await this.notificationService.sendTaskCompletedNotification({
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          boardName: board?.name || 'Unknown',
          columnName: newColumn.name,
          completedAt: new Date().toISOString(),
          userEmail: '', // Will be filled by notification service
        });
      }
    }

    return task;
  }

  async moveTask(input: MoveTaskInput): Promise<TaskWithCategory | null> {
    const task = await this.db.prepare('SELECT * FROM tasks WHERE id = ?').bind(input.taskId).first<Task>();
    if (!task) return null;

    const oldColumnId = task.column_id;

    // Get max position in new column
    const maxPosResult = await this.db.prepare(
      'SELECT COALESCE(MAX(position), -1) as maxPos FROM tasks WHERE column_id = ?'
    ).bind(input.columnId).first<{ maxPos: number }>();

    const newPosition = input.position <= maxPosResult!.maxPos
      ? input.position
      : maxPosResult!.maxPos + 1;

    // Shift positions of tasks after the new position
    if (input.position <= maxPosResult!.maxPos) {
      await this.db.prepare(
        'UPDATE tasks SET position = position + 1 WHERE column_id = ? AND position >= ? AND id != ?'
      ).bind(input.columnId, input.position, input.taskId).run();
    }

    await this.db.prepare(
      'UPDATE tasks SET column_id = ?, position = ?, updated_at = ? WHERE id = ?'
    ).bind(input.columnId, newPosition, new Date().toISOString(), input.taskId).run();

    const updatedTask = await this.getTaskWithCategory(input.taskId);

    // Check for AI agent category
    if (updatedTask?.category?.is_ai_agent) {
      await this.webhookService.triggerWebhook(updatedTask, 'moved_to_ai_category');
    }

    // Check for move to Finished column
    if (updatedTask && input.columnId !== oldColumnId) {
      const newColumn = await this.db.prepare('SELECT name FROM columns WHERE id = ?').bind(input.columnId).first<{ name: string }>();
      if (newColumn?.name === 'Finished') {
        const board = await this.db.prepare('SELECT name FROM boards WHERE id = ?').bind(updatedTask.board_id).first<{ name: string }>();
        await this.notificationService.sendTaskCompletedNotification({
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          taskDescription: updatedTask.description,
          boardName: board?.name || 'Unknown',
          columnName: newColumn.name,
          completedAt: new Date().toISOString(),
          userEmail: '',
        });
      }
    }

    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
    return result.meta.rows_written > 0;
  }

  async reorderTasks(columnId: string, taskIds: string[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await this.db.prepare(
        'UPDATE tasks SET position = ?, updated_at = ? WHERE id = ? AND column_id = ?'
      ).bind(i, new Date().toISOString(), taskIds[i], columnId).run();
    }
  }
}