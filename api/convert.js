const { parse } = require('csv-parse/sync');
const PDFDocument = require('pdfkit');
const Busboy = require('busboy');
const XLSX = require('xlsx');
const archiver = require('archiver');

// Parse formatting prompt to extract preferences
function parseFormatPrompt(prompt) {
  // Red theme default colors
  const defaultColors = {
    primary: '#ff4444',
    secondary: '#ff6666',
    accent: '#cc0000'
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
    options.boldHeaders = true;
  }

  // Parse margins
  const marginMatch = lowerPrompt.match(/(\d+)\s*px\s*margins?/i);
  if (marginMatch) {
    options.margin = parseInt(marginMatch[1]);
  } else if (lowerPrompt.includes('tight spacing') || lowerPrompt.includes('narrow margins')) {
    options.margin = 30;
  } else if (lowerPrompt.includes('wide margins') || lowerPrompt.includes('spacious')) {
    options.margin = 80;
  }

  // Parse header text
  const headerMatch = lowerPrompt.match(/header:\s*["']?([^"'\n]+)["']?/i);
  if (headerMatch) {
    options.customHeader = headerMatch[1].trim();
  }

  // Parse footer text
  const footerMatch = lowerPrompt.match(/footer:\s*["']?([^"'\n]+)["']?/i);
  if (footerMatch) {
    options.customFooter = footerMatch[1].trim();
  }

  // Parse page numbers
  if (lowerPrompt.includes('page numbers') || lowerPrompt.includes('add page numbers')) {
    options.showPageNumbers = true;
  }

  // Parse date in footer
  if (lowerPrompt.includes('show date') || lowerPrompt.includes('date in footer')) {
    options.showDate = true;
  }

  // Parse totals calculation
  if (lowerPrompt.includes('calculate totals') || lowerPrompt.includes('show totals') || 
      lowerPrompt.includes('add totals')) {
    options.calculateTotals = true;
  }

  // Parse averages calculation
  if (lowerPrompt.includes('calculate averages') || lowerPrompt.includes('show averages') || 
      lowerPrompt.includes('add averages')) {
    options.calculateAverages = true;
  }

  // Parse alternating rows
  if (lowerPrompt.includes('alternating rows') || lowerPrompt.includes('zebra stripes') ||
      lowerPrompt.includes('striped rows')) {
    options.alternatingRows = true;
  }

  // Parse border styles
  if (lowerPrompt.includes('no borders') || lowerPrompt.includes('borderless')) {
    options.borderStyle = 'none';
  } else if (lowerPrompt.includes('horizontal borders') || lowerPrompt.includes('horizontal only')) {
    options.borderStyle = 'horizontal';
  } else if (lowerPrompt.includes('vertical borders') || lowerPrompt.includes('vertical only')) {
    options.borderStyle = 'vertical';
  }

  // Parse column width
  if (lowerPrompt.includes('equal column width') || lowerPrompt.includes('equal width')) {
    options.columnWidth = 'equal';
  } else if (lowerPrompt.includes('auto-fit') || lowerPrompt.includes('auto fit')) {
    options.columnWidth = 'auto';
  }

  // Parse custom title
  const titleMatch = lowerPrompt.match(/custom title:\s*["']?([^"'\n]+)["']?/i) ||
                     lowerPrompt.match(/title:\s*["']?([^"'\n]+)["']?/i);
  if (titleMatch) {
    options.customTitle = titleMatch[1].trim();
  }

  // Parse metadata
  const metadataMatch = lowerPrompt.match(/metadata:\s*([^"\n]+)/i);
  if (metadataMatch) {
    const metadataStr = metadataMatch[1];
    const pairs = metadataStr.split(',').map(p => p.trim());
    options.metadata = {};
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        options.metadata[key] = value;
      }
    });
  }

  // Parse password protection
  if (lowerPrompt.includes('password protect') || lowerPrompt.includes('password protection')) {
    options.passwordProtect = true;
    const passwordMatch = lowerPrompt.match(/password:\s*["']?([^"'\n]+)["']?/i);
    if (passwordMatch) {
      options.password = passwordMatch[1].trim();
    }
  }

  // Parse highlight conditions
  const highlightMatch = lowerPrompt.match(/highlight\s+(?:values?|rows?)\s*(>|<|>=|<=|=)\s*(\d+)/i);
  if (highlightMatch) {
    options.highlightCondition = {
      operator: highlightMatch[1],
      value: parseFloat(highlightMatch[2]),
      color: '#ff6b6b'
    };
  }

  // Parse sort instructions
  const sortMatch = lowerPrompt.match(/sort\s+by\s+(["']?)(\w+)\1/i);
  if (sortMatch) {
    options.sortBy = sortMatch[2];
    if (lowerPrompt.includes('descending') || lowerPrompt.includes('desc')) {
      options.sortOrder = 'desc';
    } else {
      options.sortOrder = 'asc';
    }
  }

  return options;
}

// Generate one PDF per entry/row
async function generatePerEntryPDFs(records, headers, options, res, customFilename) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  res.setHeader('Content-Type', 'application/zip');
  const zipFilename = customFilename ? `${customFilename}.zip` : `pdfs_per_entry_${Date.now()}.zip`;
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
  
  archive.pipe(res);
  
  // Generate a PDF for each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    // Create a new PDF for this record
    const doc = new PDFDocument({
      margin: options.margin || 50,
      size: options.orientation === 'landscape' ? [792, 612] : [612, 792],
      info: {
        Title: options.advanced?.metadata?.title || `Entry ${i + 1}`,
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
    
    // Collect PDF data
    const pdfChunks = [];
    doc.on('data', chunk => pdfChunks.push(chunk));
    
    // Helper function to add headers/footers for this entry
    const addHeaderFooter = (pageNum, totalPages) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      
      if (options.advanced?.header) {
        doc.fontSize(10)
           .fillColor(options.textColor || '#4a5a65')
           .text(options.advanced.header, 50, 30, { width: pageWidth - 100, align: 'left' });
      }
      
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
    
    // Add title
    const title = options.advanced?.metadata?.title || `Entry ${i + 1}`;
    doc.fontSize(options.titleSize || 24)
       .font('Helvetica-Bold')
       .fillColor(options.colors?.primary || options.headerColor || '#ff4444')
       .text(title, { align: 'center' });
    doc.moveDown(1);
    
    // Generate content for this single record
    const singleRecordArray = [record];
    
    if (options.useTable) {
      generateTableLayout(doc, singleRecordArray, headers, options, addHeaderFooter);
    } else {
      generateListLayout(doc, singleRecordArray, headers, options, addHeaderFooter);
    }
    
    // Wait for PDF to finish and add to archive
    await new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(pdfChunks);
        
        // Generate filename for this entry
        let entryFilename = `entry_${i + 1}.pdf`;
        if (customFilename) {
          entryFilename = `${customFilename}_${i + 1}.pdf`;
        } else {
          // Try to use a meaningful field as filename (e.g., name, id, etc.)
          const nameFields = ['name', 'id', 'title', 'filename', 'document'];
          for (const field of nameFields) {
            if (record[field] && typeof record[field] === 'string') {
              const cleanName = record[field].replace(/[^a-z0-9]/gi, '_').substring(0, 50);
              entryFilename = `${cleanName}.pdf`;
              break;
            }
          }
        }
        
        archive.append(pdfBuffer, { name: entryFilename });
        resolve();
      });
      
      doc.end();
    });
  }
  
  // Finalize the ZIP archive
  archive.finalize();
}

