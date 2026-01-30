import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importDictionary() {
    console.log('🚀 Starting Dictionary Import...');

    const backupPath = 'G:/My Drive/misc data/Pristine_Dictionary_Backup_2026-01-03.json';

    // 1. Read the JSON file
    try {
        const raw = fs.readFileSync(backupPath, 'utf8');
        const dictionary = JSON.parse(raw);
        console.log(`📂 Loaded ${dictionary.length} entries from backup.`);

        // 2. Transform to Vendor Format
        // Our app expects: { id, name, category, defaultAccountId, description_patterns }

        const vendors = dictionary.map(entry => {
            return {
                id: entry.id,
                name: entry.display_name || entry.canonical_name,
                category: entry.default_category,
                defaultAccountId: entry.default_account,
                description_patterns: entry.description_patterns,
                // Preserve training data
                transaction_count: entry.transaction_count,
                industry: entry.industry,
                created_at: entry.created_at,
                updated_at: new Date().toISOString()
            };
        });

        // 3. Write to LocalStorage (Simulated via file for now, or instructions for user)
        // Since I cannot access LocalStorage from here, I will save a transformed JSON 
        // that the user can Drop/Upload into the app.

        const outputDir = path.join(__dirname, '..', 'src', 'data');
        const outputPath = path.join(outputDir, 'transformed_vendors.json');

        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(vendors, null, 2));

        console.log(`✅ Successfully transformed and saved to: ${outputPath}`);
        console.log('👉 Please upload this file using the "Import Data" feature in the app.');

    } catch (err) {
        console.error('❌ Error importing dictionary:', err);
    }
}

importDictionary();
