# CSV to PDF Converter

A simple and elegant web application that allows users to upload CSV files and convert them to PDF documents. Deployed on Vercel with a beautiful, user-friendly interface.

## Features

- 📁 Easy CSV file upload (drag & drop or click to select)
- 📄 Automatic conversion to PDF format
- ✅ Success notification when PDF is generated
- 📥 Direct download of the generated PDF
- 🎨 Modern, responsive design
- ⚡ Fast serverless conversion on Vercel

## Getting Started

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Deploy to Vercel

1. Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

Or simply connect your GitHub repository to Vercel for automatic deployments.

## Usage

1. Click the upload area or drag and drop a CSV file
2. Click "Convert to PDF"
3. Wait for the conversion to complete
4. You'll see a success message: "Your PDF has been generated!"
5. Click "Download PDF" to save your file

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla JS)
- **Backend**: Node.js Serverless Functions (Vercel)
- **Libraries**:
  - `csv-parse`: For parsing CSV files
  - `pdfkit`: For generating PDF documents
  - `busboy`: For handling file uploads

## File Structure

```
.
├── api/
│   └── convert.js          # Serverless function for CSV to PDF conversion
├── index.html              # Main HTML file
├── styles.css              # Styling
├── script.js               # Frontend JavaScript
├── package.json            # Dependencies
├── vercel.json             # Vercel configuration
└── README.md               # This file
```

## License

MIT

