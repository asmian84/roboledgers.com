# PowerShell script to fix BMO parser
$parserFile = "src\services\pdf-parser.js"
$fixedFile = "src\services\pdf-parser-FIXED-BMO.js"

Write-Host "Reading files..."
$content = Get-Content $parserFile -Raw
$fixedBMO = Get-Content $fixedFile -Raw

Write-Host "Finding BMO function..."
# Find the start and end of the BMO function
$pattern = '(?s)(        /\*\*\r?\n         \* BMO Bank of Montreal.*?extractBMOTransactions\(text\) \{.*?console\.log\(`🎯 BMO Parser: Extracted \$\{transactions\.length\} transactions`\);\r?\n            return \{ transactions, metadata \};\r?\n        \})'

if ($content -match $pattern) {
    Write-Host "Found BMO function, replacing..."
    
    # Prepare the fixed function with proper indentation
    $replacement = @"
        /**
         * BMO Bank of Montreal Credit Card Parser
         * Format: TRANS_DATE   POST_DATE   DESCRIPTION   REFERENCE_NO   AMOUNT
         * Example: Mar 8   Mar 8   DIN THE STORE #0405   9301151476406   237.95
         */
        extractBMOTransactions(text) {
            const transactions = [];

            // Detect year from statement period
            let year = new Date().getFullYear();
            const periodMatch = text.match(/PERIOD COVERED BY THIS STATEMENT.*?(\d{4})/i);
            if (periodMatch) {
                year = parseInt(periodMatch[1]);
            }

            // Extract metadata
            const metadata = {
                accountHolder: null,
                accountNumber: null,
                statementPeriod: null,
                previousBalance: null,
                newBalance: null,
                cardType: 'BMO Mastercard'
            };

            // Extract customer name
            const nameMatch = text.match(/Customer Name\s+(.+)/i);
            if (nameMatch) {
                metadata.accountHolder = nameMatch[1].trim();
            }

            // Extract card number
            const cardMatch = text.match(/Card Number\s+(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/i);
            if (cardMatch) {
                const lastFour = cardMatch[1].trim().split(/\s+/).pop();
                metadata.accountNumber = ``**** `${lastFour}``;
            }

            // Extract statement period
            const periodMatch2 = text.match(/PERIOD COVERED BY THIS STATEMENT\s+(.+)/i);
            if (periodMatch2) {
                metadata.statementPeriod = periodMatch2[1].trim();
            }

            // Extract previous balance
            const prevBalMatch = text.match(/Previous Balance.*?\`$?([\d,]+\.?\d{2})/i);
            if (prevBalMatch) {
                metadata.previousBalance = parseFloat(prevBalMatch[1].replace(/,/g, ''));
            }

            // Extract new balance
            const newBalMatch = text.match(/New Balance.*?\`$?([\d,]+\.?\d{2})/i);
            if (newBalMatch) {
                metadata.newBalance = parseFloat(newBalMatch[1].replace(/,/g, ''));
            }

            const months = {
                Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
            };

            let previousMonth = -1;
            let currentYear = year;

            // Pattern: MMM DD   MMM DD   DESCRIPTION   REFERENCE_NO   AMOUNT (global for matchAll)
            const bmoPattern = /([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+(\d{10,})\s+([-]?[\d,]+\.?\d{2})/g;

            // Use matchAll to find all transactions
            const matches = text.matchAll(bmoPattern);

            for (const match of matches) {
                const [, transMonth, transDay, postMonth, postDay, description, refNo, amountStr] = match;

                const monthNum = months[transMonth];

                // Handle year rollover
                if (previousMonth !== -1 && previousMonth === 11 && monthNum === 0) {
                    currentYear++;
                }
                previousMonth = monthNum;

                // Parse amount
                let amount = parseFloat(amountStr.replace(/[`$,]/g, ''));
                const type = amount < 0 ? 'credit' : 'debit';
                amount = Math.abs(amount);

                // Format date
                const month = (monthNum + 1).toString().padStart(2, '0');
                const day = transDay.padStart(2, '0');
                const isoDate = ``${currentYear}-${month}-${day}``;

                transactions.push({
                    date: isoDate,
                    description: description.trim(),
                    amount: amount,
                    type: type,
                    referenceNumber: refNo,
                    originalDate: ``${transMonth} ${transDay}, ${currentYear}``
                });
            }

            console.log(``🎯 BMO Parser: Extracted `${transactions.length} transactions``);
            return { transactions, metadata };
        }
"@
    
    $newContent = $content -replace $pattern, $replacement
    
    Write-Host "Writing fixed file..."
    $newContent | Set-Content $parserFile -NoNewline
    
    Write-Host "✅ BMO parser fixed successfully!"
}
else {
    Write-Host "❌ Could not find BMO function pattern"
    exit 1
}
