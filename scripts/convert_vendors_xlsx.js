import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../vendors_FINAL_CORRECTED_CLEANED.xlsx');
const OUTPUT_FILE = path.join(__dirname, '../vendors_ready_to_import.json');

// Helper to generate deterministic UUID from string
function generateUUID(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash);
    const rng = (offset) => {
        const val = Math.sin(seed + offset) * 10000;
        return Math.floor((val - Math.floor(val)) * 256);
    }
    const hex = (offset, len) => {
        let s = '';
        for (let i = 0; i < len; i++) {
            s += rng(offset + i).toString(16).padStart(2, '0');
        }
        return s;
    };
    return `${hex(0, 4)}-${hex(4, 2)}-${hex(6, 2)}-${hex(8, 2)}-${hex(10, 6)}`;
}

try {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found: ${INPUT_FILE}`);
        process.exit(1);
    }

    console.log(`📖 Reading ${INPUT_FILE}...`);
    const workbook = XLSX.readFile(INPUT_FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${rawData.length} rows.`);

    const processed = rawData.map(row => {
        // Try to find columns case-insensitively
        const getCol = (possibleNames) => {
            const keys = Object.keys(row);
            const found = keys.find(k => possibleNames.includes(k.toLowerCase().trim()));
            return found ? row[found] : null;
        };

        const name = getCol(['vendor name', 'vendor', 'name', 'merchant', 'display_name']);
        const category = getCol(['category', 'default_category', 'account category']);
        const account = getCol(['account', 'default_account', 'gl account', 'account code']);
        const industry = getCol(['industry', 'industry_type']);

        if (!name) return null; // Skip if no name

        return {
            id: generateUUID(name),
            display_name: name.toString().trim(),
            default_category: category ? category.toString().trim() : 'Miscellaneous',
            default_account: account ? account.toString().replace(/[^0-9]/g, '') : '5718', // Default to 5718 or keep raw
            industry: industry ? industry.toString().trim() : 'Miscellaneous',
            categorization_confidence: 1.0, // Manual fix = 100% confidence
            description_patterns: [],
            aliases: [],
            user_id: null // Let app inject this
        };
    }).filter(x => x !== null);

    console.log(`✅ Processed ${processed.length} valid merchants.`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processed, null, 2));
    console.log(`💾 Saved to ${OUTPUT_FILE}`);

} catch (e) {
    console.error('❌ Error handling Excel:', e);
}
