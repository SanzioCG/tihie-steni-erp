import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';

// Mahsulotlar ro'yxati (kategoriyalar va batches bilan birga)
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *, 
          categories (id, name_uz),
          batches (remaining_quantity)
        `)
        .order('name_uz', { ascending: true });
      
      if (error) throw error;

      // Har bir mahsulot uchun umumiy qoldiqni hisoblaymiz
      return data?.map(p => ({
        ...p,
        total_stock: p.batches?.reduce((acc: number, b: any) => acc + (b.remaining_quantity || 0), 0) || 0
      })) || [];
    },
    staleTime: 30_000, // 30 sekund cache
  });
}

// Kategoriyalar
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name_uz');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000, // 5 daqiqa cache (o'zgaradigan narsa emas)
  });
}

// Mahsulot o'chirish (mutation)
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Cache'ni yangilash — Inventory avtomatik refetch qiladi
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}