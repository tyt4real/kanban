import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'custom';
  color?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', color, children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-gray-100 text-gray-700',
      primary: 'bg-primary-100 text-primary-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      danger: 'bg-red-100 text-red-700',
      custom: '',
    };

    const style = variant === 'custom' && color
      ? { backgroundColor: color, color: getContrastColor(color) }
      : undefined;

    return (
      <span
        ref={ref}
        className={`badge ${variantClasses[variant]} ${className}`}
        style={style}
        {...props}
      >
        {children}
      </span>
    );
  }
);

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

Badge.displayName = 'Badge';