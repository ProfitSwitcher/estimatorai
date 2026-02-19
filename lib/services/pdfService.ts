// lib/services/pdfService.ts
import PDFDocument from 'pdfkit'

export async function generateEstimatePDF(estimate: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fontSize(24).text('Construction Estimate', { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).text(estimate.project_title, { align: 'center' })
    doc.moveDown(2)

    // Line items table
    doc.fontSize(12).text('Line Items', { underline: true })
    doc.moveDown()

    const lineItems = estimate.line_items // Assuming estimate.line_items is already an array of objects
      
    lineItems.forEach((item: any, idx: number) => {
      doc.fontSize(10)
        .text(`\${idx + 1}. \${item.description}`, { continued: true })
        .text(`$${item.total.toFixed(2)}`, { align: 'right' })
      doc.fontSize(8)
        .fillColor('gray')
        .text(`   \${item.quantity} \${item.unit} × $\${item.rate}`)
        .fillColor('black')
      doc.moveDown(0.5)
    })

    // Totals
    doc.moveDown()
    doc.fontSize(12)
      .text(`Subtotal: $${estimate.subtotal.toFixed(2)}`, { align: 'right' })
      .text(`Tax: $${estimate.tax.toFixed(2)}`, { align: 'right' })
      .fontSize(14)
      .text(`Total: $${estimate.total.toFixed(2)}`, { align: 'right' })

    doc.end()
  })
}
