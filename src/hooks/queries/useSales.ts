import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`*, clients (full_name, client_type, phone), products (id, name_uz, sku, categories (name_uz))`)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}