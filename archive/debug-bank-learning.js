/**
 * Bank Learning Debug Utility
 * Paste this into browser console to diagnose issues
 */

// Enable verbose logging
window.DEBUG_BANK_LEARNING = true;

console.log('%c=== BANK LEARNING DEBUG MODE ===', 'color: #3b82f6; font-size: 16px; font-weight: bold;');

// 1. Check if services are loaded
console.group('🔍 Service Check');
console.log('BrandDetector:', window.brandDetector ? '✅ Loaded' : '❌ Missing');
console.log('BankLearningService:', window.bankLearningService ? '✅ Loaded' : '❌ Missing');
if (window.bankLearningService) {
    const stats = window.bankLearningService.getStats();
    console.log('Learning Stats:', stats);
    console.log('Learned Associations:', window.bankLearningService.data.statements.length);
}
console.groupEnd();

// 2. Check UI elements
console.group('🎨 UI Element Check');
const bankSelect = document.getElementById('v5-bank-brand-select');
const tagSelect = document.getElementById('v5-account-tag-select');
const status = document.getElementById('v5-status-text');
console.log('Bank Select:', bankSelect ? '✅ Found' : '❌ Missing');
console.log('Tag Select:', tagSelect ? '✅ Found' : '❌ Missing');
console.log('Status Text:', status ? `✅ "${status.textContent}"` : '❌ Missing');
if (bankSelect) console.log('  Current value:', bankSelect.value);
if (tagSelect) console.log('  Current value:', tagSelect.value);
console.groupEnd();

// 3. Intercept detectWithLearning to log timing
if (window.brandDetector) {
    const original = window.brandDetector.detectWithLearning.bind(window.brandDetector);
    window.brandDetector.detectWithLearning = async function (text, filename) {
        const startTime = performance.now();
        console.group('⏱️ detectWithLearning() called');
        console.log('Text length:', text.length, 'chars');
        console.log('Filename:', filename || 'none');

        try {
            const result = await original(text, filename);
            const elapsed = performance.now() - startTime;

            console.log('✅ Detection complete in', elapsed.toFixed(2), 'ms');
            console.log('Result:', {
                brand: result.brand,
                subType: result.subType,
                confidence: result.confidence,
                source: result.source
            });
            console.groupEnd();

            return result;
        } catch (err) {
            console.error('❌ Detection failed:', err);
            console.groupEnd();
            throw err;
        }
    };
    console.log('✅ Intercepted detectWithLearning()');
}

// 4. Intercept generateFingerprint to check performance
if (window.bankLearningService) {
    const originalFp = window.bankLearningService.generateFingerprint.bind(window.bankLearningService);
    window.bankLearningService.generateFingerprint = async function (text, filename) {
        const startTime = performance.now();
        const result = await originalFp(text, filename);
        const elapsed = performance.now() - startTime;

        console.log('🔑 Fingerprint generated in', elapsed.toFixed(2), 'ms');
        return result;
    };
    console.log('✅ Intercepted generateFingerprint()');
}

// 5. Watch for UI updates
if (window.updateBrandDisplay) {
    const originalUpdate = window.updateBrandDisplay;
    window.updateBrandDisplay = function (detection) {
        console.group('🎨 updateBrandDisplay() called');
        console.log('Detection object:', detection);
        const result = originalUpdate(detection);
        console.log('UI updated');
        console.groupEnd();
        return result;
    };
    console.log('✅ Intercepted updateBrandDisplay()');
}

// 6. Check localStorage
console.group('💾 localStorage Check');
const stored = localStorage.getItem('ab_bank_learning');
if (stored) {
    try {
        const data = JSON.parse(stored);
        console.log('Stored data:', data);
        console.log('Total associations:', data.statements?.length || 0);
    } catch (e) {
        console.error('❌ Failed to parse:', e);
    }
} else {
    console.log('⚠️ No learning data stored yet');
}
console.groupEnd();

// 7. Manual test function
window.testBankLearning = async function () {
    console.log('%c=== MANUAL TEST ===', 'color: #10b981; font-size: 14px; font-weight: bold;');

    const testText = `
    Royal Bank of Canada
    Statement Period: June 1 - June 30, 2023
    Account Number: 1234567
    
    Date        Description                 Debit      Credit     Balance
    Jun 01      Opening Balance                                   1000.00
    Jun 05      E-TRANSFER SENT             50.00                  950.00
  `;

    console.log('Running test detection...');
    const result = await window.brandDetector.detectWithLearning(testText, 'test.pdf');
    console.log('Test result:', result);

    window.updateBrandDisplay(result);
    console.log('✅ Test complete - check UI');
};

console.log('%c
Run: testBankLearning()
To manually test the system
', 'color: #f59e0b; font - weight: bold; ');
