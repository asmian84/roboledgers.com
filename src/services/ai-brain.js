/**
 * AI Persistence Layer - Brain Storage Service
 * Makes the AI remember, learn, and improve over time
 */

class AIBrain {
    constructor(userId) {
        this.userId = userId;
        this.currentSession = null;
        this.conversationId = null;
    }

    // ============================================
    // CONVERSATION MEMORY
    // ============================================

    async startConversation(title = null) {
        console.log('🧠 Starting new AI conversation session...');

        const conversation = {
            user_id: this.userId,
            session_id: this.generateSessionId(),
            started_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
            title: title || 'New Conversation',
            summary: '',
            context: {},
            message_count: 0,
            is_active: true
        };

        // Save to localStorage (will move to Supabase)
        const conversations = this.getConversations();
        conversation.id = this.generateId();
        conversations.push(conversation);
        localStorage.setItem('ai_conversations', JSON.stringify(conversations));

        this.currentSession = conversation;
        this.conversationId = conversation.id;

        console.log('✅ Conversation started:', conversation.id);
        return conversation;
    }

    async saveMessage(role, content, metadata = {}) {
        if (!this.conversationId) {
            await this.startConversation();
        }

        const message = {
            id: this.generateId(),
            conversation_id: this.conversationId,
            role, // 'user' or 'assistant'
            content,
            metadata,
            timestamp: new Date().toISOString(),
            tokens_used: this.estimateTokens(content)
        };

        // Save message
        const messages = this.getMessages();
        messages.push(message);
        localStorage.setItem('ai_messages', JSON.stringify(messages));

        // Update conversation
        const conversations = this.getConversations();
        const conv = conversations.find(c => c.id === this.conversationId);
        if (conv) {
            conv.last_message_at = new Date().toISOString();
            conv.message_count++;
            localStorage.setItem('ai_conversations', JSON.stringify(conversations));
        }

        console.log(`💬 Saved ${role} message:`, message.id);
        return message;
    }

    async getConversationHistory(limit = 5) {
        const conversations = this.getConversations()
            .filter(c => c.user_id === this.userId)
            .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
            .slice(0, limit);

        // Attach messages to each conversation
        const messages = this.getMessages();
        conversations.forEach(conv => {
            conv.messages = messages.filter(m => m.conversation_id === conv.id);
        });

        return conversations;
    }

    async resumeConversation(conversationId) {
        const conversations = this.getConversations();
        const conv = conversations.find(c => c.id === conversationId);

        if (conv) {
            this.currentSession = conv;
            this.conversationId = conv.id;

            const messages = this.getMessages()
                .filter(m => m.conversation_id === conversationId);

            console.log(`🔄 Resumed conversation: ${conv.title} (${messages.length} messages)`);
            return { conversation: conv, messages };
        }

        return null;
    }

