import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation';
import { useAuth } from '@/lib/auth';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { changePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setError(null);
    setLoading(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md card text-center">
          <div className="card-body">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Password changed</h1>
            <p className="text-gray-500 mt-2">Your password has been successfully updated.</p>
            <button
              onClick={() => navigate('/boards')}
              className="btn-primary mt-6"
            >
              Back to boards
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-gray-900">Change password</h1>
          <p className="text-gray-500 mt-1">Update your password</p>
        </div>
        <div className="card-body">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="label">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
                className={`input ${errors.currentPassword ? 'input-error' : ''}`}
                placeholder="••••••••••••"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="newPassword" className="label">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
                className={`input ${errors.newPassword ? 'input-error' : ''}`}
                placeholder="••••••••••••"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="label">
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmNewPassword')}
                className={`input ${errors.confirmNewPassword ? 'input-error' : ''}`}
                placeholder="••••••••••••"
              />
              {errors.confirmNewPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmNewPassword.message}</p>
              )}
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>At least 12 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character</li>
              </ul>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}