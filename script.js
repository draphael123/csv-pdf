const uploadForm = document.getElementById('uploadForm');
const csvFileInput = document.getElementById('csvFile');
const formatPrompt = document.getElementById('formatPrompt');
const dropZone = document.getElementById('dropZone');
const fileName = document.getElementById('fileName');
const convertButton = document.getElementById('convertButton');
const buttonText = document.getElementById('buttonText');
const buttonLoader = document.getElementById('buttonLoader');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const downloadLink = document.getElementById('downloadLink');
const previewButton = document.getElementById('previewButton');
const previewBox = document.getElementById('previewBox');
const previewContent = document.getElementById('previewContent');
const visitorCount = document.getElementById('visitorCount');

// Daily visitor counter
function updateVisitorCounter() {
    const today = new Date().toDateString();
    const lastVisitDate = localStorage.getItem('lastVisitDate');
    let dailyCount = parseInt(localStorage.getItem('dailyVisitorCount') || '0');
    
    if (lastVisitDate !== today) {
        // New day, reset counter
        dailyCount = 1;
        localStorage.setItem('lastVisitDate', today);
    } else {
        // Same day, increment counter
        dailyCount++;
    }
    
    localStorage.setItem('dailyVisitorCount', dailyCount.toString());
    visitorCount.textContent = dailyCount;
}

// Initialize visitor counter on page load
updateVisitorCounter();

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Validate file
function validateFile(file) {
    const errors = [];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
        return { valid: false, errors };
    }
    
    if (file.size > WARN_FILE_SIZE) {
        errors.push(`Warning: File "${file.name}" is large (${(file.size / 1024 / 1024).toFixed(2)} MB). Processing may take longer.`);
    }
    
    // Check file extension
    const validExtensions = ['.csv', '.xlsx', '.xls', '.tsv'];
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!hasValidExtension) {
        errors.push(`File "${file.name}" has an unsupported extension. Supported: ${validExtensions.join(', ')}`);
        return { valid: false, errors };
    }
    
    return { valid: true, errors, warnings: errors };
}

// Handle file selection (multiple files) with validation
csvFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const validationResults = files.map(file => ({ file, ...validateFile(file) }));
    const invalidFiles = validationResults.filter(r => !r.valid);
    const validFiles = validationResults.filter(r => r.valid);
    const warnings = validationResults.filter(r => r.warnings && r.warnings.length > 0);
    
    // Show errors for invalid files
    if (invalidFiles.length > 0) {
        const errorMessages = invalidFiles.flatMap(r => r.errors);
        showError(errorMessages.join('\n'));
        
        // Remove invalid files from input
        const dataTransfer = new DataTransfer();
        validFiles.forEach(({ file }) => dataTransfer.items.add(file));
        csvFileInput.files = dataTransfer.files;
    }
    
    // Show warnings
    if (warnings.length > 0 && invalidFiles.length === 0) {
        const warningMessages = warnings.flatMap(r => r.warnings);
        // Show as info message (you might want to create a showWarning function)
        console.warn('File warnings:', warningMessages);
    }
    
    if (validFiles.length > 0) {
        const validFileObjects = validFiles.map(r => r.file);
        displayFileList(validFileObjects);
        
        // Load preview for first file
        if (validFileObjects.length > 0) {
            await loadCSVPreview(validFileObjects[0]);
        }
        
        hideMessages();
    }
});

