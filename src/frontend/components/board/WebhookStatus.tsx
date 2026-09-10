import { useApiMutation } from '../../lib/api';
import { Badge } from '../ui/Badge';

interface WebhookStatusProps {
  status: 'pending' | 'sent' | 'failed' | null;
  taskId: string;
}

export default function WebhookStatus({ status, taskId }: WebhookStatusProps) {
  if (!status) return null;

  const retryMutation = useApiMutation<void, string>(
    `/api/webhooks/retry/${taskId}`,
    'POST',
  );

  const handleRetry = async () => {
    try {
      await retryMutation.mutateAsync(taskId);
    } catch (err) {
      console.error('Failed to retry webhook:', err);
      alert('Failed to retry webhook');
    }
  };

  const statusConfig = {
    pending: { label: 'Pending', variant: 'warning' as const, icon: '⏳' },
    sent: { label: 'Sent', variant: 'success' as const, icon: '✅' },
    failed: { label: 'Failed', variant: 'danger' as const, icon: '❌' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1">
      <Badge variant={config.variant} className="text-xs">
        {config.icon} {config.label}
      </Badge>
      {status === 'failed' && (
        <button
          onClick={handleRetry}
          disabled={retryMutation.isPending}
          className="btn-ghost btn-sm p-1.5 text-gray-500 hover:text-primary-600"
          aria-label="Retry webhook"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
}