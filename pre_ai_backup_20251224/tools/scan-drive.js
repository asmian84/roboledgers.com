
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const xlsx = require('xlsx');

// Configuration
// We default to the current drive root if possible, or a specific path
// Since this is running in the project root (G:\My Drive\AutoBookkeeping\AutoBookkeeping-V4)
// We might want to scan G:\My Drive recursively, but that's HUGE.
// Let's restrict it to likely accounting folders or the current drive context.
// For safety, we will scan the parent directory of the project, which is likely the active workspace root.
const SEARCH_ROOT = path.resolve(__dirname, '../../../../'); // Goes up to G:\My Drive roughly
const OUTPUT_FILE = path.resolve(__dirname, '../data/learned-memory.json');

console.log(`🤖 Data Junkie Scanner Initialized`);
console.log(`📂 Target Root: ${SEARCH_ROOT}`);
console.log(`💾 Memory Output: ${OUTPUT_FILE}`);

const VALID_HEADERS = ['description', 'desc', 'vendor', 'payee', 'original description'];
const ACCOUNT_HEADERS = ['account', 'category', 'expense account', 'account name'];

const memory = {};

function normalizeHeader(h) {
    return h ? h.toString().toLowerCase().trim() : '';
}

function scan() {
    console.log('Searching for Excel and CSV files...');

    // Find all Excel/CSV files, ignoring node_modules and hidden folders
    glob(SEARCH_ROOT + '/**/*.{xlsx,xls,csv}', {
        ignore: ['**/node_modules/**', '**/.*/**', '**/dist/**', '**/build/**']
    }, (err, files) => {
        if (err) {
            console.error('Glob check failed:', err);
            return;
        }

        console.log(`Found ${files.length} candidate files.`);
        let processedCount = 0;

        files.forEach(file => {
            try {
                processFile(file);
                process.stdout.write('.');
            } catch (e) {
                // Silent fail for locked files etc
            }
            processedCount++;
        });

        console.log(`\n\n✅ Scan Complete.`);
        saveMemory();
    });
}

function processFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!data || data.length === 0) return;

    // Detect Headers
    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    const descKey = keys.find(k => VALID_HEADERS.includes(normalizeHeader(k)));
    const accountKey = keys.find(k => ACCOUNT_HEADERS.includes(normalizeHeader(k)));

    if (descKey && accountKey) {
        // console.log(`\nFound Schema in ${path.basename(filePath)}: [${descKey}] -> [${accountKey}]`);

        data.forEach(row => {
            const desc = row[descKey];
            const account = row[accountKey];

            if (desc && account && typeof desc === 'string' && typeof account === 'string') {
                const cleanDesc = desc.trim();
                const cleanAcct = account.trim();

                if (cleanDesc.length > 2 && cleanAcct.length > 2) {
                    addMemory(cleanDesc, cleanAcct);
                }
            }
        });
    }
}

function addMemory(description, account) {
    if (!memory[description]) {
        memory[description] = {};
    }

    if (!memory[description][account]) {
        memory[description][account] = 0;
    }

    memory[description][account]++;
}

function saveMemory() {
    // Transform to simple Description -> Best Account map
    const finalMap = {};
    let ruleCount = 0;

    Object.keys(memory).forEach(desc => {
        const potentialAccounts = memory[desc];

        // Find account with highest frequency
        let bestAccount = null;
        let maxCount = 0;

        Object.entries(potentialAccounts).forEach(([acct, count]) => {
            if (count > maxCount) {
                maxCount = count;
                bestAccount = acct;
            }
        });

        // Threshold: Must have seen it at least once? (Maybe higher for strictness)
        if (bestAccount) {
            finalMap[desc] = {
                account: bestAccount,
                confidence: Math.min(maxCount * 0.2, 1.0), // 5 occurrences = 100% confidence
                source: 'scanned_history'
            };
            ruleCount++;
        }
    });

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalMap, null, 2));
    console.log(`🧠 Learned ${ruleCount} unique categorization rules.`);
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
}

// Start
scan();