// Display list of selected files with remove buttons and drag-and-drop
function displayFileList(files) {
    uploadedFiles = Array.from(files);
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    // Calculate total statistics
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalRows = Array.from(fileDataMap.values()).reduce((sum, data) => sum + (data.rows || 0), 0);
    
    // Show statistics
    const statsDiv = document.createElement('div');
    statsDiv.className = 'file-stats';
    statsDiv.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Files:</span>
            <span class="stat-value">${files.length}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Size:</span>
            <span class="stat-value">${(totalSize / 1024).toFixed(2)} KB</span>
        </div>
        ${totalRows > 0 ? `
        <div class="stat-item">
            <span class="stat-label">Total Rows:</span>
            <span class="stat-value">${totalRows.toLocaleString()}</span>
        </div>
        ` : ''}
    `;
    fileList.appendChild(statsDiv);
    
    if (files.length === 1) {
        fileName.textContent = `Selected: ${files[0].name}`;
        fileName.style.display = 'block';
        // Still show file list for single file to allow removal
        fileList.style.display = 'block';
        
        const fileItem = createFileItem(files[0], 0);
        fileList.appendChild(fileItem);
    } else {
        fileName.textContent = `Selected: ${files.length} files`;
        fileName.style.display = 'block';
        fileList.style.display = 'block';
        
        files.forEach((file, index) => {
            const fileItem = createFileItem(file, index);
            fileList.appendChild(fileItem);
        });
    }
    
    // Make file list sortable
    makeFileListSortable();
}

// Create a file item with remove button
function createFileItem(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.draggable = true;
    fileItem.dataset.index = index;
    
    const fileInfo = fileDataMap.get(file.name);
    const rowCount = fileInfo ? fileInfo.rows : '?';
    
    fileItem.innerHTML = `
        <span class="drag-handle">☰</span>
        <span class="file-item-name" title="${file.name}">${file.name}</span>
        <span class="file-item-info">
            <span class="file-item-size">${(file.size / 1024).toFixed(2)} KB</span>
            ${rowCount !== '?' ? `<span class="file-item-rows">${rowCount} rows</span>` : ''}
        </span>
        <button type="button" class="remove-file-btn" data-index="${index}" title="Remove file">×</button>
    `;
    
    // Add remove button event
    const removeBtn = fileItem.querySelector('.remove-file-btn');
    removeBtn.addEventListener('click', () => removeFile(index));
    
    // Add drag events
    fileItem.addEventListener('dragstart', handleDragStart);
    fileItem.addEventListener('dragover', handleDragOver);
    fileItem.addEventListener('drop', handleDrop);
    fileItem.addEventListener('dragend', handleDragEnd);
    
    return fileItem;
}

// Remove file from list
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    
    // Update file input
    const dataTransfer = new DataTransfer();
    uploadedFiles.forEach(file => dataTransfer.items.add(file));
    csvFileInput.files = dataTransfer.files;
    
    // Update display
    displayFileList(uploadedFiles);
    
    // Clear preview if removed file was being previewed
    if (csvData && fileDataMap.size === 0) {
        csvData = null;
        csvHeaders = [];
        filteredData = null;
        renderCSVPreview();
    }
}

// Drag and drop for file reordering
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(this.parentElement, e.clientY);
    const dragging = document.querySelector('.dragging');
    
    if (afterElement == null) {
        this.parentElement.appendChild(dragging);
    } else {
        this.parentElement.insertBefore(dragging, afterElement);
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Reorder files based on new DOM order
    const fileItems = Array.from(document.querySelectorAll('.file-item:not(.file-stats)'));
    const newOrder = fileItems.map(item => {
        const index = parseInt(item.dataset.index);
        return uploadedFiles[index];
    }).filter(Boolean);
    
    if (newOrder.length === uploadedFiles.length) {
        uploadedFiles = newOrder;
        const dataTransfer = new DataTransfer();
        uploadedFiles.forEach(file => dataTransfer.items.add(file));
        csvFileInput.files = dataTransfer.files;
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging):not(.file-stats)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function makeFileListSortable() {
    // Already handled by drag events above
}

// Drag and drop functionality
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.name.endsWith('.csv') || 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls') || 
        file.name.endsWith('.tsv') ||
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel' ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    
    if (files.length > 0) {
        // Validate files
        const validationResults = files.map(file => ({ file, ...validateFile(file) }));
        const invalidFiles = validationResults.filter(r => !r.valid);
        const validFiles = validationResults.filter(r => r.valid);
        
        if (invalidFiles.length > 0) {
            const errorMessages = invalidFiles.flatMap(r => r.errors);
            showError(errorMessages.join('\n'));
        }
        
        if (validFiles.length > 0) {
            // Create a new FileList-like object
            const dataTransfer = new DataTransfer();
            validFiles.forEach(({ file }) => dataTransfer.items.add(file));
            csvFileInput.files = dataTransfer.files;
            
            const validFileObjects = validFiles.map(r => r.file);
            displayFileList(validFileObjects);
            
            // Load preview for first file
            if (validFileObjects.length > 0) {
                await loadCSVPreview(validFileObjects[0]);
            }
            
            hideMessages();
        }
    } else {
        showError('Please upload valid CSV/Excel files.');
    }
});

function setLoadingState(loading) {
    convertButton.disabled = loading;
    buttonText.style.display = loading ? 'none' : 'inline';
    buttonLoader.style.display = loading ? 'inline-block' : 'none';
}

function showSuccess(pdfUrl) {
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Store PDF URL for preview
    if (pdfUrl) {
        window.lastPdfUrl = pdfUrl;
    }
}

// PDF Preview functionality
const previewPdfBtn = document.getElementById('previewPdfBtn');
const pdfPreviewContainer = document.getElementById('pdfPreviewContainer');
const pdfPreviewFrame = document.getElementById('pdfPreviewFrame');

if (previewPdfBtn) {
    previewPdfBtn.addEventListener('click', () => {
        if (window.lastPdfUrl) {
            pdfPreviewFrame.src = window.lastPdfUrl;
            pdfPreviewContainer.style.display = pdfPreviewContainer.style.display === 'none' ? 'block' : 'none';
            previewPdfBtn.textContent = pdfPreviewContainer.style.display === 'none' ? 'Preview PDF' : 'Hide Preview';
        }
    });
}

// Example prompt buttons
document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        formatPrompt.value = btn.dataset.prompt;
        showPreview();
    });
});

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

function resetForm() {
    csvFileInput.value = '';
    formatPrompt.value = '';
    fileName.textContent = '';
    fileName.style.display = 'none';
    previewBox.style.display = 'none';
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('fileList').style.display = 'none';
}

// Parse formatting prompt (client-side version matching server logic)
function parseFormatPrompt(prompt) {
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

    // Parse orientation
    if (lowerPrompt.includes('landscape') || lowerPrompt.includes('horizontal') || 
        lowerPrompt.includes('wide') || lowerPrompt.includes('sideways')) {
        options.orientation = 'landscape';
    } else if (lowerPrompt.includes('portrait') || lowerPrompt.includes('vertical') || 
               lowerPrompt.includes('tall')) {
        options.orientation = 'portrait';
    }

    // Parse layout preference
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

    // Parse font size preferences
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

    // Enhanced color parsing
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

    for (const [colorName, colorHex] of Object.entries(colorMap)) {
        if (lowerPrompt.includes(colorName)) {
            if (lowerPrompt.includes('header') || lowerPrompt.includes('title') || 
                lowerPrompt.includes('heading')) {
                options.headerColor = colorHex;
                options.colors.primary = colorHex;
            } else if (lowerPrompt.includes('text') || lowerPrompt.includes('content') ||
                       lowerPrompt.includes('body') || lowerPrompt.includes('paragraph')) {
                options.textColor = colorHex;
            } else {
                options.colors.primary = colorHex;
                options.headerColor = colorHex;
            }
        }
    }

    // Parse hex codes
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

    return options;
}

// Show preview of formatting options
function showPreview() {
    const prompt = formatPrompt.value.trim();
    
    if (!prompt) {
        previewBox.style.display = 'none';
        // Reset preview box styles
        previewBox.style.borderColor = '#ff4444';
        previewBox.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(240, 147, 251, 0.1) 100%)';
        return;
    }

    const options = parseFormatPrompt(prompt);
    
    // Apply formatting styles to preview box dynamically
    previewBox.style.borderColor = options.headerColor || options.colors.primary;
    previewBox.style.background = `linear-gradient(135deg, ${hexToRgba(options.headerColor || options.colors.primary, 0.15)} 0%, ${hexToRgba(options.colors.secondary || options.colors.primary, 0.15)} 100%)`;
    previewBox.style.boxShadow = `0 4px 12px ${hexToRgba(options.headerColor || options.colors.primary, 0.2)}`;
    
    let html = '';
    
    // Visual preview sample
    html += `<div class="preview-sample" style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid ${options.headerColor || options.colors.primary};">
        <div style="font-size: ${Math.max(options.fontSize - 2, 10)}px; font-weight: bold; color: ${options.headerColor || options.colors.primary}; margin-bottom: 8px;">
            Sample ${options.useTable ? 'Table' : 'List'} Format
        </div>
        <div style="font-size: ${Math.max(options.fontSize - 4, 9)}px; color: ${options.textColor};">
            ${options.useTable 
                ? `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                    <div style="background: ${options.headerColor || options.colors.primary}; color: white; padding: 4px; text-align: center; font-weight: bold; font-size: ${Math.max(options.fontSize - 5, 8)}px;">Header</div>
                    <div style="background: ${options.headerColor || options.colors.primary}; color: white; padding: 4px; text-align: center; font-weight: bold; font-size: ${Math.max(options.fontSize - 5, 8)}px;">Header</div>
                    <div style="background: ${options.headerColor || options.colors.primary}; color: white; padding: 4px; text-align: center; font-weight: bold; font-size: ${Math.max(options.fontSize - 5, 8)}px;">Header</div>
                    <div style="background: #f8f9fa; padding: 4px; text-align: center; font-size: ${Math.max(options.fontSize - 5, 8)}px;">Data</div>
                    <div style="background: white; padding: 4px; text-align: center; font-size: ${Math.max(options.fontSize - 5, 8)}px;">Data</div>
                    <div style="background: #f8f9fa; padding: 4px; text-align: center; font-size: ${Math.max(options.fontSize - 5, 8)}px;">Data</div>
                  </div>`
                : `<div style="margin-bottom: 4px;"><span style="font-weight: bold; color: ${options.colors.accent || options.headerColor};">Field:</span> <span style="color: ${options.textColor};">Value</span></div>
                   <div style="margin-bottom: 4px;"><span style="font-weight: bold; color: ${options.colors.accent || options.headerColor};">Field:</span> <span style="color: ${options.textColor};">Value</span></div>`
            }
        </div>
    </div>`;
    
    html += `<div class="preview-item" style="border-left-color: ${options.headerColor || options.colors.primary};">
        <span class="preview-label">Layout:</span>
        <span class="preview-value" style="color: ${options.headerColor || options.colors.primary};">${options.useTable ? 'Table' : 'List'}</span>
    </div>`;
    
    html += `<div class="preview-item" style="border-left-color: ${options.headerColor || options.colors.primary};">
        <span class="preview-label">Orientation:</span>
        <span class="preview-value" style="color: ${options.headerColor || options.colors.primary};">${options.orientation.charAt(0).toUpperCase() + options.orientation.slice(1)}</span>
    </div>`;
    
    html += `<div class="preview-item" style="border-left-color: ${options.headerColor || options.colors.primary};">
        <span class="preview-label">Font Size:</span>
        <span class="preview-value" style="color: ${options.headerColor || options.colors.primary};">${options.fontSize}pt (body), ${options.titleSize}pt (title)</span>
    </div>`;
    
    html += `<div class="preview-item" style="border-left-color: ${options.headerColor || options.colors.primary};">
        <span class="preview-label">Header Color:</span>
        <span class="preview-value" style="color: ${options.headerColor}; font-weight: bold;">${options.headerColor}</span>
        <span style="display: inline-block; width: 20px; height: 20px; background: ${options.headerColor}; border-radius: 4px; margin-left: 8px; vertical-align: middle; border: 1px solid #ddd;"></span>
    </div>`;
    
    html += `<div class="preview-item" style="border-left-color: ${options.headerColor || options.colors.primary};">
        <span class="preview-label">Text Color:</span>
        <span class="preview-value" style="color: ${options.textColor}; font-weight: bold;">${options.textColor}</span>
        <span style="display: inline-block; width: 20px; height: 20px; background: ${options.textColor}; border-radius: 4px; margin-left: 8px; vertical-align: middle; border: 1px solid #ddd;"></span>
    </div>`;
    
    previewContent.innerHTML = html;
    previewBox.style.display = 'block';
    previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Helper function to convert hex to rgba
function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) {
        return `rgba(102, 126, 234, ${alpha})`;
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return `rgba(102, 126, 234, ${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Preview button click handler
previewButton.addEventListener('click', showPreview);

// Auto-preview on input (debounced) - real-time updates
let previewTimeout;
formatPrompt.addEventListener('input', () => {
    clearTimeout(previewTimeout);
    // Show preview with short delay for smooth real-time feedback
    previewTimeout = setTimeout(showPreview, 200);
});

// Show preview on focus
formatPrompt.addEventListener('focus', () => {
    if (formatPrompt.value.trim()) {
        showPreview();
    }
});

// ========== NEW FEATURES ==========

// Global state
let csvData = null;
let csvHeaders = [];
let filteredData = null;
let selectedColumns = [];
let uploadedFiles = []; // Store file objects for management
let fileDataMap = new Map(); // Map to store file data for preview
let settingsHistory = []; // For undo/redo
let currentHistoryIndex = -1;

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${targetTab}Tab`).classList.add('active');
    });
});

// Dark Mode
const darkModeToggle = document.getElementById('darkModeToggle');
const isDarkMode = localStorage.getItem('darkMode') === 'true';

if (isDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
}

darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
});

// CSV Preview and Parsing (for first file only)
csvFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        displayFileList(files);
        hideMessages();
        // Preview only the first file
        await loadCSVPreview(files[0]);
    }
});

async function loadCSVPreview(file, fileIndex = 0) {
    try {
        // Check if we already have this file's data
        if (fileDataMap.has(file.name)) {
            const cached = fileDataMap.get(file.name);
            csvData = cached.data;
            csvHeaders = cached.headers;
            filteredData = [...csvData];
            selectedColumns = [...csvHeaders];
            renderCSVPreview();
            setupColumnSelection();
            setupSorting();
            return;
        }
        
        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
        let text, rows;
        
        if (isExcel) {
            // For Excel files, we'll need to parse on the server or use a client-side library
            // For now, show a message that Excel preview requires conversion
            showError('Excel file preview is being processed. Full preview available after upload.');
            return;
        } else {
            text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                showError('File is empty');
                return;
            }

            // Parse CSV (simple parser)
            const delimiter = text.includes('\t') ? '\t' : ',';
            csvHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
            
            csvData = [];
            for (let i = 1; i < Math.min(lines.length, 101); i++) { // Limit to 100 rows for preview
                const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
                const row = {};
                csvHeaders.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });
                csvData.push(row);
            }
            
            rows = lines.length - 1; // Total rows (excluding header)
        }
        
        filteredData = [...csvData];
        selectedColumns = [...csvHeaders];
        
        // Store in map for later use
        fileDataMap.set(file.name, {
            data: csvData,
            headers: csvHeaders,
            rows: rows,
            file: file
        });
        
        // Update file preview selector
        updateFilePreviewSelector();
        
        renderCSVPreview();
        setupColumnSelection();
        setupSorting();
        addToHistory(file.name);
    } catch (error) {
        showError('Error reading file: ' + error.message);
    }
}

// Update file preview selector dropdown
function updateFilePreviewSelector() {
    const selector = document.getElementById('filePreviewSelector');
    const select = document.getElementById('previewFileSelect');
    
    if (uploadedFiles.length > 1) {
        selector.style.display = 'block';
        select.innerHTML = '<option value="">Select a file to preview</option>';
        
        uploadedFiles.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = file.name;
            if (index === 0) option.selected = true;
            select.appendChild(option);
        });
        
        select.addEventListener('change', async (e) => {
            const index = parseInt(e.target.value);
            if (index >= 0 && index < uploadedFiles.length) {
                await loadCSVPreview(uploadedFiles[index], index);
            }
        });
    } else {
        selector.style.display = 'none';
    }
}

function renderCSVPreview() {
    const preview = document.getElementById('csvPreview');
    const controls = document.getElementById('previewControls');
    
    if (!csvData || csvData.length === 0) {
        preview.innerHTML = '<p class="preview-placeholder">Upload a file to see preview</p>';
        controls.style.display = 'none';
        return;
    }
    
    controls.style.display = 'block';
    
    let html = '<table class="preview-table"><thead><tr>';
    selectedColumns.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    filteredData.slice(0, 50).forEach(row => {
        html += '<tr>';
        selectedColumns.forEach(header => {
            const value = row[header] || '';
            html += `<td>${value.substring(0, 50)}${value.length > 50 ? '...' : ''}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    if (filteredData.length > 50) {
        html += `<p style="text-align: center; padding: 10px; color: #666;">Showing first 50 of ${filteredData.length} rows</p>`;
    }
    
    preview.innerHTML = html;
}

// Column Selection
function setupColumnSelection() {
    const checkboxes = document.getElementById('columnCheckboxes');
    checkboxes.innerHTML = '';
    
    csvHeaders.forEach(header => {
        const div = document.createElement('div');
        div.className = 'column-checkbox';
        div.innerHTML = `
            <input type="checkbox" id="col-${header}" value="${header}" checked>
            <label for="col-${header}">${header}</label>
        `;
        checkboxes.appendChild(div);
        
        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!selectedColumns.includes(header)) {
                    selectedColumns.push(header);
                }
            } else {
                selectedColumns = selectedColumns.filter(col => col !== header);
            }
            renderCSVPreview();
        });
    });
}

