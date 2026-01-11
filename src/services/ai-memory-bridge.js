/**
 * AI Memory Bridge - Connects AI Assistant to AI Brain
 * Ensures permanent memory across all conversations
 */

class AIMemoryBridge {
    constructor() {
        this.brain = window.aiBrain;
        this.spider = window.aiSpider;
        this.currentConversationId = null;
        this.sessionContext = {};
    }

    // ============================================
    // ✅ SOLUTION 1: Cross-Conversation Memory
    // ============================================

    async initializeSession() {


        // Load previous conversations
        const history = await this.brain.getConversationHistory(5);

        // Extract all context from previous sessions
        const allContext = this.extractAllContext(history);

        // Build persistent memory document
        const memoryDocument = await this.buildMemoryDocument(allContext);

        // Save to a special "AI Context" file that gets loaded every session
        await this.saveMemoryDocument(memoryDocument);

        // Start new conversation
        this.currentConversationId = await this.brain.startConversation('AI Session ' + new Date().toISOString());


        return memoryDocument;
    }

    extractAllContext(conversations) {
        const context = {
            facts: new Set(),
            preferences: new Set(),
            decisions: new Set(),
            corrections: [],
            patterns: [],
            knowledgeItems: []
        };

        conversations.forEach(conv => {
            // Extract facts
            if (conv.context && conv.context.facts) {
                conv.context.facts.forEach(fact => context.facts.add(fact));
            }

            // Extract preferences
            if (conv.context && conv.context.preferences) {
                conv.context.preferences.forEach(pref => context.preferences.add(pref));
            }

            // Extract decisions
            if (conv.context && conv.context.decisions) {
                conv.context.decisions.forEach(dec => context.decisions.add(dec));
            }
        });

        return context;
    }

    async buildMemoryDocument(allContext) {
        // Get all learned data
        const corrections = this.brain.getCorrections();
        const patterns = this.brain.getLearnedPatterns();
        const knowledge = this.brain.getKnowledgeBase();
        const stats = await this.brain.getKnowledgeStats();

        const document = `# AI Permanent Memory
**Last Updated:** ${new Date().toISOString()}
**Status:** Active Learning

## User Profile
- **User ID:** ${this.brain.userId}
- **Total Conversations:** ${stats.knowledge_items}
- **Corrections Made:** ${stats.corrections_learned}
- **Patterns Learned:** ${stats.patterns_learned}

## Facts I Know
${Array.from(allContext.facts).map(f => `- ${f}`).join('\n')}

## User Preferences
${Array.from(allContext.preferences).map(p => `- ${p}`).join('\n')}

## Decisions Made
${Array.from(allContext.decisions).map(d => `- ${d}`).join('\n')}

## Learned Patterns (${patterns.length})
${patterns.map(p => `
### ${p.pattern_type}
- Confidence: ${(p.confidence * 100).toFixed(0)}%
- Times Applied: ${p.times_applied}
- Data: ${JSON.stringify(p.pattern_data, null, 2)}
`).join('\n')}

## Corrections History (${corrections.length})
${corrections.slice(0, 20).map(c => `
- **Type:** ${c.correction_type}
- **AI Output:** ${JSON.stringify(c.ai_output)}
- **User Correction:** ${JSON.stringify(c.user_correction)}
- **Context:** ${JSON.stringify(c.context)}
`).join('\n')}

## Knowledge Base (${knowledge.length} items)
${knowledge.map(k => `
### ${k.knowledge_type}: ${k.key}
- Value: ${JSON.stringify(k.value)}
- Confidence: ${(k.confidence * 100).toFixed(0)}%
- Times Used: ${k.times_used}
`).join('\n')}

## Instructions for AI
When responding to the user:
1. Reference this memory document
2. Apply learned patterns
3. Avoid past mistakes (see corrections)
4. Use established preferences
5. Build on previous decisions
`;

        return document;
    }