    async saveContext(contextType, key, value, confidence = 1.0) {
        const context = {
            id: this.generateId(),
            conversation_id: this.conversationId,
            context_type: contextType, // 'fact', 'preference', 'decision', 'file'
            key,
            value,
            confidence,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const contexts = this.getContexts();
        contexts.push(context);
        localStorage.setItem('ai_contexts', JSON.stringify(contexts));

        console.log(`📝 Saved context: ${contextType} - ${key}`);
        return context;
    }

    // ============================================
    // CORRECTION LEARNING
    // ============================================

    async recordCorrection(correction) {
        const record = {
            id: this.generateId(),
            user_id: this.userId,
            conversation_id: this.conversationId,
            correction_type: correction.type, // 'code', 'categorization', 'parsing', 'suggestion'
            ai_output: correction.aiOutput,
            ai_reasoning: correction.aiReasoning || '',
            user_correction: correction.userCorrection,
            user_feedback: correction.userFeedback || '',
            context: correction.context || {},
            pattern_extracted: null,
            confidence: 0.5,
            applied_count: 0,
            success_rate: 0,
            created_at: new Date().toISOString()
        };

        // Extract pattern from correction
        const pattern = this.extractPattern(correction);
        if (pattern) {
            record.pattern_extracted = pattern;
            await this.saveLearnedPattern(pattern);
        }

        // Save correction
        const corrections = this.getCorrections();
        corrections.push(record);
        localStorage.setItem('ai_corrections', JSON.stringify(corrections));

        console.log(`🎓 Learned from correction: ${correction.type}`);
        return record;
    }

    extractPattern(correction) {
        if (correction.type === 'categorization') {
            // Extract vendor → account mapping pattern
            return {
                type: 'vendor_mapping',
                vendor: correction.context.vendor,
                account: correction.userCorrection.account,
                gifi: correction.userCorrection.gifi,
                condition: {
                    description_contains: correction.context.description,
                    amount_range: this.getAmountRange(correction.context.amount)
                }
            };
        }

        if (correction.type === 'parsing') {
            // Extract parsing rule pattern
            return {
                type: 'parsing_rule',
                bank: correction.context.bank,
                rule: correction.userCorrection.rule,
                format: correction.userCorrection.format
            };
        }

        return null;
    }

    async saveLearnedPattern(pattern) {
        const existing = this.getLearnedPatterns()
            .find(p =>
                p.user_id === this.userId &&
                p.pattern_type === pattern.type &&
                JSON.stringify(p.pattern_data) === JSON.stringify(pattern)
            );

        if (existing) {
            // Reinforce existing pattern
            existing.learned_from_corrections++;
            existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
            existing.last_updated_at = new Date().toISOString();

            const patterns = this.getLearnedPatterns();
            const index = patterns.findIndex(p => p.id === existing.id);
            patterns[index] = existing;
            localStorage.setItem('ai_learned_patterns', JSON.stringify(patterns));

            console.log(`✨ Reinforced pattern: ${pattern.type} (confidence: ${existing.confidence})`);
        } else {
            // Create new pattern
            const newPattern = {
                id: this.generateId(),
                user_id: this.userId,
                pattern_type: pattern.type,
                pattern_data: pattern,
                learned_from_corrections: 1,
                times_applied: 0,
                times_correct: 0,
                confidence: 0.7,
                created_at: new Date().toISOString(),
                last_used_at: null,
                last_updated_at: new Date().toISOString()
            };

            const patterns = this.getLearnedPatterns();
            patterns.push(newPattern);
            localStorage.setItem('ai_learned_patterns', JSON.stringify(patterns));

            console.log(`🆕 Created new pattern: ${pattern.type}`);
        }
    }

    async getLearnedPatterns(patternType = null) {
        let patterns = this.getLearnedPatterns()
            .filter(p => p.user_id === this.userId && p.confidence >= 0.5);

        if (patternType) {
            patterns = patterns.filter(p => p.pattern_type === patternType);
        }

        return patterns.sort((a, b) => b.confidence - a.confidence);
    }

    // ============================================
    // USER-SPECIFIC PARSING
    // ============================================

    async saveParsingPattern(file, result) {
        const pattern = {
            id: this.generateId(),
            user_id: this.userId,
            bank: result.metadata.bank,
            statement_type: result.metadata.type,
            pattern_data: {
                transactionPattern: result.patternUsed,
                metadataPatterns: result.metadataPatterns,
                dateFormat: result.dateFormat
            },
            sample_statement_hash: result.fileHash,
            times_used: 1,
            times_successful: 1,
            success_rate: 1.0,
            confidence: result.confidence,
            first_seen: new Date().toISOString(),
            last_used: new Date().toISOString(),
            last_successful: new Date().toISOString()
        };

        const patterns = this.getParsingPatterns();
        patterns.push(pattern);
        localStorage.setItem('user_parsing_patterns', JSON.stringify(patterns));

        console.log(`📊 Saved parsing pattern: ${result.metadata.bank} ${result.metadata.type}`);
        return pattern;
    }

    async getUserParsingPatterns(bank = null, type = null) {
        let patterns = this.getParsingPatterns()
            .filter(p => p.user_id === this.userId && p.confidence >= 0.6);

        if (bank) patterns = patterns.filter(p => p.bank === bank);
        if (type) patterns = patterns.filter(p => p.statement_type === type);

        return patterns.sort((a, b) => b.success_rate - a.success_rate);
    }

    async trackParsingSuccess(patternId, success) {
        const patterns = this.getParsingPatterns();
        const pattern = patterns.find(p => p.id === patternId);

        if (pattern) {
            pattern.times_used++;
            if (success) pattern.times_successful++;
            pattern.success_rate = pattern.times_successful / pattern.times_used;
            pattern.confidence = Math.min(pattern.success_rate, 1.0);
            pattern.last_used = new Date().toISOString();
            if (success) pattern.last_successful = new Date().toISOString();

            localStorage.setItem('user_parsing_patterns', JSON.stringify(patterns));

            console.log(`📈 Updated pattern success: ${pattern.success_rate.toFixed(2)} (${pattern.times_successful}/${pattern.times_used})`);
        }
    }

    // ============================================
    // KNOWLEDGE BASE
    // ============================================

    async addKnowledge(knowledge) {
        const record = {
            id: this.generateId(),
            user_id: this.userId,
            knowledge_type: knowledge.type, // 'vendor', 'bank_pattern', 'gifi_mapping', 'best_practice'
            key: knowledge.key,
            value: knowledge.value,
            times_used: 0,
            times_correct: 0,
            confidence: knowledge.confidence || 0.7,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const kb = this.getKnowledgeBase();
        kb.push(record);
        localStorage.setItem('ai_knowledge_base', JSON.stringify(kb));

        console.log(`📚 Added knowledge: ${knowledge.type} - ${knowledge.key}`);
        return record;
    }

    async queryKnowledge(type, search = '') {
        const kb = this.getKnowledgeBase()
            .filter(k =>
                k.user_id === this.userId &&
                k.knowledge_type === type &&
                k.confidence >= 0.5
            );

        if (search) {
            return kb.filter(k =>
                k.key.toLowerCase().includes(search.toLowerCase())
            );
        }

        return kb.sort((a, b) => b.confidence - a.confidence);
    }

    async getKnowledgeStats() {
        const kb = this.getKnowledgeBase().filter(k => k.user_id === this.userId);
        const corrections = this.getCorrections().filter(c => c.user_id === this.userId);
        const patterns = this.getLearnedPatterns().filter(p => p.user_id === this.userId);
        const parsingPatterns = this.getParsingPatterns().filter(p => p.user_id === this.userId);

        return {
            knowledge_items: kb.length,
            corrections_learned: corrections.length,
            patterns_learned: patterns.length,
            parsing_patterns: parsingPatterns.length,
            total_learning: kb.length + corrections.length + patterns.length + parsingPatterns.length
        };
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    getAmountRange(amount) {
        if (amount < 50) return '0-50';
        if (amount < 100) return '50-100';
        if (amount < 500) return '100-500';
        if (amount < 1000) return '500-1000';
        return '1000+';
    }

    // Storage getters
    getConversations() {
        return JSON.parse(localStorage.getItem('ai_conversations') || '[]');
    }

    getMessages() {
        return JSON.parse(localStorage.getItem('ai_messages') || '[]');
    }

    getContexts() {
        return JSON.parse(localStorage.getItem('ai_contexts') || '[]');
    }

    getCorrections() {
        return JSON.parse(localStorage.getItem('ai_corrections') || '[]');
    }

    getLearnedPatterns() {
        return JSON.parse(localStorage.getItem('ai_learned_patterns') || '[]');
    }

    getParsingPatterns() {
        return JSON.parse(localStorage.getItem('user_parsing_patterns') || '[]');
    }

    getKnowledgeBase() {
        return JSON.parse(localStorage.getItem('ai_knowledge_base') || '[]');
    }
}

// Initialize global AI Brain
window.AIBrain = AIBrain;

// Auto-start for current user
if (typeof window !== 'undefined') {
    window.aiBrain = new AIBrain('current_user');
    console.log('🧠 AI Brain initialized - I am now a Learning Machine!');
}
