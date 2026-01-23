/**
 * Quick test of BMO Chequing Parser
 * Tests brand detection + routing + parsing
 */
import 'dotenv/config';
import { parserRouter } from './src/services/ParserRouter.js';
import fs from 'fs';

async function testBMOChequing() {
    console.log('🧪 Testing BMO Chequing Parser\n');

    // Load extracted text
    const text = fs.readFileSync('bmo_chq_text.txt', 'utf-8');

    console.log(`📄 Loaded statement text (${text.length} chars)`);
    console.log('🚀 Starting parser...\n');

    try {
        const result = await parserRouter.parseStatement(text);

        console.log('\n✅ SUCCESS!');
        console.log(`\nBrand: ${result.brandDetection.fullBrandName}`);
        console.log(`Account Type: ${result.brandDetection.accountType}`);
        console.log(`Confidence: ${result.brandDetection.confidence}`);
        console.log(`\nAccount Holder: ${result.accountHolder}`);
        console.log(`Statement Period: ${result.statementPeriod}`);
        console.log(`Opening Balance: $${result.openingBalance.toLocaleString()}`);

        console.log(`\n📊 Parsed ${result.transactions.length} transactions:`);

        // Show first 5 transactions
        result.transactions.slice(0, 5).forEach((tx, idx) => {
            console.log(`\n${idx + 1}. ${tx.date} - ${tx.description}`);
            if (tx.debit) console.log(`   Debit: $${tx.debit.toFixed(2)}`);
            if (tx.credit) console.log(`   Credit: $${tx.credit.toFixed(2)}`);
        });

        // Validate against ground truth
        console.log('\n🎯 Validation against ground truth:');
        const groundTruth = [
            { date: '2022-07-11', desc: 'INTERAC e-Transfer Sent', debit: 300.00, credit: null },
            { date: '2022-07-11', desc: 'INTERAC e-Transfer Received', debit: null, credit: 1536.00 },
            { date: '2022-07-13', desc: 'Online Bill Payment', debit: 500.00, credit: null }
        ];

        let passed = 0;
        groundTruth.forEach((expected, idx) => {
            const actual = result.transactions[idx];
            if (!actual) {
                console.log(`❌ Transaction ${idx + 1}: Not found`);
                return;
            }

            const dateMatch = actual.date === expected.date;
            const descMatch = actual.description.includes(expected.desc.split(' ')[0]);
            const debitMatch = (actual.debit === expected.debit) || (actual.debit === null && expected.debit === null);
            const creditMatch = (actual.credit === expected.credit) || (actual.credit === null && expected.credit === null);

            if (dateMatch && descMatch && debitMatch && creditMatch) {
                console.log(`✅ Transaction ${idx + 1}: PASS`);
                passed++;
            } else {
                console.log(`❌ Transaction ${idx + 1}: FAIL`);
                console.log(`   Expected: ${expected.date} | ${expected.desc}`);
                console.log(`   Got: ${actual.date} | ${actual.description}`);
            }
        });

        console.log(`\n📈 Score: ${passed}/${groundTruth.length} passed`);

    } catch (error) {
        console.error('\n❌ FAILED:', error.message);
        console.error(error.stack);
    }
}

testBMOChequing();
