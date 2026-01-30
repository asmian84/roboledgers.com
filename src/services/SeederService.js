/**
 * SeederService.js
 * Automatically hydrates the MerchantDictionary with 'Pristine' backup data on startup.
 * Acts as the "Backend Feed" for local-first architecture.
 */

/**
 * SeederService.js
 * Automatically hydrates the MerchantDictionary with 'Pristine' backup data on startup.
 * Acts as the "Backend Feed" for local-first architecture.
 */

class SeederService {
    constructor() {
        this.STORAGE_KEY = 'ab_data_seeding_complete_v1';
    }

    async init() {
        // 1. Check if already seeded
        const isSeeded = localStorage.getItem(this.STORAGE_KEY);
        if (isSeeded === 'true') {
            console.log('🌱 Seeder: Backend data already present. Skipping.');
            return;
        }

        // 2. Check for Global Seed Data (CORS Fix)
        if (!window.SEED_DATA) {
            console.warn('⚠️ Seeder: window.SEED_DATA not found. Check load order.');
            return;
        }

        console.log('🌱 Seeder: "Bank Zero" Protocol Initiated.');
        console.log(`📦 Seeder: Found ${window.SEED_DATA.length} core vendor records to feed.`);

        try {
            // 3. Wait for Dictionary to be ready
            await this.waitForDictionary();

            // 4. Perform Bulk Insert
            if (!window.merchantDictionary) {
                throw new Error('MerchantDictionary not found in window scope.');
            }

            await window.merchantDictionary.init();

            // Chunking to prevent UI freeze
            const count = await this.performSeed(window.SEED_DATA);

            // 5. Mark as complete
            localStorage.setItem(this.STORAGE_KEY, 'true');

            if (window.ProcessingEngine) window.ProcessingEngine.log('system', `[Seeder] Loaded ${count} vendors from global seed data.`);

            // 6. Notify User
            if (window.ToastManager) {
                window.ToastManager.success(`Backend Feed Complete: ${count} vendors loaded.`);
            }

            console.log('✅ Seeder: "Bank Zero" Protocol Complete.');

            // FREE MEMORY
            window.SEED_DATA = null;

        } catch (err) {
            console.error('❌ Seeder Failed:', err);
        }
    }

    async waitForDictionary() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const interval = setInterval(() => {
                if (window.merchantDictionary) {
                    clearInterval(interval);
                    resolve();
                }
                attempts++;
                if (attempts > 50) { // 5 seconds
                    clearInterval(interval);
                    reject('Timeout waiting for MerchantDictionary');
                }
            }, 100);
        });
    }

    async performSeed(vendors) {
        return await window.merchantDictionary.importBackup(vendors);
    }
}

// Auto-run singleton
const seeder = new SeederService();
// We delay slightly to allow main app to boot
setTimeout(() => seeder.init(), 2000);
window.SeederService = seeder;

