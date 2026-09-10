import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

export const boardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

export const columnSchema = z.object({
  name: z.string().min(1, 'Column name is required').max(50, 'Name too long'),
  position: z.number().int().nonnegative(),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  columnId: z.string().uuid('Invalid column ID'),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use #RRGGBB)'),
  isAiAgent: z.boolean().default(false),
});

export const smtpSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535),
  user: z.string().min(1, 'SMTP user is required'),
  pass: z.string().min(1, 'SMTP password is required'),
  from: emailSchema,
});

export const rateLimitSchema = z.object({
  authLimit: z.number().int().positive().default(5),
  apiLimit: z.number().int().positive().default(60),
  webhookLimit: z.number().int().positive().default(10),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type BoardInput = z.infer<typeof boardSchema>;
export type ColumnInput = z.infer<typeof columnSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SmtpInput = z.infer<typeof smtpSchema>;
export type RateLimitInput = z.infer<typeof rateLimitSchema>;