/**
 * PDF Generation Service
 * Creates professional estimate PDFs
 */

const PDFDocument = require('pdfkit');

class PDFService {
  
  /**
   * Generate estimate PDF
   */
  async generateEstimatePDF(estimate) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(24)
           .text('PROJECT ESTIMATE', { align: 'center' })
           .moveDown();

        // Project Title
        doc.fontSize(16)
           .text(estimate.project_title, { underline: true })
           .moveDown();

        // Date
        doc.fontSize(10)
           .text(`Date: ${new Date(estimate.created_at).toLocaleDateString()}`)
           .moveDown(2);

        // Line Items Table
        doc.fontSize(12)
           .text('LINE ITEMS', { underline: true })
           .moveDown();

        const lineItems = JSON.parse(estimate.line_items);
        
        // Table headers
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 250;
        const col3 = 350;
        const col4 = 420;
        const col5 = 490;

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Description', col1, tableTop)
           .text('Qty', col2, tableTop)
           .text('Unit', col3, tableTop)
           .text('Rate', col4, tableTop)
           .text('Total', col5, tableTop);

        doc.moveTo(col1, tableTop + 15)
           .lineTo(545, tableTop + 15)
           .stroke();

        let y = tableTop + 25;
        doc.font('Helvetica');

        lineItems.forEach(item => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          doc.fontSize(9)
             .text(item.description.substring(0, 40), col1, y, { width: 190 })
             .text(item.quantity.toString(), col2, y)
             .text(item.unit, col3, y)
             .text(`$${item.rate.toFixed(2)}`, col4, y)
             .text(`$${item.total.toFixed(2)}`, col5, y);

          if (item.notes) {
            y += 15;
            doc.fontSize(8)
               .fillColor('gray')
               .text(item.notes, col1, y, { width: 490 })
               .fillColor('black');
          }

          y += 25;
        });

        // Totals section
        y += 20;
        doc.moveTo(col1, y)
           .lineTo(545, y)
           .stroke();

        y += 15;
        doc.fontSize(10)
           .font('Helvetica')
           .text('Subtotal:', 400, y)
           .text(`$${estimate.subtotal.toFixed(2)}`, 490, y);

        y += 20;
        doc.text('Tax:', 400, y)
           .text(`$${estimate.tax.toFixed(2)}`, 490, y);

        y += 25;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('TOTAL:', 400, y)
           .text(`$${estimate.total.toFixed(2)}`, 490, y);

        // Footer
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('gray')
           .text(
             'This estimate is valid for 30 days. Actual costs may vary based on site conditions.',
             50,
             750,
             { width: 500, align: 'center' }
           );

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate invoice PDF (similar structure, different styling)
   */
  async generateInvoicePDF(estimate) {
    // Similar to estimate but with INVOICE header and payment terms
    // Implementation similar to above
    return this.generateEstimatePDF(estimate); // Placeholder
  }
}

module.exports = new PDFService();