// Sorting
function setupSorting() {
    const sortColumn = document.getElementById('sortColumn');
    const sortOrder = document.getElementById('sortOrder');
    
    sortColumn.innerHTML = '<option value="">None</option>';
    csvHeaders.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        sortColumn.appendChild(option);
    });
    
    sortColumn.addEventListener('change', applySorting);
    sortOrder.addEventListener('change', applySorting);
}

function applySorting() {
    const sortColumn = document.getElementById('sortColumn').value;
    const sortOrder = document.getElementById('sortOrder').value;
    
    if (!sortColumn || !csvData) return;
    
    filteredData = [...csvData].sort((a, b) => {
        const valA = a[sortColumn] || '';
        const valB = b[sortColumn] || '';
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        
        let comparison = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
            comparison = numA - numB;
        } else {
            comparison = valA.toString().localeCompare(valB.toString());
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    renderCSVPreview();
}

// Filtering
const filterInput = document.getElementById('filterInput');
filterInput.addEventListener('input', (e) => {
    const filter = e.target.value.toLowerCase();
    
    if (!filter) {
        filteredData = [...csvData];
    } else {
        filteredData = csvData.filter(row => {
            return Object.values(row).some(val => 
                val.toString().toLowerCase().includes(filter)
            );
        });
    }
    
    applySorting(); // Re-apply sorting after filtering
});

// Advanced Options Collection
function collectAdvancedOptions() {
    return {
        pageBreak: {
            mode: document.getElementById('pageBreakMode').value,
            rows: parseInt(document.getElementById('pageBreakRows').value) || 50
        },
        header: document.getElementById('headerText').value,
        footer: document.getElementById('footerText').value,
        showPageNumbers: document.getElementById('showPageNumbers').checked,
        showDate: document.getElementById('showDate').checked,
        metadata: {
            title: document.getElementById('pdfTitle').value,
            author: document.getElementById('pdfAuthor').value,
            subject: document.getElementById('pdfSubject').value,
            keywords: document.getElementById('pdfKeywords').value.split(',').map(k => k.trim())
        },
        password: document.getElementById('passwordProtect').checked 
            ? document.getElementById('pdfPassword').value 
            : null,
        table: {
            columnWidth: document.getElementById('columnWidthMode').value,
            alternatingRows: document.getElementById('alternatingRows').checked,
            borderStyle: document.getElementById('borderStyle').value
        },
        calculations: {
            totals: document.getElementById('calculateTotals').checked,
            averages: document.getElementById('calculateAverages').checked
        },
        split: {
            mode: document.getElementById('splitMode').value,
            value: parseInt(document.getElementById('splitValue').value) || 1000
        },
        conditionalFormatting: collectConditionalRules()
    };
}

// Conditional Formatting
function collectConditionalRules() {
    const rules = [];
    document.querySelectorAll('.rule-item').forEach(item => {
        const column = item.querySelector('.rule-column').value;
        const condition = item.querySelector('.rule-condition').value;
        const value = item.querySelector('.rule-value').value;
        const color = item.querySelector('.rule-color').value;
        
        if (column && value) {
            rules.push({ column, condition, value, color });
        }
    });
    return rules;
}

const enableConditionalFormat = document.getElementById('enableConditionalFormat');
const conditionalRules = document.getElementById('conditionalRules');
const addRuleBtn = document.getElementById('addRule');

enableConditionalFormat.addEventListener('change', (e) => {
    conditionalRules.style.display = e.target.checked ? 'block' : 'none';
    addRuleBtn.style.display = e.target.checked ? 'block' : 'none';
});

addRuleBtn.addEventListener('click', () => {
    const ruleItem = document.createElement('div');
    ruleItem.className = 'rule-item';
    
    const columnSelect = document.createElement('select');
    columnSelect.className = 'rule-column';
    columnSelect.innerHTML = '<option>Select Column</option>';
    csvHeaders.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        columnSelect.appendChild(option);
    });
    
    ruleItem.innerHTML = `
        ${columnSelect.outerHTML}
        <select class="rule-condition">
            <option value="greater">Greater Than</option>
            <option value="less">Less Than</option>
            <option value="equal">Equal To</option>
            <option value="contains">Contains</option>
        </select>
        <input type="text" class="rule-value" placeholder="Value">
        <input type="color" class="rule-color" value="#ff6b6b">
        <button type="button" class="remove-rule">Remove</button>
    `;
    
    ruleItem.querySelector('.remove-rule').addEventListener('click', () => {
        ruleItem.remove();
    });
    
    conditionalRules.appendChild(ruleItem);
});

