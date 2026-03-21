import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { uploadProductImage } from '../storage';

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
      // 1. Upload image if provided
      let imageUrl = '';
      if (data.image_file) {
        imageUrl = await uploadProductImage(data.image_file);
      }

      // 2. Insert into products
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
          average_cost: data.purchase_price, // Initial average cost is the first purchase price
          // Also set legacy columns for compatibility
          width: data.dimensions.width,
          height: data.dimensions.height,
          length: data.dimensions.length,
        })
        .select()
        .single();

      if (productError) throw productError;

      // 3. Insert into batches (referred to as product_batches in logic)
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
      // Invalidate queries to refresh Dashboard and Inventory
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
