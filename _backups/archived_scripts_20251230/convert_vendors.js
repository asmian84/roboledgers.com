import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_FILE = 'raw_vendors.txt';
const OUTPUT_FILE = 'vendor_import.json';

// Paths
const inputPath = path.resolve(process.cwd(), INPUT_FILE);
const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);

console.log(`Reading from: ${inputPath}`);

try {
    if (!fs.existsSync(inputPath)) {
        console.error(`Error: ${INPUT_FILE} not found.`);
        console.error(`Please create ${INPUT_FILE} and paste your vendor list into it.`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(inputPath, 'utf8');
    const lines = rawData.split(/\r?\n/);

    const validRules = [];
    let skipped = 0;

    lines.forEach((line, index) => {
        if (!line.trim()) return; // Skip empty
        if (line.startsWith('Vendor Name')) return; // Skip header

        // Attempt tab split
        let parts = line.split('\t');

        // Normalize whitespace in parts
        parts = parts.map(p => p.trim()).filter(p => p);

        let name, accountNum, category;

        // Strategy 1: Tab separated clean
        // Expected: [Name, Account, Category]
        if (parts.length >= 3) {
            name = parts[0];
            accountNum = parts[parts.length - 2];
            category = parts[parts.length - 1];

            // Refinement: Identify 4 digit number
            const numIndex = parts.findIndex(p => /^\d{4}$/.test(p));
            if (numIndex > 0) {
                name = parts.slice(0, numIndex).join(' ');
                accountNum = parts[numIndex];
                category = parts.slice(numIndex + 1).join(' ');
            }
        }
        // Strategy 2: Regex for lines that lost tabs but have structure "Name 1234 Category"
        else {
            const match = line.match(/^(.*?)\s+(\d{4})\s+(.*)$/);
            if (match) {
                name = match[1].trim();
                accountNum = match[2].trim();
                category = match[3].trim();
            }
        }

        if (name && accountNum && category) {
            validRules.push({
                name: name,
                accountNumber: accountNum,
                defaultAccount: category,
                confidence: 100
            });
        } else {
            console.warn(`[Line ${index + 1}] Skipped (Format?): "${line.substring(0, 50)}..."`);
            skipped++;
        }
    });

    // Write JSON
    fs.writeFileSync(outputPath, JSON.stringify(validRules, null, 2));

    console.log(`\nSuccess!`);
    console.log(`Processed: ${lines.length} lines`);
    console.log(`Created: ${validRules.length} rules`);
    console.log(`Skipped: ${skipped} lines`);
    console.log(`\nOutput saved to: ${outputPath}`);

} catch (err) {
    console.error("Error processing file:", err.message);
}