// Page Break Controls
document.getElementById('pageBreakMode').addEventListener('change', (e) => {
    document.getElementById('pageBreakRows').style.display = 
        e.target.value === 'every' ? 'block' : 'none';
});

document.getElementById('passwordProtect').addEventListener('change', (e) => {
    document.getElementById('pdfPassword').style.display = 
        e.target.checked ? 'block' : 'none';
});

document.getElementById('splitMode').addEventListener('change', (e) => {
    document.getElementById('splitValue').style.display = 
        e.target.value !== 'none' ? 'block' : 'none';
});

// Templates
function saveTemplate() {
    const name = document.getElementById('templateName').value.trim();
    if (!name) {
        alert('Please enter a template name');
        return;
    }
    
    const template = {
        name,
        formatPrompt: formatPrompt.value,
        layout: document.getElementById('layoutType').value,
        orientation: document.getElementById('orientation').value,
        fontSize: document.getElementById('fontSize').value,
        headerColor: document.getElementById('headerColor').value,
        textColor: document.getElementById('textColor').value,
        advanced: collectAdvancedOptions()
    };
    
    const templates = JSON.parse(localStorage.getItem('templates') || '[]');
    templates.push(template);
    localStorage.setItem('templates', JSON.stringify(templates));
    
    document.getElementById('templateName').value = '';
    loadTemplates();
    alert('Template saved!');
}

