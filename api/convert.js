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

// Helper function to add calculations (totals/averages)
function addCalculations(doc, headers, records, options, margin, startY) {
  if (!options.advanced?.calculations) return;
  
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(options.fontSize + 2).fillColor(options.colors.primary || '#667eea');
  doc.text('Summary', margin, startY);
  doc.moveDown(0.5);
  
  headers.forEach(header => {
    const values = records.map(r => parseFloat(r[header])).filter(v => !isNaN(v));
    if (values.length > 0) {
      if (options.advanced.calculations.totals) {
        const total = values.reduce((a, b) => a + b, 0);
        doc.font('Helvetica-Bold').fontSize(options.fontSize).fillColor(options.colors.accent || options.colors.primary);
        doc.text(`${header} Total: `, { continued: true });
        doc.font('Helvetica').fillColor(options.textColor);
        doc.text(total.toFixed(2), { continued: false });
        doc.moveDown(0.3);
      }
      if (options.advanced.calculations.averages) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        doc.font('Helvetica-Bold').fontSize(options.fontSize).fillColor(options.colors.accent || options.colors.primary);
        doc.text(`${header} Average: `, { continued: true });
        doc.font('Helvetica').fillColor(options.textColor);
        doc.text(avg.toFixed(2), { continued: false });
        doc.moveDown(0.3);
      }
    }
  });
}

// Generate table layout
function generateTableLayout(doc, records, headers, options, addHeaderFooter) {
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
    // Check for page breaks
    const pageBreakMode = options.advanced?.pageBreak?.mode || 'auto';
    const pageBreakRows = options.advanced?.pageBreak?.rows || 50;
    
    let needsNewPage = false;
    if (pageBreakMode === 'every' && recordIndex > 0 && recordIndex % pageBreakRows === 0) {
      needsNewPage = true;
    } else if (startY + rowHeight > pageHeight - margin - 50) {
      needsNewPage = true;
    }
    
    if (needsNewPage) {
      // Add totals/averages before new page if needed
      if (options.advanced?.calculations && recordIndex > 0) {
        addCalculations(doc, headers, records.slice(0, recordIndex), options, margin, startY);
        startY = doc.y + 10;
      }
      
      doc.addPage();
      if (addHeaderFooter) {
        const totalPages = Math.ceil(records.length / (pageBreakMode === 'every' ? pageBreakRows : 100));
        addHeaderFooter(Math.floor(recordIndex / pageBreakRows) + 1, totalPages);
      }
      startY = margin + 30;
      
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
    let rowColor = '#ffffff';
    if (options.advanced?.table?.alternatingRows) {
      rowColor = recordIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
    }
    
    // Apply conditional formatting
    if (options.advanced?.conditionalFormatting) {
      options.advanced.conditionalFormatting.forEach(rule => {
        const cellValue = String(record[rule.column] || '');
        let matches = false;
        
        if (rule.condition === 'greater' && !isNaN(cellValue) && !isNaN(rule.value)) {
          matches = parseFloat(cellValue) > parseFloat(rule.value);
        } else if (rule.condition === 'less' && !isNaN(cellValue) && !isNaN(rule.value)) {
          matches = parseFloat(cellValue) < parseFloat(rule.value);
        } else if (rule.condition === 'equal') {
          matches = cellValue === rule.value;
        } else if (rule.condition === 'contains') {
          matches = cellValue.toLowerCase().includes(rule.value.toLowerCase());
        }
        
        if (matches) {
          rowColor = rule.color;
        }
      });
    }
    currentX = margin;
    headers.forEach((header, index) => {
      const value = String(record[header] || '(empty)');
      // Border style
      const borderStyle = options.advanced?.table?.borderStyle || 'all';
      const strokeColor = (borderStyle === 'all' || (borderStyle === 'horizontal' && index === 0)) ? '#e0e0e0' : 'transparent';
      doc.rect(currentX, startY, columnWidth, rowHeight).fillAndStroke(rowColor, strokeColor);
      
      // Check if value is a URL
      if (value.match(/^https?:\/\//i)) {
        doc.fontSize(options.fontSize)
           .fillColor('#0066cc')
           .text(value, currentX + 5, startY + 5, { 
             width: columnWidth - 10, 
             align: 'left',
             link: value,
             underline: true
           });
        doc.fillColor(options.textColor); // Reset color
      } else {
        doc.fontSize(options.fontSize).text(value, currentX + 5, startY + 5, { width: columnWidth - 10, align: 'left' });
      }
      currentX += columnWidth;
    });
    startY += rowHeight;
  });
  
  // Add final calculations if needed
  if (options.advanced?.calculations && records.length > 0) {
    const calcY = startY;
    addCalculations(doc, headers, records, options, margin, startY);
    // Add bookmark for summary
    doc.outline.addItem('Summary', { expanded: false, destination: [doc.page, 0, calcY] });
  }
}

