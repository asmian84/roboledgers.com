/**
 * AI Spider - Intelligent Hint System
 * Crawls data, learns patterns, provides contextual hints only when truly helpful
 */

class AISpider {
    constructor(brain) {
        this.brain = brain;
        this.patterns = new Map();
        this.userBehavior = new Map();
        this.hintThresholds = {
            confidence: 0.8,      // Only show hints we're 80%+ confident about
            severity: 'medium',   // Only show for medium+ severity issues
            frequency: 3,         // Only after seeing pattern 3+ times
            cooldown: 300000      // 5 min cooldown between hints (don't annoy)
        };
        this.lastHintTime = 0;
        this.hintsShown = new Set();
    }

    // ============================================
    // DATA CRAWLING
    // ============================================

    async crawlTransaction(transaction) {
        // Extract patterns from transaction
        const patterns = {
            vendor: transaction.vendor,
            amount: transaction.amount,
            category: transaction.category,
            date: transaction.date,
            description: transaction.description
        };

        // Store in pattern map
        const key = this.generatePatternKey(patterns);
        if (!this.patterns.has(key)) {
            this.patterns.set(key, {
                count: 0,
                firstSeen: new Date(),
                lastSeen: new Date(),
                variations: [],
                userActions: []
            });
        }

        const pattern = this.patterns.get(key);
        pattern.count++;
        pattern.lastSeen = new Date();
        pattern.variations.push(transaction);

        // Save to brain
        await this.brain.addKnowledge({
            type: 'transaction_pattern',
            key,
            value: patterns,
            confidence: this.calculateConfidence(pattern)
        });
    }

    async crawlUserAction(action) {
        // Track what user does
        const key = `${action.type}_${action.context}`;

        if (!this.userBehavior.has(key)) {
            this.userBehavior.set(key, {
                count: 0,
                outcomes: [],
                mistakes: [],
                corrections: []
            });
        }

        const behavior = this.userBehavior.get(key);
        behavior.count++;
        behavior.outcomes.push(action.outcome);

        // Detect mistakes
        if (action.wasCorrection) {
            behavior.mistakes.push({
                original: action.original,
                corrected: action.corrected,
                timestamp: new Date()
            });
        }
    }

    async crawlFileUpload(file, result) {
        // Learn from file uploads
        const filePattern = {
            bank: result.metadata.bank,
            type: result.metadata.type,
            transactionCount: result.transactions.length,
            success: result.success,
            confidence: result.confidence
        };

        await this.brain.saveParsingPattern(file, result);

        // Detect issues
        if (result.confidence < 0.7) {
            this.detectParsingIssue(file, result);
        }
    }

    // ============================================
    // PATTERN DETECTION
    // ============================================

    detectParsingIssue(file, result) {
        return {
            severity: 'high',
            type: 'low_confidence_parse',
            message: `Low confidence (${(result.confidence * 100).toFixed(0)}%) parsing ${file.name}`,
            suggestion: 'This statement format might be new. Review extracted transactions carefully.',
            data: { file: file.name, confidence: result.confidence }
        };
    }

    detectDuplicateTransaction(transaction, existing) {
        return {
            severity: 'medium',
            type: 'potential_duplicate',
            message: 'Potential duplicate transaction detected',
            suggestion: `Similar transaction found: ${existing.description} on ${existing.date}`,
            data: { transaction, existing }
        };
    }

    detectUnusualAmount(transaction, historicalAvg) {
        const deviation = Math.abs(transaction.amount - historicalAvg) / historicalAvg;

        if (deviation > 2.0) { // 200% deviation
            return {
                severity: 'high',
                type: 'unusual_amount',
                message: `Unusual amount for ${transaction.vendor}`,
                suggestion: `Typically ${transaction.vendor} is around $${historicalAvg.toFixed(2)}, but this is $${transaction.amount.toFixed(2)}`,
                data: { transaction, historicalAvg, deviation }
            };
        }

        return null;
    }

