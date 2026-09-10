import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categorySchema, smtpSchema, rateLimitSchema, type CategoryInput, type SmtpInput, type RateLimitInput } from '@/lib/validation';
import { useApiQuery, useApiMutation } from '@/lib/api';
import { Category } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Badge } from '@/components/ui/Badge';

interface SettingsData {
  categories: Category[];
  smtp: {
    host: string;
    port: number;
    user: string;
    from: string;
  } | null;
  rateLimits: {
    authLimit: number;
    apiLimit: number;
    webhookLimit: number;
  };
}

interface TestEmailResult {
  success: boolean;
  message: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'categories' | 'smtp' | 'rateLimits'>('categories');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: settingsData, refetch } = useApiQuery<{ data: SettingsData }>(
    ['settings'],
    '/api/settings'
  );

  const updateCategoriesMutation = useApiMutation<void, CategoryInput>(
    '/api/categories',
    'POST',
    { onSuccess: () => refetch(), invalidateKeys: [['categories']] }
  );

  const deleteCategoryMutation = useApiMutation<void, string>(
    '/api/categories',
    'DELETE',
    { onSuccess: () => refetch(), invalidateKeys: [['categories']] }
  );

  const updateSmtpMutation = useApiMutation<void, SmtpInput>(
    '/api/settings/smtp',
    'PUT',
    { onSuccess: () => refetch() }
  );

  const testEmailMutation = useApiMutation<TestEmailResult, { email: string }>(
    '/api/settings/smtp/test',
    'POST',
  );

  const updateRateLimitsMutation = useApiMutation<void, RateLimitInput>(
    '/api/settings/rate-limits',
    'PUT',
    { onSuccess: () => refetch() }
  );

  const categories = settingsData?.data?.categories || [];
  const smtp = settingsData?.data?.smtp || { host: '', port: 587, user: '', from: '' };
  const rateLimits = settingsData?.data?.rateLimits || { authLimit: 5, apiLimit: 60, webhookLimit: 10 };

  // Categories form
  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategory,
    watch: watchCategory,
    setValue: setCategoryValue,
    formState: { errors: categoryErrors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', color: '#3b82f6', isAiAgent: false },
  });

  const onSubmitCategory = async (data: CategoryInput) => {
    try {
      await updateCategoriesMutation.mutateAsync(data);
      resetCategory();
      showToast('Category saved successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Tasks using it will lose their category.')) return;
    try {
      await deleteCategoryMutation.mutateAsync(id);
      showToast('Category deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
    }
  };

  // SMTP form
  const {
    register: registerSmtp,
    handleSubmit: handleSubmitSmtp,
    formState: { errors: smtpErrors },
  } = useForm<SmtpInput>({
    resolver: zodResolver(smtpSchema),
    defaultValues: smtp,
  });

  const [testEmail, setTestEmail] = useState('');

  const onSubmitSmtp = async (data: SmtpInput) => {
    try {
      await updateSmtpMutation.mutateAsync(data);
      showToast('SMTP settings saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save SMTP settings', 'error');
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    try {
      const result = await testEmailMutation.mutateAsync({ email: testEmail });
      showToast(result.message, result.success ? 'success' : 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send test email', 'error');
    }
  };

  // Rate limits form
  const {
    register: registerRateLimits,
    handleSubmit: handleSubmitRateLimits,
    formState: { errors: rateLimitErrors },
  } = useForm<RateLimitInput>({
    resolver: zodResolver(rateLimitSchema),
    defaultValues: rateLimits,
  });

  const onSubmitRateLimits = async (data: RateLimitInput) => {
    try {
      await updateRateLimitsMutation.mutateAsync(data);
      showToast('Rate limits updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update rate limits', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <nav className="mb-6 border-b border-gray-200" aria-label="Settings tabs">
            <ul className="flex gap-8">
              {[
                { id: 'categories', label: 'Categories' },
                { id: 'smtp', label: 'Email (SMTP)' },
                { id: 'rateLimits', label: 'Rate Limits' },
              ].map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {activeTab === 'categories' && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold">Task Categories</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmitCategory(onSubmitCategory)} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      label="Name"
                      {...registerCategory('name')}
                      error={categoryErrors.name?.message}
                      placeholder="Bug, Feature, etc."
                    />
                    <div>
                      <label className="label">Color</label>
                      <ColorPicker
                        value={watchCategory('color') || '#3b82f6'}
                        onChange={(c) => setCategoryValue('color', c)}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          {...registerCategory('isAiAgent')}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">AI Agent Category</span>
                      </label>
                    </div>
                  </div>
                  <Button type="submit" disabled={updateCategoriesMutation.isPending}>
                    {updateCategoriesMutation.isPending ? 'Saving...' : 'Add Category'}
                  </Button>
                </form>

                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="custom" color={cat.color}>
                          {cat.name}
                          {cat.is_ai_agent && <span className="ml-1">🤖</span>}
                        </Badge>
                        <span className="text-xs text-gray-500 font-mono">{cat.color}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        disabled={deleteCategoryMutation.isPending}
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">SMTP Configuration</h2>
                <p className="text-sm text-gray-500 mt-1">Configure email notifications for task completion</p>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmitSmtp(onSubmitSmtp)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="SMTP Host"
                      {...registerSmtp('host')}
                      error={smtpErrors.host?.message}
                      placeholder="smtp.example.com"
                    />
                    <Input
                      label="Port"
                      type="number"
                      {...registerSmtp('port', { valueAsNumber: true })}
                      error={smtpErrors.port?.message}
                      placeholder="587"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Username"
                      {...registerSmtp('user')}
                      error={smtpErrors.user?.message}
                      placeholder="your-username"
                    />
                    <Input
                      label="Password"
                      type="password"
                      {...registerSmtp('pass')}
                      error={smtpErrors.pass?.message}
                      placeholder="••••••••"
                      helperText="Stored securely in Cloudflare Workers secrets"
                    />
                  </div>
                  <Input
                    label="From Email"
                    {...registerSmtp('from')}
                    error={smtpErrors.from?.message}
                    placeholder="noreply@yourdomain.com"
                  />
                  <Button type="submit" disabled={updateSmtpMutation.isPending}>
                    {updateSmtpMutation.isPending ? 'Saving...' : 'Save SMTP Settings'}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-4">Test Email</h3>
                  <form onSubmit={handleTestEmail} className="flex gap-2">
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={testEmailMutation.isPending || !testEmail}
                    >
                      {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rateLimits' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Rate Limiting</h2>
                <p className="text-sm text-gray-500 mt-1">Configure request limits per minute per user</p>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmitRateLimits(onSubmitRateLimits)} className="space-y-4 max-w-md">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      label="Auth Endpoints (/min)"
                      type="number"
                      {...registerRateLimits('authLimit')}
                      error={rateLimitErrors.authLimit?.message}
                      placeholder="5"
                    />
                    <Input
                      label="API Endpoints (/min)"
                      type="number"
                      {...registerRateLimits('apiLimit')}
                      error={rateLimitErrors.apiLimit?.message}
                      placeholder="60"
                    />
                    <Input
                      label="Webhooks (/min)"
                      type="number"
                      {...registerRateLimits('webhookLimit')}
                      error={rateLimitErrors.webhookLimit?.message}
                      placeholder="10"
                    />
                  </div>
                  <Button type="submit" disabled={updateRateLimitsMutation.isPending}>
                    {updateRateLimitsMutation.isPending ? 'Saving...' : 'Save Rate Limits'}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}