import fs from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { PDFParser } from './parsing/pdf-parser-logic.js';
import { extractTextFromPDF } from './parsing/pdf-text-extractor.js';

// Setup Mock Browser Environment for PDF Parser
global.window = {}; // Some parser logic might still access window? No, I removed it.
// But just in case
global.console = console;

const parser = new PDFParser();

async function main() {
    const argv = yargs(hideBin(process.argv))
        .option('dir', {
            alias: 'd',
            type: 'string',
            description: 'Directory to scan',
            demandOption: true
        })
        .option('output', {
            alias: 'o',
            type: 'string',
            description: 'Output JSON file',
            default: 'scan_results.json'
        })
        .help()
        .argv;

    const targetDir = path.resolve(argv.dir);
    console.log(`🚀 Starting CLI Indexer...`);
    console.log(`📂 Target: ${targetDir}`);

    // PHASE 1: DISCOVERY
    console.log(`\n🔍 Phase 1: Discovering files...`);
    const files = [];

    async function walk(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (['node_modules', '.git', '$Recycle.Bin'].includes(entry.name)) continue;
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    if (entry.name.toLowerCase().endsWith('.pdf')) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (e) {
            console.warn(`⚠️ Error accessing ${dir}: ${e.message}`);
        }
    }

    await walk(targetDir);
    console.log(`✅ Found ${files.length} PDF files.`);

    // PHASE 2: PROCESSING
    console.log(`\n⚙️ Phase 2: Processing...`);
    const results = [];
    const errors = [];
    let processed = 0;
    const startTime = Date.now();

    for (const file of files) {
        processed++;
        const progress = Math.round((processed / files.length) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const eta = (files.length - processed) / rate;

        process.stdout.write(`\r[${progress}%] ${processed}/${files.length} | ETA: ${Math.round(eta)}s | ${path.basename(file).substring(0, 30)}...   `);

        try {
            const text = await extractTextFromPDF(file);
            const parseResult = await parser.parseText(text, file); // passing file path as hash for now?

            if (parseResult.transactions && parseResult.transactions.length > 0) {
                results.push({
                    file: file,
                    bank: parseResult.bank,
                    transactions: parseResult.transactions,
                    metadata: parseResult.metadata
                });
            } else {
                // errors.push({ file, error: 'No transactions found' });
            }

        } catch (e) {
            errors.push({ file, error: e.message });
        }
    }

    console.log(`\n\n✅ Scan Complete!`);
    console.log(`Parsed: ${results.length} files with transactions.`);
    console.log(`Errors: ${errors.length} files.`);

    // BANK SUMMARY
    console.log(`\n========================================================`);
    console.log(`  BANK STATEMENT SUMMARY`);
    console.log(`========================================================`);

    const bankTally = {};
    results.forEach(r => {
        const name = r.bank || 'Unknown';
        bankTally[name] = (bankTally[name] || 0) + 1;
    });

    for (const [bank, count] of Object.entries(bankTally)) {
        console.log(`  ${bank.padEnd(30)}: ${count}`);
    }
    console.log(`========================================================\n`);

    await fs.writeFile(argv.output, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to ${argv.output}`);

    if (errors.length > 0) {
        await fs.writeFile('scan_errors.json', JSON.stringify(errors, null, 2));
        console.log(`⚠️ Errors saved to scan_errors.json`);
    }
}

main().catch(console.error);
