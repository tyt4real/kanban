import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApiQuery, useApiMutation } from '@/lib/api';
import Board from '@/components/board/Board';

interface BoardData {
  id: string;
  name: string;
  description: string | null;
  columns: { id: string; name: string; position: number }[];
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onBack = () => navigate('/boards');

  const { data: boardData, isLoading, refetch } = useApiQuery<{ data: BoardData }>(
    ['board', boardId],
    boardId ? `/api/boards/${boardId}` : '',
    { enabled: !!boardId }
  );

  const deleteMutation = useApiMutation<void, string>(
    '/api/boards',
    'DELETE',
    {
      onSuccess: () => navigate('/boards'),
    }
  );

  const handleDelete = async () => {
    if (!boardId || !confirm('Are you sure you want to delete this board?')) return;
    try {
      await deleteMutation.mutateAsync(boardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete board');
    }
  };

  if (!boardId) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!boardData?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Board not found</p>
      </div>
    );
  }

  const board = boardData.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="btn-ghost btn-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
              {board.description && (
                <p className="text-sm text-gray-500">{board.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}
        <Board
          boardId={boardId}
          columns={board.columns}
          onBack={onBack}
        />
      </main>
    </div>
  );
}