import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useContactCounts() {
  return useQuery({
    queryKey: ['contact-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('client_id');
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(c => {
        if (c.client_id) counts[c.client_id] = (counts[c.client_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60_000,
  });
}

export function useClientStats() {
  return useQuery({
    queryKey: ['client-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('client_id, total_amount')
        .gt('quantity', 0);
      if (error) throw error;
      
      const stats: Record<string, number> = {};
      data?.forEach(s => {
        if (s.client_id) {
          stats[s.client_id] = (stats[s.client_id] || 0) + Number(s.total_amount);
        }
      });
      return stats;
    },
    staleTime: 30_000,
  });
}