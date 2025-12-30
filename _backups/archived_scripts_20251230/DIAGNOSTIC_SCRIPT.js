// EMERGENCY DIAGNOSTIC SCRIPT
// Paste this in console to monitor what's happening

console.log('🔍 Starting comprehensive data monitoring...');

// Monitor all localStorage changes
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;
const originalClear = localStorage.clear;

localStorage.setItem = function (key, value) {
    if (key.startsWith('ab3_') || key === 'transactions') {
        let count = 'N/A';
        try {
            count = JSON.parse(value || '[]').length;
        } catch (e) { }
        console.log(`📝 SAVE: ${key} → ${count} items`);
        console.trace();
    }
    return originalSetItem.apply(this, arguments);
};

localStorage.removeItem = function (key) {
    if (key.startsWith('ab3_') || key === 'transactions') {
        console.log(`🗑️ DELETE: ${key}`);
        console.trace();
    }
    return originalRemoveItem.apply(this, arguments);
};

localStorage.clear = function () {
    console.log('💥 CLEAR ALL LOCALSTORAGE');
    console.trace();
    return originalClear.apply(this, arguments);
};

// Monitor navigation
window.addEventListener('hashchange', () => {
    console.log('🧭 NAVIGATION:', window.location.hash);
    setTimeout(() => {
        console.log('📊 After navigation - localStorage state:');
        Object.keys(localStorage).filter(k => k.startsWith('ab3_')).forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '[]');
                console.log(`  ${key}: ${Array.isArray(data) ? data.length : 'N/A'} items`);
            } catch (e) { }
        });
    }, 100);
});

console.log('✅ Monitoring active. Now navigate around and watch console!');
