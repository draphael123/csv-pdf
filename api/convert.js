const { parse } = require('csv-parse/sync');
const PDFDocument = require('pdfkit');
const Busboy = require('busboy');

// Parse formatting prompt to extract preferences
function parseFormatPrompt(prompt) {
  if (!prompt || !prompt.trim()) {
    return {
      orientation: 'portrait',
      layout: 'list',
      headerColor: '#ff6b6b',
      textColor: '#333333',
      fontSize: 11,
      titleSize: 24,
      useTable: false,
      colors: {
        primary: '#ff6b6b',
        secondary: '#feca57',
        accent: '#54a0ff'
      }
    };
  }

  const lowerPrompt = prompt.toLowerCase();
  const options = {
    orientation: 'portrait',
    layout: 'list',
    headerColor: '#ff6b6b',
    textColor: '#333333',
    fontSize: 11,
    titleSize: 24,
    useTable: false,
    colors: {
      primary: '#ff6b6b',
      secondary: '#feca57',
      accent: '#54a0ff'
    }
  };

  // Parse orientation
  if (lowerPrompt.includes('landscape') || lowerPrompt.includes('horizontal')) {
    options.orientation = 'landscape';
  }

  // Parse layout preference
  if (lowerPrompt.includes('table') || lowerPrompt.includes('tabular') || lowerPrompt.includes('grid')) {
    options.useTable = true;
    options.layout = 'table';
  }

  // Parse font size preferences
  if (lowerPrompt.includes('large') || lowerPrompt.includes('bigger') || lowerPrompt.includes('big')) {
    options.fontSize = 14;
    options.titleSize = 28;
  } else if (lowerPrompt.includes('small') || lowerPrompt.includes('smaller') || lowerPrompt.includes('tiny')) {
    options.fontSize = 9;
    options.titleSize = 20;
  } else if (lowerPrompt.match(/font\s*(size)?\s*(\d+)/i)) {
    const match = lowerPrompt.match(/font\s*(size)?\s*(\d+)/i);
    if (match) {
      const size = parseInt(match[2]);
      if (size >= 8 && size <= 20) {
        options.fontSize = size;
        options.titleSize = size * 2;
      }
    }
  }

  // Parse color preferences
  const colorMap = {
    'blue': '#54a0ff',
    'red': '#ff6b6b',
    'green': '#48dbfb',
    'yellow': '#feca57',
    'orange': '#ff9f43',
    'pink': '#ff9ff3',
    'purple': '#a55eea',
    'black': '#000000',
    'gray': '#666666',
    'grey': '#666666',
    'white': '#ffffff',
    'navy': '#2c3e50',
    'teal': '#1dd1a1'
  };

  for (const [colorName, colorHex] of Object.entries(colorMap)) {
    if (lowerPrompt.includes(colorName)) {
      if (lowerPrompt.includes('header') || lowerPrompt.includes('title')) {
        options.headerColor = colorHex;
        options.colors.primary = colorHex;
      } else if (lowerPrompt.includes('text') || lowerPrompt.includes('content')) {
        options.textColor = colorHex;
      } else {
        // Default to primary color if not specified
        options.colors.primary = colorHex;
        options.headerColor = colorHex;
      }
    }
  }

  // Parse specific color mentions (hex codes)
  const hexMatch = lowerPrompt.match(/#[0-9a-f]{6}/i);
  if (hexMatch) {
    options.colors.primary = hexMatch[0];
    options.headerColor = hexMatch[0];
  }

  return options;
}

// Generate table layout
function generateTableLayout(doc, records, headers, options) {
  const margin = 50;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const tableWidth = pageWidth - (margin * 2);
  const columnCount = headers.length;
  const columnWidth = tableWidth / columnCount;
  const rowHeight = options.fontSize + 10;
  let startY = doc.y;

  // Draw table header
  doc.font('Helvetica-Bold').fontSize(options.fontSize).fillColor('#ffffff');
  let currentX = margin;
  headers.forEach((header, index) => {
    doc.rect(currentX, startY, columnWidth, rowHeight).fillAndStroke(options.colors.primary, options.colors.primary);
    doc.text(header, currentX + 5, startY + 5, { width: columnWidth - 10, align: 'left' });
    currentX += columnWidth;
  });
  startY += rowHeight;

  // Draw table rows
  doc.font('Helvetica').fillColor(options.textColor);
  records.forEach((record, recordIndex) => {
    // Check if we need a new page
    if (startY + rowHeight > pageHeight - margin) {
      doc.addPage();
      startY = margin;
      
      // Redraw header on new page
      doc.font('Helvetica-Bold').fontSize(options.fontSize).fillColor('#ffffff');
      currentX = margin;
      headers.forEach((header) => {
        doc.rect(currentX, startY, columnWidth, rowHeight).fillAndStroke(options.colors.primary, options.colors.primary);
        doc.text(header, currentX + 5, startY + 5, { width: columnWidth - 10, align: 'left' });
        currentX += columnWidth;
      });
      startY += rowHeight;
      doc.font('Helvetica').fillColor(options.textColor);
    }

    // Alternate row colors for better readability
    const rowColor = recordIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
    currentX = margin;
    headers.forEach((header, index) => {
      const value = String(record[header] || '(empty)');
      doc.rect(currentX, startY, columnWidth, rowHeight).fillAndStroke(rowColor, '#e0e0e0');
      doc.fontSize(options.fontSize).text(value, currentX + 5, startY + 5, { width: columnWidth - 10, align: 'left' });
      currentX += columnWidth;
    });
    startY += rowHeight;
  });
}

// Generate list layout (original style with customizations)
function generateListLayout(doc, records, headers, options) {
  doc.font('Helvetica').fontSize(options.fontSize);
  
  records.forEach((record, recordIndex) => {
    // Check if we need a new page (leave space for at least 3 columns)
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    // Record header
    doc.fontSize(options.fontSize + 3)
       .font('Helvetica-Bold')
       .fillColor(options.headerColor);
    doc.text(`Record ${recordIndex + 1}`, { align: 'left' });
    doc.moveDown(0.5);
    
    // Draw a colorful line
    doc.strokeColor(options.colors.secondary)
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(doc.page.width - 50, doc.y)
       .stroke();
    doc.moveDown(0.8);

    // List each column on a separate line
    doc.fontSize(options.fontSize);
    headers.forEach((header, headerIndex) => {
      const value = String(record[header] || '(empty)');
      
      // Check if we need a new page before adding another line
      if (doc.y > doc.page.height - 50) {
        doc.addPage();
      }

      // Column name (bold) and value on the same line using continued
      doc.font('Helvetica-Bold').fillColor(options.colors.accent);
      doc.text(`${header}: `, { continued: true });
      
      // Column value (regular) - continues on same line
      doc.font('Helvetica').fillColor(options.textColor);
      doc.text(value, { continued: false });
      
      doc.moveDown(0.7);
    });

    // Add spacing between records
    if (recordIndex < records.length - 1) {
      doc.moveDown(1);
      doc.strokeColor('#e0e0e0')
         .lineWidth(0.5)
         .moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      doc.moveDown(1);
    }
  });
}

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const busboy = Busboy({ headers: req.headers });
    let csvContent = '';
    let formatPrompt = '';
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

      busboy.on('field', (name, value) => {
        if (name === 'formatPrompt') {
          formatPrompt = value;
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

    // Parse formatting prompt
    const formatOptions = parseFormatPrompt(formatPrompt);

    // Create PDF document with parsed orientation
    const doc = new PDFDocument({ 
      margin: 50,
      size: formatOptions.orientation === 'landscape' ? [792, 612] : [612, 792]
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');

    // Pipe PDF to response
    doc.pipe(res);

    // Add title with parsed options
    doc.fontSize(formatOptions.titleSize)
       .font('Helvetica-Bold')
       .fillColor(formatOptions.colors.primary)
       .text('CSV to PDF Conversion', { align: 'center' });
    doc.moveDown(1);

    // Process records based on layout preference
    if (formatOptions.useTable) {
      // Table layout
      generateTableLayout(doc, records, headers, formatOptions);
    } else {
      // List layout (original)
      generateListLayout(doc, records, headers, formatOptions);
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error converting CSV to PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to convert CSV to PDF: ' + error.message });
    }
  }
};
