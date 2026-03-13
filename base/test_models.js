
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE"; // User will need to set this or I'll run it with their key if I can find it

if (apiKey === "YOUR_API_KEY_HERE") {
    console.error("Please set GEMINI_API_KEY env var");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy model just to get the client? No, getGenerativeModel is for inference.
        // The SDK doesn't always expose listModels directly on the main class in all versions?
        // Let's try to infer from a simple generation call or see if we can find a listing method.
        // Actually, checking docs (or common knowledge), we might not be able to list models easily with just the high-level SDK `getGenerativeModel`.
        // But we can try to run a simple generateContent with "gemini-pro" and "gemini-1.5-flash" to see which one works.

        console.log("Testing specific models...");

        const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-pro", "gemini-pro"];

        for (const modelName of modelsToTest) {
            console.log(`\nTesting ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you there?");
                const response = await result.response;
                console.log(`✅ ${modelName} is WORKING! Response: ${response.text()}`);
            } catch (error) {
                console.error(`❌ ${modelName} FAILED: ${error.message}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
