import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Rasmni URL orqali yuklab olish yordamchisi
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

export const generatePDF = async (title: string, headers: string[][], data: any[][]) => {
  const doc = new jsPDF();

  try {
    // 1. Header (Qora fon)
    doc.setFillColor(12, 12, 14);
    doc.rect(0, 0, 210, 45, 'F');

    // 2. Logotipni Public papkadan olish
    try {
      const logoImg = await loadImage('/logo.png');
      doc.addImage(logoImg, 'PNG', 15, 10, 25, 25); // X:15, Y:10, W:25, H:25
    } catch (e) {
      console.error("Logotip yuklanmadi, vektorli shakl ishlatiladi.");
      // Agar rasm topilmasa, o'rniga yashil aylana chizadi
      doc.setDrawColor(52, 211, 153);
      doc.circle(27, 22, 12, 'S');
    }

    // 3. BREND NOMI (ТИХИЕ СТЕНЫ)
    // DIQQAT: Ruscha yozuv chiqishi uchun shriftni 'helvetica' emas 'courier' yoki 
    // maxsus yuklangan shrift qilish kerak.
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("courier", "bold"); // 'courier' ba'zan rus tilini taniy oladi
    doc.text("TIHIE STENI", 45, 22); 
    
    // Pastki kichik yozuv
    doc.setTextColor(52, 211, 153);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("HOLDING ERP SYSTEM - UZBEKISTAN", 45, 30);

    // 4. SANA
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text(`Sana: ${new Date().toLocaleString()}`, 145, 30);

    // 5. HISOBOT NOMI (Jadval tepasida)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 15, 60);

    // 6. JADVAL (AutoTable)
    autoTable(doc, {
      startY: 65,
      head: headers,
      body: data,
      theme: 'grid',
      headStyles: { 
        fillColor: [52, 211, 153], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        font: "courier" // Jadval ichidagi ruscha matnlar uchun
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 }
    });

    // 7. FOOTER
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Sahifa ${i} / ${pageCount}`, 105, 285, { align: 'center' });
      doc.text("© 2024 Silent Walls ERP. Barcha huquqlar himoyalangan.", 15, 285);
    }

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error("PDF yaratishda xato:", error);
  }
};