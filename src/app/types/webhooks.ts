export interface WebhookDelivery {
  id: string;
  task_id: string;
  payload: string;
  response_status: number | null;
  response_body: string | null;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
}

export interface WebhookPayload {
  task: {
    id: string;
    title: string;
    description: string | null;
    column_id: string;
    category_id: string | null;
    board_id: string;
    created_at: string;
    updated_at: string;
  };
  category: {
    id: string;
    name: string;
    is_ai_agent: boolean;
  };
  board: {
    id: string;
    name: string;
  };
  column: {
    id: string;
    name: string;
  };
  triggered_at: string;
  trigger_type: 'created' | 'moved_to_ai_category';
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  maxRetries: number;
  retryDelays: number[]; // in milliseconds
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  url: '',
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000], // 1s, 2s, 4s exponential backoff
};