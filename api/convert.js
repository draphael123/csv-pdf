const { parse } = require('csv-parse/sync');
const PDFDocument = require('pdfkit');
const Busboy = require('busboy');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const busboy = Busboy({ headers: req.headers });
    let csvContent = '';
    let fileReceived = false;

    const parsePromise = new Promise((resolve, reject) => {
      busboy.on('file', (name, file, info) => {
        if (name === 'csvFile') {
          fileReceived = true;
          file.setEncoding('utf8');
          
          file.on('data', (data) => {
            csvContent += data;
          });

          file.on('end', () => {
            // File reading is complete
          });
        } else {
          file.resume(); // Drain the file stream
        }
      });

      busboy.on('finish', () => {
        resolve();
      });

      busboy.on('error', (err) => {
        reject(err);
      });

      req.pipe(busboy);
    });

    await parsePromise;

    if (!fileReceived || !csvContent) {
      return res.status(400).json({ error: 'No CSV file provided or file is empty' });
    }

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or has no valid data' });
    }

    // Get column headers
    const headers = Object.keys(records[0]);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('CSV to PDF Conversion', { align: 'center' });
    doc.moveDown();

    // Calculate column widths
    const pageWidth = doc.page.width - 100; // Margin on both sides
    const columnCount = headers.length;
    const columnWidth = Math.max(80, pageWidth / columnCount);

    // Add table headers
    doc.fontSize(12).font('Helvetica-Bold');
    let x = 50;
    headers.forEach(header => {
      const headerText = String(header).substring(0, 25);
      doc.text(headerText, x, doc.y, { width: columnWidth - 10, align: 'left' });
      x += columnWidth;
    });

    doc.moveDown();
    doc.moveDown(0.5);

    // Add separator line
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
    doc.moveDown(0.5);

    // Add table rows
    doc.font('Helvetica').fontSize(10);
    records.forEach((record, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        // Redraw headers on new page
        doc.fontSize(12).font('Helvetica-Bold');
        x = 50;
        headers.forEach(header => {
          const headerText = String(header).substring(0, 25);
          doc.text(headerText, x, doc.y, { width: columnWidth - 10, align: 'left' });
          x += columnWidth;
        });
        doc.moveDown();
        doc.moveDown(0.5);
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
      }

      x = 50;
      headers.forEach(header => {
        const value = String(record[header] || '').substring(0, 40);
        doc.text(value, x, doc.y, { width: columnWidth - 10, align: 'left' });
        x += columnWidth;
      });

      doc.moveDown();

      // Add separator line every 10 rows for better readability
      if ((index + 1) % 10 === 0 && index < records.length - 1) {
        doc.moveDown(0.3);
        doc.strokeColor('#eeeeee').lineWidth(0.5).moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
        doc.moveDown(0.5);
      }
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error converting CSV to PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to convert CSV to PDF: ' + error.message });
    }
  }
};
