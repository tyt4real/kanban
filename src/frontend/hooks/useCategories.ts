import { useApiQuery } from '../lib/api';
import { Category } from '@/types';

export function useCategories() {
  const { data, isLoading, refetch } = useApiQuery<{ data: Category[] }>(
    ['categories'],
    '/api/categories'
  );

  return {
    categories: data?.data || [],
    isLoading,
    refetch,
  };
}