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
}