    detectMissingCategory(transaction) {
        // Check if similar transactions have categories
        const similar = this.findSimilarTransactions(transaction);
        const categorized = similar.filter(t => t.category);

        if (categorized.length >= 3) {
            const mostCommon = this.getMostCommonCategory(categorized);
            return {
                severity: 'low',
                type: 'missing_category',
                message: 'Transaction not categorized',
                suggestion: `Similar transactions are usually: ${mostCommon}`,
                data: { transaction, suggestion: mostCommon }
            };
        }

        return null;
    }

    detectRecurringTransaction(transaction) {
        const similar = this.findSimilarTransactions(transaction);

        if (similar.length >= 3) {
            const isMonthly = this.checkMonthlyPattern(similar);
            if (isMonthly) {
                return {
                    severity: 'low',
                    type: 'recurring_transaction',
                    message: 'Recurring transaction detected',
                    suggestion: `${transaction.vendor} appears monthly. Consider setting up auto-categorization.`,
                    data: { transaction, frequency: 'monthly' }
                };
            }
        }

        return null;
    }

    detectCategoryMismatch(transaction, suggestedCategory) {
        if (transaction.category && transaction.category !== suggestedCategory) {
            const confidence = this.getCategoryConfidence(transaction.vendor, suggestedCategory);

            if (confidence > 0.9) {
                return {
                    severity: 'medium',
                    type: 'category_mismatch',
                    message: 'Unusual category for this vendor',
                    suggestion: `${transaction.vendor} is usually categorized as ${suggestedCategory}`,
                    data: { transaction, suggestedCategory, confidence }
                };
            }
        }

        return null;
    }

    // ============================================
    // INTELLIGENT HINT SYSTEM
    // ============================================

    async analyzeAndHint(context) {
        // Analyze current context and decide if hint is needed
        const issues = [];

        // Run all detectors
        if (context.type === 'transaction') {
            const transaction = context.data;

            // Check for duplicates
            const existing = await this.findExistingTransaction(transaction);
            if (existing) {
                const issue = this.detectDuplicateTransaction(transaction, existing);
                if (issue) issues.push(issue);
            }

            // Check for unusual amounts
            const avgAmount = await this.getAverageAmount(transaction.vendor);
            if (avgAmount) {
                const issue = this.detectUnusualAmount(transaction, avgAmount);
                if (issue) issues.push(issue);
            }

            // Check for missing category
            if (!transaction.category) {
                const issue = this.detectMissingCategory(transaction);
                if (issue) issues.push(issue);
            }

            // Check for recurring pattern
            const issue = this.detectRecurringTransaction(transaction);
            if (issue) issues.push(issue);
        }

        if (context.type === 'file_upload') {
            const { file, result } = context.data;

            if (result.confidence < 0.7) {
                const issue = this.detectParsingIssue(file, result);
                issues.push(issue);
            }
        }

        // Filter and prioritize issues
        const hints = this.filterHints(issues);

        return hints;
    }

    filterHints(issues) {
        // Only show hints that meet thresholds
        const now = Date.now();

        return issues.filter(issue => {
            // Check severity
            if (issue.severity === 'low' && this.hintThresholds.severity !== 'low') {
                return false;
            }

            // Check cooldown (don't annoy user)
            if (now - this.lastHintTime < this.hintThresholds.cooldown) {
                return false;
            }

            // Check if we've shown this hint recently
            const hintKey = `${issue.type}_${JSON.stringify(issue.data)}`;
            if (this.hintsShown.has(hintKey)) {
                return false;
            }

            // Check confidence
            if (issue.data.confidence && issue.data.confidence < this.hintThresholds.confidence) {
                return false;
            }

            return true;
        });
    }

