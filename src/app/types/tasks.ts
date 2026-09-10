export interface Task {
  id: string;
  board_id: string;
  column_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithCategory extends Task {
  category: Category | null;
  webhook_status?: 'pending' | 'sent' | 'failed' | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_ai_agent: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  categoryId?: string | null;
  position?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  columnId?: string;
  categoryId?: string | null;
  position?: number;
}

export interface MoveTaskInput {
  taskId: string;
  columnId: string;
  position: number;
}

export interface TaskFilters {
  columnId?: string;
  categoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}