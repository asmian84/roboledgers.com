const CONFIG = {
    // Current Environment: 'DEV' or 'PROD'
    // Default to DEV for safety, or auto-detect based on host
    ENV: window.location.hostname === 'roboledgers.com' || window.location.hostname.endsWith('vercel.app') ? 'PROD' : 'DEV',

    SUPABASE: {
        DEV: {
            URL: 'https://tjpafbkpmowlttrgjqhw.supabase.co',
            KEY: 'sb_publishable_lFpLcQWr1N7H-WagADHBGw_qhqJPrug' // User Provided Key
        },
        PROD: {
            URL: 'YOUR_PRODUCTION_SUPABASE_URL_HERE',
            KEY: 'YOUR_PRODUCTION_SUPABASE_KEY_HERE'
        }
    }
};

// Helper to get current config
window.AppConfig = {
    getSupabaseCreds: () => {
        const env = CONFIG.ENV;
        console.log(`🌍 Environment: ${env}`);
        return CONFIG.SUPABASE[env];
    }
};