    async showHint(hint) {
        // Only show in dire situations
        if (hint.severity !== 'high' && hint.severity !== 'medium') {
            return; // Don't show low severity hints
        }

        // Update tracking
        this.lastHintTime = Date.now();
        const hintKey = `${hint.type}_${JSON.stringify(hint.data)}`;
        this.hintsShown.add(hintKey);

        // Show hint to user
        const hintElement = this.createHintElement(hint);
        this.displayHint(hintElement);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            this.dismissHint(hintElement);
        }, 10000);
    }

    createHintElement(hint) {
        const severity = hint.severity;
        const icon = severity === 'high' ? '⚠️' : severity === 'medium' ? '💡' : 'ℹ️';

        return `
            <div class="ai-hint ai-hint-${severity}" id="hint-${Date.now()}">
                <div class="hint-icon">${icon}</div>
                <div class="hint-content">
                    <div class="hint-message">${hint.message}</div>
                    <div class="hint-suggestion">${hint.suggestion}</div>
                </div>
                <button class="hint-dismiss" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
    }

    displayHint(hintHtml) {
        // Add to hint container
        let container = document.getElementById('ai-hints-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ai-hints-container';
            container.className = 'ai-hints-container';
            document.body.appendChild(container);
        }

        container.insertAdjacentHTML('beforeend', hintHtml);
    }

    dismissHint(hintElement) {
        if (typeof hintElement === 'string') {
            const el = document.querySelector(hintElement);
            if (el) el.remove();
        } else {
            hintElement.remove();
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    generatePatternKey(patterns) {
        return `${patterns.vendor}_${patterns.category}`;
    }

    calculateConfidence(pattern) {
        // More occurrences = higher confidence
        const countScore = Math.min(pattern.count / 10, 1.0);

        // Recent activity = higher confidence
        const daysSinceLastSeen = (Date.now() - pattern.lastSeen) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(1 - (daysSinceLastSeen / 30), 0);

        return (countScore * 0.7) + (recencyScore * 0.3);
    }

    findSimilarTransactions(transaction) {
        // Find transactions with same vendor
        const allPatterns = Array.from(this.patterns.values());
        return allPatterns
            .filter(p => p.variations.some(v => v.vendor === transaction.vendor))
            .flatMap(p => p.variations);
    }

    getMostCommonCategory(transactions) {
        const counts = {};
        transactions.forEach(t => {
            counts[t.category] = (counts[t.category] || 0) + 1;
        });

        return Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b
        );
    }

    checkMonthlyPattern(transactions) {
        // Check if transactions occur roughly monthly
        const dates = transactions.map(t => new Date(t.date)).sort();
        const intervals = [];

        for (let i = 1; i < dates.length; i++) {
            const days = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
            intervals.push(days);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return avgInterval >= 25 && avgInterval <= 35; // ~30 days
    }

    async getAverageAmount(vendor) {
        const similar = this.findSimilarTransactions({ vendor });
        if (similar.length === 0) return null;

        const total = similar.reduce((sum, t) => sum + t.amount, 0);
        return total / similar.length;
    }

    getCategoryConfidence(vendor, category) {
        const similar = this.findSimilarTransactions({ vendor });
        const withCategory = similar.filter(t => t.category === category);

        return similar.length > 0 ? withCategory.length / similar.length : 0;
    }

    async findExistingTransaction(transaction) {
        // Check for duplicates (same vendor, amount, date within 1 day)
        const similar = this.findSimilarTransactions(transaction);

        return similar.find(t =>
            Math.abs(t.amount - transaction.amount) < 0.01 &&
            Math.abs(new Date(t.date) - new Date(transaction.date)) < 86400000 // 1 day
        );
    }
}

// Initialize global AI Spider
window.AISpider = AISpider;

if (typeof window !== 'undefined' && window.aiBrain) {
    window.aiSpider = new AISpider(window.aiBrain);
    console.log('🕷️ AI Spider initialized - Crawling data, learning patterns, ready to help!');
}
