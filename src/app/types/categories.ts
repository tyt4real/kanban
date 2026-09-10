export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_ai_agent: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  color: string;
  isAiAgent?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  isAiAgent?: boolean;
}

export const DEFAULT_CATEGORIES = [
  { name: 'Bug', color: '#ef4444', isAiAgent: false },
  { name: 'Feature', color: '#3b82f6', isAiAgent: false },
  { name: 'Documentation', color: '#8b5cf6', isAiAgent: false },
  { name: 'AI Agent', color: '#10b981', isAiAgent: true },
] as const;