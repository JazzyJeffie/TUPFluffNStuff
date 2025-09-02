const formatDate = isoDate => {
  if (!isoDate) return 'N/A';

  // Convert ISO string to Date object
  const date = new Date(isoDate);

  // Add 8 hours for Philippine Time
  const phtTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  // Extract month, day, year
  const month = String(phtTime.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(phtTime.getDate()).padStart(2, '0');
  const year = phtTime.getFullYear();

  return `${month}-${day}-${year}`;
};

export const generateSalesReportPDF = async (reportData, fromDate, toDate) => {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let currentY = 40;

  // --- Logo ---
  const imgEl = document.getElementById('logo');
  if (imgEl) {
    const scaleFactor = 4;
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.width * scaleFactor;
    canvas.height = imgEl.height * scaleFactor;
    const ctx = canvas.getContext('2d');
    ctx.scale(scaleFactor, scaleFactor);
    ctx.drawImage(imgEl, 0, 0, imgEl.width, imgEl.height);
    const imgData = canvas.toDataURL('image/png', 1.0);
    doc.addImage(imgData, 'PNG', margin, currentY, 80, 80);
  }

  // --- Header text ---
  const headerX = margin + 100;
  doc.setFont('times', 'bold').setFontSize(18);
  doc.text(
    "DA Constance Fluff 'N Stuff Pet Supplies Store",
    headerX,
    currentY + 25
  );

  doc.setFont('times', 'normal').setFontSize(12);
  doc.text('Pasig City, Metro Manila', headerX, currentY + 45);

  doc.setFont('times', 'bold').setFontSize(16);
  doc.text('SALES REPORT', pageWidth / 2, currentY + 95, { align: 'center' });

  // --- Period & Generated On ---
  doc.setFont('times', 'normal').setFontSize(11);
  doc.text(
    `Period: ${fromDate || 'N/A'} to ${toDate || 'N/A'}`,
    pageWidth / 2,
    currentY + 115,
    {
      align: 'center',
    }
  );
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    pageWidth / 2,
    currentY + 135,
    { align: 'center' }
  );

  // Push down
  currentY += 170;

  // --- Section title helper ---
  const sectionTitle = text => {
    doc.setFont('times', 'bold').setFontSize(14);
    doc.text(text, margin, currentY);
    currentY += 25;
    doc.setFont('times', 'normal').setFontSize(11);
  };

  // --- Table style helper ---
  const tableStyle = {
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 12,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      font: 'times',
      fontSize: 11,
      cellPadding: 6,
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { lineColor: [200, 200, 200], lineWidth: 0.3 },
  };

  // --- Sales Overview ---
  sectionTitle('Sales Overview');
  const overview = [
    ['Volume of Sales', reportData.volume || '0'],
    ['Gross Sales', reportData.grossSales || '0'],
    ['Net Profit', reportData.netProfit || '0'],
    ['Total Revenue', reportData.totalRevenue || '0'],
    [
      'Total VAT',
      reportData.totalVAT != null
        ? Number(reportData.totalVAT).toFixed(3)
        : '0.000',
    ],
    ['Total Discount', reportData.totalDiscount || '0'],
  ];
  doc.autoTable({
    startY: currentY,
    head: [['Metric', 'Value']],
    body: overview,
    ...tableStyle,
    columnStyles: {
      0: { halign: 'left', cellWidth: 200 },
      1: { halign: 'left' },
    },
  });

  // --- Top-Selling by SKU ---
  doc.addPage();
  currentY = 60;
  sectionTitle('Top-Selling Products (by SKU)');
  const topSKUData = (reportData.topSellingBySKU || []).map((item, index) => [
    index + 1,
    item.sku || 'N/A',
    item.name || 'N/A',
    item.quantity || 'N/A',
    item.netProfit || 'N/A',
  ]);
  doc.autoTable({
    startY: currentY,
    head: [['#', 'SKU', 'Product Name', 'Quantity Sold', 'Net Profit']],
    body: topSKUData.length ? topSKUData : [['-', 'N/A', 'N/A', 'N/A', 'N/A']],
    ...tableStyle,
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { halign: 'center', cellWidth: 100 },
      2: { halign: 'left', cellWidth: 260 },
      3: { halign: 'left', cellWidth: 100 },
      4: { halign: 'left', cellWidth: 120 },
    },
  });

  // --- Top-Selling by Category ---
  doc.addPage();
  currentY = 60;
  sectionTitle('Top-Selling Products (by Category)');
  const topCategoryData = (reportData.topSellingByCategory || []).map(
    (item, index) => [
      index + 1,
      item.category || 'N/A',
      item.quantity || 'N/A',
      item.netProfit || 'N/A',
    ]
  );
  doc.autoTable({
    startY: currentY,
    head: [['#', 'Category', 'Quantity Sold', 'Net Profit']],
    body: topCategoryData.length
      ? topCategoryData
      : [['-', 'N/A', 'N/A', 'N/A']],
    ...tableStyle,
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { halign: 'left', cellWidth: 200 },
      2: { halign: 'left', cellWidth: 120 },
      3: { halign: 'left', cellWidth: 120 },
    },
  });

  // --- Daily Breakdown ---
  doc.addPage();
  currentY = 60;
  sectionTitle('Daily Transaction (Summary)');
  const dailyData = (reportData.dailyBreakdown || []).map(d => {
    // Compute total quantity for this day
    const transactionDay = reportData.transactionBreakdown?.find(
      t => formatDate(t.date) === formatDate(d.date)
    );
    const totalQty = transactionDay
      ? transactionDay.transactions.reduce(
          (sum, tx) => sum + (tx.quantity || 0),
          0
        )
      : 0;

    return [
      formatDate(d.date) || 'N/A',
      d.transactions || 'N/A',
      d.grossSales || '0',
      d.totalRevenue || '0',
      d.totalVAT || '0',
      d.totalDiscount || 'N/A',
      totalQty, // ✅ Use computed quantity
    ];
  });

  doc.autoTable({
    startY: currentY,
    head: [
      [
        'Date',
        'Transactions',
        'Gross Sales',
        'Total Revenue',
        'VAT',
        'Discounts',
        'Quantity',
      ],
    ],
    body: dailyData.length
      ? dailyData
      : [['N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']],
    ...tableStyle,
    styles: { ...tableStyle.styles, overflow: 'linebreak' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 80 },
      1: { halign: 'center', cellWidth: 100 },
      2: { halign: 'left', cellWidth: 100 },
      3: { halign: 'left', cellWidth: 100 },
      4: { halign: 'left', cellWidth: 100 },
      5: { halign: 'left', cellWidth: 100 },
      6: { halign: 'left', cellWidth: 80 },
    },
  });

  // --- Transaction Breakdown (Per Day) ---
  doc.addPage();
  currentY = 60;
  sectionTitle('Transaction Breakdown (Per Day)');

  (reportData.transactionBreakdown || []).forEach(day => {
    // Day header
    doc.setFont('times', 'bold').setFontSize(12);
    doc.text(`Date: ${formatDate(day.date)}`, margin, currentY);
    currentY += 20;
    doc.setFont('times', 'normal').setFontSize(11);

    // Prepare table data
    const transactionData = (day.transactions || []).map((tx, index) => [
      index + 1,
      tx.id || 'N/A',
      tx.grossAmount != null
        ? `${Number(tx.grossAmount).toLocaleString()}`
        : '0',
      tx.totalAmount != null
        ? `${Number(tx.totalAmount).toLocaleString()}`
        : '0',
      tx.vatAmount != null ? `${Number(tx.vatAmount).toLocaleString()}` : '0',
      tx.discount != null ? `${Number(tx.discount).toLocaleString()}` : '0',
      tx.quantity != null ? tx.quantity : 0,
    ]);

    doc.autoTable({
      startY: currentY,
      head: [
        [
          '#',
          'Transaction ID',
          'Gross Amount',
          'Total Amount',
          'VAT',
          'Discount',
          'Quantity',
        ],
      ],
      body: transactionData.length
        ? transactionData
        : [['-', 'N/A', '0', '0', '0', '0', '0']],
      ...tableStyle,
      styles: { ...tableStyle.styles, overflow: 'linebreak' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 40 },
        1: { halign: 'left', cellWidth: 150 },
        2: { halign: 'left', cellWidth: 100 },
        3: { halign: 'left', cellWidth: 100 },
        4: { halign: 'left', cellWidth: 80 },
        5: { halign: 'left', cellWidth: 80 },
        6: { halign: 'left', cellWidth: 60 },
      },
    });

    // Move Y position after table
    currentY = doc.lastAutoTable.finalY + 20;
  });

  // --- Footer with page numbers ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('times', 'italic').setFontSize(9).setTextColor(120);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, {
      align: 'right',
    });
  }

  // --- Save ---
  doc.save(`Sales_Report_${fromDate || 'N/A'}_to_${toDate || 'N/A'}.pdf`);
};
