import { useApiQuery } from '../lib/api';
import { Task, Category } from '@/types';

export function useTasks(boardId: string) {
  const { data, isLoading, refetch } = useApiQuery<{ data: Task[] }>(
    ['tasks', boardId],
    boardId ? `/api/boards/${boardId}/tasks` : '',
    { enabled: !!boardId }
  );

  return {
    tasks: data?.data || [],
    isLoading,
    refetch,
  };
}