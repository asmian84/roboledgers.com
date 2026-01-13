/**
 * QUICK SETUP: Configure Google AI API Key
 * Run this in the console to fix AI categorization
 */

async function setupGoogleAI(apiKey) {
    console.log("🔧 Setting up Google AI...");

    // 1. Save API key to settings
    const settings = await window.storage.getSettings();
    settings.googleAiApiKey = apiKey;
    await window.storage.saveSettings(settings);
    console.log("   ✅ API Key saved to settings");

    // 2. Reinitialize GoogleAICategorizer
    if (window.GoogleAICategorizer) {
        window.GoogleAICategorizer.apiKey = apiKey;
        window.GoogleAICategorizer.initialized = false;
        await window.GoogleAICategorizer.init();
        console.log("   ✅ GoogleAICategorizer reinitialized");
    }

    // 3. Test connection
    console.log("   🧪 Testing connection...");
    const testResult = await window.GoogleAICategorizer.testConnection(apiKey);
    if (testResult.success) {
        console.log("   🎉 SUCCESS! AI is ready to use.");
        console.log("\n💡 Now run 'AI Audit' from the Vendors page to categorize.");
    } else {
        console.error("   ❌ Test failed:", testResult.message);
    }

    return testResult;
}

// AUTO-EXECUTE with the key from the curl command
console.log("🚀 Auto-configuring Google AI with your API key...");
setupGoogleAI("AIzaSyBe3b0bE-eeqQx-UGq3cHJqOAlgKZgYSKA");
