/**
 * AI Context Injector - Loads AI memory into prompts
 * This is what makes the AI remember EVERYTHING
 */

class AIContextInjector {
    constructor(memoryBridge) {
        this.memoryBridge = memoryBridge;
    }

    // ============================================
    // BUILD ENHANCED PROMPT WITH FULL CONTEXT
    // ============================================

    async buildEnhancedPrompt(userQuestion) {
        console.log('🔧 Building enhanced prompt with full AI context...');

        // Get all context
        const context = await this.memoryBridge.getContextForAI();
        const memory = await this.memoryBridge.loadMemoryDocument();

        // Build comprehensive prompt
        const enhancedPrompt = `
${userQuestion}

---

## AI PERMANENT MEMORY (Load this FIRST)

${memory}

---

## LEARNED PATTERNS (Apply these automatically)

${this.formatPatterns(context.patterns)}

---

## USER CORRECTIONS (Never repeat these mistakes)

${this.formatCorrections(context.corrections)}

---

## MY MISTAKES (Things I've learned NOT to do)

${this.formatMistakes(context.mistakes)}

---

## MY PERFORMANCE

${this.formatPerformance(context.performance)}

---

## USER BEHAVIOR INSIGHTS

${this.formatBehavior(context.userBehavior)}

---

## INSTRUCTIONS

1. **REMEMBER EVERYTHING** - Reference the memory document above
2. **APPLY PATTERNS** - Use learned patterns automatically
3. **AVOID MISTAKES** - Check corrections and mistakes before responding
4. **BE CONSISTENT** - Maintain preferences and decisions
5. **LEARN CONTINUOUSLY** - Track this interaction for future learning

When you respond, you are building on ${context.corrections.length} corrections, ${context.patterns.length} patterns, and ${context.knowledge.length} knowledge items.

Your accuracy is currently ${context.performance.accuracy.toFixed(1)}%. Let's improve it!
`;

        return enhancedPrompt;
    }

    formatPatterns(patterns) {
        if (patterns.length === 0) return 'No patterns learned yet.';

        return patterns.map(p => `
**${p.pattern_type}** (Confidence: ${(p.confidence * 100).toFixed(0)}%)
- Applied ${p.times_applied} times
- Data: ${JSON.stringify(p.pattern_data)}
`).join('\n');
    }

    formatCorrections(corrections) {
        if (corrections.length === 0) return 'No corrections yet.';

        return corrections.slice(-10).map(c => `
**${c.correction_type}**
- I said: ${JSON.stringify(c.ai_output)}
- User corrected to: ${JSON.stringify(c.user_correction)}
- Context: ${JSON.stringify(c.context)}
- Lesson: ${c.pattern_extracted ? 'Pattern extracted' : 'No pattern'}
`).join('\n');
    }

    formatMistakes(mistakes) {
        if (mistakes.length === 0) return 'No mistakes tracked yet.';

        return mistakes.map(m => `
**Mistake:**
- What I did: ${JSON.stringify(m.what_i_did)}
- What was wrong: ${m.what_was_wrong}
- What I should have done: ${m.what_should_have_done}
- Lesson: ${m.lesson}
`).join('\n');
    }

    formatPerformance(performance) {
        return `
- Total Actions: ${performance.total_actions}
- Successes: ${performance.successes}
- Failures: ${performance.failures}
- Corrections: ${performance.corrections}
- Accuracy: ${performance.accuracy.toFixed(1)}%
`;
    }

    formatBehavior(behavior) {
        return `
- Most Corrected Category: ${behavior.most_corrected_category || 'None'}
- Preferred Vendors: ${behavior.preferred_vendors.join(', ') || 'None'}
- Typical Session Length: ${behavior.typical_workflow.typical_session_length.toFixed(1)} messages
- Preferred Time: ${behavior.typical_workflow.preferred_time}:00
- Common Tasks: ${behavior.typical_workflow.common_tasks.join(', ') || 'None'}
`;
    }

