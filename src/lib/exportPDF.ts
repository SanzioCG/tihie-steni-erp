export async function exportToPDF(title: string, headers: string[][], data: any[][]) {
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

  doc.setFontSize(16);
  doc.text(title, 14, 15);

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 20,
    theme: 'grid',
    headStyles: { 
      fillColor: [52, 211, 153], 
      textColor: [0, 0, 0], 
      fontStyle: 'bold',
      font: 'Roboto'
    },
    styles: { 
      fontSize: 10, 
      cellPadding: 3,
      font: 'Roboto',
    },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}