function loadTemplates() {
    const templates = JSON.parse(localStorage.getItem('templates') || '[]');
    const container = document.getElementById('savedTemplates');
    
    container.innerHTML = '';
    templates.forEach((template, index) => {
        const div = document.createElement('div');
        div.className = 'template-item';
        div.innerHTML = `
            <h4>${template.name}</h4>
            <p>Layout: ${template.layout} | Orientation: ${template.orientation}</p>
        `;
        div.addEventListener('click', () => applyTemplate(template));
        container.appendChild(div);
    });
}

function applyTemplate(template) {
    formatPrompt.value = template.formatPrompt || '';
    document.getElementById('layoutType').value = template.layout || 'list';
    document.getElementById('orientation').value = template.orientation || 'portrait';
    document.getElementById('fontSize').value = template.fontSize || 11;
    document.getElementById('headerColor').value = template.headerColor || '#ff4444';
    document.getElementById('textColor').value = template.textColor || '#4a5a65';
    
    if (template.advanced) {
        // Apply advanced options
        if (template.advanced.header) document.getElementById('headerText').value = template.advanced.header;
        if (template.advanced.footer) document.getElementById('footerText').value = template.advanced.footer;
        // ... apply other advanced options
    }
    
    showPreview();
    alert('Template loaded!');
}

