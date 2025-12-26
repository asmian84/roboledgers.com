/**
 * PDF Parser Debug Tool
 * Logs the actual extracted text to help fix regex patterns
 */

(function () {
    'use strict';

    window.debugPDF = async function (file) {
        try {
            console.log('🔍 DEBUG: Starting PDF analysis...');

            // Load PDF
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            console.log(`📄 PDF Pages: ${pdf.numPages}`);

            // Extract all text
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            console.log(`📝 Total Text Length: ${fullText.length} characters`);
            console.log('\n========== FULL EXTRACTED TEXT ==========\n');
            console.log(fullText);
            console.log('\n========================================\n');

            // Split into lines and show each line
            const lines = fullText.split('\n');
            console.log(`📊 Total Lines: ${lines.length}`);
            console.log('\n========== LINE BY LINE ==========\n');

            lines.forEach((line, index) => {
                if (line.trim()) {
                    console.log(`Line ${index}: "${line}"`);
                }
            });

            console.log('\n==================================\n');

            // Look for transaction patterns
            console.log('🔍 Looking for date patterns...');
            const datePattern1 = /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi;
            const dateMatches = fullText.match(datePattern1);
            if (dateMatches) {
                console.log(`✅ Found ${dateMatches.length} potential date patterns:`);
                dateMatches.slice(0, 10).forEach(match => console.log(`  - "${match}"`));
            } else {
                console.log('❌ No date patterns found with DD MMM format');
            }

            // Look for amounts
            console.log('\n🔍 Looking for amount patterns...');
            const amountPattern = /\d+\.\d{2}/g;
            const amountMatches = fullText.match(amountPattern);
            if (amountMatches) {
                console.log(`✅ Found ${amountMatches.length} potential amounts:`);
                amountMatches.slice(0, 10).forEach(match => console.log(`  - $${match}`));
            }

            return fullText;

        } catch (error) {
            console.error('❌ Debug failed:', error);
            throw error;
        }
    };

    console.log('🔧 PDF Debug Tool loaded. Use: window.debugPDF(file)');

})();
