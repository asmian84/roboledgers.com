// Quick fix script to remove old Reports placeholder from app.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find and comment out the old Reports button code
const oldCode = `    // Reports button (placeholder)
    const reportsBtn = document.getElementById('reportsBtn');
    if (reportsBtn) {
        reportsBtn.addEventListener('click', () => {
            alert('📊 Reports feature coming soon!\\n\\nWill include:\\n- Income Statement\\n- Balance Sheet\\n- Trial Balance\\n- Custom Reports');
        });
    }`;

const newCode = `    // Reports button (placeholder) - REMOVED
    // Reports button now handled by reports-modal.js`;

// Replace the old code
content = content.replace(oldCode, newCode);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed! Old Reports placeholder removed.');
console.log('📊 Reports modal should now work. Refresh your browser!');