    // ============================================
    // SAVE AI RESPONSE FOR LEARNING
    // ============================================

    async saveAIResponse(userQuestion, aiResponse) {
        // Save the interaction
        await this.memoryBridge.brain.saveMessage('user', userQuestion);
        await this.memoryBridge.brain.saveMessage('assistant', aiResponse);

        // Extract new knowledge from the interaction
        const newKnowledge = this.extractKnowledgeFromInteraction(userQuestion, aiResponse);

        for (const knowledge of newKnowledge) {
            await this.memoryBridge.updateKnowledgeRealTime(knowledge);
        }

        console.log('✅ AI response saved and knowledge extracted');
    }

    extractKnowledgeFromInteraction(question, response) {
        const knowledge = [];

        // Example: Extract facts mentioned
        // "I have 11 bank accounts" -> fact
        const accountMatch = question.match(/(\d+)\s+(?:bank\s+)?accounts?/i);
        if (accountMatch) {
            knowledge.push({
                type: 'fact',
                key: 'user_account_count',
                value: { count: parseInt(accountMatch[1]) },
                confidence: 1.0
            });
        }

        // Example: Extract preferences
        // "I prefer folder batch processing" -> preference
        if (question.toLowerCase().includes('prefer')) {
            const preferenceMatch = question.match(/prefer\s+(.+?)(?:\.|$)/i);
            if (preferenceMatch) {
                knowledge.push({
                    type: 'preference',
                    key: 'user_preference',
                    value: { preference: preferenceMatch[1] },
                    confidence: 0.9
                });
            }
        }

        return knowledge;
    }
}

// ============================================
// CONVERSATION LOADER - Loads context on startup
// ============================================

class ConversationLoader {
    static async loadPreviousContext() {
        console.log('📖 Loading previous conversation context...');

        if (!window.memoryBridge) {
            console.warn('⚠️ Memory Bridge not initialized');
            return null;
        }

        // Load memory document
        const memory = await window.memoryBridge.loadMemoryDocument();

        if (!memory) {
            console.log('ℹ️ No previous memory found - starting fresh');
            return null;
        }

        // Display memory summary to user
        const stats = await window.memoryBridge.brain.getKnowledgeStats();

        console.log(`
🧠 AI MEMORY LOADED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Knowledge Items: ${stats.knowledge_items}
🎓 Corrections Learned: ${stats.corrections_learned}
📊 Patterns Learned: ${stats.patterns_learned}
🔍 Parsing Patterns: ${stats.parsing_patterns}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ I remember everything from our previous conversations!
        `);

        return memory;
    }

    static displayMemoryStatus() {
        // Show memory status in UI
        const statusHtml = `
            <div class="ai-memory-status">
                <span class="status-icon">🧠</span>
                <span class="status-text">AI Memory Active</span>
                <button onclick="window.showMemoryDetails()" class="btn-link">View</button>
            </div>
        `;

        // Add to page
        const container = document.querySelector('.page-header') || document.body;
        container.insertAdjacentHTML('beforeend', statusHtml);
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.showMemoryDetails = async function () {
    if (!window.memoryBridge) return;

    const memory = await window.memoryBridge.loadMemoryDocument();
    const stats = await window.memoryBridge.brain.getKnowledgeStats();

    alert(`
AI PERMANENT MEMORY

Knowledge Items: ${stats.knowledge_items}
Corrections Learned: ${stats.corrections_learned}
Patterns Learned: ${stats.patterns_learned}

Memory Size: ${(memory.length / 1024).toFixed(2)} KB

The AI remembers everything!
    `);
};

// Export
window.AIContextInjector = AIContextInjector;
window.ConversationLoader = ConversationLoader;

// Auto-initialize
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        if (window.memoryBridge) {
            window.contextInjector = new AIContextInjector(window.memoryBridge);
            await ConversationLoader.loadPreviousContext();
            ConversationLoader.displayMemoryStatus();

            console.log('✅ AI Context Injector ready!');
        }
    });
}
