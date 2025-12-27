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
    doc.fontSize(24).font('Helvetica-Bold').text('CSV to PDF Conversion', { align: 'center' });
    doc.moveDown(1);

    // Process each record and list each column on separate lines
    doc.font('Helvetica').fontSize(11);
    
    records.forEach((record, recordIndex) => {
      // Check if we need a new page (leave space for at least 3 columns)
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      // Record header
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#ff6b6b');
      doc.text(`Record ${recordIndex + 1}`, { align: 'left' });
      doc.moveDown(0.5);
      
      // Draw a colorful line
      doc.strokeColor('#feca57').lineWidth(2).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.8);

      // List each column on a separate line
      doc.fontSize(11);
      headers.forEach((header, headerIndex) => {
        const value = String(record[header] || '(empty)');
        
        // Check if we need a new page before adding another line
        if (doc.y > doc.page.height - 50) {
          doc.addPage();
        }

        // Column name (bold) and value on the same line using continued
        doc.font('Helvetica-Bold').fillColor('#54a0ff');
        doc.text(`${header}: `, { continued: true });
        
        // Column value (regular) - continues on same line
        doc.font('Helvetica').fillColor('#333333');
        doc.text(value, { continued: false });
        
        doc.moveDown(0.7);
      });

      // Add spacing between records
      if (recordIndex < records.length - 1) {
        doc.moveDown(1);
        doc.strokeColor('#e0e0e0').lineWidth(0.5).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(1);
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
