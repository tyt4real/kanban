export interface Category {
  id: string;
  name: string;
  color: string;
  is_ai_agent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  columns: Column[];
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  category_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  category: Category | null;
  webhook_status?: 'pending' | 'sent' | 'failed' | null;
}

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