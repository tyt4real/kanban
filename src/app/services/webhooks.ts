import { Database } from '../db/client';
import { WebhookDelivery, WebhookPayload, WebhookConfig, DEFAULT_WEBHOOK_CONFIG } from '../types/webhooks';
import { TaskWithCategory } from '../types/tasks';

export class WebhookService {
  constructor(
    private db: Database,
    private config: WebhookConfig = DEFAULT_WEBHOOK_CONFIG
  ) {}

  async triggerWebhook(task: TaskWithCategory, triggerType: 'created' | 'moved_to_ai_category'): Promise<void> {
    if (!this.config.url) {
      console.warn('Webhook URL not configured, skipping webhook');
      return;
    }

    if (!task.category?.is_ai_agent) {
      return;
    }

    // Get board and column info
    const board = await this.db.prepare('SELECT name FROM boards WHERE id = ?').bind(task.board_id).first<{ name: string }>();
    const column = await this.db.prepare('SELECT name FROM columns WHERE id = ?').bind(task.column_id).first<{ name: string }>();

    const payload: WebhookPayload = {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        column_id: task.column_id,
        category_id: task.category_id,
        board_id: task.board_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
      category: {
        id: task.category.id,
        name: task.category.name,
        is_ai_agent: task.category.is_ai_agent === 1,
      },
      board: {
        id: task.board_id,
        name: board?.name || 'Unknown',
      },
      column: {
        id: task.column_id,
        name: column?.name || 'Unknown',
      },
      triggered_at: new Date().toISOString(),
      trigger_type: triggerType,
    };

    const deliveryId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(
      `INSERT INTO webhook_deliveries (id, task_id, payload, status, attempts, created_at)
       VALUES (?, ?, ?, 'pending', 0, ?)`
    ).bind(deliveryId, task.id, JSON.stringify(payload), now).run();

    // Process asynchronously
    this.processDelivery(deliveryId, payload).catch(err => {
      console.error('Webhook processing error:', err);
    });
  }

  private async processDelivery(deliveryId: string, payload: WebhookPayload): Promise<void> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= this.config.maxRetries) {
      try {
        const response = await fetch(this.config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Kanban-Webhook/1.0',
          },
          body: JSON.stringify(payload),
        });

        const responseBody = await response.text().catch(() => '');

        await this.db.prepare(
          `UPDATE webhook_deliveries
           SET response_status = ?, response_body = ?, status = ?, attempts = ?, last_attempt_at = ?
           WHERE id = ?`
        ).bind(
          response.status,
          responseBody,
          response.ok ? 'sent' : 'failed',
          attempts + 1,
          new Date().toISOString(),
          deliveryId
        ).run();

        if (response.ok) {
          console.log(`Webhook delivered successfully for delivery ${deliveryId}`);
          return;
        }

        lastError = new Error(`HTTP ${response.status}: ${responseBody}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
      }

      attempts++;

      if (attempts <= this.config.maxRetries) {
        const delay = this.config.retryDelays[Math.min(attempts - 1, this.config.retryDelays.length - 1)];
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    await this.db.prepare(
      `UPDATE webhook_deliveries
       SET status = 'failed', attempts = ?, last_attempt_at = ?
       WHERE id = ?`
    ).bind(attempts, new Date().toISOString(), deliveryId).run();

    console.error(`Webhook failed after ${attempts} attempts for delivery ${deliveryId}:`, lastError?.message);
  }

  async getDeliveryStatus(taskId: string): Promise<WebhookDelivery | null> {
    return this.db.prepare(
      'SELECT * FROM webhook_deliveries WHERE task_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(taskId).first<WebhookDelivery>();
  }

  async retryDelivery(deliveryId: string): Promise<boolean> {
    const delivery = await this.db.prepare(
      'SELECT * FROM webhook_deliveries WHERE id = ?'
    ).bind(deliveryId).first<WebhookDelivery>();

    if (!delivery) return false;

    const payload = JSON.parse(delivery.payload) as WebhookPayload;

    await this.db.prepare(
      `UPDATE webhook_deliveries SET status = 'pending', attempts = 0 WHERE id = ?`
    ).bind(deliveryId).run();

    this.processDelivery(deliveryId, payload).catch(err => {
      console.error('Webhook retry error:', err);
    });

    return true;
  }

  async getDeliveriesForTask(taskId: string): Promise<WebhookDelivery[]> {
    const result = await this.db.prepare(
      'SELECT * FROM webhook_deliveries WHERE task_id = ? ORDER BY created_at DESC'
    ).bind(taskId).all<WebhookDelivery>();

    return result.results;
  }
}