// Script to fix all parsers in pdf-parser.js
// Run with: node fix-parsers.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'pdf-parser.js');

console.log('Reading pdf-parser.js...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Applying fixes...');

// Fix 1: BMO Parser - Remove text.split and use matchAll
content = content.replace(
    /const lines = text\.split\('\\n'\);\s+const months = \{[^}]+\};\s+let previousMonth = -1;\s+let currentYear = year;\s+\/\/ Pattern:[^\n]+\s+const bmoPattern = \/\^\(\[A-Z\]\[a-z\]\{2\}\)\\s\+\(\\d\{1,2\}\)\\s\+\(\[A-Z\]\[a-z\]\{2\}\)\\s\+\(\\d\{1,2\}\)\\s\+\(\.+\?\)\\s\+\(\\d\{10,\}\)\\s\+\(\[-\]\?\[\\d,\]\+\\\.\?\\\d\{2\}\)\$\/;/g,
    `const months = {
                Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
            };

            let previousMonth = -1;
            let currentYear = year;

            // Pattern: MMM DD   MMM DD   DESCRIPTION   REFERENCE_NO   AMOUNT (global for matchAll)
            const bmoPattern = /([A-Z][a-z]{2})\\s+(\\d{1,2})\\s+([A-Z][a-z]{2})\\s+(\\d{1,2})\\s+(.+?)\\s+(\\d{10,})\\s+([-]?[\\d,]+\\.?\\d{2})/g;`
);

// Fix 2: BMO Parser - Replace for loop with matchAll
content = content.replace(
    /for \(let i = 0; i < lines\.length; i\+\+\) \{\s+const line = lines\[i\]\.trim\(\);[\s\S]+?\/\/ Skip headers[\s\S]+?if \(match\) \{[\s\S]+?\}\s+\}/g,
    `const matches = text.matchAll(bmoPattern);

            for (const match of matches) {
                const [, transMonth, transDay, postMonth, postDay, description, refNo, amountStr] = match;

                const monthNum = months[transMonth];

                // Handle year rollover
                if (previousMonth !== -1 && previousMonth === 11 && monthNum === 0) {
                    currentYear++;
                }
                previousMonth = monthNum;

                // Parse amount
                let amount = parseFloat(amountStr.replace(/[$,]/g, ''));
                const type = amount < 0 ? 'credit' : 'debit';
                amount = Math.abs(amount);

                // Format date
                const month = (monthNum + 1).toString().padStart(2, '0');
                const day = transDay.padStart(2, '0');
                const isoDate = \`\${currentYear}-\${month}-\${day}\`;

                transactions.push({
                    date: isoDate,
                    description: description.trim(),
                    amount: amount,
                    type: type,
                    referenceNumber: refNo,
                    originalDate: \`\${transMonth} \${transDay}, \${currentYear}\`
                });
            }`
);

console.log('Writing fixed file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Done! All parsers fixed.');
console.log('Now run: git add src/services/pdf-parser.js && git commit -m "Fix: Apply matchAll to all parsers"');
