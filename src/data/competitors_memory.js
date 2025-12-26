/**
 * Save competitor information to AI permanent memory
 */

// Initialize if needed
if (typeof window !== 'undefined' && window.aiBrain) {

    // Save each competitor to knowledge base
    const competitors = [
        {
            name: 'ReceiptsAI',
            focus: 'LLM-powered context understanding',
            keyFeature: 'SMS/Email receipt capture',
            weakness: 'Cloud-only, $29/mo+',
            edge: 'Context is King - understands Starbucks = Meals without rules',
            url: 'receiptsai.com'
        },
        {
            name: 'Rocket Statements',
            focus: 'PDF to Excel conversion',
            keyFeature: 'Bank-level security, thousands of bank formats',
            weakness: 'Conversion tool first, bookkeeping second',
            edge: 'Handles messy scans, broad bank support',
            url: 'rocketstatements.com'
        },
        {
            name: 'DocuClipper',
            focus: 'Speed & Integration',
            keyFeature: 'Direct QuickBooks/Xero sync, 99.6% OCR accuracy',
            weakness: 'Transaction-based pricing (expensive)',
            edge: 'Convert in seconds',
            url: 'docuclipper.com'
        },
        {
            name: 'SmartClerk AI',
            focus: 'Accountant Ready outputs',
            keyFeature: 'Invoice processing, check image reading',
            weakness: 'Still requires manual oversight',
            edge: 'P&L and tax-ready documents',
            url: 'smartclerkai.com'
        }
    ];

    // Save to AI Brain
    competitors.forEach(async (competitor) => {
        await window.aiBrain.addKnowledge({
            type: 'competitor',
            key: competitor.name,
            value: competitor,
            confidence: 1.0
        });
    });

    // Save our competitive advantage
    await window.aiBrain.addKnowledge({
        type: 'competitive_advantage',
        key: 'privacy_moat',
        value: {
            advantages: [
                '100% Local (they are all cloud)',
                'Free/Open Source (they are $20-50/mo)',
                'Instant Speed (no upload time)',
                'AI Learning Machine (permanent memory)'
            ],
            strategy: 'Privacy-first, local-first, AI-powered'
        },
        confidence: 1.0
    });

    console.log('✅ Competitors saved to permanent memory!');
    console.log('🧠 I will NEVER forget them again!');
}
