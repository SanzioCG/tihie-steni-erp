// Mahsulot o'lchov birligi — bazadagi kanonik qiymatlar (products.unit CHECK)
export type ProductUnit = 'm2' | 'p.m' | 'pcs';

export const PRODUCT_UNITS: ProductUnit[] = ['m2', 'p.m', 'pcs'];

// Ko'rsatish uchun belgi. Birlik product.unit'dan olinadi — kategoriyadan
// TAXMIN qilinmaydi. Eski (unit yo'q) mahsulot uchun default 'm²'.
export function unitLabel(unit?: string | null, t?: (k: string) => string): string {
  switch (unit) {
    case 'm2':  return 'm²';
    case 'p.m': return t ? t('unit_meter') : 'm';
    case 'pcs': return t ? t('unit_pcs') : 'pcs';
    default:    return 'm²';
  }
}

// Kategoriya nomiga qarab aqlli default (faqat yangi mahsulot yaratishда
// tavsiya sifatida — foydalanuvchi o'zgartira oladi).
export function defaultUnitForCategory(categoryName?: string): ProductUnit {
  return categoryName?.toLowerCase().includes('tekstil') ? 'm2' : 'p.m';
}
