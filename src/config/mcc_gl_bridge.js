/**
 * MCC -> GL Bridge Table
 * Maps ISO 18245 Codes to AutoBookkeeping GL Accounts
 */
window.MCC_GL_BRIDGE = {
    // === RANGES (Priority 3) ===
    // Travel & Transport
    "3000-3299": "6600", // Airlines -> Travel
    "3300-3499": "6400", // Car Rental -> Auto Expense
    "3500-3999": "6600", // Lodging/Hotels -> Travel
    "4000-4799": "6600", // Transportation Services

    // Utilities
    "4800-4999": "6800", // Utilities / Telecom

    // Retail
    "5000-5599": "6700", // Retail / Supplies
    "5600-5699": "6700", // Clothing

    // Dining (High Risk)
    "5800-5899": "6415", // Eating Places

    // Services
    "6000-6999": "6900", // Professional Services
    "7000-7999": "6900", // Personal Services
    "8000-8999": "6500", // Medical -> Insurance?

    // === EXACT OVERRIDES (Priority 2) ===
    "5411": "6100", // Grocery Stores
    "5541": "6400", // Gas
    "5542": "6400", // Automated Fuel
    "5734": "6800", // Software
    "5912": "6500", // Drug Stores
    "5942": "6700", // Book Stores
    "5943": "6700", // Stationery
    "7372": "6800", // Data Processing

    // === KEYWORD FALLBACKS (Priority 4) ===
    "airlines": "6600",
    "hotels": "6600",
    "restaurants": "6415",
    "fast_food": "6415",
    "gas": "6400",
    "tools": "7100"
};
