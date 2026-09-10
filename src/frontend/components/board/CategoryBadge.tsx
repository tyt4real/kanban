import { Badge } from '../ui/Badge';
import { Category } from '@/types';

interface CategoryBadgeProps {
  category: Category | null;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  if (!category) return null;

  const badgeSize = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-0.5';

  return (
    <Badge variant="custom" color={category.color} className={badgeSize}>
      {category.name}
      {category.is_ai_agent && <span className="ml-1" aria-label="AI Agent">🤖</span>}
    </Badge>
  );
}