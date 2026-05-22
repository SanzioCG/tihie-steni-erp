import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';

export function useFinanceStats(params: { 
  p_category?: string | null; 
  p_date_from?: string | null; 
  p_date_to?: string | null;
}) {
  return useQuery({
    queryKey: ['finance-stats', params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_finance_stats_v2', params);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

export function useTransactionCategories() {
  return useQuery({
    queryKey: ['transaction-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('category');
      if (error) throw error;
      const unique = Array.from(new Set((data || []).map((t: any) => t.category).filter(Boolean)));
      return unique as string[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAuditLogs() {
  return useInfiniteQuery({
    queryKey: ['audit-logs'],
    queryFn: async ({ pageParam = 0 }) => {
      const PAGE_SIZE = 50;
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { 
        logs: data || [], 
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : null 
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30_000,
  });
}

export function useDebtors() {
  return useQuery({
    queryKey: ['debtors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .lt('balance', 0)
        .order('balance', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, products(name_uz, sku, image_url, categories(name_uz))')
        .order('remaining_quantity');
      if (error) throw error;
      return (data || []).filter((b: any) => 
        Number(b.remaining_quantity) <= Number(b.min_limit || 0)
      );
    },
    staleTime: 30_000,
  });
}

export function useStock() {
  return useQuery({
    queryKey: ['stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, products(*, categories(name_uz))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useOfficeExpenses() {
  return useQuery({
    queryKey: ['office-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('office_expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useCommercialOffers() {
  return useQuery({
    queryKey: ['commercial-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_offers')
        .select('*, clients(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}