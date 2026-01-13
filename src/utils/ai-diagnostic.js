/**
 * DIAGNOSTIC: Check AI Configuration
 * Run this in the console to debug why AI isn't categorizing
 */

console.log("🔍 ===== AI DIAGNOSTIC =====");

// 1. Check if GoogleAICategorizer exists
console.log("\n1️⃣ Checking GoogleAICategorizer...");
if (window.GoogleAICategorizer) {
    console.log("   ✅ GoogleAICategorizer EXISTS");
    console.log("   - Initialized:", window.GoogleAICategorizer.initialized);
    console.log("   - API Key:", window.GoogleAICategorizer.apiKey ? "✅ SET" : "❌ MISSING");
} else {
    console.log("   ❌ GoogleAICategorizer NOT FOUND!");
}

// 2. Check settings for API key
console.log("\n2️⃣ Checking Settings...");
window.storage.getSettings().then(settings => {
    console.log("   - googleAiApiKey:", settings.googleAiApiKey ? "✅ SET" : "❌ MISSING");
    if (!settings.googleAiApiKey) {
        console.warn("   ⚠️ NO API KEY! AI will not work. Go to Settings and add Google AI API Key.");
    }
});

// 3. Test AI on a sample vendor
console.log("\n3️⃣ Testing AI Categorization...");
if (window.GoogleAICategorizer) {
    window.GoogleAICategorizer.categorize({
        description: "WINE STORE TEST"
    }).then(result => {
        console.log("   🎯 AI Result:", result);
        if (!result) {
            console.error("   ❌ AI returned NULL! Check API key or network.");
        }
    }).catch(err => {
        console.error("   ❌ AI Error:", err);
    });
} else {
    console.log("   ⏭️ Skipped (no AI service)");
}

// 4. Check CategorizeAI
console.log("\n4️⃣ Checking CategorizeAI Brain...");
if (window.CategorizeAI) {
    console.log("   ✅ CategorizeAI EXISTS");
    console.log("   - Initialized:", window.CategorizeAI.initialized);
} else {
    console.log("   ❌ CategorizeAI NOT FOUND!");
}

console.log("\n🔍 ===== END DIAGNOSTIC =====\n");
console.log("💡 TIP: Run this again after making changes to see if issues are fixed.");
