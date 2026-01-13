import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const INPUT_FILENAME = 'vendors_FINAL_CORRECTED_CLEANED(1).json';
const OUTPUT_FILENAME = 'vendors_clean_ready.json';

const INPUT_PATH = path.join(__dirname, '../', INPUT_FILENAME);
const OUTPUT_PATH = path.join(__dirname, '../', OUTPUT_FILENAME);

// UTILS
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

function validateUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

// MAIN
try {
    if (!fs.existsSync(INPUT_PATH)) {
        console.error(`❌ Input file not found in workspace: ${INPUT_FILENAME}`);
        console.log(`👉 Please drag "${INPUT_FILENAME}" into the project root folder.`);
        process.exit(1);
    }

    console.log(`📖 Reading ${INPUT_FILENAME}...`);
    const rawContent = fs.readFileSync(INPUT_PATH, 'utf8');
    let data;
    try {
        data = JSON.parse(rawContent);
    } catch (e) {
        console.error('❌ JSON Parse Error:', e.message);
        process.exit(1);
    }

    if (!Array.isArray(data)) {
        console.log('⚠️ Root is object, looking for array property...');
        // Try common keys
        if (Array.isArray(data.merchants)) data = data.merchants;
        else if (Array.isArray(data.vendors)) data = data.vendors;
        else if (Array.isArray(data.Vendors)) data = data.Vendors; // Case Sensitive Fix
        else if (Array.isArray(data.data)) data = data.data;
        else {
            console.error('❌ Invalid JSON: Could not find array of merchants in object root.');
            console.log('Keys found:', Object.keys(data));
            process.exit(1);
        }
    }

    console.log(`📊 Validating ${data.length} records...`);

    const cleanMap = new Map(); // Use Map to deduplicate by normalized name
    let duplicates = 0;
    let fixedIds = 0;

    data.forEach(item => {
        // 1. Sanitize Name
        let name = item.display_name || item.vendor_name || item.name;
        if (!name || typeof name !== 'string') return; // Skip garbage
        name = name.trim();
        if (name.length === 0) return;

        // 2. Normalize for Deduplication
        const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

        // 3. Ensure ID
        let id = item.id;
        if (!id || !validateUUID(id)) {
            id = generateUUID(name);
            fixedIds++;
        }

        // 4. Default Values
        const category = item.default_category || item.category || 'Miscellaneous';
        const account = item.default_account || item.account || '5718';
        const industry = item.industry || 'Miscellaneous';

        // 5. Build Clean Object
        const cleanObj = {
            id: id,
            display_name: name,
            default_category: category,
            default_account: account.toString(),
            industry: industry,
            categorization_confidence: 1.0, // Force High Confidence
            description_patterns: Array.isArray(item.description_patterns) ? item.description_patterns : [],
            aliases: Array.isArray(item.aliases) ? item.aliases : [],
            user_id: null // App will inject
        };

        if (cleanMap.has(normalized)) {
            duplicates++;
            // Overwrite with latest (assuming bottom of file is newer/better) or keep first?
            // Usually "Corrected" files imply the entry exists once. If duplicated, we take the one that looks "fuller" or just last.
            cleanMap.set(normalized, cleanObj);
        } else {
            cleanMap.set(normalized, cleanObj);
        }
    });

    const finalOutput = Array.from(cleanMap.values());
    console.log(`\n✅ ANALYSIS COMPLETE:`);
    console.log(`   - Original Rows: ${data.length}`);
    console.log(`   - Invalid/Empty: ${data.length - fixedIds - cleanMap.size}`); // Rough approx
    console.log(`   - Duplicates Removed: ${duplicates}`);
    console.log(`   - IDs Generated/Fixed: ${fixedIds}`);
    console.log(`   - Final Clean Record Count: ${finalOutput.length}`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2));
    console.log(`\n💾 SAVED CLEAN FILE: ${OUTPUT_FILENAME}`);
    console.log(`👉 You can now import "${OUTPUT_FILENAME}" using Factory Reset.`);

} catch (err) {
    console.error('❌ Unexpected Error:', err);
}
