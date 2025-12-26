// Add this to indexer.js - Single File Upload for Testing

window.uploadSingleFile = async function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log(`📄 Testing single file: ${file.name}`);

        try {
            // Process the file
            const result = await window.pdfParser.parsePDF(file);
            console.log(`✅ Result:`, result);
            console.log(`📊 Transactions: ${result.transactions?.length || 0}`);

            if (result.transactions && result.transactions.length > 0) {
                console.log(`🎉 SUCCESS! Extracted ${result.transactions.length} transactions`);
                result.transactions.slice(0, 5).forEach((t, i) => {
                    console.log(`  ${i + 1}. ${t.date} - ${t.description} - $${t.amount}`);
                });
            } else {
                console.warn(`⚠️ No transactions extracted`);
            }

        } catch (error) {
            console.error(`❌ Error:`, error);
        }
    };

    input.click();
};

// Add button to UI - paste this in browser console:
/*
const btn = document.createElement('button');
btn.textContent = '📄 Test Single PDF';
btn.className = 'btn-primary';
btn.style.marginLeft = '10px';
btn.onclick = () => window.uploadSingleFile();
document.querySelector('.indexer-header .header-left').appendChild(btn);
*/
