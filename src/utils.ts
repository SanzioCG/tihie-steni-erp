import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function exportToPDF(title: string, headers: string[][], data: any[][]) {
  const doc = new jsPDF();
  doc.text(title, 14, 15);
  autoTable(doc, {
    head: headers,
    body: data,
    startY: 20,
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

export function calculateAverageCost(batches: { quantity: number; cost_price: number }[]) {
  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalQuantity === 0) return 0;
  const totalCost = batches.reduce((sum, b) => sum + b.quantity * b.cost_price, 0);
  return totalCost / totalQuantity;
}