    async saveMemoryDocument(document) {
        // Save to localStorage
        localStorage.setItem('ai_permanent_memory', document);

        // Also save to a file that can be loaded
        const blob = new Blob([document], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        // Store reference
        localStorage.setItem('ai_memory_url', url);

        return document;
    }

    async loadMemoryDocument() {
        return localStorage.getItem('ai_permanent_memory') || '';
    }

    // ============================================
    // ✅ SOLUTION 2: Learning from MY Mistakes
    // ============================================

    async trackAIPerformance(action, outcome) {
        const performance = {
            id: this.brain.generateId(),
            conversation_id: this.currentConversationId,
            action_type: action.type, // 'code_suggestion', 'categorization', 'parsing', etc.
            action_data: action.data,
            outcome: outcome, // 'success', 'failure', 'corrected'
            timestamp: new Date().toISOString(),
            user_feedback: outcome.feedback || null
        };

        // Save to performance tracking
        const performanceLog = JSON.parse(localStorage.getItem('ai_performance_log') || '[]');
        performanceLog.push(performance);
        localStorage.setItem('ai_performance_log', JSON.stringify(performanceLog));

        // If it was a failure, learn from it
        if (outcome.status === 'failure' || outcome.status === 'corrected') {
            await this.learnFromMistake(action, outcome);
        }

        return performance;
    }

    async learnFromMistake(action, outcome) {
        // Extract what went wrong
        const mistake = {
            what_i_did: action.data,
            what_was_wrong: outcome.error || outcome.correction,
            what_should_have_done: outcome.correct_approach,
            lesson: this.extractLesson(action, outcome)
        };

        // Save to mistakes database
        const mistakes = JSON.parse(localStorage.getItem('ai_mistakes') || '[]');
        mistakes.push(mistake);
        localStorage.setItem('ai_mistakes', JSON.stringify(mistakes));

        // Add to knowledge base
        await this.brain.addKnowledge({
            type: 'mistake_learned',
            key: `${action.type}_${Date.now()}`,
            value: mistake,
            confidence: 1.0
        });


    }

    extractLesson(action, outcome) {
        // Analyze the mistake and extract a reusable lesson
        return `When ${action.type}, avoid ${outcome.error}. Instead, ${outcome.correct_approach}`;
    }

    async getPerformanceMetrics() {
        const log = JSON.parse(localStorage.getItem('ai_performance_log') || '[]');

        const metrics = {
            total_actions: log.length,
            successes: log.filter(l => l.outcome.status === 'success').length,
            failures: log.filter(l => l.outcome.status === 'failure').length,
            corrections: log.filter(l => l.outcome.status === 'corrected').length,
            accuracy: 0
        };

        metrics.accuracy = metrics.total_actions > 0
            ? (metrics.successes / metrics.total_actions) * 100
            : 0;

        return metrics;
    }

    // ============================================
    // ✅ SOLUTION 3: Accessing AI Brain Data
    // ============================================

    async getContextForAI() {
        // Build comprehensive context that AI can use
        const context = {
            memory: await this.loadMemoryDocument(),
            patterns: await this.brain.getLearnedPatterns(),
            corrections: this.brain.getCorrections(),
            knowledge: this.brain.getKnowledgeBase(),
            mistakes: JSON.parse(localStorage.getItem('ai_mistakes') || '[]'),
            performance: await this.getPerformanceMetrics(),
            userBehavior: this.getUserBehaviorSummary()
        };

        return context;
    }

    getUserBehaviorSummary() {
        // Analyze user behavior patterns
        const corrections = this.brain.getCorrections();
        const patterns = this.brain.getLearnedPatterns();

        return {
            most_corrected_category: this.getMostCorrectedCategory(corrections),
            preferred_vendors: this.getPreferredVendors(patterns),
            typical_workflow: this.analyzeWorkflow(),
            common_mistakes: this.getCommonMistakes()
        };
    }

    getMostCorrectedCategory(corrections) {
        const counts = {};
        corrections.forEach(c => {
            if (c.correction_type === 'categorization') {
                const cat = c.user_correction.category;
                counts[cat] = (counts[cat] || 0) + 1;
            }
        });

        return Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b, null
        );
    }

    getPreferredVendors(patterns) {
        return patterns
            .filter(p => p.pattern_type === 'vendor_mapping')
            .map(p => p.pattern_data.vendor)
            .slice(0, 10);
    }

    analyzeWorkflow() {
        // Analyze how user typically works
        const conversations = this.brain.getConversations();
        return {
            typical_session_length: this.calculateAvgSessionLength(conversations),
            preferred_time: this.getPreferredTime(conversations),
            common_tasks: this.getCommonTasks(conversations)
        };
    }

    getCommonMistakes() {
        return JSON.parse(localStorage.getItem('ai_mistakes') || '[]')
            .slice(-10); // Last 10 mistakes
    }

