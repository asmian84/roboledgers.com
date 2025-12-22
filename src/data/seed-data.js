
// Mock seedDatabase function since it was missing
window.seedDatabase = async function () {
    console.log('🌱 Seeding database with initial data...');
    // Create base accounts
    const initialAccounts = [
        { id: '1', name: 'Chequing', type: 'Bank', balance: 0 },
        { id: '2', name: 'Savings', type: 'Bank', balance: 0 },
        { id: '3', name: 'Credit Card', type: 'Credit Card', balance: 0 }
    ];

    // Save to storage
    if (window.storage) {
        // await window.storage.saveAccounts(initialAccounts);
    }

    return {
        accounts: initialAccounts.length,
        transactions: 0,
        vendors: 0
    };
};
