import { useState } from 'react';
import TaskForm from './TaskForm';
import CategoryBadge from './CategoryBadge';
import { api, useApiMutation } from '../../lib/api';
import { Category } from '@/types';
import WebhookStatus from './WebhookStatus';

interface Task {
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

interface TaskCardProps {
  task: Task;
  categories: Category[];
  onMove: (taskId: string, columnId: string, position: number) => void;
  onUpdate: () => void;
}

export default function TaskCard({ task, categories, onMove, onUpdate }: TaskCardProps) {
  const [showForm, setShowForm] = useState(false);

  const deleteMutation = useApiMutation<void, string>(
    `/api/tasks/${task.id}`,
    'DELETE',
    { onSuccess: onUpdate }
  );

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteMutation.mutateAsync(task.id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task');
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: task.id,
      columnId: task.column_id,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="card bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      role="listitem"
      aria-label={task.title}
    >
      <div className="card-body p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1 min-w-0">
            {task.title}
          </h4>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowForm(true);
              }}
              className="btn-ghost btn-sm p-1.5 text-gray-500 hover:text-gray-700"
              aria-label="Edit task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="btn-ghost btn-sm p-1.5 text-gray-500 hover:text-red-600"
              aria-label="Delete task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {task.description && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <CategoryBadge category={task.category} size="sm" />
          <WebhookStatus status={task.webhook_status || null} taskId={task.id} />
        </div>

        <p className="mt-2 text-xs text-gray-400">
          Updated {new Date(task.updated_at).toLocaleDateString()}
        </p>
      </div>

      {showForm && (
        <TaskForm
          initialData={{
            id: task.id,
            title: task.title,
            description: task.description,
            columnId: task.column_id,
            categoryId: task.category_id,
          }}
          columnId={task.column_id}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSuccess={onUpdate}
        />
      )}
    </div>
  );
}