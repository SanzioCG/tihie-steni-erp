import { createClient } from '@supabase/supabase-js';

// Vite-da environment variables shunday o'qiladi:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Siz yozgan barcha Interfeyslar (Profile, Category, Product, Batch...)
// shu yerda o'zgarishsiz qoladi. 

// ... (Siz yozgan helper funksiyalar ham shu yerda qoladi)