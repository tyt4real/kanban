export interface Board {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BoardWithColumns extends Board {
  columns: Column[];
}

export interface CreateBoardInput {
  name: string;
  description?: string;
}

export interface UpdateBoardInput {
  name?: string;
  description?: string | null;
}

export interface CreateColumnInput {
  boardId: string;
  name: string;
  position: number;
}

export interface UpdateColumnInput {
  name?: string;
  position?: number;
}

export const DEFAULT_COLUMNS = [
  { name: 'Todo', position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Finished', position: 2 },
  { name: 'Pending Review', position: 3 },
] as const;