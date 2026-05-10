import { supabase } from './supabase';

export async function uploadProductImage(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `product-images/${fileName}`;

  const { error: uploadError, data } = await supabase.storage
    .from('erp-assets')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('erp-assets')
    .getPublicUrl(filePath);

  return publicUrl;
}
