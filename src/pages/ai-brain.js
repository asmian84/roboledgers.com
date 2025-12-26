/**
 * AI Brain Demo & Testing Page
 * Shows the AI's learning capabilities in action
 */

function renderAIBrainPage() {
    return `
        <div class="page ai-brain-page">
            <div class="page-header">
                <div>
                    <h1 class="page-title">🧠 AI Learning Machine</h1>
                    <p class="page-subtitle">Watch me remember, learn, and improve!</p>
                </div>
                <button class="btn-primary" onclick="window.aiBrain.getKnowledgeStats().then(stats => alert(JSON.stringify(stats, null, 2)))">
                    📊 View Stats
                </button>
            </div>

            <!-- Status Cards -->
            <div class="ai-status-grid">
                <div class="ai-status-card">
                    <div class="status-icon">💬</div>
                    <div class="status-label">Conversations</div>
                    <div class="status-value" id="conversation-count">0</div>
                    <div class="status-note">Remembered forever</div>
                </div>

                <div class="ai-status-card">
                    <div class="status-icon">🎓</div>
                    <div class="status-label">Corrections Learned</div>
                    <div class="status-value" id="corrections-count">0</div>
                    <div class="status-note">Never repeat mistakes</div>
                </div>

                <div class="ai-status-card">
                    <div class="status-icon">📊</div>
                    <div class="status-label">Parsing Patterns</div>
                    <div class="status-value" id="patterns-count">0</div>
                    <div class="status-note">Your specific statements</div>
                </div>

                <div class="ai-status-card">
                    <div class="status-icon">📚</div>
                    <div class="status-label">Knowledge Items</div>
                    <div class="status-value" id="knowledge-count">0</div>
                    <div class="status-note">Growing every day</div>
                </div>
            </div>

            <!-- Capabilities Demo -->
            <div class="card">
                <h2>✅ What I Can Do Now</h2>
                
                <div class="capability-section">
                    <h3>✅ Remember Conversations Tomorrow</h3>
                    <p>Every message is saved. I can resume any conversation anytime.</p>
                    <button class="btn-secondary" onclick="demoConversationMemory()">
                        🧪 Test Conversation Memory
                    </button>
                </div>

                <div class="capability-section">
                    <h3>✅ Learn from Corrections Permanently</h3>
                    <p>When you correct me, I extract patterns and never make that mistake again.</p>
                    <button class="btn-secondary" onclick="demoCorrectionLearning()">
                        🧪 Test Correction Learning
                    </button>
                </div>

                <div class="capability-section">
                    <h3>✅ Get Better at YOUR Statements</h3>
                    <p>I track success rates for your specific bank statements and improve over time.</p>
                    <button class="btn-secondary" onclick="demoUserPatterns()">
                        🧪 Test User-Specific Patterns
                    </button>
                </div>

                <div class="capability-section">
                    <h3>✅ Build Persistent Knowledge Base</h3>
                    <p>Every fact, preference, and decision is stored and grows forever.</p>
                    <button class="btn-secondary" onclick="demoKnowledgeBase()">
                        🧪 Test Knowledge Base
                    </button>
                </div>
            </div>

            <!-- Conversation History -->
            <div class="card">
                <h2>💬 Recent Conversations</h2>
                <div id="conversation-history"></div>
            </div>

            <!-- Learned Patterns -->
            <div class="card">
                <h2>🎓 Learned Patterns</h2>
                <div id="learned-patterns"></div>
            </div>

            <!-- Knowledge Base -->
            <div class="card">
                <h2>📚 Knowledge Base</h2>
                <div id="knowledge-base"></div>
            </div>
        </div>
    `;
}

// Demo Functions
async function demoConversationMemory() {
    const brain = window.aiBrain;

    // Start new conversation
    await brain.startConversation('Demo: Testing Memory');
    await brain.saveMessage('user', 'Hello! Can you remember this conversation?');
    await brain.saveMessage('assistant', 'Yes! I will remember every word. Try refreshing the page and checking conversation history.');
    await brain.saveContext('fact', 'demo_completed', true, 1.0);

    alert('✅ Conversation saved! Refresh the page and check "Recent Conversations" - it will still be there!');
    loadAIBrainData();
}

async function demoCorrectionLearning() {
    const brain = window.aiBrain;

    // Simulate a correction
    await brain.recordCorrection({
        type: 'categorization',
        aiOutput: {
            vendor: 'Amazon',
            account: '5100 - Office Supplies'
        },
        userCorrection: {
            account: '1540 - Computer Equipment',
            gifi: '8620'
        },
        userFeedback: 'This was a laptop purchase',
        context: {
            vendor: 'Amazon',
            description: 'AMZN Mktp CA LAPTOP',
            amount: 1299.99
        }
    });

    alert('✅ Learned! Next time I see Amazon purchases over $1000, I\'ll suggest Computer Equipment instead of Office Supplies.');
    loadAIBrainData();
}

