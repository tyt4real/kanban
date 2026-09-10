import { useState, useRef, useCallback } from 'react';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import { api, useApiMutation } from '../../lib/api';
import { Task, Category } from '@/types';
import { Button } from '../ui/Button';

interface ColumnProps {
  id: string;
  name: string;
  tasks: Task[];
  categories: Category[];
  onMove: (taskId: string, columnId: string, position: number) => void;
  onUpdate: () => void;
}

export default function Column({ id, name, tasks, categories, onMove, onUpdate }: ColumnProps) {
  const [showForm, setShowForm] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const createMutation = useApiMutation<{ data: Task }, any>(
    '/api/tasks',
    'POST',
    { onSuccess: () => { onUpdate(); setShowForm(false); } }
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dropZoneRef.current?.classList.add('bg-primary-50');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      dropZoneRef.current?.classList.remove('bg-primary-50');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('bg-primary-50');

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.taskId && data.columnId !== id) {
        onMove(data.taskId, id, tasks.length);
      }
    } catch {
      console.error('Invalid drop data');
    }
  }, [id, tasks.length, onMove]);

  const handleFormSubmit = async (data: any) => {
    try {
      await createMutation.mutateAsync({ ...data, columnId: id });
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Failed to create task');
    }
  };

  return (
    <div className="flex flex-col w-72 flex-shrink-0 bg-gray-100 rounded-xl">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
          {name}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
      </div>

      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px] transition-colors"
        role="list"
        aria-label={`${name} tasks`}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            categories={categories}
            onMove={onMove}
            onUpdate={onUpdate}
          />
        ))}

        {showForm && (
          <TaskForm
            initialData={null}
            columnId={id}
            categories={categories}
            onClose={() => setShowForm(false)}
            onSuccess={onUpdate}
          />
        )}

        {!showForm && tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No tasks yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-ghost btn-sm mt-2"
            >
              Add task
            </button>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            + Add Task
          </Button>
        </div>
      )}
    </div>
  );
}