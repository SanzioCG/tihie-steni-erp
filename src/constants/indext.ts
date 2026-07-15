import type { Role, SaleStatus, ClientType, ClientKind } from '../types';

// ============================================
// ROLES (foydalanuvchi rollari)
// ============================================

export const ROLES: Record<string, Role> = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  MANAGER: 'manager',
  WAREHOUSEMAN: 'warehouseman',
  SALESPERSON: 'salesperson',
};

// Admin huquqiga ega rollar
export const ADMIN_ROLES: Role[] = ['admin', 'director'];

// Sotuv qila oladigan rollar
export const SALES_ROLES: Role[] = ['admin', 'director', 'manager', 'salesperson'];

// Ombor bilan ishlay oladigan rollar
export const WAREHOUSE_ROLES: Role[] = ['admin', 'director', 'manager', 'warehouseman'];

// ============================================
// SALE STATUS
// ============================================

export const SALE_STATUS: Record<string, SaleStatus> = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// ============================================
// CLIENT TYPES
// ============================================

export const CLIENT_TYPES: Record<string, ClientType> = {
  RETAIL: 'retail',
  VIP: 'vip',
  WHOLESALE: 'wholesale',
};

// ============================================
// CLIENT KIND (kontragent turi)
// ============================================

export const CLIENT_KINDS: Record<string, ClientKind> = {
  PERSON: 'person',
  COMPANY: 'company',
};

// ============================================
// TRANSACTION CATEGORIES
// ============================================

export const TRANSACTION_CATEGORIES = {
  SALE: 'sale',
  DEBT_PAYMENT: 'debt_payment',
  RETURN: 'return',
  OFFICE_EXPENSE: 'office_expense',
  INBOUND: 'inbound',
} as const;

// ============================================
// LANGUAGES & CURRENCIES
// ============================================

export const LANGUAGES = ['uz', 'ru', 'en'] as const;
export const CURRENCIES = ['UZS', 'USD'] as const;

// ============================================
// PAGINATION
// ============================================

export const PAGINATION = {
  ITEMS_PER_PAGE: 20,
  AUDIT_ITEMS_PER_PAGE: 30,
} as const;

// ============================================
// VALIDATION LIMITS
// ============================================

export const LIMITS = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 1_000_000,
  MIN_QUANTITY: 0.01,
  MAX_QUANTITY: 100_000,
  DEFAULT_MIN_LIMIT: 5,
} as const;