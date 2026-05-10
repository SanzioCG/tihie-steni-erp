import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { uploadProductImage } from '../services/storage';
import type { Product, Warehouse, Category, Batch } from '../types';

// ============================================
// PRODUCT + BATCH (atomik amal)
// ============================================

export interface AddProductData {
  sku: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  category_id: string;
  warehouse_id: string;
  unit: 'm2' | 'p.m' | 'pcs';
  image_file?: File;
  dimensions: {
    width?: number;
    height?: number;
    length?: number;
  };
  quantity: number;
  purchase_price: number;
}

export function useInventory() {
  const queryClient = useQueryClient();

  const addProductWithBatch = useMutation({
    mutationFn: async (data: AddProductData) => {
      let imageUrl = '';
      if (data.image_file) {
        imageUrl = await uploadProductImage(data.image_file);
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          sku: data.sku,
          name_uz: data.name_uz,
          name_ru: data.name_ru,
          name_en: data.name_en,
          category_id: data.category_id,
          unit: data.unit,
          image_url: imageUrl,
          dimensions: data.dimensions,
          average_cost: data.purchase_price,
          width: data.dimensions.width,
          height: data.dimensions.height,
          length: data.dimensions.length,
        })
        .select()
        .single();

      if (productError) throw productError;

      const { error: batchError } = await supabase
        .from('batches')
        .insert({
          product_id: product.id,
          warehouse_id: data.warehouse_id,
          batch_number: `BATCH-${Date.now()}`,
          quantity: data.quantity,
          purchase_price: data.purchase_price,
          purchase_date: new Date().toISOString().split('T')[0],
        });

      if (batchError) throw batchError;

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  return {
    addProductWithBatch,
  };
}

// ============================================
// WAREHOUSES
// ============================================

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').order('name_uz');
      if (error) throw error;
      return data as Warehouse[];
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newWarehouse: Omit<Warehouse, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('warehouses').insert(newWarehouse).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Warehouse> & { id: string }) => {
      const { data, error } = await supabase.from('warehouses').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

// ============================================
// CATEGORIES
// ============================================

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name_uz');
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCategory: Omit<Category, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('categories').insert(newCategory).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ============================================
// PRODUCTS
// ============================================

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newProduct: Omit<Product, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('products').insert(newProduct).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ============================================
// BATCHES
// ============================================

export function useBatches(productId?: string) {
  return useQuery({
    queryKey: ['batches', productId],
    queryFn: async () => {
      let query = supabase.from('batches').select('*, warehouses(*)').order('created_at', { ascending: false });
      if (productId) query = query.eq('product_id', productId);
      const { data, error } = await query;
      if (error) throw error;
      return data as (Batch & { warehouses: Warehouse })[];
    },
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newBatch: Omit<Batch, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('batches').insert(newBatch).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}