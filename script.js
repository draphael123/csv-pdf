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
        return;
    }

    const options = parseFormatPrompt(prompt);
    
    let html = '';
    
    html += `<div class="preview-item">
        <span class="preview-label">Layout:</span>
        <span class="preview-value">${options.useTable ? 'Table' : 'List'}</span>
    </div>`;
    
    html += `<div class="preview-item">
        <span class="preview-label">Orientation:</span>
        <span class="preview-value">${options.orientation.charAt(0).toUpperCase() + options.orientation.slice(1)}</span>
    </div>`;
    
    html += `<div class="preview-item">
        <span class="preview-label">Font Size:</span>
        <span class="preview-value">${options.fontSize}pt (body), ${options.titleSize}pt (title)</span>
    </div>`;
    
    html += `<div class="preview-item">
        <span class="preview-label">Header Color:</span>
        <span class="preview-value" style="color: ${options.headerColor};">${options.headerColor}</span>
    </div>`;
    
    html += `<div class="preview-item">
        <span class="preview-label">Text Color:</span>
        <span class="preview-value" style="color: ${options.textColor};">${options.textColor}</span>
    </div>`;
    
    previewContent.innerHTML = html;
    previewBox.style.display = 'block';
    previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Preview button click handler
previewButton.addEventListener('click', showPreview);

// Auto-preview on input (debounced)
let previewTimeout;
formatPrompt.addEventListener('input', () => {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(showPreview, 500);
});

