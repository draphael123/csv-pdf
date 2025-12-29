const { parse } = require('csv-parse/sync');
const PDFDocument = require('pdfkit');
const Busboy = require('busboy');

// Parse formatting prompt to extract preferences
function parseFormatPrompt(prompt) {
  // Calmer, zen default colors
  const defaultColors = {
    primary: '#7a9ba8',
    secondary: '#a8c4b8',
    accent: '#8fa8b5'
  };

  if (!prompt || !prompt.trim()) {
    return {
      orientation: 'portrait',
      layout: 'list',
      headerColor: defaultColors.primary,
      textColor: '#4a5a65',
      fontSize: 11,
      titleSize: 24,
      useTable: false,
      colors: defaultColors
    };
  }

  const lowerPrompt = prompt.toLowerCase();
  const options = {
    orientation: 'portrait',
    layout: 'list',
    headerColor: defaultColors.primary,
    textColor: '#4a5a65',
    fontSize: 11,
    titleSize: 24,
    useTable: false,
    colors: { ...defaultColors }
  };

  // Parse orientation - more variations
  if (lowerPrompt.includes('landscape') || lowerPrompt.includes('horizontal') || 
      lowerPrompt.includes('wide') || lowerPrompt.includes('sideways')) {
    options.orientation = 'landscape';
  } else if (lowerPrompt.includes('portrait') || lowerPrompt.includes('vertical') || 
             lowerPrompt.includes('tall')) {
    options.orientation = 'portrait';
  }

  // Parse layout preference - more variations
  if (lowerPrompt.includes('table') || lowerPrompt.includes('tabular') || 
      lowerPrompt.includes('grid') || lowerPrompt.includes('spreadsheet') ||
      lowerPrompt.includes('columns') || lowerPrompt.includes('rows')) {
    options.useTable = true;
    options.layout = 'table';
  } else if (lowerPrompt.includes('list') || lowerPrompt.includes('vertical') ||
             lowerPrompt.includes('stacked') || lowerPrompt.includes('one column')) {
    options.useTable = false;
    options.layout = 'list';
  }

  // Parse font size preferences - more variations
  if (lowerPrompt.includes('large') || lowerPrompt.includes('bigger') || 
      lowerPrompt.includes('big') || lowerPrompt.includes('increase') ||
      lowerPrompt.includes('larger') || lowerPrompt.includes('huge')) {
    options.fontSize = 14;
    options.titleSize = 28;
  } else if (lowerPrompt.includes('small') || lowerPrompt.includes('smaller') || 
             lowerPrompt.includes('tiny') || lowerPrompt.includes('compact') ||
             lowerPrompt.includes('reduce') || lowerPrompt.includes('decrease')) {
    options.fontSize = 9;
    options.titleSize = 20;
  } else if (lowerPrompt.includes('medium') || lowerPrompt.includes('normal') ||
             lowerPrompt.includes('standard')) {
    options.fontSize = 11;
    options.titleSize = 24;
  }
  
  // Parse numeric font sizes
  const fontSizeMatch = lowerPrompt.match(/font\s*(size)?\s*(?:of\s*)?(\d+)/i);
  if (fontSizeMatch) {
    const size = parseInt(fontSizeMatch[2]);
    if (size >= 8 && size <= 20) {
      options.fontSize = size;
      options.titleSize = Math.max(size * 2, 20);
    }
  }

  // Enhanced color parsing with more colors and variations
  const colorMap = {
    'blue': '#7a9ba8', 'light blue': '#a8c4d0', 'dark blue': '#5a7d8a',
    'red': '#c49a9a', 'light red': '#d4a5a5', 'dark red': '#b48a8a',
    'green': '#a8c4b8', 'light green': '#b8d4c8', 'dark green': '#8fa49a',
    'yellow': '#d4c4a5', 'light yellow': '#e4d4b5', 'dark yellow': '#c4b495',
    'orange': '#d4b4a5', 'light orange': '#e4c4b5', 'dark orange': '#c4a495',
    'pink': '#d4a5b5', 'light pink': '#e4b5c5', 'dark pink': '#c495a5',
    'purple': '#b4a5c4', 'light purple': '#c4b5d4', 'dark purple': '#a495b4',
    'black': '#2a3a45', 'dark': '#2a3a45',
    'gray': '#7a8a95', 'grey': '#7a8a95', 'light gray': '#9aabb5', 'light grey': '#9aabb5',
    'white': '#ffffff', 'light': '#ffffff',
    'navy': '#4a5a65', 'dark navy': '#3a4a55',
    'teal': '#7a9ba8', 'mint': '#a8c4b8', 'sage': '#8fa49a',
    'beige': '#d4c4b5', 'cream': '#f0e8d8', 'tan': '#c4b4a5',
    'brown': '#8a7a6a', 'light brown': '#a49a8a',
    'slate': '#6a7a85', 'charcoal': '#4a5a65'
  };

  // Parse colors with context
  // Sort by length (longest first) to match multi-word colors first
  const sortedColors = Object.entries(colorMap).sort((a, b) => b[0].length - a[0].length);
  
  let headerColorSet = false;
  let textColorSet = false;
  
  for (const [colorName, colorHex] of sortedColors) {
    // Simple includes check - works for both single and multi-word colors
    if (lowerPrompt.includes(colorName)) {
      // Check for specific context - prioritize explicit mentions
      if ((lowerPrompt.includes('header') || lowerPrompt.includes('title') || 
          lowerPrompt.includes('heading') || lowerPrompt.includes('head')) && !headerColorSet) {
        options.headerColor = colorHex;
        options.colors.primary = colorHex;
        options.colors.accent = colorHex;
        headerColorSet = true;
      } else if ((lowerPrompt.includes('text') || lowerPrompt.includes('content') ||
                 lowerPrompt.includes('body') || lowerPrompt.includes('paragraph')) && !textColorSet) {
        options.textColor = colorHex;
        textColorSet = true;
      } else if (lowerPrompt.includes('background') || lowerPrompt.includes('bg')) {
        // Background color (if we add this feature)
        options.colors.secondary = colorHex;
      } else if (!headerColorSet) {
        // Default to primary color if not specified and header not already set
        options.colors.primary = colorHex;
        options.headerColor = colorHex;
        // Also update accent if it's a general color mention
        if (!lowerPrompt.includes('accent')) {
          options.colors.accent = colorHex;
        }
      }
    }
  }

  // Parse specific color mentions (hex codes)
  const hexMatch = lowerPrompt.match(/#[0-9a-f]{6}/i);
  if (hexMatch) {
    options.colors.primary = hexMatch[0];
    options.headerColor = hexMatch[0];
  }

  // Parse style preferences
  if (lowerPrompt.includes('minimal') || lowerPrompt.includes('minimalist') ||
      lowerPrompt.includes('simple') || lowerPrompt.includes('clean')) {
    options.fontSize = Math.max(options.fontSize - 1, 9);
    options.colors.primary = '#6a7a85';
    options.textColor = '#4a5a65';
  }

  if (lowerPrompt.includes('bold') || lowerPrompt.includes('strong')) {
    // Could add bold font option
  }

  if (lowerPrompt.includes('spacing') || lowerPrompt.includes('space')) {
    // Could add spacing options
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

      busboy.on('field', (name, value, info) => {
        console.log('Received field:', name, 'Value:', value);
        if (name === 'formatPrompt') {
          formatPrompt = value;
          console.log('Set formatPrompt to:', formatPrompt);
        }
      });

      busboy.on('finish', () => {
        console.log('Busboy finished parsing. formatPrompt:', formatPrompt);
        resolve();
      });

      busboy.on('error', (err) => {
        console.error('Busboy error:', err);
        reject(err);
      });

      req.pipe(busboy);
    });

    await parsePromise;

    if (!fileReceived || !csvContent) {
      return res.status(400).json({ error: 'No CSV file provided or file is empty' });
    }

    // Debug: Log received prompt
    console.log('Received formatPrompt:', formatPrompt);
    console.log('FormatPrompt length:', formatPrompt ? formatPrompt.length : 0);

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
    
    // Debug: Log parsed options
    console.log('Parsed format options:', JSON.stringify(formatOptions, null, 2));

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
