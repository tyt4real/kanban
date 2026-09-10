import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, type TaskInput } from '../../lib/validation';
import { api, useApiMutation } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ColorPicker } from '../ui/ColorPicker';
import { Badge } from '../ui/Badge';
import { Category } from '@/types';

interface TaskFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string | null;
    columnId: string;
    categoryId: string | null;
  } | null;
  columnId: string;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TaskForm({ initialData, columnId, categories, onClose, onSuccess }: TaskFormProps) {
  const isEditing = !!initialData;
  const [error, setError] = useState<string | null>(null);

  const createMutation = useApiMutation<{ data: any }, TaskInput>(
    '/api/tasks',
    'POST',
    { onSuccess: () => { onSuccess(); onClose(); } }
  );

  const updateMutation = useApiMutation<{ data: any }, TaskInput>(
    `/api/tasks/${initialData?.id}`,
    'PATCH',
    { onSuccess: () => { onSuccess(); onClose(); } }
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      columnId: initialData?.columnId || columnId,
      categoryId: initialData?.categoryId || null,
    },
  });

  const watchedCategoryId = watch('categoryId');
  const selectedCategory = categories.find(c => c.id === watchedCategoryId);

  const onSubmit = async (data: TaskInput) => {
    setError(null);
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
      <div className="w-full max-w-md card max-h-[90vh] overflow-y-auto">
        <div className="card-header flex items-center justify-between sticky top-0 bg-white border-b border-gray-200 z-10">
          <h2 id="task-form-title" className="text-lg font-semibold">
            {isEditing ? 'Edit Task' : 'Create Task'}
          </h2>
          <button
            onClick={onClose}
            className="btn-ghost btn-sm"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="card-body">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Title"
              {...register('title')}
              error={errors.title?.message}
              placeholder="Task title"
              autoFocus
            />
            <Textarea
              label="Description (optional)"
              {...register('description')}
              error={errors.description?.message}
              placeholder="Add details..."
              rows={3}
            />
            <div>
              <label className="label">Category</label>
              <select
                {...register('categoryId', { valueAsNumber: false })}
                className="input"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} style={{ color: cat.color }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color, marginRight: '8px' }} />
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
              )}
            </div>
            {selectedCategory && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <Badge variant="custom" color={selectedCategory.color}>
                  {selectedCategory.name}
                  {selectedCategory.is_ai_agent && ' 🤖'}
                </Badge>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}