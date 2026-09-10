import { useState, useCallback } from 'react';
import Column from './Column';
import TaskForm from './TaskForm';
import { api, useApiQuery, useApiMutation } from '../../lib/api';
import { Task, Category } from '@/types';
import { Button } from '../ui/Button';

interface BoardProps {
  boardId: string;
  columns: { id: string; name: string; position: number }[];
  onBack: () => void;
}

export default function Board({ boardId, columns, onBack }: BoardProps) {
  const [showForm, setShowForm] = useState<string | null>(null);

  const { data: tasksData, isLoading, refetch } = useApiQuery<{ data: Task[] }>(
    ['tasks', boardId],
    `/api/boards/${boardId}/tasks`
  );

  const { data: categoriesData } = useApiQuery<{ data: Category[] }>(
    ['categories'],
    '/api/categories'
  );

  const moveMutation = useApiMutation<void, { taskId: string; columnId: string; position: number }>(
    '/api/tasks/move',
    'PATCH',
    { onSuccess: refetch }
  );

  const handleMove = useCallback(async (taskId: string, columnId: string, position: number) => {
    try {
      await moveMutation.mutateAsync({ taskId, columnId, position });
    } catch (err) {
      console.error('Failed to move task:', err);
      refetch();
    }
  }, [moveMutation, refetch]);

  const tasks = tasksData?.data || [];
  const categories = categoriesData?.data || [];

  const columnsWithTasks = columns.map((column) => ({
    ...column,
    tasks: tasks
      .filter((t) => t.column_id === column.id)
      .sort((a, b) => a.position - b.position),
  }));

  if (isLoading) {
    return (
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-[1200px]">
          {columns.map((col) => (
            <div key={col.id} className="w-72 flex-shrink-0 bg-gray-100 rounded-xl">
              <div className="p-3 border-b border-gray-200">
                <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse" />
              </div>
              <div className="p-2 space-y-2 min-h-[400px]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card animate-pulse h-24" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto p-4">
      <div className="flex gap-4 min-w-[1200px] pb-4">
        {columnsWithTasks.map((column) => (
          <Column
            key={column.id}
            id={column.id}
            name={column.name}
            tasks={column.tasks}
            categories={categories}
            onMove={handleMove}
            onUpdate={refetch}
          />
        ))}
      </div>
    </div>
  );
}