import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export async function exportToPDF(
  title: string,
  headers: string[][],
  data: any[][],
  clientInfo?: { name?: string; phone?: string; total?: string }
) {
  // Lazy load — font va PDF kutubxonalari faqat eksport bosilganda yuklanadi
  const [{ robotoBase64 }, { default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('../utils/font-base64'),
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();

  try {
    doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
  } catch (e) {
    console.error("Shrift yuklashda xato.");
  }

  // Header
  doc.setFillColor(12, 12, 14);
  doc.rect(0, 0, 210, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('Roboto', 'normal');
  doc.text("TIHIE STENI", 45, 25);

  doc.setTextColor(52, 211, 153);
  doc.setFontSize(8);
  doc.text("HOLDING ERP SYSTEM - UZBEKISTAN", 45, 33);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.text(`Sana: ${new Date().toLocaleString()}`, 150, 25);

  if (clientInfo?.name) {
    doc.text(`Mijoz: ${clientInfo.name}`, 150, 32);
    doc.text(`Tel: ${clientInfo.phone || '—'}`, 150, 38);
  }

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), 15, 65);

  // Table
  autoTable(doc, {
    startY: 72,
    head: headers,
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: [52, 211, 153],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      font: 'Roboto'
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
      font: 'Roboto',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 }
  });

  // Total (agar clientInfo.total bo'lsa)
  if (clientInfo?.total) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`JAMI: ${clientInfo.total}`, 195, finalY, { align: 'right' });
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

export function calculateAverageCost(batches: { quantity: number; cost_price: number }[]) {
  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalQuantity === 0) return 0;
  const totalCost = batches.reduce((sum, b) => sum + b.quantity * b.cost_price, 0);
  return totalCost / totalQuantity;
}