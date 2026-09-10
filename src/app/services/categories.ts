import { Database } from '../db/client';
import { Category, CreateCategoryInput, UpdateCategoryInput, DEFAULT_CATEGORIES } from '../types/categories';

export class CategoryService {
  constructor(private db: Database) {}

  async createCategory(userId: string, input: CreateCategoryInput): Promise<Category> {
    const categoryId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(
      `INSERT INTO categories (id, user_id, name, color, is_ai_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(categoryId, userId, input.name, input.color, input.isAiAgent ? 1 : 0, now, now).run();

    const category = await this.db.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first<Category>();
    if (!category) throw new Error('Failed to create category');
    return category;
  }

  async getCategories(userId: string): Promise<Category[]> {
    const result = await this.db.prepare(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY created_at'
    ).bind(userId).all<Category>();

    return result.results;
  }

  async getCategory(categoryId: string): Promise<Category | null> {
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first<Category>();
  }

  async getAiAgentCategory(userId: string): Promise<Category | null> {
    return this.db.prepare(
      'SELECT * FROM categories WHERE user_id = ? AND is_ai_agent = 1 LIMIT 1'
    ).bind(userId).first<Category>();
  }

  async updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<Category | null> {
    const category = await this.db.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first<Category>();
    if (!category) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      values.push(input.color);
    }
    if (input.isAiAgent !== undefined) {
      updates.push('is_ai_agent = ?');
      values.push(input.isAiAgent ? 1 : 0);
    }

    if (updates.length === 0) return category;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(categoryId);

    await this.db.prepare(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return this.db.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first<Category>();
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();
    return result.meta.rows_written > 0;
  }

  async seedDefaultCategories(userId: string): Promise<Category[]> {
    const existing = await this.getCategories(userId);
    if (existing.length > 0) return existing;

    const created: Category[] = [];
    for (const cat of DEFAULT_CATEGORIES) {
      const category = await this.createCategory(userId, {
        name: cat.name,
        color: cat.color,
        isAiAgent: cat.isAiAgent,
      });
      created.push(category);
    }
    return created;
  }
}