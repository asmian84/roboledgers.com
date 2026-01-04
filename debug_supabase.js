
const supabaseUrl = 'https://qygddrggoywhvlwhuzil.supabase.co';
const supabaseKey = 'sb_publishable_7IouLxlc9zPMCpiV2K81mQ_Rj0XysYm';

async function listTables() {
    console.log(`Checking tables for ${supabaseUrl}...`);

    // Attempt to access the root to check generic availability (often returns documentation or 404)
    // But better to check the Swagger definition which lists all tables
    const openApiUrl = `${supabaseUrl}/rest/v1/`;

    try {
        const response = await fetch(openApiUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        console.log(`Root status: ${response.status}`);

        if (response.status === 200) {
            const data = await response.json();
            console.log('--- API Definitions Found ---');
            // The root usually returns an OpenAPI-like JSON where 'definitions' holds the tables
            if (data.definitions) {
                console.log('Available Tables:', Object.keys(data.definitions).join(', '));
            } else {
                console.log('Root response:', JSON.stringify(data, null, 2));
            }
        } else {
            console.log('Could not access root API. Trying standard table checks...');

            const tablesToCheck = ['vendors', 'merchants', 'chart_of_accounts', 'accounts', 'bank_accounts'];

            for (const table of tablesToCheck) {
                const url = `${supabaseUrl}/rest/v1/${table}?select=count&limit=1`;
                const res = await fetch(url, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Range': '0-1'
                    }
                });
                console.log(`Table '${table}': ${res.status} ${res.status === 200 ? '✅ Found' : '❌ ' + res.statusText}`);
            }
        }
    } catch (e) {
        console.error('Network error:', e);
    }
}

listTables();
