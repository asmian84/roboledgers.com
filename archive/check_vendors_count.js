
const supabaseUrl = 'https://qygddrggoywhvlwhuzil.supabase.co';
const supabaseKey = 'sb_publishable_7IouLxlc9zPMCpiV2K81mQ_Rj0XysYm';

async function checkCount() {
    console.log('Checking vendor count (GET)...');
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/vendors?select=*&limit=1`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'count=exact'
            }
        });

        if (response.ok) {
            const range = response.headers.get('content-range');
            console.log('Content-Range Header:', range);
            if (range) {
                const total = range.split('/')[1];
                console.log(`✅ Total Vendors in Cloud: ${total}`);
            } else {
                console.log('⚠️ No Content-Range header found.');
            }
        } else {
            console.log('❌ Error:', response.status, response.statusText);
            const text = await response.text();
            console.log('Response body:', text);
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

checkCount();
