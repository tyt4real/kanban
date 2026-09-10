import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boardSchema, type BoardInput } from '@/lib/validation';
import { useApiQuery, useApiMutation } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Board {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function BoardList() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: boards, isLoading, refetch } = useApiQuery<{ data: Board[] }>(
    ['boards'],
    '/api/boards'
  );

  const createMutation = useApiMutation<{ data: Board }, BoardInput>(
    '/api/boards',
    'POST',
    {
      onSuccess: () => {
        setShowCreate(false);
        refetch();
      },
      invalidateKeys: [['boards']],
    }
  );

  const deleteMutation = useApiMutation<void, string>(
    '/api/boards',
    'DELETE',
    {
      onSuccess: () => refetch(),
      invalidateKeys: [['boards']],
    }
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BoardInput>({
    resolver: zodResolver(boardSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = async (data: BoardInput) => {
    setError(null);
    try {
      await createMutation.mutateAsync(data);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this board?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete board');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Kanban Boards</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="btn-ghost btn-sm"
            >
              Logout
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary"
            >
              New Board
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="mb-6 card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Board</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-ghost btn-sm"
              >
                Cancel
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="name" className="label">
                    Board Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className={`input ${errors.name ? 'input-error' : ''}`}
                    placeholder="My Project"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="description" className="label">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    {...register('description')}
                    className={`input ${errors.description ? 'input-error' : ''}`}
                    placeholder="What's this board for?"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn-primary"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Board'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="card-body">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : boards?.data.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10l4-4m-4 4l4 4m-7-14h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No boards yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new board.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary mt-4"
            >
              Create Board
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards?.data.map((board) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                className="card hover:shadow-md transition-shadow group"
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {board.name}
                      </h3>
                      {board.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(board.id);
                      }}
                      className="btn-ghost btn-sm text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete board"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-gray-400">
                    Updated {new Date(board.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}