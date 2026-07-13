import type { User } from '@supabase/supabase-js';

// Auth
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'warehouseman' | 'salesperson' | 'director';
  avatar_url?: string;
  created_at: string;
}

export type Role = Profile['role'];

// Inventory
export interface Category {
  id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  type: 'textile' | 'profile' | 'other';
  location?: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  description?: string;
  category_id: string;
  unit: 'm2' | 'p.m' | 'pcs';
  image_url?: string;
  series?: string;
  average_cost: number;
  width?: number;
  height?: number;
  length?: number;
  created_at: string;
  categories?: Category;
}

export interface Batch {
  id: string;
  product_id: string;
  warehouse_id?: string;
  batch_number: string;
  quantity: number;
  remaining_quantity: number;
  purchase_price: number;
  selling_price: number;
  min_limit: number;
  width_m?: number;
  length_m?: number;
  color_name?: string;
  created_at: string;
  products?: Product;
  warehouses?: Warehouse;
}

// Sales & CRM
export type ClientType = 'Chakana' | 'VIP' | 'Ulgurji';

export interface Client {
  id: string;
  full_name: string;
  phone: string;
  client_type: ClientType;
  balance: number;
  source?: string;
  address?: string;
  notes?: string;
  responsible_id?: string;
  status?: string;
  last_contact_at?: string;
  created_at: string;
}

export type InteractionType = 'call' | 'meeting' | 'message' | 'note' | 'visit';
export type InteractionDirection = 'incoming' | 'outgoing';

export interface ClientInteraction {
  id: string;
  client_id: string;
  type: InteractionType;
  direction?: InteractionDirection;
  subject?: string;
  note?: string;
  outcome?: string;
  created_by?: string;
  created_at: string;
}

export interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  due_date?: string;
  status: 'pending' | 'done' | 'cancelled';
  completed_at?: string;
  created_by?: string;
  created_at: string;
  clients?: Client;
}

export type SaleStatus = 'pending' | 'completed' | 'cancelled';

export interface Sale {
  id: string;
  client_id?: string;
  product_id?: string;
  batch_id?: string;
  quantity: number;
  total_amount: number;
  status: SaleStatus;
  created_by?: string;
  created_at: string;
  clients?: Client;
  products?: Product;
}

// Finance
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  client_id?: string;
  created_by?: string;
  created_at: string;
}

// Other
export interface AuditLog {
  id: string;
  action: string;
  user_name: string;
  description?: string;
  created_at: string;
}

export interface OfficeExpense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export interface CommercialOffer {
  id: string;
  client_id: string;
  items: any[];
  total_amount: number;
  created_at: string;
  clients?: Client;
}