document.getElementById('saveTemplate').addEventListener('click', saveTemplate);
document.getElementById('loadTemplate').addEventListener('click', () => {
    loadTemplates();
    document.getElementById('templatesTab').classList.add('active');
    document.querySelector('[data-tab="templates"]').classList.add('active');
});

loadTemplates();

// Progress Bar
function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.display = 'block';
    progressFill.style.width = percent + '%';
    progressText.textContent = percent + '%';
}

// Conversion History
function addToHistory(fileName) {
    const history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
    history.unshift({
        fileName,
        date: new Date().toISOString(),
        timestamp: Date.now()
    });
    
    // Keep only last 10
    if (history.length > 10) history.pop();
    
    localStorage.setItem('conversionHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
    const container = document.getElementById('historyList');
    const historySection = document.getElementById('conversionHistory');
    
    if (history.length === 0) {
        historySection.style.display = 'none';
        return;
    }
    
    historySection.style.display = 'block';
    container.innerHTML = '';
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <span>${item.fileName}</span>
            <span style="color: #999; font-size: 0.85rem;">${new Date(item.date).toLocaleString()}</span>
        `;
        container.appendChild(div);
    });
}

renderHistory();

// Enhanced Form Submission (with multiple file support, download options, per-file progress)
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const files = Array.from(csvFileInput.files);
    if (files.length === 0) {
        showError('Please select at least one CSV/Excel file first.');
        return;
    }
    
    hideMessages();
    setLoadingState(true);
    updateProgress(10, 'Starting conversion...');
    
    // Show download options if multiple files
    if (files.length > 1) {
        document.getElementById('downloadOptions').style.display = 'block';
    }
    document.getElementById('customFilename').style.display = 'block';
    
    try {
        const downloadType = document.querySelector('input[name="downloadType"]:checked')?.value || 'combined';
        const customFilename = document.getElementById('pdfFilename').value.trim();
        
        // Save current settings for undo
        saveSettingsToHistory();
        
        const formData = new FormData();
        
        // Append all files
        files.forEach((file, index) => {
            formData.append(`csvFile${index}`, file);
            updateFileProgress(index, 0, `Uploading ${file.name}...`);
        });
        formData.append('fileCount', files.length.toString());
        formData.append('downloadType', downloadType);
        if (customFilename) {
            formData.append('customFilename', customFilename);
        }
        
        // Collect all options
        const options = {
            formatPrompt: formatPrompt.value.trim(),
            layout: document.getElementById('layoutType').value,
            orientation: document.getElementById('orientation').value,
            fontSize: parseInt(document.getElementById('fontSize').value),
            headerColor: document.getElementById('headerColor').value,
            textColor: document.getElementById('textColor').value,
            selectedColumns: selectedColumns.length > 0 ? selectedColumns : csvHeaders,
            filteredData: filteredData || csvData,
            advanced: collectAdvancedOptions()
        };
        
        formData.append('options', JSON.stringify(options));
        updateProgress(20, 'Processing files...');
        
        // Simulate per-file progress (in real implementation, this would come from server)
        for (let i = 0; i < files.length; i++) {
            updateFileProgress(i, 30 + (i * 50 / files.length), `Processing ${files[i].name}...`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
        }
        
        updateProgress(60, 'Generating PDF...');
        
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });
        
        updateProgress(80, 'Finalizing...');
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to convert files' }));
            const errorMsg = errorData.error || 'Failed to convert CSV to PDF';
            const fileErrors = errorData.fileErrors || [];
            
            if (fileErrors.length > 0) {
                const errorDetails = fileErrors.map(e => `${e.filename}: ${e.error}`).join('\n');
                throw new Error(`${errorMsg}\n\nFile Errors:\n${errorDetails}`);
            }
            throw new Error(errorMsg);
        }
        
        updateProgress(90, 'Preparing download...');
        
        const contentType = response.headers.get('content-type');
        let blob, downloadUrl, filename;
        
        if (contentType && contentType.includes('application/zip')) {
            // Separate PDFs in ZIP
            blob = await response.blob();
            downloadUrl = window.URL.createObjectURL(blob);
            filename = customFilename ? `${customFilename}.zip` : `pdf_files_${Date.now()}.zip`;
        } else {
            // Combined PDF
            blob = await response.blob();
            downloadUrl = window.URL.createObjectURL(blob);
            filename = customFilename 
                ? `${customFilename}.pdf`
                : (files.length === 1 
                    ? files[0].name.replace(/\.(csv|tsv|xlsx|xls)$/i, '.pdf')
                    : `combined_${files.length}_files.pdf`);
        }
        
        downloadLink.href = downloadUrl;
        downloadLink.download = filename;
        
        // Store PDF URL for preview
        window.lastPdfUrl = downloadUrl;
        
        updateProgress(100, 'Complete!');
        showSuccess(downloadUrl);
        files.forEach(file => addToHistory(file.name));
        
        setTimeout(() => {
            document.getElementById('progressBar').style.display = 'none';
            document.querySelectorAll('.file-progress-item').forEach(el => el.remove());
        }, 2000);
        
    } catch (error) {
        showError(error.message || 'An error occurred while converting the files. Please try again.');
        document.getElementById('progressBar').style.display = 'none';
        document.querySelectorAll('.file-progress-item').forEach(el => el.remove());
    } finally {
        setLoadingState(false);
    }
});

// Update per-file progress
function updateFileProgress(fileIndex, percent, message) {
    const fileProgress = document.getElementById('fileProgress');
    fileProgress.style.display = 'block';
    
    let progressItem = document.querySelector(`.file-progress-item[data-index="${fileIndex}"]`);
    if (!progressItem) {
        progressItem = document.createElement('div');
        progressItem.className = 'file-progress-item';
        progressItem.dataset.index = fileIndex;
        fileProgress.appendChild(progressItem);
    }
    
    const fileName = uploadedFiles[fileIndex]?.name || `File ${fileIndex + 1}`;
    progressItem.innerHTML = `
        <div class="file-progress-name">${fileName}</div>
        <div class="file-progress-bar">
            <div class="file-progress-fill" style="width: ${percent}%"></div>
        </div>
        <div class="file-progress-text">${message || `${percent}%`}</div>
    `;
}

// Update overall progress with message
function updateProgress(percent, message = '') {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.display = 'block';
    progressFill.style.width = percent + '%';
    progressText.textContent = message ? `${percent}% - ${message}` : percent + '%';
}

// Undo/Redo for settings
function saveSettingsToHistory() {
    const settings = {
        formatPrompt: formatPrompt.value,
        layout: document.getElementById('layoutType').value,
        orientation: document.getElementById('orientation').value,
        fontSize: document.getElementById('fontSize').value,
        headerColor: document.getElementById('headerColor').value,
        textColor: document.getElementById('textColor').value,
        advanced: collectAdvancedOptions()
    };
    
    // Remove future history if we're not at the end
    if (currentHistoryIndex < settingsHistory.length - 1) {
        settingsHistory = settingsHistory.slice(0, currentHistoryIndex + 1);
    }
    
    settingsHistory.push(settings);
    currentHistoryIndex = settingsHistory.length - 1;
    
    // Limit history size
    if (settingsHistory.length > 50) {
        settingsHistory.shift();
        currentHistoryIndex--;
    }
}

function undoSettings() {
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        applySettings(settingsHistory[currentHistoryIndex]);
    }
}

function redoSettings() {
    if (currentHistoryIndex < settingsHistory.length - 1) {
        currentHistoryIndex++;
        applySettings(settingsHistory[currentHistoryIndex]);
    }
}

function applySettings(settings) {
    if (!settings) return;
    
    formatPrompt.value = settings.formatPrompt || '';
    document.getElementById('layoutType').value = settings.layout || 'list';
    document.getElementById('orientation').value = settings.orientation || 'portrait';
    document.getElementById('fontSize').value = settings.fontSize || 11;
    document.getElementById('headerColor').value = settings.headerColor || '#667eea';
    document.getElementById('textColor').value = settings.textColor || '#4a5a65';
    
    if (settings.advanced) {
        if (settings.advanced.header) document.getElementById('headerText').value = settings.advanced.header;
        if (settings.advanced.footer) document.getElementById('footerText').value = settings.advanced.footer;
        // Apply other advanced settings...
    }
    
    showPreview();
}

// Export/Import Settings
function exportSettings() {
    const settings = {
        formatPrompt: formatPrompt.value,
        layout: document.getElementById('layoutType').value,
        orientation: document.getElementById('orientation').value,
        fontSize: document.getElementById('fontSize').value,
        headerColor: document.getElementById('headerColor').value,
        textColor: document.getElementById('textColor').value,
        advanced: collectAdvancedOptions(),
        version: '1.0',
        exportDate: new Date().toISOString()
    };
    
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf-settings-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            applySettings(settings);
            alert('Settings imported successfully!');
        } catch (error) {
            alert('Error importing settings: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// Add export/import buttons to Templates tab
const templatesTab = document.getElementById('templatesTab');
if (templatesTab) {
    const exportImportDiv = document.createElement('div');
    exportImportDiv.className = 'export-import-section';
    exportImportDiv.innerHTML = `
        <h3>Export/Import Settings</h3>
        <div class="template-controls">
            <button type="button" id="exportSettings" class="export-btn">📤 Export Settings</button>
            <label for="importSettings" class="import-btn">
                📥 Import Settings
                <input type="file" id="importSettings" accept=".json" style="display: none;">
            </label>
        </div>
    `;
    templatesTab.appendChild(exportImportDiv);
    
    document.getElementById('exportSettings').addEventListener('click', exportSettings);
    document.getElementById('importSettings').addEventListener('change', importSettings);
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Allow some shortcuts in inputs
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoSettings();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redoSettings();
            return;
        }
        return;
    }
    
    // Ctrl/Cmd + S to save template
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('templateName').focus();
    }
    
    // Ctrl/Cmd + Enter to convert
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!convertButton.disabled) {
            convertButton.click();
        }
    }
    
    // Ctrl/Cmd + Z to undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoSettings();
    }
    
    // Ctrl/Cmd + Y or Shift+Z to redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoSettings();
    }
    
    // Delete key to remove selected file (if file list is focused)
    if (e.key === 'Delete' && document.activeElement.classList.contains('file-item')) {
        const index = parseInt(document.activeElement.dataset.index);
        if (!isNaN(index)) {
            removeFile(index);
        }
    }
    
    // Number keys for tabs (1-5)
    if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey) {
        const tabIndex = parseInt(e.key) - 1;
        const tabs = Array.from(tabButtons);
        if (tabs[tabIndex]) {
            tabs[tabIndex].click();
        }
    }
    
    // Escape to close previews
    if (e.key === 'Escape') {
        pdfPreviewContainer.style.display = 'none';
        previewBox.style.display = 'none';
    }
});

// Help Tooltips
const helpTooltip = document.getElementById('helpTooltip');
document.querySelectorAll('[title]').forEach(element => {
    element.addEventListener('mouseenter', (e) => {
        helpTooltip.textContent = e.target.title;
        helpTooltip.style.display = 'block';
        helpTooltip.style.left = e.pageX + 10 + 'px';
        helpTooltip.style.top = e.pageY + 10 + 'px';
    });
    
    element.addEventListener('mouseleave', () => {
        helpTooltip.style.display = 'none';
    });
    
    element.addEventListener('mousemove', (e) => {
        helpTooltip.style.left = e.pageX + 10 + 'px';
        helpTooltip.style.top = e.pageY + 10 + 'px';
    });
});