async function demoUserPatterns() {
    const brain = window.aiBrain;

    // Simulate saving a parsing pattern
    await brain.saveParsingPattern(
        { name: 'RBC_Visa_Statement.pdf' },
        {
            metadata: {
                bank: 'RBC',
                type: 'CREDIT_CARD'
            },
            patternUsed: 'smart_credit_card',
            metadataPatterns: { accountNumber: '****1234' },
            dateFormat: 'MMM DD',
            fileHash: 'demo_hash_123',
            confidence: 0.95
        }
    );

    alert('✅ Saved! I now have a pattern specifically for YOUR RBC Visa statements. Next upload will be even faster!');
    loadAIBrainData();
}

async function demoKnowledgeBase() {
    const brain = window.aiBrain;

    // Add some knowledge
    await brain.addKnowledge({
        type: 'vendor',
        key: 'Tim Hortons',
        value: {
            category: 'Meals & Entertainment',
            account: '6420',
            gifi: '8523',
            typical_amount: '5-15'
        },
        confidence: 0.9
    });

    await brain.addKnowledge({
        type: 'best_practice',
        key: 'statement_organization',
        value: {
            tip: 'Organize statements by account in separate folders',
            benefit: 'Faster batch processing'
        },
        confidence: 1.0
    });

    alert('✅ Knowledge added! I now know how to categorize Tim Hortons and best practices for organizing statements.');
    loadAIBrainData();
}

// Load and display AI Brain data
async function loadAIBrainData() {
    const brain = window.aiBrain;

    // Update stats
    const stats = await brain.getKnowledgeStats();
    document.getElementById('conversation-count').textContent = brain.getConversations().length;
    document.getElementById('corrections-count').textContent = stats.corrections_learned;
    document.getElementById('patterns-count').textContent = stats.parsing_patterns;
    document.getElementById('knowledge-count').textContent = stats.knowledge_items;

    // Load conversation history
    const conversations = await brain.getConversationHistory(5);
    const historyHtml = conversations.map(conv => `
        <div class="conversation-item">
            <div class="conversation-header">
                <strong>${conv.title}</strong>
                <span class="conversation-date">${new Date(conv.started_at).toLocaleString()}</span>
            </div>
            <div class="conversation-meta">
                ${conv.message_count} messages • Last: ${new Date(conv.last_message_at).toLocaleString()}
            </div>
            <button class="btn-secondary btn-sm" onclick="resumeConversation('${conv.id}')">
                Resume
            </button>
        </div>
    `).join('');
    document.getElementById('conversation-history').innerHTML = historyHtml || '<p>No conversations yet. Try the demos above!</p>';

    // Load learned patterns
    const patterns = await brain.getLearnedPatterns();
    const patternsHtml = patterns.map(p => `
        <div class="pattern-item">
            <div class="pattern-type">${p.pattern_type}</div>
            <div class="pattern-data">${JSON.stringify(p.pattern_data, null, 2)}</div>
            <div class="pattern-stats">
                Confidence: ${(p.confidence * 100).toFixed(0)}% • 
                Applied: ${p.times_applied} times • 
                Correct: ${p.times_correct} times
            </div>
        </div>
    `).join('');
    document.getElementById('learned-patterns').innerHTML = patternsHtml || '<p>No patterns learned yet. Try correcting a categorization!</p>';

    // Load knowledge base
    const kb = brain.getKnowledgeBase();
    const kbHtml = kb.map(k => `
        <div class="knowledge-item">
            <div class="knowledge-type">${k.knowledge_type}</div>
            <div class="knowledge-key"><strong>${k.key}</strong></div>
            <div class="knowledge-value">${JSON.stringify(k.value, null, 2)}</div>
            <div class="knowledge-stats">
                Confidence: ${(k.confidence * 100).toFixed(0)}% • 
                Used: ${k.times_used} times
            </div>
        </div>
    `).join('');
    document.getElementById('knowledge-base').innerHTML = kbHtml || '<p>No knowledge yet. Try adding some!</p>';
}

async function resumeConversation(conversationId) {
    const brain = window.aiBrain;
    const result = await brain.resumeConversation(conversationId);

    if (result) {
        alert(`Resumed conversation: ${result.conversation.title}\n\nMessages: ${result.messages.length}\n\nLast message: ${result.messages[result.messages.length - 1]?.content || 'N/A'}`);
    }
}

// Initialize when page loads
window.renderAIBrainPage = renderAIBrainPage;
window.initAIBrainPage = loadAIBrainData;