// Helper function to add calculations (totals/averages)
function addCalculations(doc, headers, records, options, margin, startY) {
  if (!options.advanced?.calculations) return;
  
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(options.fontSize + 2).fillColor(options.colors.primary || '#ff4444');
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
            content: '',
            isBinary: false,
            buffer: null
          };
          
          // Check if it's an Excel file
          const isExcel = fileData.filename.toLowerCase().endsWith('.xlsx') || 
                         fileData.filename.toLowerCase().endsWith('.xls');
          
          if (isExcel) {
            // Handle Excel files as binary
            fileData.isBinary = true;
            const chunks = [];
            
            file.on('data', (data) => {
              chunks.push(data);
            });

            file.on('end', () => {
              fileData.buffer = Buffer.concat(chunks);
              if (fileData.buffer.length > 0) {
                csvFiles.push(fileData);
              }
            });
          } else {
            // Handle CSV/TSV files as text
            file.setEncoding('utf8');
            
            file.on('data', (data) => {
              fileData.content += data;
            });

            file.on('end', () => {
              if (fileData.content.trim().length > 0) {
                csvFiles.push(fileData);
              }
            });
          }
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
        } else if (name === 'downloadType') {
          formatPrompt = formatPrompt || {};
          if (typeof formatPrompt === 'object') {
            formatPrompt.downloadType = value;
          }
        } else if (name === 'customFilename') {
          formatPrompt = formatPrompt || {};
          if (typeof formatPrompt === 'object') {
            formatPrompt.customFilename = value;
          }
        } else if (name === 'options') {
          try {
            const parsed = JSON.parse(value);
            // Store the entire options object
            formatPrompt = parsed;
            console.log('Received JSON options:', Object.keys(parsed));
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
    
    const fileErrors = [];
    
    for (const fileData of csvFiles) {
      try {
        let records = [];
        
        if (fileData.isBinary) {
          // Parse Excel file
          const workbook = XLSX.read(fileData.buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with header row
          records = XLSX.utils.sheet_to_json(worksheet, {
            defval: '', // Default value for empty cells
            raw: false // Convert all values to strings
          });
        } else {
          // Parse CSV/TSV file
          records = parse(fileData.content, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          });
        }

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
        } else {
          fileErrors.push({ filename: fileData.filename, error: 'File is empty or has no valid data' });
        }
      } catch (parseError) {
        console.error(`Error parsing file ${fileData.filename}:`, parseError);
        fileErrors.push({ filename: fileData.filename, error: parseError.message || 'Failed to parse file' });
        // Continue with other files even if one fails
      }
    }
    
    // Store file errors for response
    if (fileErrors.length > 0 && allRecords.length === 0) {
      return res.status(400).json({ 
        error: 'All files failed to parse',
        fileErrors: fileErrors
      });
    }

    if (allRecords.length === 0) {
      return res.status(400).json({ error: 'All CSV files are empty or have no valid data' });
    }

    // Check if formatPrompt is JSON (new format) or string (old format)
    let options = {};
    let headers = Array.from(allHeadersSet); // Use union of all headers
    let promptText = '';
    let downloadType = 'combined';
    let customFilename = '';
    
    // Extract formatPrompt from options object if it exists
    if (typeof formatPrompt === 'object' && formatPrompt !== null) {
      // formatPrompt is the entire options object
      options = formatPrompt;
      promptText = options.formatPrompt || '';
      downloadType = options.downloadType || 'combined';
      customFilename = options.customFilename || '';
      
      // Use provided data if available (note: we already have allRecords from file parsing)
      // The filteredData from options would override, but we'll keep the parsed file data
      if (options.selectedColumns && Array.isArray(options.selectedColumns) && options.selectedColumns.length > 0) {
        // Only use selected columns that exist in the data
        headers = options.selectedColumns.filter(col => allHeadersSet.has(col));
        if (headers.length === 0) {
          headers = Array.from(allHeadersSet);
        }
      }
    } else if (typeof formatPrompt === 'string' && formatPrompt.startsWith('{')) {
      try {
        options = JSON.parse(formatPrompt);
        promptText = options.formatPrompt || '';
        downloadType = options.downloadType || 'combined';
        customFilename = options.customFilename || '';
        // Use provided data if available (note: we already have allRecords from file parsing)
        if (options.selectedColumns && Array.isArray(options.selectedColumns) && options.selectedColumns.length > 0) {
          // Only use selected columns that exist in the data
          headers = options.selectedColumns.filter(col => allHeadersSet.has(col));
          if (headers.length === 0) {
            headers = Array.from(allHeadersSet);
          }
        }
      } catch (e) {
        // Fall back to text parsing
        promptText = formatPrompt;
      }
    } else {
      // formatPrompt is a plain string
      promptText = formatPrompt || '';
    }
    
    // Parse the prompt text to extract formatting options
    const parsedPromptOptions = parseFormatPrompt(promptText);
    
    // Merge parsed prompt options with UI options
    // Start with UI options, then apply prompt options (prompt takes precedence when provided)
    const finalOptions = {
      ...options, // Start with UI options as base
      // Merge colors properly
      colors: {
        ...parsedPromptOptions.colors,
        ...(options.colors || {})
      },
      // Merge advanced options - start with UI advanced, then add prompt options
      advanced: {
        ...(options.advanced || {}),
        // Prompt options can add to advanced settings
      }
    };
    
    // Apply prompt-specific options (these should override UI if prompt was provided)
    if (promptText.trim()) {
      // Prompt was provided, so use parsed prompt options to override UI options
      if (parsedPromptOptions.layout) {
        finalOptions.layout = parsedPromptOptions.layout;
        finalOptions.useTable = parsedPromptOptions.layout === 'table';
      }
      if (parsedPromptOptions.orientation) finalOptions.orientation = parsedPromptOptions.orientation;
      if (parsedPromptOptions.fontSize) {
        finalOptions.fontSize = parsedPromptOptions.fontSize;
        finalOptions.titleSize = Math.max(parsedPromptOptions.fontSize * 2, 20);
      }
      if (parsedPromptOptions.headerColor) {
        finalOptions.headerColor = parsedPromptOptions.headerColor;
        finalOptions.colors.primary = parsedPromptOptions.headerColor;
      }
      if (parsedPromptOptions.textColor) finalOptions.textColor = parsedPromptOptions.textColor;
      if (parsedPromptOptions.margin) finalOptions.margin = parsedPromptOptions.margin;
      if (parsedPromptOptions.showPageNumbers !== undefined) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        finalOptions.advanced.showPageNumbers = parsedPromptOptions.showPageNumbers;
      }
      if (parsedPromptOptions.showDate !== undefined) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        finalOptions.advanced.showDate = parsedPromptOptions.showDate;
      }
      if (parsedPromptOptions.customHeader) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        finalOptions.advanced.header = parsedPromptOptions.customHeader;
      }
      if (parsedPromptOptions.customFooter) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        finalOptions.advanced.footer = parsedPromptOptions.customFooter;
      }
      if (parsedPromptOptions.calculateTotals !== undefined) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        if (!finalOptions.advanced.calculations) finalOptions.advanced.calculations = {};
        finalOptions.advanced.calculations.totals = parsedPromptOptions.calculateTotals;
      }
      if (parsedPromptOptions.calculateAverages !== undefined) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        if (!finalOptions.advanced.calculations) finalOptions.advanced.calculations = {};
        finalOptions.advanced.calculations.averages = parsedPromptOptions.calculateAverages;
      }
      if (parsedPromptOptions.alternatingRows !== undefined) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        if (!finalOptions.advanced.table) finalOptions.advanced.table = {};
        finalOptions.advanced.table.alternatingRows = parsedPromptOptions.alternatingRows;
      }
      if (parsedPromptOptions.borderStyle) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        if (!finalOptions.advanced.table) finalOptions.advanced.table = {};
        finalOptions.advanced.table.borderStyle = parsedPromptOptions.borderStyle;
      }
      if (parsedPromptOptions.customTitle) {
        if (!finalOptions.advanced) finalOptions.advanced = {};
        if (!finalOptions.advanced.metadata) finalOptions.advanced.metadata = {};
        finalOptions.advanced.metadata.title = parsedPromptOptions.customTitle;
      }
    }
    
    // Use UI options as fallback if prompt wasn't provided
    if (!promptText.trim()) {
      if (options.layout) finalOptions.layout = options.layout;
      if (options.orientation) finalOptions.orientation = options.orientation;
      if (options.fontSize) finalOptions.fontSize = parseInt(options.fontSize) || options.fontSize;
      if (options.headerColor) finalOptions.headerColor = options.headerColor;
      if (options.textColor) finalOptions.textColor = options.textColor;
    }
    
    // Set useTable based on layout
    if (finalOptions.layout) {
      finalOptions.useTable = finalOptions.layout === 'table';
    }
    
    // Ensure fontSize and titleSize are numbers
    if (finalOptions.fontSize) {
      finalOptions.fontSize = parseInt(finalOptions.fontSize) || finalOptions.fontSize;
      finalOptions.titleSize = Math.max(finalOptions.fontSize * 2, 20);
    }
    
    // Update colors from headerColor
    if (finalOptions.headerColor) {
      finalOptions.colors = finalOptions.colors || {};
      finalOptions.colors.primary = finalOptions.headerColor;
    }
    
    options = finalOptions;
    
    // Debug: Log parsed options
    console.log('Final format options:', JSON.stringify(options, null, 2));
    console.log('Download type:', downloadType);
    console.log('Prompt text received:', promptText);
    console.log('Parsed prompt options:', JSON.stringify(parsedPromptOptions, null, 2));

    // Handle per-entry PDF generation
    if (downloadType === 'perEntry') {
      return await generatePerEntryPDFs(allRecords, headers, options, res, customFilename);
    }

    // Create PDF document with parsed orientation
    const doc = new PDFDocument({ 
      margin: options.margin || 50,
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
    const filename = customFilename || 'converted.pdf';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

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
       .fillColor(options.colors?.primary || options.headerColor || '#ff4444')
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
           .fillColor(options.colors?.primary || options.headerColor || '#ff4444')
           .text(`File: ${fileName}`, { align: 'left' });
        doc.moveDown(0.8);
        
        // Draw separator line
        doc.strokeColor(options.colors?.secondary || options.colors?.primary || '#ff4444')
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
