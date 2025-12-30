import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile } from 'fs/promises';

/**
 * Extracts raw text from a PDF file using PDF.js
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractTextFromPDF(filePath) {
    try {
        const buffer = await readFile(filePath);
        const uint8Array = new Uint8Array(buffer);

        // Load PDF document
        const loadingTask = getDocument({
            data: uint8Array,
            useSystemFonts: true, // Avoid font loading errors
            disableFontFace: true // Disable font face
        });

        const pdf = await loadingTask.promise;
        let fullText = '';

        // Iterate through all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Extract strings and join with space (mimicking browser behavior)
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n'; // Separate pages with newlines
        }

        return fullText;

    } catch (error) {
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}
