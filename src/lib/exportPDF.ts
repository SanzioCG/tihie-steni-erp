import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { robotoBase64 } from '../utils/font-base64'; // 🟢 Shrift faylini import qilamiz

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

export const generatePDF = async (title: string, headers: string[][], data: any[][], clientInfo?: any) => {
  // 1. PDF yaratish
  const doc = new jsPDF();

  // 2. Kirill shriftini ro'yxatdan o'tkazish (ENG MUHIM JOYI)
  try {
    doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto'); // Standart shriftni Roboto qildik
  } catch (e) {
    console.error("Shrift yuklashda xato, standart shrift ishlatiladi.");
  }

  try {
    // Header (Qora fon)
    doc.setFillColor(12, 12, 14);
    doc.rect(0, 0, 210, 50, 'F');

    // Brend Nomi
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('Roboto', 'normal'); // Shriftni ishlatamiz
    doc.text("TIHIE STENI", 45, 25); 
    
    doc.setTextColor(52, 211, 153);
    doc.setFontSize(8);
    doc.text("HOLDING ERP SYSTEM - UZBEKISTAN", 45, 33);

    // Mijoz va Sana
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.text(`Sana: ${new Date().toLocaleString()}`, 150, 25);
    if (clientInfo) {
      doc.text(`Mijoz: ${clientInfo.name}`, 150, 32);
      doc.text(`Tel: ${clientInfo.phone || '—'}`, 150, 38);
    }

    // Jadval sarlavhasi
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(title.toUpperCase(), 15, 65);

    // 3. JADVAL (AUTO-TABLE)
    autoTable(doc, {
      startY: 72,
      head: headers,
      body: data,
      theme: 'grid',
      headStyles: { 
        fillColor: [52, 211, 153], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        font: 'Roboto' // Jadval tepasi uchun
      },
      styles: { 
        fontSize: 10, 
        cellPadding: 4,
        font: 'Roboto', // 🟢 Jadval ichidagi kirill harflari uchun
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 }
    });

    if (clientInfo?.total) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text(`JAMI: ${clientInfo.total}`, 195, finalY, { align: 'right' });
    }

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error("PDF yaratishda xato:", error);
  }
};