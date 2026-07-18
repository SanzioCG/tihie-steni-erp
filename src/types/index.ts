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
}

// Sales & CRM
export type ClientType = 'retail' | 'vip' | 'wholesale';
export type ClientKind = 'person' | 'company';

export interface Client {
  id: string;
  kind: ClientKind;
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
  // Rekvizitlar — faqat kind='company' uchun to'ldiriladi
  inn?: string;
  bank_name?: string;
  bank_account?: string;
  mfo?: string;
  legal_address?: string;
  director_name?: string;
  email?: string;
}

export interface Contact {
  id: string;
  client_id: string;
  full_name: string;
  position?: string;
  phone?: string;
  email?: string;
  telegram?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
}

export type InteractionType = 'call' | 'meeting' | 'message' | 'note' | 'visit';
export type InteractionDirection = 'incoming' | 'outgoing' | 'internal';
export type InteractionOutcome = 'answered' | 'no_answer' | 'callback' | 'deal' | 'rejected' | 'info';

export interface ClientInteraction {
  id: string;
  client_id: string;
  contact_id?: string;
  type: InteractionType;
  direction?: InteractionDirection;
  subject?: string;
  notes?: string;
  outcome?: InteractionOutcome;
  created_by?: string;
  created_at: string;
}

export interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'cancelled';
  completed_at?: string;
  created_by?: string;
  created_at: string;
  clients?: Client;
}

export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'returned' | 'partial_return';

export interface Sale {
  id: string;
  client_id?: string;
  product_id?: string;
  batch_id?: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_amount: number;
  status: SaleStatus;
  created_by?: string;
  created_at: string;
  clients?: Client;
  products?: Product;
}

// Deals — savdo voronkasi (Bitrix uslubi)
export type DealStage = 'new' | 'contacted' | 'offer_sent' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  client_id?: string;
  contact_id?: string;      // Faza 1: kompaniya ichidagi odam (ixtiyoriy)
  title: string;
  stage: DealStage;
  expected_amount: number;
  probability: number;
  expected_close_date?: string;
  offer_id?: string;
  sale_id?: string;
  owner_id?: string;
  lost_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  clients?: Client;
  contacts?: Contact;       // join uchun
}

// Deal items — bitim mahsulotlari (Faza 2)
export interface DealItem {
  id: string;
  deal_id: string;
  product_id?: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface DealDetail {
  items: (DealItem & { line_total: number; in_stock: number })[];
  revenue: number;
  est_cost: number;
  est_margin: number;
  est_margin_pct: number;
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