// Generate list layout (original style with customizations)
function generateListLayout(doc, records, headers, options, addHeaderFooter) {
  doc.font('Helvetica').fontSize(options.fontSize);
  
  const pageBreakMode = options.advanced?.pageBreak?.mode || 'auto';
  const pageBreakRows = options.advanced?.pageBreak?.rows || 50;
  
  records.forEach((record, recordIndex) => {
    // Check for page breaks
    let needsNewPage = false;
    if (pageBreakMode === 'every' && recordIndex > 0 && recordIndex % pageBreakRows === 0) {
      needsNewPage = true;
    } else if (doc.y > doc.page.height - 150) {
      needsNewPage = true;
    }
    
    if (needsNewPage) {
      doc.addPage();
      if (addHeaderFooter) {
        const totalPages = Math.ceil(records.length / (pageBreakMode === 'every' ? pageBreakRows : 100));
        addHeaderFooter(Math.floor(recordIndex / pageBreakRows) + 1, totalPages);
      }
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
      
      // Check if value is a URL
      if (value.match(/^https?:\/\//i)) {
        doc.fillColor('#0066cc')
           .text(value, { continued: false, link: value, underline: true });
        doc.fillColor(options.textColor); // Reset color
      } else {
        doc.text(value, { continued: false });
      }
      
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
  
  // Add final calculations if needed
  if (options.advanced?.calculations && records.length > 0) {
    addCalculations(doc, headers, records, options, 50, doc.y);
  }
}

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const busboy = Busboy({ headers: req.headers });
    const csvFiles = []; // Array to store multiple files
    let formatPrompt = '';
    let fileCount = 1;

    const parsePromise = new Promise((resolve, reject) => {
      busboy.on('file', (name, file, info) => {
        // Handle multiple files (csvFile0, csvFile1, etc.) or single file (csvFile)
        if (name.startsWith('csvFile')) {
          const fileData = {
            filename: info.filename || `file_${csvFiles.length}`,
            content: ''
          };
          
          file.setEncoding('utf8');
          
          file.on('data', (data) => {
            fileData.content += data;
          });

          file.on('end', () => {
            if (fileData.content.trim().length > 0) {
              csvFiles.push(fileData);
            }
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
        } else if (name === 'fileCount') {
          fileCount = parseInt(value) || 1;
          console.log('File count:', fileCount);
        } else if (name === 'options') {
          try {
            formatPrompt = JSON.parse(value);
            console.log('Received JSON options');
          } catch (e) {
            console.log('Options not JSON, using as prompt');
            formatPrompt = value;
          }
        }
      });

      busboy.on('finish', () => {
        console.log('Busboy finished parsing. Files received:', csvFiles.length);
        resolve();
      });

      busboy.on('error', (err) => {
        console.error('Busboy error:', err);
        reject(err);
      });

      req.pipe(busboy);
    });

    await parsePromise;

    if (csvFiles.length === 0) {
      return res.status(400).json({ error: 'No CSV files provided or files are empty' });
    }

    // Debug: Log received prompt
    console.log('Received formatPrompt:', formatPrompt);
    console.log('FormatPrompt length:', formatPrompt ? formatPrompt.length : 0);
    console.log('Processing', csvFiles.length, 'file(s)');

    // Parse all CSV files
    const allRecords = [];
    const allFileNames = [];
    const allHeadersSet = new Set();
    
    for (const fileData of csvFiles) {
      try {
        const records = parse(fileData.content, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        if (records.length > 0) {
          // Collect all headers from all files
          records.forEach(record => {
            Object.keys(record).forEach(key => {
              if (key !== '__sourceFile') {
                allHeadersSet.add(key);
              }
            });
          });

          // Add file identifier to each record for tracking
          records.forEach(record => {
            record.__sourceFile = fileData.filename;
            // Ensure all records have all headers (fill missing with empty string)
            allHeadersSet.forEach(header => {
              if (!(header in record)) {
                record[header] = '';
              }
            });
          });
          allRecords.push(...records);
          allFileNames.push(fileData.filename);
        }
      } catch (parseError) {
        console.error(`Error parsing file ${fileData.filename}:`, parseError);
        // Continue with other files even if one fails
      }
    }

    if (allRecords.length === 0) {
      return res.status(400).json({ error: 'All CSV files are empty or have no valid data' });
    }

    // Check if formatPrompt is JSON (new format) or string (old format)
    let options = {};
    let headers = Array.from(allHeadersSet); // Use union of all headers
    
    if (typeof formatPrompt === 'string' && formatPrompt.startsWith('{')) {
      try {
        options = JSON.parse(formatPrompt);
        // Use provided data if available
        if (options.filteredData && Array.isArray(options.filteredData)) {
          records = options.filteredData;
        }
        if (options.selectedColumns && Array.isArray(options.selectedColumns) && options.selectedColumns.length > 0) {
          // Only use selected columns that exist in the data
          headers = options.selectedColumns.filter(col => allHeadersSet.has(col));
          if (headers.length === 0) {
            headers = Array.from(allHeadersSet);
          }
        }
      } catch (e) {
        // Fall back to text parsing
        options = parseFormatPrompt(formatPrompt);
      }
    } else {
      options = parseFormatPrompt(formatPrompt);
    }
    
    // Merge UI options with parsed options
    if (options.layout) {
      options.useTable = options.layout === 'table';
    }
    if (options.orientation) {
      options.orientation = options.orientation;
    }
    if (options.fontSize) {
      options.fontSize = parseInt(options.fontSize) || options.fontSize;
      options.titleSize = Math.max(options.fontSize * 2, 20);
    }
    if (options.headerColor) {
      options.colors = options.colors || {};
      options.colors.primary = options.headerColor;
    }
    if (options.textColor) {
      options.textColor = options.textColor;
    }
    
    // Debug: Log parsed options
    console.log('Final format options:', JSON.stringify(options, null, 2));

    // Create PDF document with parsed orientation
    const doc = new PDFDocument({ 
      margin: 50,
      size: options.orientation === 'landscape' ? [792, 612] : [612, 792],
      info: {
        Title: options.advanced?.metadata?.title || 'CSV to PDF Conversion',
        Author: options.advanced?.metadata?.author || '',
        Subject: options.advanced?.metadata?.subject || '',
        Keywords: options.advanced?.metadata?.keywords?.join(', ') || ''
      }
    });
    
    // Apply password protection if requested
    if (options.advanced?.password) {
      doc.encrypt({
        userPassword: options.advanced.password,
        ownerPassword: options.advanced.password,
        userPermissions: ['print', 'modify', 'copy', 'annotate']
      });
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');

    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to add headers/footers
    const addHeaderFooter = (pageNum, totalPages) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      
      // Header
      if (options.advanced?.header) {
        doc.fontSize(10)
           .fillColor(options.textColor || '#4a5a65')
           .text(options.advanced.header, 50, 30, { width: pageWidth - 100, align: 'left' });
      }
      
      // Footer
      let footerText = '';
      if (options.advanced?.footer) {
        footerText = options.advanced.footer;
      }
      if (options.advanced?.showDate) {
        footerText += (footerText ? ' | ' : '') + new Date().toLocaleDateString();
      }
      if (options.advanced?.showPageNumbers) {
        footerText += (footerText ? ' | ' : '') + `Page ${pageNum} of ${totalPages}`;
      }
      
      if (footerText) {
        doc.fontSize(9)
           .fillColor(options.textColor || '#4a5a65')
           .text(footerText, 50, pageHeight - 30, { width: pageWidth - 100, align: 'center' });
      }
    };

    // Add title with parsed options
    const title = options.advanced?.metadata?.title || 
                  (csvFiles.length === 1 ? 'CSV to PDF Conversion' : `Combined PDF (${csvFiles.length} files)`);
    doc.fontSize(options.titleSize || 24)
       .font('Helvetica-Bold')
       .fillColor(options.colors?.primary || options.headerColor || '#667eea')
       .text(title, { align: 'center' });
    doc.moveDown(0.5);
    
    // Add subtitle with file names if multiple files
    if (csvFiles.length > 1) {
      doc.fontSize(options.fontSize || 11)
         .font('Helvetica')
         .fillColor(options.textColor || '#4a5a65')
         .text(`Files: ${allFileNames.join(', ')}`, { align: 'center' });
      doc.moveDown(1);
    } else {
      doc.moveDown(1);
    }
    
    // Add bookmarks for navigation
    if (options.useTable) {
      doc.outline.addItem('Table View', { expanded: true });
    } else {
      doc.outline.addItem('List View', { expanded: true });
    }
    
    // Add bookmark for summary if calculations are enabled
    if (options.advanced?.calculations) {
      // Will be added after calculations are generated
    }

    // Group records by source file if multiple files
    if (csvFiles.length > 1) {
      const recordsByFile = {};
      allRecords.forEach(record => {
        const sourceFile = record.__sourceFile;
        if (!recordsByFile[sourceFile]) {
          recordsByFile[sourceFile] = [];
        }
        // Remove internal field and ensure all headers are present
        const cleanRecord = {};
        headers.forEach(header => {
          cleanRecord[header] = record[header] || '';
        });
        recordsByFile[sourceFile].push(cleanRecord);
      });

      // Process each file's records separately with section headers
      Object.entries(recordsByFile).forEach(([fileName, fileRecords], fileIndex) => {
        // Add section header for each file (except the first one)
        if (fileIndex > 0) {
          doc.addPage();
          if (addHeaderFooter) {
            addHeaderFooter(1, 1);
          }
        }

        // Add file section title
        doc.fontSize(options.titleSize - 4 || 20)
           .font('Helvetica-Bold')
           .fillColor(options.colors?.primary || options.headerColor || '#667eea')
           .text(`File: ${fileName}`, { align: 'left' });
        doc.moveDown(0.8);
        
        // Draw separator line
        doc.strokeColor(options.colors?.secondary || options.colors?.primary || '#667eea')
           .lineWidth(2)
           .moveTo(50, doc.y)
           .lineTo(doc.page.width - 50, doc.y)
           .stroke();
        doc.moveDown(1);

        // Process records based on layout preference
        if (options.useTable) {
          generateTableLayout(doc, fileRecords, headers, options, addHeaderFooter);
        } else {
          generateListLayout(doc, fileRecords, headers, options, addHeaderFooter);
        }
      });
    } else {
      // Single file - process normally (remove internal field)
      const cleanRecords = allRecords.map(record => {
        const clean = { ...record };
        delete clean.__sourceFile;
        return clean;
      });

      // Process records based on layout preference
      if (options.useTable) {
        generateTableLayout(doc, cleanRecords, headers, options, addHeaderFooter);
      } else {
        generateListLayout(doc, cleanRecords, headers, options, addHeaderFooter);
      }
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
