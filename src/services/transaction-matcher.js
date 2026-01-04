/**
 * Transaction Matcher Engine v1.0
 * Bi-Directional Matching & Deduplication Service
 */

class TransactionMatcher {
    constructor() {
        this.fingerprints = new Set();
    }

    /**
     * Generates a unique hash for a transaction.
     * Uses: Date (YYYY-MM-DD), Amount (Absolute), and Normalized Description.
     * @param {Object} txn 
     */
    async generateHash(txn) {
        if (!txn) return null;

        // 1. Normalize Data
        const date = (txn.date || '').split('T')[0]; // YYYY-MM-DD
        const amount = Math.abs(parseFloat(txn.amount) || 0).toFixed(2);

        // Remove whitespace, special chars, and common prefixes for fuzzy matching
        let cleanDesc = (txn.description || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 30); // limit length

        const dataString = `${date}|${amount}|${cleanDesc}`;

        // 2. SHA-256 Hash
        const msgBuffer = new TextEncoder().encode(dataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return hashHex;
    }

    /**
     * Scans for exact duplicates within a dataset or against historical data.
     * @param {Array} newTransactions 
     * @param {Array} existingTransactions 
     */
    async findDuplicates(newTransactions, existingTransactions = []) {
        const duplicates = [];
        const seenHashes = new Map();

        // 1. Index Existing
        for (const txn of existingTransactions) {
            const hash = await this.generateHash(txn);
            if (hash) seenHashes.set(hash, txn.id);
        }

        // 2. Check New
        for (const txn of newTransactions) {
            const hash = await this.generateHash(txn);
            if (seenHashes.has(hash)) {
                duplicates.push({
                    new: txn,
                    existingId: seenHashes.get(hash),
                    hash: hash
                });
            } else {
                seenHashes.set(hash, txn.id || 'new_temp_id');
            }
        }

        return duplicates;
    }

    /**
     * Detects potential transfers between accounts.
     * Logic: Match Amount (A == B), Opposite Signs (Dr vs Cr), Date within 3 days.
     * @param {Array} allTransactions 
     */
    detectTransfers(allTransactions) {
        const potentialTransfers = [];
        const usedIds = new Set();

        // Sort by date to optimize window scanning
        const sorted = [...allTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 0; i < sorted.length; i++) {
            const t1 = sorted[i];
            if (usedIds.has(t1.id)) continue;

            // Should be categorized as Transfer or Uncategorized to be candidate?
            // Let's be broad: Just look for pattern.

            const t1Amount = Math.abs(parseFloat(t1.amount));
            if (t1Amount === 0) continue;

            // Look ahead in window
            for (let j = i + 1; j < sorted.length; j++) {
                const t2 = sorted[j];
                if (usedIds.has(t2.id)) continue;

                // Stop if date gap > 3 days
                const d1 = new Date(t1.date);
                const d2 = new Date(t2.date);
                const diffDays = Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));

                if (diffDays > 3) break;

                // Check Amount Match
                const t2Amount = Math.abs(parseFloat(t2.amount));
                if (Math.abs(t1Amount - t2Amount) < 0.02) {
                    // Check Logic: Must be opposite directions (Debit vs Credit)
                    // We need reliable type/direction.
                    const type1 = t1.type || (t1.debit > 0 ? 'debit' : 'credit');
                    const type2 = t2.type || (t2.debit > 0 ? 'debit' : 'credit');

                    if (type1 !== type2) {
                        potentialTransfers.push({
                            source: t1,
                            target: t2,
                            confidence: diffDays === 0 ? 0.95 : (0.9 - (diffDays * 0.1))
                        });
                        // Don't mark used yet, let user confirm? 
                        // For greedy matching, we might want to skip.
                        // Let's skip to avoid N:N matching chaos.
                        usedIds.add(t1.id);
                        usedIds.add(t2.id);
                        break; // Found match for t1
                    }
                }
            }
        }

        return potentialTransfers;
    }
}

window.TransactionMatcher = new TransactionMatcher();
console.log('🔗 Transaction Matcher v1.0 Loaded');