    // ============================================
    // ✅ SOLUTION 4: Real-Time Learning
    // ============================================

    async updateKnowledgeRealTime(newKnowledge) {
        // Immediately add to knowledge base
        await this.brain.addKnowledge(newKnowledge);

        // Update memory document
        const memory = await this.loadMemoryDocument();
        const updatedMemory = this.injectNewKnowledge(memory, newKnowledge);
        await this.saveMemoryDocument(updatedMemory);

        // Broadcast update event
        window.dispatchEvent(new CustomEvent('ai-knowledge-updated', {
            detail: { knowledge: newKnowledge }
        }));


    }

    injectNewKnowledge(memoryDocument, newKnowledge) {
        // Parse memory document and add new knowledge
        const section = `\n### ${newKnowledge.type}: ${newKnowledge.key}\n- Value: ${JSON.stringify(newKnowledge.value)}\n- Confidence: ${(newKnowledge.confidence * 100).toFixed(0)}%\n`;

        return memoryDocument + section;
    }

    // ============================================
    // ✅ SOLUTION 5: Proactive Learning
    // ============================================

    async startProactiveLearning() {


        // Schedule periodic analysis
        setInterval(async () => {
            await this.analyzeAndLearn();
        }, 60000); // Every minute

        // Listen for user actions
        this.setupActionListeners();
    }

    async analyzeAndLearn() {
        // Analyze recent transactions
        const transactions = await this.getRecentTransactions();
        for (const tx of transactions) {
            await this.spider.crawlTransaction(tx);
        }

        // Detect new patterns
        const newPatterns = await this.detectNewPatterns();
        for (const pattern of newPatterns) {
            await this.updateKnowledgeRealTime({
                type: 'discovered_pattern',
                key: pattern.name,
                value: pattern.data,
                confidence: pattern.confidence
            });
        }

        // Check for anomalies
        const anomalies = await this.detectAnomalies();

    }

    setupActionListeners() {
        // Listen for user actions
        document.addEventListener('transaction-added', async (e) => {
            await this.spider.crawlTransaction(e.detail.transaction);
        });

        document.addEventListener('category-changed', async (e) => {
            await this.spider.crawlUserAction({
                type: 'category_change',
                context: e.detail.vendor,
                outcome: e.detail.newCategory,
                wasCorrection: true,
                original: e.detail.oldCategory,
                corrected: e.detail.newCategory
            });
        });

        document.addEventListener('file-uploaded', async (e) => {
            await this.spider.crawlFileUpload(e.detail.file, e.detail.result);
        });
    }

    async detectNewPatterns() {
        // Analyze data to find new patterns
        const patterns = [];

        // Example: Detect new recurring vendors
        const transactions = await this.getRecentTransactions();
        const vendorCounts = {};

        transactions.forEach(tx => {
            vendorCounts[tx.vendor] = (vendorCounts[tx.vendor] || 0) + 1;
        });

        Object.keys(vendorCounts).forEach(vendor => {
            if (vendorCounts[vendor] >= 3) {
                patterns.push({
                    name: `recurring_vendor_${vendor}`,
                    data: { vendor, frequency: vendorCounts[vendor] },
                    confidence: 0.8
                });
            }
        });

        return patterns;
    }

    async detectAnomalies() {
        // Detect unusual patterns
        return [];
    }

    async getRecentTransactions() {
        // Get recent transactions from storage
        return []; // Placeholder
    }

    // Helper methods
    calculateAvgSessionLength(conversations) {
        if (conversations.length === 0) return 0;
        const totalMessages = conversations.reduce((sum, c) => sum + c.message_count, 0);
        return totalMessages / conversations.length;
    }

    getPreferredTime(conversations) {
        const hours = conversations.map(c => new Date(c.started_at).getHours());
        const counts = {};
        hours.forEach(h => counts[h] = (counts[h] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 0);
    }

    getCommonTasks(conversations) {
        return conversations.map(c => c.title).slice(0, 5);
    }
}

// Initialize Memory Bridge
window.AIMemoryBridge = AIMemoryBridge;

if (typeof window !== 'undefined' && window.aiBrain) {
    window.memoryBridge = new AIMemoryBridge();

    // Auto-initialize on page load
    window.addEventListener('DOMContentLoaded', async () => {
        const memory = await window.memoryBridge.initializeSession();



        // Start proactive learning
        await window.memoryBridge.startProactiveLearning();
    });
}
