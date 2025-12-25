/**
 * AutoBookkeeping V4 - PDF Parser
 * Adapted from StatementSensei/Monopoly
 * 
 * Supports Canadian banks: TD, RBC, CIBC, BMO, Scotiabank
 * Uses PDF.js for text extraction and bank-specific regex patterns
 */

(function () {
    'use strict';

    class PDFParser {
        constructor() {
            // Bank configurations adapted from Monopoly
            this.banks = {
                td: {
                    name: 'TD Canada Trust',
                    patterns: {
                        // TD format: MM/DD/YYYY Description Amount
                        date: /(\d{2}\/\d{2}\/\d{4})/,
                        transaction: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*([CR])?/,
                        debitCredit: /([CR])$/
                    },
                    identifier: /TD Canada Trust|TD Bank|TD CANADA/i,
                    dateFormat: 'MM/DD/YYYY'
                },
                rbc: {
                    name: 'RBC Royal Bank',
                    patterns: {
                        // RBC format: DD MMM   Description   Amount   Amount   Balance
                        // Example: 29 Feb   Loan interest   NO.78783249 001   221.33   -58.86
                        date: /(\d{1,2}\s+\w{3})/,
                        transaction: /(\d{1,2}\s+\w{3})\s+(.+?)\s+([\d,]+\.?\d{0,2})\s+([\d,]+\.?\d{0,2})?/,
                    },
                    identifier: /Royal Bank|RBC|ROYAL BANK OF CANADA/i,
                    dateFormat: 'DD MMM'
                },
                cibc: {
                    name: 'CIBC',
                    patterns: {
                        // CIBC format: MMM DD, YYYY Description Amount OR MMM DD Description SpendCategory Amount
                        date: /(\w{3}\s+\d{1,2})/,
                        transaction: /(\w{3}\s+\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})/,
                    },
                    identifier: /CIBC|Canadian Imperial Bank|Aventura/i,
                    dateFormat: 'MMM DD'
                },
                bmo: {
                    name: 'BMO Bank of Montreal',
                    patterns: {
                        // BMO format: MM/DD/YY Description Amount
                        date: /(\d{2}\/\d{2}\/\d{2})/,
                        transaction: /(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/,
                    },
                    identifier: /Bank of Montreal|BMO|BMO BANK/i,
                    dateFormat: 'MM/DD/YY'
                },
                scotiabank: {
                    name: 'Scotiabank',
                    patterns: {
                        // Scotiabank format: YYYY-MM-DD Description Amount
                        date: /(\d{4}-\d{2}-\d{2})/,
                        transaction: /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/,
                    },
                    identifier: /Scotiabank|Scotia|THE BANK OF NOVA SCOTIA/i,
                    dateFormat: 'YYYY-MM-DD'
                }
            };

            // Garbage line patterns (from Monopoly)
            this.garbagePatterns = [
                /opening balance/i,
                /closing balance/i,
                /beginning balance/i,
                /ending balance/i,
                /page \d+ of \d+/i,
                /statement period/i,
                /account number/i,
                /account summary/i,
                /transaction history/i,
                /^\s*$/,
                /^date\s+description\s+amount/i,
                /^total/i,
                /account activity/i,
                /continued/i,
                /description.+cheques.+debits/i,
                /deposits.+credits.+balance/i
            ];
        }

        /**
         * SMART PARSER - Phase 1: Classification
         * Automatically detect statement type (Credit Card vs Bank Account)
         */
        classifyStatementType(text) {
            const creditCardIndicators = [
                /PREVIOUS\s+STATEMENT\s+BALANCE/i,
                /PAYMENT\s+DUE\s+DATE/i,
                /CREDIT\s+LIMIT/i,
                /MINIMUM\s+PAYMENT/i,
                /TRANSACTION.*DATE.*POSTING.*DATE/i,
                /TRANS.*DATE.*POST.*DATE/i,
                /NEW\s+BALANCE/i,
                /TOTAL\s+BALANCE/i
            ];

            const bankAccountIndicators = [
                /WITHDRAWALS.*DEPOSITS/i,
                /DEBITS.*CREDITS/i,
                /CHEQUES.*DEBITS/i,
                /OPENING\s+BALANCE/i,
                /CLOSING\s+BALANCE/i,
                /ACCOUNT\s+ACTIVITY/i,
                /ACCOUNT\s+SUMMARY/i
            ];

            let creditScore = creditCardIndicators.filter(p => p.test(text)).length;
            let bankScore = bankAccountIndicators.filter(p => p.test(text)).length;

            if (creditScore > bankScore) return 'CREDIT_CARD';
            if (bankScore > creditScore) return 'BANK_ACCOUNT';
            return 'UNKNOWN';
        }

        /**
         * SMART PARSER - Detect bank/issuer from statement content
         */
        detectBankSmart(text) {
            const bankPatterns = {
                'RBC': /Royal Bank|RBC|ROYAL BANK OF CANADA|WestJet.*World.*Elite/i,
                'BMO': /Bank of Montreal|BMO|BMO BANK|Ascend.*World.*Elite|AIR MILES/i,
                'TD': /TD Canada Trust|TD Bank|TD CANADA|FIRST CLASS TRAVEL|Aeroplan.*Visa/i,
                'CIBC': /CIBC|Canadian Imperial Bank|Aventura|Costco.*World.*Mastercard/i,
                'Scotia': /Scotiabank|Scotia|THE BANK OF NOVA SCOTIA|Passport.*Visa/i,
                'Amex': /American Express|AMEX|The Business Platinum Card|Business Edge/i,
                'ATB': /ATB Financial|ATB|MyBudiness Rewards/i,
                'Capital One': /Capital One|CAPITAL ONE/i,
                'Servus': /Servus Credit Union|SERVUS/i
            };

            for (const [bank, pattern] of Object.entries(bankPatterns)) {
                if (pattern.test(text)) return bank;
            }

            return 'UNKNOWN';
        }

        /**
         * SMART PARSER - Extract universal metadata
         */
        extractUniversalMetadata(text, bank, type) {
            const metadata = {
                bank,
                type,
                accountHolder: null,
                accountNumber: null,
                statementPeriod: null,
                previousBalance: null,
                newBalance: null,
                currency: 'CAD'
            };

            // Account Holder Patterns
            const holderPatterns = [
                /MR\s+([A-Z\s]+)\s+\d{4}/,
                /MRS\s+([A-Z\s]+)\s+\d{4}/,
                /Customer Name[:\s]+(.+)/i,
                /Prepared For[:\s]+(.+)/i,
                /([A-Z\s]+)\s+\d{3}\s+[A-Z\s]+\s+(CALGARY|VANCOUVER|TORONTO|MONTREAL)/i,
                /([A-Z0-9\s]+LTD)\s+\d{4}/
            ];

            // Account Number Patterns
            const accountPatterns = [
                /(\d{4}\s+\d{2}\*\*\s+\*\*\*\*\s+\d{4})/,
                /Card Number[:\s]+(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/i,
                /Account #[:\s]+(\d+)/i,
                /Account Number[:\s]+(\d+)/i,
                /(XXXX\s+XXXX+\s+\d{4,5})/,
                /(\d{5}\s+\d{3,4}-\d{4,7})/
            ];

            // Statement Period Patterns
            const periodPatterns = [
                /STATEMENT FROM\s+(.+?)\s+TO\s+(.+)/i,
                /STATEMENT PERIOD[:\s]+(.+)/i,
                /PERIOD COVERED BY THIS STATEMENT[:\s]+(.+)/i,
                /Statement date[:\s]+(.+)/i,
                /(\w+\s+\d{1,2},\s+\d{4})\s+to\s+(\w+\s+\d{1,2},\s+\d{4})/i
            ];

            // Balance Patterns
            const prevBalancePatterns = [
                /PREVIOUS\s+STATEMENT\s+BALANCE[:\s]+\$?([\d,]+\.?\d{2})/i,
                /Previous Balance[:\s]+\$?([\d,]+\.?\d{2})/i,
                /Opening Balance[:\s]+\$?([\d,]+\.?\d{2})/i,
                /Your previous balance[:\s]+\$?([\d,]+\.?\d{2})/i
            ];

            const newBalancePatterns = [
                /NEW\s+BALANCE[:\s]+\$?([\d,]+\.?\d{2})/i,
                /Total balance[:\s]+\$?([\d,]+\.?\d{2})/i,
                /Closing Balance[:\s]+\$?([\d,]+\.?\d{2})/i,
                /Your new balance[:\s]+\$?([\d,]+\.?\d{2})/i
            ];

            // Extract using patterns
            for (const pattern of holderPatterns) {
                const match = text.match(pattern);
                if (match) {
                    metadata.accountHolder = match[1].trim();
                    break;
                }
            }

            for (const pattern of accountPatterns) {
                const match = text.match(pattern);
                if (match) {
                    metadata.accountNumber = match[1].trim();
                    break;
                }
            }

            for (const pattern of periodPatterns) {
                const match = text.match(pattern);
                if (match) {
                    metadata.statementPeriod = match[1].trim();
                    break;
                }
            }

            for (const pattern of prevBalancePatterns) {
                const match = text.match(pattern);
                if (match) {
                    metadata.previousBalance = parseFloat(match[1].replace(/,/g, ''));
                    break;
                }
            }

            for (const pattern of newBalancePatterns) {
                const match = text.match(pattern);
                if (match) {
                    metadata.newBalance = parseFloat(match[1].replace(/,/g, ''));
                    break;
                }
            }

            // Currency Detection
            if (/USD|US\s+Dollar|United States/i.test(text)) {
                metadata.currency = 'USD';
            }

            return metadata;
        }

        /**
         * SMART PARSER - Extract credit card transactions (all banks)
         */
        extractSmartCreditCard(text, bank) {
            const transactions = [];
            const lines = text.split('\n');

            // Detect year from statement
            let year = new Date().getFullYear();
            const yearMatch = text.match(/20\d{2}/);
            if (yearMatch) year = parseInt(yearMatch[0]);

            const months = {
                JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
                JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
                Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
            };

            // Detect if CIBC (has category column)
            const hasCategoryColumn = /CIBC|Costco.*World.*Mastercard/i.test(text);

            let previousMonth = -1;
            let currentYear = year;
            let descBuffer = '';

            // Base pattern: MMM DD   MMM DD   DESCRIPTION   AMOUNT
            // Handles: RBC, BMO, TD, Amex, Scotia, ATB, Capital One
            const basePattern = /^([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2}[-]?)$/;

            for (const line of lines) {
                const trimmed = line.trim();

                // Skip headers, empty, totals
                if (!trimmed || trimmed.length < 10) continue;
                if (/TRANSACTION|POSTING|DATE|DESCRIPTION|AMOUNT|ACTIVITY/i.test(trimmed)) continue;
                if (/STATEMENT|BALANCE|TOTAL|INTEREST|PAYMENT DUE|CREDIT LIMIT/i.test(trimmed)) continue;

                const match = trimmed.match(basePattern);

                if (match) {
                    const [, transMonth, transDay, postMonth, postDay, description, amountStr] = match;

                    const monthNum = months[transMonth] || months[transMonth.toUpperCase()];
                    if (monthNum === undefined) continue;

                    // Year rollover detection
                    if (previousMonth !== -1 && previousMonth === 11 && monthNum === 0) {
                        currentYear++;
                    }
                    previousMonth = monthNum;

                    // Parse amount (handle various formats)
                    let amount = parseFloat(amountStr.replace(/[$,\-]/g, ''));

                    // Scotia format: -123.45- means credit
                    if (amountStr.match(/^-[\d,]+\.?\d{2}-$/)) {
                        amount = -Math.abs(amount);
                    } else if (amountStr.startsWith('-')) {
                        amount = -Math.abs(amount);
                    }

                    // Add buffered description (multi-line handling)
                    let finalDesc = descBuffer ? descBuffer + ' ' + description : description;
                    descBuffer = '';

                    transactions.push({
                        date: `${currentYear}-${String(monthNum + 1).padStart(2, '0')}-${transDay.padStart(2, '0')}`,
                        description: finalDesc.trim(),
                        amount: Math.abs(amount),
                        type: amount < 0 ? 'credit' : 'debit'
                    });
                } else if (trimmed.length > 5 && !/^\d/.test(trimmed) && !/^[A-Z]{3}\s+\d{1,2}/.test(trimmed)) {
                    // Continuation line (multi-line description)
                    descBuffer += ' ' + trimmed;
                }
            }

            console.log(`🧠 Smart Credit Card Parser: Extracted ${transactions.length} transactions`);
            return transactions;
        }

        /**
         * SMART PARSER - Extract bank account transactions (all banks)
         */
        extractSmartBankAccount(text, bank) {
            const transactions = [];
            const lines = text.split('\n');

            // Detect year
            let year = new Date().getFullYear();
            const yearMatch = text.match(/20\d{2}/);
            if (yearMatch) year = parseInt(yearMatch[0]);

            const months = {
                Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
                Dec: 11
            };

            // Detect date format
            const hasSlashDate = /\d{2}\/\d{2}\/\d{4}/.test(text);
            const hasMonthDay = /[A-Z][a-z]{2}\s+\d{1,2}/.test(text);
            const hasDayMonth = /\d{1,2}\s+[A-Z][a-z]{2}/.test(text);

            for (const line of lines) {
                const trimmed = line.trim();

                // Skip headers
                if (!trimmed || trimmed.length < 10) continue;
                if (/DATE|DESCRIPTION|WITHDRAWALS|DEPOSITS|DEBITS|CREDITS|BALANCE/i.test(trimmed)) continue;
                if (/OPENING|CLOSING|STATEMENT|ACCOUNT SUMMARY/i.test(trimmed)) continue;

                let transaction = null;

                // Try MM/DD/YYYY format (Scotia Chequing)
                if (hasSlashDate) {
                    const match = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.?\d{2}|-)\s+([\d,]+\.?\d{2}|-)\s+([\d,]+\.?\d{2})$/);
                    if (match) {
                        const [, date, desc, withdrawal, deposit, balance] = match;
                        const [month, day, fullYear] = date.split('/');
                        const amount = withdrawal !== '-' ? parseFloat(withdrawal.replace(/,/g, '')) : parseFloat(deposit.replace(/,/g, ''));
                        const type = withdrawal !== '-' ? 'debit' : 'credit';

                        transaction = {
                            date: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
                            description: desc.trim(),
                            amount,
                            type
                        };
                    }
                }

                // Try DD MMM format (RBC Chequing)
                if (!transaction && hasDayMonth) {
                    const match = trimmed.match(/^(\d{1,2})\s+([A-Z][a-z]{2})\s+(.+?)\s+([\d,]+\.?\d{2}|-)\s+([\d,]+\.?\d{2}|-)\s+([\d,]+\.?\d{2}|-)$/);
                    if (match) {
                        const [, day, month, desc, withdrawal, deposit, balance] = match;
                        const monthNum = months[month];
                        if (monthNum !== undefined) {
                            const amount = withdrawal !== '-' ? parseFloat(withdrawal.replace(/,/g, '')) : parseFloat(deposit.replace(/,/g, ''));
                            const type = withdrawal !== '-' ? 'debit' : 'credit';

                            transaction = {
                                date: `${year}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}`,
                                description: desc.trim(),
                                amount,
                                type
                            };
                        }
                    }
                }

                // Try MMM DD format (ATB, Servus)
                if (!transaction && hasMonthDay) {
                    const match = trimmed.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+([\d,]+\.?\d{2}|-)\s+(\$?[\d,]+\.?\d{2}|-)\s+\$?([\d,]+\.?\d{2})$/);
                    if (match) {
                        const [, month, day, desc, debit, credit, balance] = match;
                        const monthNum = months[month];
                        if (monthNum !== undefined) {
                            const amount = debit !== '-' ? parseFloat(debit.replace(/[$,]/g, '')) : parseFloat(credit.replace(/[$,]/g, ''));
                            const type = debit !== '-' ? 'debit' : 'credit';

                            transaction = {
                                date: `${year}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}`,
                                description: desc.trim(),
                                amount,
                                type
                            };
                        }
                    }
                }

                if (transaction) {
                    transactions.push(transaction);
                }
            }

            console.log(`🧠 Smart Bank Account Parser: Extracted ${transactions.length} transactions`);
            return transactions;
        }

        /**
         * Parse PDF file and extract transactions
         * @param {File} file - PDF file to parse
         * @param {Object} options - Parsing options
         * @param {boolean} options.skipDuplicateCheck - Skip duplicate file detection (for Data Junkie)
         */
        async parsePDF(file, options = {}) {
            try {
                console.log('📄 Starting PDF parsing...');

                // Fallback for missing GlobalWorkerOptions (User fix)
                if ((!window.pdfjsLib.GlobalWorkerOptions || !window.pdfjsLib.GlobalWorkerOptions.workerSrc) && window.location.protocol !== 'file:') {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }

                // 1. Load PDF
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                console.log(`📄 PDF loaded: ${pdf.numPages} pages`);

                // 2. Extract text from all pages
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }

                console.log(`📄 Extracted ${fullText.length} characters`);

                // IMAGE CHECK (OCR Required)
                if (fullText.trim().length < 100) {
                    throw new Error('IMAGE_PDF: Document appears to be a scanned image (OCR required).');
                }

                // Calculate file hash (needed for duplicate check and saving)
                const fileHash = this.hashContent(fullText);

                // 2. DUPLICATE CHECK (Skip if requested by Data Junkie)
                if (!options.skipDuplicateCheck) {
                    let isDup = false;

                    if (window.BrainStorage) {
                        isDup = await window.BrainStorage.hasParsedFile(fileHash);
                    } else {
                        // Fallback to legacy
                        isDup = this.isDuplicate(fileHash);
                    }

                    if (isDup) {
                        console.warn(`🛑 Duplicate File Detected (Hash: ${fileHash}). Skipping.`);
                        throw new Error('DUPLICATE_FILE: This document has already been processed.');
                    }
                }

                // 3. Identify bank
                let bank = this.identifyBank(fullText);
                if (!bank) {
                    console.warn(`⚠️ Unable to identify bank.Using Generic Fallback Parser.`);
                    bank = {
                        name: 'Generic / Unknown Source',
                        type: 'generic',
                        patterns: {
                            // Generic Fallback Patterns (Risky but better than nothing)
                            // 1. YYYY-MM-DD Desc Amount
                            // 2. MM/DD/YYYY Desc Amount
                            // 3. MMM DD Desc Amount
                            transaction: /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{2,4}|[A-Z][a-z]{2}\s+\d{1,2})[\s|]+(.+?)[\s|]+(-?[\d,]+\.\d{2})/
                        },
                        dateFormat: 'AUTO'
                    };
                }

                console.log(`🏦 Identified bank: ${bank.name} `);

                // 4. Extract transactions & metadata
                const result = this.extractTransactions(fullText, bank);
                let transactions = [];
                let metadata = {};

                if (Array.isArray(result)) {
                    transactions = result;
                } else {
                    transactions = result.transactions;
                    metadata = result.metadata;
                }

                console.log(`✅ Extracted ${transactions.length} transactions`);

                // 2. Extracted Validation (If generic failed to get anything)
                if (transactions.length === 0) {
                    // If standard parsers failed, try "Line Scan" heuristic?
                    // For now, let's just let it return 0 and log warning
                    console.warn('Generic parser yielded 0 transactions.');
                }

                // 5. Calculate confidence
                const confidence = this.calculateConfidence(transactions);

                // 6. Save Hash ONLY if we extracted transactions successfully
                if (transactions.length > 0) {
                    if (window.BrainStorage) {
                        try {
                            await window.BrainStorage.markFileParsed(fileHash);
                            console.log('🧠 File hash saved to Brain.');
                        } catch (e) {
                            // Fallback
                            this.saveHash(fileHash);
                        }
                    } else {
                        this.saveHash(fileHash);
                    }
                } else {
                    console.warn('⚠️ No transactions extracted - hash NOT saved (can retry this file)');
                }

                return {
                    bank: bank.name,
                    transactions,
                    metadata,
                    confidence,
                    rawText: fullText // For debugging
                };
            } catch (error) {
                console.error('❌ PDF parsing failed:', error);
                throw error;
            }
        }

        /**
         * Identify bank from PDF text
         */
        identifyBank(text) {
            for (const [key, bank] of Object.entries(this.banks)) {
                if (bank.identifier.test(text)) {
                    return bank;
                }
            }
            return null;
        }

        /**
         * Extract transactions using bank-specific patterns
         */
        extractTransactions(text, bank) {
            // ========================================
            // SMART PARSER - Try intelligent classification first
            // ========================================
            console.log('🧠 Attempting Smart Parser...');

            const statementType = this.classifyStatementType(text);
            const detectedBank = this.detectBankSmart(text);

            console.log(`🧠 Smart Classification: Type = ${statementType}, Bank = ${detectedBank} `);

            let smartTransactions = [];
            let smartMetadata = {};

            // Try smart extraction
            if (statementType === 'CREDIT_CARD') {
                smartTransactions = this.extractSmartCreditCard(text, detectedBank);
                smartMetadata = this.extractUniversalMetadata(text, detectedBank, statementType);
            } else if (statementType === 'BANK_ACCOUNT') {
                smartTransactions = this.extractSmartBankAccount(text, detectedBank);
                smartMetadata = this.extractUniversalMetadata(text, detectedBank, statementType);
            }

            // If smart parser succeeded, return results
            if (smartTransactions.length > 0) {
                console.log(`✅ Smart Parser SUCCESS: ${smartTransactions.length} transactions`);
                return { transactions: smartTransactions, metadata: smartMetadata };
            }

            // ========================================
            // FALLBACK - Use legacy parsers
            // ========================================
            console.log('⚠️ Smart parser found 0 transactions, trying legacy parsers...');

            // Detect RBC Visa (credit card) vs RBC Chequing
            if (bank.name === 'RBC Royal Bank') {
                // Check if it's a Visa statement
                if (/RBC.*Visa/i.test(text) || /VISA.*BUSINESS/i.test(text)) {
                    console.log('🔍 Detected RBC Visa Credit Card statement');
                    return this.extractRBCVisaTransactions(text);
                }
                // Otherwise use chequing parser
                return this.extractRBCTransactions(text);
            }

            if (bank.name === 'CIBC') {
                return this.extractCIBCTransactions(text);
            }

            // BMO Parser
            if (bank.name === 'BMO Bank of Montreal') {
                return this.extractBMOTransactions(text);
            }

            // TD Parser
            if (bank.name === 'TD Canada Trust') {
                // Check if it's a Visa/credit card statement
                if (/TD.*VISA/i.test(text) || /FIRST CLASS TRAVEL/i.test(text)) {
                    console.log('🔍 Detected TD Visa Credit Card statement');
                    return this.extractTDVisaTransactions(text);
                }
                // Otherwise use generic TD parser
                return this.extractGenericTransactions(text);
            }

            // GENERIC PARSER
            if (bank.type === 'generic') {
                return this.extractGenericTransactions(text);
            }

            // Use regex-based parser for other banks
            const lines = text.split('\n');
            const transactions = [];
            let multilineDescription = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Skip garbage lines
                if (this.isGarbageLine(line)) {
                    multilineDescription = '';
                    continue;
                }

                // Try to match transaction pattern
                const match = line.match(bank.patterns.transaction);

                if (match) {
                    const [, dateStr, description, amountStr, debitCredit] = match;

                    // Determine if debit or credit
                    let amount = this.parseAmount(amountStr);
                    const type = this.determineType(line, debitCredit, amount);

                    // Make debits negative
                    if (type === 'debit') {
                        amount = -Math.abs(amount);
                    }

                    transactions.push({
                        date: this.normalizeDate(dateStr, bank.dateFormat),
                        description: (multilineDescription + ' ' + description).trim(),
                        amount,
                        type,
                        raw: line
                    });

                    multilineDescription = '';
                } else if (line.length > 0 && !this.isGarbageLine(line)) {
                    // Might be continuation of previous description
                    multilineDescription += ' ' + line;
                }
            }

            return transactions;
        }

        /**
         * RBC Visa Credit Card Parser
         * Format: TRANS_DATE   POST_DATE   DESCRIPTION   AMOUNT
         * Example: DEC 12   DEC 13   STARBUCKS COFFEE   15.50
         */
        extractRBCVisaTransactions(text) {
            const transactions = [];

            console.log(`🔍 RBC Visa Parser: Starting extraction...`);
            console.log(`📝 Text length: ${text.length} characters`);

            // 1. Detect Year
            let year = new Date().getFullYear();
            const yearMatch = text.match(/\b(20[2-3]\d)\b/);
            if (yearMatch) {
                year = parseInt(yearMatch[1]);
                console.log(`📅 Detected Year: ${year}`);
            }

            // 2. Extract Metadata
            const metadata = {
                accountHolder: null,
                accountNumber: null,
                statementPeriod: null,
                previousBalance: null,
                newBalance: null
            };

            const holderMatch = text.match(/([A-Z0-9\s]+LTD|[A-Z\s]+)\s+\d{4}\s+\d{2}\*\*/);
            if (holderMatch) metadata.accountHolder = holderMatch[1].trim();

            const accountMatch = text.match(/\d{4}\s+\d{2}\*\*\s+\*\*\*\*\s+(\d{4})/);
            if (accountMatch) metadata.accountNumber = `**** ${accountMatch[1]}`;

            const periodMatch = text.match(/STATEMENT FROM\s+(\w+\s+\d{1,2})\s+TO\s+(\w+\s+\d{1,2},?\s+\d{4})/i);
            if (periodMatch) metadata.statementPeriod = `${periodMatch[1]} to ${periodMatch[2]}`;

            const prevBalMatch = text.match(/PREVIOUS BALANCE[\s\S]*?\$?([\d,]+\.\d{2})/);
            if (prevBalMatch) metadata.previousBalance = parseFloat(prevBalMatch[1].replace(/,/g, ''));

            const newBalMatch = text.match(/NEW BALANCE[\s\S]*?\$?([\d,]+\.\d{2})/);
            if (newBalMatch) metadata.newBalance = parseFloat(newBalMatch[1].replace(/,/g, ''));

            console.log('📊 Extracted Metadata:', metadata);

            // 3. Extract Transactions using matchAll
            // Pattern: MMM DD MMM DD DESCRIPTION AMOUNT
            const visaPattern = /([A-Z]{3})\s+(\d{1,2})\s+([A-Z]{3})\s+(\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2})/g;

            const months = {
                JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
                JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
            };

            let previousMonth = -1;
            let currentYear = year;

            // Use matchAll to find ALL transactions in the continuous text
            const matches = text.matchAll(visaPattern);

            for (const match of matches) {
                const [, transMonth, transDay, postMonth, postDay, description, amountStr] = match;

                // Use transaction date (first date)
                const monthNum = months[transMonth.toUpperCase()];

                // Handle year rollover
                if (previousMonth !== -1 && previousMonth === 11 && monthNum === 0) {
                    currentYear++;
                }
                previousMonth = monthNum;

                // Parse amount - remove $ and commas
                let amount = parseFloat(amountStr.replace(/[$,]/g, ''));

                // Determine type
                const type = amount < 0 ? 'credit' : 'debit';
                amount = Math.abs(amount);

                // Format date
                const month = (monthNum + 1).toString().padStart(2, '0');
                const day = transDay.padStart(2, '0');
                const isoDate = `${currentYear}-${month}-${day}`;

                transactions.push({
                    date: isoDate,
                    description: description.trim(),
                    amount: amount,
                    type: type,
                    originalDate: `${transMonth} ${transDay}, ${currentYear}`
                });
            }

            console.log(`🎯 RBC Visa Parser: Extracted ${transactions.length} transactions`);
            return { transactions, metadata };
        }

        /**
         * Custom RBC parser for multi-column format
         * Format: Date   Description   Cheques & Debits ($)   Deposits & Credits ($)   Balance ($)
         */
        extractRBCTransactions(text) {
            const transactions = [];

            console.log(`🔍 RBC Parser: Starting extraction...`);
            console.log(`📝 Text length: ${text.length} characters`);
            console.log(`📄 First 500 chars: `, text.substring(0, 500));
            console.log(`📄 Last 500 chars: `, text.substring(text.length - 500));

            // 1. Better Year Detection
            let startYear = new Date().getFullYear();
            const periodMatch = text.match(/from\s+\w+\s+\d{1,2},?\s+(\d{4})\s+to/i);
            if (periodMatch) {
                startYear = parseInt(periodMatch[1]);
                console.log(`📅 Detected Statement Start Year: ${startYear} `);
            } else {
                const yearMatch = text.match(/\b20[2-3]\d\b/);
                if (yearMatch) startYear = parseInt(yearMatch[0]);
                console.log(`📅 Estimated Year: ${startYear} `);
            }

            // 2. Line-by-Line Parsing State
            const lines = text.split('\n');
            let currentDateStr = null;
            let currentYear = startYear;
            const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
            let previousMonthVal = -1;
            let descriptionBuffer = ''; // Store orphan text lines
            let currentRunningBalance = null; // Track running balance for logic

            // Regex for Date: "29 Feb" or "02 Mar"
            // Updated to work without ^ anchor and case-insensitive
            const lineDatePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i;

            // Metadata extraction
            const metadata = {
                openingBalance: null,
                closingBalance: null,
                totalDeposits: null,
                totalDeposits: null,
                totalDebits: null
            };

            let previousBalance = null; // State tracking for delta calculation

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();

                if (!line) {
                    descriptionBuffer = ''; // Clear buffer on empty
                    continue;
                }

                const lowerLine = line.toLowerCase();

                // Metadata Parsing
                if (lowerLine.includes('opening balance')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) {
                        const val = parseFloat(match[0].replace(/[$,]/g, ''));
                        metadata.openingBalance = val;
                        // Initialize tracking for Delta Logic
                        // Note: Opening Balance line is BEFORE transactions usually.
                        if (previousBalance === null) previousBalance = val;
                    }
                }
                if (lowerLine.includes('closing balance')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) metadata.closingBalance = parseFloat(match[0].replace(/[$,]/g, ''));
                }
                if (lowerLine.includes('total deposits') && lowerLine.includes('credits')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) metadata.totalDeposits = parseFloat(match[0].replace(/[$,]/g, ''));
                }
                if (lowerLine.includes('total cheques') && lowerLine.includes('debits')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) metadata.totalDebits = parseFloat(match[0].replace(/[$,]/g, ''));
                }

                // Skip known headers/garbage AFTER checking for metadata
                if (this.isGarbageLine(line)) {
                    descriptionBuffer = ''; // Clear buffer on garbage
                    continue;
                }
                if (/statement period/i.test(line)) continue;
                if (/royal bank/i.test(line)) continue;
                if (/page \d+/i.test(line)) continue;

                // Also skip the specific summary lines we just parsed so they don't become transactions
                if (lowerLine.includes('opening balance') ||
                    lowerLine.includes('closing balance') ||
                    (lowerLine.includes('total deposits') && lowerLine.includes('credits')) ||
                    (lowerLine.includes('total cheques') && lowerLine.includes('debits'))) {
                    continue;
                }

                // Check for Date
                const dateMatch = line.match(lineDatePattern);
                if (dateMatch) {
                    currentDateStr = dateMatch[1];
                    // Remove date from line for processing
                    line = line.substring(dateMatch[0].length).trim();

                    // Year Logic
                    const monthStr = currentDateStr.split(' ')[1];
                    const monthVal = months[monthStr];

                    if (previousMonthVal !== -1) {
                        if (previousMonthVal === 11 && monthVal === 0) {
                            currentYear++; // Dec -> Jan
                        }
                    }
                    previousMonthVal = monthVal;
                }

                // If we don't have a date yet, skipping (header junk before first txn)
                if (!currentDateStr) continue;

                // Look for Amounts: "-1,234.56" or "1234.56"
                const amountPattern = /-?[\d,]+\.\d{2}/g;
                const matches = line.match(amountPattern);

                // --- CRITICAL FIX: ORPHAN HANDLING ---
                if (!matches) {
                    // This line has text (maybe a Date) but no amount.
                    // It is likely the START of a split transaction.
                    // Example: "23 Jan e-Transfer received..." (No dollars)

                    // If we just found a date on this line, we MUST separate this text 
                    // from the previous transaction. It belongs to this new date context.
                    if (dateMatch) {
                        // New date context, start fresh buffer
                        descriptionBuffer = line;
                    } else {
                        // No date, just text. 
                        // Check if it's junk numbers or meaningful text
                        if (!line.match(/^\d+$/)) {
                            // Append to buffer for NEXT transaction
                            descriptionBuffer += (descriptionBuffer ? ' ' : '') + line;
                        }
                    }
                    continue;
                }

                // We have amounts.
                const firstAmountStr = matches[0];
                const firstAmountIndex = line.indexOf(firstAmountStr);

                let description = line.substring(0, firstAmountIndex).trim();

                // If description is empty (or purely whitespace), use buffer
                if (!description && descriptionBuffer) {
                    description = descriptionBuffer;
                    descriptionBuffer = '';
                } else if (description) {
                    // We have a description inline.
                    // Check if we also have a buffer waiting (e.g. from previous line with Date)
                    if (descriptionBuffer) {
                        description = descriptionBuffer + ' ' + description;
                        descriptionBuffer = '';
                    }
                } else {
                    // No desc, no buffer.
                    description = "Transaction";
                }

                // Filter out totals/balances lines that mimic transactions
                if (description.toLowerCase().includes('balance') ||
                    description.toLowerCase().includes('total')) continue;

                // Parse Amounts
                const amounts = matches.map(s => parseFloat(s.replace(/,/g, '')));
                let amount = amounts[0];
                let type = 'debit'; // Default to debit if unsure

                // --- 1. KEYWORD HEURISTICS ---
                const lowerDesc = description.toLowerCase();
                const creditKeywords = [
                    'deposit', 'credit', 'redemption', 'received', 'rcvd', 'return',
                    'refund', 'interest', 'dividend', 'royalty'
                ];

                // Check keywords
                if (creditKeywords.some(kw => lowerDesc.includes(kw))) {
                    type = 'credit';
                }

                // --- 2. BALANCE DELTA LOGIC (The Truth) ---
                // We track 'previousBalance' (initialized at openingBalance)
                // If we can match the math, we force the type.

                // Initialize running balance for the loop if not set
                if (currentRunningBalance === null && metadata.openingBalance !== null) {
                    currentRunningBalance = metadata.openingBalance;
                }

                let lineBalance = null;

                if (amounts.length >= 1) {
                    // Try to identify Balance Column
                    // In RBC, Balance is the LAST column.
                    if (amounts.length >= 2) {
                        const candidateBalance = amounts[amounts.length - 1]; // Last number
                        lineBalance = candidateBalance;

                        // If we have a previous balance reference
                        if (currentRunningBalance !== null) {
                            const diff = candidateBalance - currentRunningBalance;

                            // Check if it matches the transaction amount
                            // Tolerance for floating point
                            if (Math.abs(diff - amount) < 0.05) {
                                // Bal increased by Amount -> Credit
                                type = 'credit';
                            } else if (Math.abs(diff + amount) < 0.05) {
                                // Bal decreased by Amount -> Debit
                                type = 'debit';
                            }
                        }

                        // Update tracking balance for next line
                        currentRunningBalance = candidateBalance;
                    }
                    else if (amounts.length === 1) {
                        // Only amount, no balance on this line.
                        // We keep currentRunningBalance as is (from previous line)
                        // But we can't display a specific "Balance" for this row from the PDF text.
                        // Optional: Use calculated balance?
                        // For now, let's leave lineBalance as null or use current logic.
                    }
                }

                // Finalize Value
                if (type === 'credit') {
                    amount = Math.abs(amount);
                } else {
                    amount = Math.abs(amount); // Debits stored as positive magnitude
                }

                // Construct Date
                const mStr = currentDateStr.split(' ')[1];
                const dStr = currentDateStr.split(' ')[0].padStart(2, '0');
                const mIdx = months[mStr] + 1;
                const mNum = mIdx.toString().padStart(2, '0');

                const isoDate = `${currentYear} -${mNum} -${dStr} `;

                transactions.push({
                    date: isoDate,
                    description: description,
                    amount: amount,
                    type: type,
                    originalDate: `${currentDateStr} ${currentYear} `,
                    Balance: lineBalance !== null ? lineBalance : '' // Add Balance for Grid
                });
            }

            console.log(`\n🎯 RBC Parser(Line - Mode): Extracted ${transactions.length} transactions`);
            return { transactions, metadata };
        }

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
                metadata.accountNumber = `**** ${lastFour}`;
            }

            // Extract statement period
            const periodMatch2 = text.match(/PERIOD COVERED BY THIS STATEMENT\s+(.+)/i);
            if (periodMatch2) {
                metadata.statementPeriod = periodMatch2[1].trim();
            }

            // Extract previous balance
            const prevBalMatch = text.match(/Previous Balance.*?\$?([\d,]+\.?\d{2})/i);
            if (prevBalMatch) {
                metadata.previousBalance = parseFloat(prevBalMatch[1].replace(/,/g, ''));
            }

            // Extract new balance
            const newBalMatch = text.match(/New Balance.*?\$?([\d,]+\.?\d{2})/i);
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
            // Updated to be optional on Reference Number (some statements don't have it)
            // Regex: Date(MMM DD)  Space  Date(MMM DD)  Space  Desc(...)  Space  Ref(Optional)  Space  Amount

            // Debug: Show a snippet of the text to understand the format (remove after fix)
            console.log('📝 BMO Sample Text (First 200 chars):', text.substring(0, 200).replace(/\n/g, ' '));

            // Try strict pattern first (with Ref Number)
            let bmoPattern = /([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+(\d{8,})\s+([-]?[\d,]+\.?\d{2})/g;

            let matches = [...text.matchAll(bmoPattern)];

            if (matches.length === 0) {
                console.log('⚠️ Strict BMO pattern failed. Trying relaxed pattern (no ref number)...');
                // Relaxed pattern: No 10-digit ref number requirement. 
                // Assumes Amount is at the end of the line/block.
                // ([A-Z][a-z]{2})\s+(\d{1,2}) ... (.+?) ... ([-]?[\d,]+\.?\d{2})
                bmoPattern = /([A-Z][a-z]{2})\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+([-]?[\d,]+\.?\d{2})/g;
                matches = [...text.matchAll(bmoPattern)];
            }

            // Use matchAll to find all transactions
            // const matches = text.matchAll(bmoPattern); // Already array-ified above

            for (const match of matches) {
                let transMonth, transDay, postMonth, postDay, description, refNo, amountStr;

                if (match.length === 8) {
                    // Strict match result
                    [, transMonth, transDay, postMonth, postDay, description, refNo, amountStr] = match;
                } else {
                    // Relaxed match result (no refNo)
                    [, transMonth, transDay, postMonth, postDay, description, amountStr] = match;
                    refNo = 'N/A';
                }

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
                const isoDate = `--`;

                transactions.push({
                    date: isoDate,
                    description: description.trim(),
                    amount: amount,
                    type: type,
                    referenceNumber: refNo,
                    originalDate: ` , `
                });
            }

            console.log(`🎯 BMO Parser: Extracted ${transactions.length} transactions`);
            return { transactions, metadata };
        }

        /**
         * Custom CIBC Parser
         * Format: Trans Date | Post Date | Description | Spend Category | Amount
         * Ex: Mar 22 | Mar 23 | CALG CO-OP GAS BAR | Transportation | 27.22
         */
        extractCIBCTransactions(text) {
            const transactions = [];
            console.log(`🔍 CIBC Parser: Starting extraction...`);

            // 1. Year Detection
            let currentYear = new Date().getFullYear();
            // CIBC usually has "Statement Period: Mar 15 to Apr 15, 2024"
            const yearMatch = text.match(/Statement Period:.*?,?\s*(\d{4})/i);
            if (yearMatch) {
                currentYear = parseInt(yearMatch[1]);
                console.log(`📅 Detected Year: ${currentYear} `);
            }

            const lines = text.split('\n');
            const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

            // Regex for "MMM DD" at start of line
            const datePattern = /^([A-Z][a-z]{2}\s+\d{1,2})\s+/;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (this.isGarbageLine(line)) continue;
                if (!datePattern.test(line)) continue;

                // We have a date-led line.
                // Expected structure: "MMM DD   MMM DD   DESCRIPTION...  CATEGORY...  AMOUNT"
                // But text extraction might squash spaces.
                // We need to extract the LAST token as Amount.
                // And the date is the FIRST token (Trans Date).

                const match = line.match(datePattern);
                if (!match) continue;

                const dateStr = match[1];
                let content = line.substring(dateStr.length).trim();

                // Check for Post Date (optional 2nd date)
                // If the next token is also MMM DD, remove it.
                const postDateMatch = content.match(/^([A-Z][a-z]{2}\s+\d{1,2})\s+/);
                if (postDateMatch) {
                    content = content.substring(postDateMatch[0].length).trim();
                }

                // Extract Amount (Last token)
                // Handles "-123.45" or "123.45"
                const amountMatch = content.match(/-?[\d,]+\.\d{2}$/);
                if (!amountMatch) continue; // No amount found

                const amountStr = amountMatch[0];
                const amount = parseFloat(amountStr.replace(/,/g, ''));

                // Content *before* amount is Description + Category
                let descAndCat = content.substring(0, content.length - amountStr.length).trim();

                // Attempt to split Category (Last part of text)
                // CIBC Categories are usually PascalCase words: "Transportation", "Restaurants", "Groceries"
                // But Description is UPPERCASE usually: "CALG CO-OP GAS BAR"
                // Heuristic: If we see a transition from UPPER to Mixed/Pascal, that's the split.
                // OR we can just use a list of known CIBC categories if we want perfect accuracy.
                // Let's try to grab the last word or phrase if it matches known types.

                // For "CALG CO-OP GAS BAR #13 CALGARY AB Transportation"
                // Matches: "Transportation" (Pascal) vs "AB" (Upper)

                let category = '';
                // Check for common categories at end of string
                const commonCats = ['Transportation', 'Restaurants', 'Groceries', 'Entertainment', 'Gas', 'Merchandise', 'Health', 'Services', 'Dining', 'Travel'];

                for (const cat of commonCats) {
                    if (descAndCat.endsWith(cat)) {
                        category = cat;
                        descAndCat = descAndCat.substring(0, descAndCat.length - cat.length).trim();
                        break;
                    }
                }

                // Fallback: If description ends with known CIBC 'Spend Categories' generic headers
                // Or if we can detect the "CamelCase" vs "UPPERCASE" boundary.
                // Regular Expression for PascalCase word at end.
                if (!category) {
                    const pascalMatch = descAndCat.match(/\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/);
                    if (pascalMatch) {
                        // Likely a category if the visual separation existed
                        // But "McDonalds" might be in description. 
                        // CIBC Descriptions are often ALL CAPS "MCDONALDS 123"
                        // So if we see Pascal at end, it's likely category.
                        category = pascalMatch[1];
                        descAndCat = descAndCat.substring(0, descAndCat.length - category.length).trim();
                    }
                }

                const type = amount < 0 ? 'credit' : 'debit'; // CIBC: Credits are negative usually? Wait.
                // In screenshot: 27.22 (Gas) is positive.
                // -234.26 (Refund/Credit?) shown in screenshot? No negative shown.
                // Return/Credits usually have a minus or CR.
                // Let's assume positive = debit (spend) for CC statements usually.
                // And negative or CR = payment.

                const finalAmount = Math.abs(amount);

                // Date Parsing
                const monthStr = dateStr.split(' ')[0];
                const monthVal = months[monthStr] + 1;
                const dateVal = dateStr.split(' ')[1].padStart(2, '0');
                const isoDate = `${currentYear} -${monthVal.toString().padStart(2, '0')} -${dateVal} `;

                transactions.push({
                    date: isoDate,
                    description: descAndCat,
                    amount: finalAmount,
                    type: amount < 0 ? 'credit' : 'debit',
                    category: category, // Pass this to SmartCSVParser -> Training
                    originalDate: dateStr
                });
            }

            console.log(`✅ CIBC Parser: Extracted ${transactions.length} transactions`);
            return { transactions, metadata: {} };
        }

        /**
         * Generic Parser for Unknown PDFs
         * Attempts to find Date + Description + Amount patterns
         */
        extractGenericTransactions(text) {
            console.log(`🔍 Generic Parser: Attempting fallback extraction...`);
            const lines = text.split('\n');
            const transactions = [];

            // Regex Components
            // Enforce Date at START of line (tolerant of minimal leading garbage like a dash or space)
            const dateRgx = /^\s*[-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{2,4}|[A-Z][a-z]{2}\s+\d{1,2})/;

            // Amount: "-1,234.56" or "1,234.56CR" or "$1,234.56"
            // We look for this generally later in the line
            const amountRgx = /(-?\$?[\d,]+\.\d{2})([CR|DR])?/;

            for (const line of lines) {
                if (this.isGarbageLine(line)) continue;

                // Simple Line Matching
                const match = line.match(dateRgx);
                const amtMatch = line.match(amountRgx);

                if (match && amtMatch) {
                    const dateStr = match[1]; // Capture group 1 is the actual date string
                    const amountStr = amtMatch[1];

                    // Remove Date (and everything before it)
                    let description = line.substring(line.indexOf(dateStr) + dateStr.length);

                    // Remove Amount (and everything after it, typically)
                    // But amount might be in middle? 
                    // Let's just remove the amount string itself.
                    description = description.replace(amountStr, '');
                    description = description.replace(amtMatch[2] || '', ''); // remove CR/DR marker

                    // Cleanup: Remove leading/trailing non-alphanumeric (dashes, parens if unbalanced? no just trim)
                    // Remove leading punctuation often found like "- " or "| "
                    description = description.replace(/^[\s\-\|\.\,]+/, '').trim();
                    description = description.replace(/[\s\-\|\.\,]+$/, '').trim();

                    // Collapse spaces
                    description = description.replace(/\s+/g, ' ');

                    // Filter out short junk
                    if (description.length > 2 && !description.match(/^[0-9]+$/)) {

                        // Amount Parsing
                        let amount = parseFloat(amountStr.replace(/[$,]/g, ''));
                        let type = 'debit';

                        // Heuristics
                        if (amount < 0) {
                            type = 'credit';
                        }
                        if (line.includes('CR') || line.includes('Credit')) type = 'credit';

                        transactions.push({
                            date: this.normalizeDate(dateStr, 'AUTO'),
                            description: description,
                            amount: Math.abs(amount),
                            type: type,
                            originalDate: dateStr
                        });
                    }
                }
            }

            console.log(`✅ Generic Parser: Extracted ${transactions.length} potential transactions`);
            return transactions;
        }




        /**
         * Check if line is garbage (headers, footers, etc.)
         */
        isGarbageLine(line) {
            return this.garbagePatterns.some(pattern => pattern.test(line));
        }

        /**
         * Determine transaction type (debit/credit)
         */
        determineType(line, debitCreditMarker, amount) {
            // If explicit marker
            if (debitCreditMarker === 'D' || debitCreditMarker === 'C') {
                return debitCreditMarker === 'D' ? 'debit' : 'credit';
            }

            // Check for keywords
            const debitKeywords = /purchase|payment|withdrawal|fee|charge/i;
            const creditKeywords = /deposit|credit|refund|interest/i;

            if (debitKeywords.test(line)) return 'debit';
            if (creditKeywords.test(line)) return 'credit';

            // Default: negative = debit, positive = credit
            return amount < 0 ? 'debit' : 'credit';
        }

        /**
         * Normalize date to YYYY-MM-DD
         */
        normalizeDate(dateStr, format) {
            let date;

            try {
                if (format === 'YYYY-MM-DD') {
                    // Already in correct format
                    date = new Date(dateStr);
                } else if (format === 'MM/DD/YYYY') {
                    const [month, day, year] = dateStr.split('/');
                    date = new Date(year, month - 1, day);
                } else if (format === 'MM/DD/YY') {
                    const [month, day, year] = dateStr.split('/');
                    const fullYear = year.length === 2 ? '20' + year : year;
                    date = new Date(fullYear, month - 1, day);
                } else if (format === 'MMM DD, YYYY' || format === 'MMM DD YYYY') {
                    date = new Date(dateStr);
                } else if (format === 'AUTO') {
                    date = new Date(dateStr);
                }

                if (!date || isNaN(date.getTime())) {
                    throw new Error('Invalid Date');
                }

                return date.toISOString().split('T')[0];
            } catch (error) {
                console.error('Date parsing error:', dateStr, error);
                return dateStr; // Return original if parsing fails
            }
        }

        /**
         * Parse amount string to number
         */
        parseAmount(amountStr) {
            return parseFloat(amountStr.replace(/,/g, ''));
        }

        /**
         * Calculate confidence score based on data quality
         */
        calculateConfidence(transactions) {
            if (transactions.length === 0) return 0;

            let score = 0;
            const checks = [
                // All have valid dates
                transactions.every(t => !isNaN(new Date(t.date))),
                // All have valid amounts
                transactions.every(t => !isNaN(t.amount)),
                // All have descriptions
                transactions.every(t => t.description.length > 0),
                // Reasonable transaction count (not too few)
                transactions.length >= 5,
                // No duplicate transactions
                new Set(transactions.map(t => `${t.date} -${t.amount} `)).size === transactions.length
            ];

            score = checks.filter(Boolean).length / checks.length;

            return score;
        }

        /**
         * Get supported banks
         */
        getSupportedBanks() {
            return Object.values(this.banks).map(b => b.name);
        }

        /**
         * Generate a simple hash from string content
         * DJB2 Hash Algorithm
         */
        generateHash(str) {
            let hash = 5381;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
            }
            return Math.abs(hash).toString(16);
        }

        /**
         * Fallback for in-memory duplication check (if BrainStorage missing)
         */
        /**
         * Generate a simple hash from text content
         * @param {string} content - Text content to hash
         * @returns {string} Hash string
         */
        hashContent(content) {
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString(36);
        }

        isDuplicate(hash) {
            if (!this.processedHashes) this.processedHashes = new Set();
            if (this.processedHashes.has(hash)) return true;
            return false;
        }

        saveHash(hash) {
            if (!this.processedHashes) this.processedHashes = new Set();
            this.processedHashes.add(hash);
        }
    }

    // Export
    window.pdfParser = new PDFParser();
    console.log('📄 PDF Parser Loaded (v1.1 - Generic Fallback Support)');

})();
