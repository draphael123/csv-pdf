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

// Handle file selection
csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = `Selected: ${file.name}`;
        fileName.style.display = 'block';
        hideMessages();
    }
});

// Drag and drop functionality
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv' || file.name.endsWith('.csv')) {
        csvFileInput.files = e.dataTransfer.files;
        fileName.textContent = `Selected: ${file.name}`;
        fileName.style.display = 'block';
        hideMessages();
    } else {
        showError('Please upload a valid CSV file.');
    }
});

// Form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = csvFileInput.files[0];
    if (!file) {
        showError('Please select a CSV file first.');
        return;
    }
    
    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        showError('Please upload a valid CSV file.');
        return;
    }
    
    hideMessages();
    setLoadingState(true);
    
    try {
        const formData = new FormData();
        formData.append('csvFile', file);
        formData.append('formatPrompt', formatPrompt.value.trim());
        
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to convert file' }));
            throw new Error(errorData.error || 'Failed to convert CSV to PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        downloadLink.href = url;
        downloadLink.download = file.name.replace('.csv', '.pdf');
        
        showSuccess();
        resetForm();
        
    } catch (error) {
        showError(error.message || 'An error occurred while converting the file. Please try again.');
    } finally {
        setLoadingState(false);
    }
});

function setLoadingState(loading) {
    convertButton.disabled = loading;
    buttonText.style.display = loading ? 'none' : 'inline';
    buttonLoader.style.display = loading ? 'inline-block' : 'none';
}

function showSuccess() {
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

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
        previewBox.style.borderColor = '#667eea';
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

// CSV Preview and Parsing
csvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = `Selected: ${file.name}`;
        fileName.style.display = 'block';
        hideMessages();
        await loadCSVPreview(file);
    }
});

async function loadCSVPreview(file) {
    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            showError('CSV file is empty');
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
        
        filteredData = [...csvData];
        selectedColumns = [...csvHeaders];
        
        renderCSVPreview();
        setupColumnSelection();
        setupSorting();
        addToHistory(file.name);
    } catch (error) {
        showError('Error reading CSV file: ' + error.message);
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
    document.getElementById('headerColor').value = template.headerColor || '#667eea';
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

// Enhanced Form Submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = csvFileInput.files[0];
    if (!file) {
        showError('Please select a CSV file first.');
        return;
    }
    
    hideMessages();
    setLoadingState(true);
    updateProgress(10);
    
    try {
        const formData = new FormData();
        formData.append('csvFile', file);
        
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
        updateProgress(30);
        
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });
        
        updateProgress(70);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to convert file' }));
            throw new Error(errorData.error || 'Failed to convert CSV to PDF');
        }
        
        updateProgress(90);
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        downloadLink.href = url;
        downloadLink.download = file.name.replace(/\.(csv|tsv)$/i, '.pdf');
        
        updateProgress(100);
        showSuccess();
        addToHistory(file.name);
        
        setTimeout(() => {
            document.getElementById('progressBar').style.display = 'none';
        }, 2000);
        
    } catch (error) {
        showError(error.message || 'An error occurred while converting the file. Please try again.');
        document.getElementById('progressBar').style.display = 'none';
    } finally {
        setLoadingState(false);
    }
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save template
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
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
    
    // Number keys for tabs (1-5)
    if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        const tabIndex = parseInt(e.key) - 1;
        const tabs = Array.from(tabButtons);
        if (tabs[tabIndex]) {
            tabs[tabIndex].click();
        }
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

