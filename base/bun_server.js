
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI, { toFile } from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

console.log("🚀 Starting AI Audio Analyst Server on http://localhost:8888");
console.log("✅ API VERSION: 2.1 (Gemini 2.0 Flash + Dynamic MIME)");

const server = Bun.serve({
    port: 8888,
    async fetch(req) {
        const url = new URL(req.url);

        // CORS Headers
        const headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        // Helper to determine MIME type
        function getMimeType(urlStr) {
            const ext = urlStr.split('.').pop().toLowerCase().split('?')[0];
            const mimeMap = {
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'm4a': 'audio/mp4',
                'aac': 'audio/aac',
                'flac': 'audio/flac',
                'aiff': 'audio/aiff',
                'webm': 'audio/webm'
            };
            return mimeMap[ext] || 'audio/mpeg'; // Default to mp3 if unknown
        }

        if (req.method === "OPTIONS") {
            return new Response(null, { headers });
        }

        // Helper to get Pricing
        async function getPricingConfig() {
            let pricing = {
                "gpt-4o": { "input": 3.00, "output": 10.00 },
                "gpt-4-turbo": { "input": 10.00, "output": 30.00 },
                "o1": { "input": 15.00, "output": 60.00 },
                "o3": { "input": 2.00, "output": 8.00 },
                "gpt-5.2-chat-latest": { "input": 1.75, "output": 14.00 },
                "gemini-3.1-pro-preview": { "input": 1.25, "output": 5.00 },
                "claude-sonnet-4-6": { "input": 3.00, "output": 15.00 },
                "claude-3-5-sonnet-latest": { "input": 3.00, "output": 15.00 },
                "grok-3": { "input": 3.00, "output": 15.00 },
                "whisper-1": { "input": 0.006, "output": 0.0 },
                "server": { "cost_per_request": 0.002 }
            };

            try {
                const file = Bun.file("pricing.json");
                if (await file.exists()) {
                    const saved = await file.json();
                    pricing = { ...pricing, ...saved }; // Merge defaults to ensure 'server' exists
                }
            } catch (e) {
                console.warn("Could not read pricing.json, using defaults.");
            }
            return pricing;
        }

        async function calculateCost(provider, modelId, promptTokens, completionTokens, pricingMap) {
            const modelPricing = pricingMap[modelId] || pricingMap[`${provider}-default`] || { input: 0, output: 0 };
            const cost = (promptTokens * modelPricing.input / 1000000) + (completionTokens * modelPricing.output / 1000000);
            return parseFloat(cost.toFixed(6));
        }

        // === API ROUTES (Mocking Netlify Functions) ===

        // 1. Transcribe Endpoint (Using Gemini or Whisper)
        if (url.pathname.endsWith("/functions/transcribe") && req.method === "POST") {
            const globalStartTime = performance.now();
            try {
                const body = await req.json();
                const { audioUrl, apiKey, provider, modelId } = body;

                if (!audioUrl || !apiKey) {
                    return new Response(JSON.stringify({ error: "Missing audioUrl or apiKey" }), { status: 400, headers });
                }

                const mimeType = getMimeType(audioUrl);
                const actualProvider = provider || 'gemini';
                const actualModelId = modelId || (actualProvider === 'openai' ? 'whisper-1' : 'gemini-2.5-pro');
                console.log(`🎤 Transcribing with ${actualProvider} (${actualModelId}) - File: ${audioUrl}`);

                // Fetch audio file (common for both)
                const audioResponse = await fetch(audioUrl);
                if (!audioResponse.ok) throw new Error(`Failed to fetch audio file from storage: ${audioResponse.statusText}`);

                const arrayBuffer = await audioResponse.arrayBuffer();
                let transcriptionText = "";
                let telemetry = { promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0, latency: 0, serverProcessingMs: 0, serverCostUsd: 0 };
                const pricingMap = await getPricingConfig();

                if (actualProvider === 'openai') {
                    const openai = new OpenAI({ apiKey: apiKey });
                    let ext = audioUrl.split('.').pop().toLowerCase().split('?')[0];
                    const validExts = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];

                    if (!validExts.includes(ext)) {
                        if (mimeType.includes('ogg')) ext = 'ogg';
                        else if (mimeType.includes('webm')) ext = 'webm';
                        else if (mimeType.includes('wav')) ext = 'wav';
                        else if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'm4a';
                        else ext = 'mp3';
                    }

                    const buffer = Buffer.from(arrayBuffer);
                    const file = await toFile(buffer, "audio." + ext, { type: mimeType });

                    console.log(`🎤 Audio fetched. Sending to OpenAI Whisper...`);

                    const startTime = performance.now();
                    const result = await openai.audio.transcriptions.create({
                        file: file,
                        model: actualModelId,
                        response_format: "verbose_json"
                    });
                    const endTime = performance.now();

                    telemetry.latency = Math.round(endTime - startTime);
                    const durationSeconds = result.duration || 0;

                    // Whisper pricing: $0.006 per minute. Mapped to "input" in our pricing map to reuse existing settings table.
                    const minuteCost = pricingMap[actualModelId]?.input || 0.006;
                    telemetry.estimatedCostUsd = parseFloat(((durationSeconds / 60) * minuteCost).toFixed(6));
                    telemetry.promptTokens = Math.round(durationSeconds); // Using seconds as "prompt tokens" so DB has some weight metric
                    telemetry.completionTokens = 0;

                    transcriptionText = result.text;
                } else {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: actualModelId });

                    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
                    console.log(`🎤 Audio fetched, size: ${base64Audio.length} bytes. Sending to Gemini...`);

                    const startTime = performance.now();
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Audio
                            }
                        },
                        { text: "Transcreva este áudio em texto. Retorne apenas a transcrição, sem comentários adicionais." }
                    ]);
                    const endTime = performance.now();

                    const usage = result.response.usageMetadata;
                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = usage?.promptTokenCount || 0;
                    telemetry.completionTokens = usage?.candidatesTokenCount || 0;
                    telemetry.estimatedCostUsd = await calculateCost('gemini', actualModelId, telemetry.promptTokens, telemetry.completionTokens, pricingMap);

                    transcriptionText = result.response.text();
                }

                // Global Server Telemetry
                const globalEndTime = performance.now();
                telemetry.serverProcessingMs = Math.max(0, Math.round(globalEndTime - globalStartTime) - telemetry.latency);
                telemetry.serverCostUsd = parseFloat((pricingMap.server?.cost_per_request || 0.002).toFixed(6));

                return new Response(JSON.stringify({
                    text: transcriptionText,
                    telemetry: telemetry
                }), { headers });

            } catch (error) {
                console.error("Transcription Error:", error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
            }
        }

        // 2. Chat Endpoint (Using Gemini or OpenAI)
        if (url.pathname.endsWith("/functions/chat_v2") && req.method === "POST") {
            const globalStartTime = performance.now();
            try {
                const body = await req.json();
                const { messages, apiKey, provider, modelId } = body;

                if (!messages || !apiKey) {
                    return new Response(JSON.stringify({ error: "Missing messages or apiKey" }), { status: 400, headers });
                }

                console.log(`💬 API Key received (first 5): ${apiKey.substring(0, 5)}...`);
                console.log(`💬 Provider: ${provider || 'gemini'} | Model: ${modelId || 'gemini-2.5-pro'}`);

                let reply = "";
                let telemetry = { promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0, latency: 0, serverProcessingMs: 0, serverCostUsd: 0 };
                const pricingMap = await getPricingConfig();

                if (provider === 'openai') {
                    // === OpenAI Implementation ===
                    console.log(`💬 Calling OpenAI API with model: ${modelId}...`);

                    const openai = new OpenAI({ apiKey: apiKey });
                    const startTime = performance.now();
                    const completion = await openai.chat.completions.create({
                        messages: messages,
                        model: modelId || "gpt-4o",
                    });
                    const endTime = performance.now();

                    reply = completion.choices[0].message.content;

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = completion.usage ? completion.usage.prompt_tokens : 0;
                    telemetry.completionTokens = completion.usage ? completion.usage.completion_tokens : 0;
                    telemetry.estimatedCostUsd = await calculateCost('openai', modelId || 'gpt-4o', telemetry.promptTokens, telemetry.completionTokens, pricingMap);

                } else if (provider === 'xai') {
                    // === xAI Implementation via OpenAI Wrapper ===
                    console.log(`💬 Calling xAI API with model: ${modelId}...`);

                    const xaiClient = new OpenAI({ apiKey: apiKey, baseURL: "https://api.x.ai/v1" });
                    const startTime = performance.now();
                    const completion = await xaiClient.chat.completions.create({
                        messages: messages,
                        model: modelId || "grok-3",
                    });
                    const endTime = performance.now();

                    reply = completion.choices[0].message.content;

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = completion.usage ? completion.usage.prompt_tokens : 0;
                    telemetry.completionTokens = completion.usage ? completion.usage.completion_tokens : 0;
                    telemetry.estimatedCostUsd = await calculateCost('xai', modelId || 'grok-3', telemetry.promptTokens, telemetry.completionTokens, pricingMap);

                } else if (provider === 'anthropic') {
                    // === Anthropic Implementation ===
                    console.log(`💬 Calling Anthropic API with model: ${modelId}...`);

                    const anthropic = new Anthropic({ apiKey: apiKey });
                    const systemMessage = messages.find(m => m.role === "system");
                    const conversationMessages = messages.filter(m => m.role !== "system");

                    const startTime = performance.now();
                    const msgResponse = await anthropic.messages.create({
                        model: modelId || "claude-sonnet-4-6",
                        max_tokens: 2048,
                        system: systemMessage ? systemMessage.content : undefined,
                        messages: conversationMessages
                    });
                    const endTime = performance.now();

                    reply = msgResponse.content[0].text;

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = msgResponse.usage ? msgResponse.usage.input_tokens : 0;
                    telemetry.completionTokens = msgResponse.usage ? msgResponse.usage.output_tokens : 0;
                    telemetry.estimatedCostUsd = await calculateCost('anthropic', modelId || 'claude-sonnet-4-6', telemetry.promptTokens, telemetry.completionTokens, pricingMap);

                } else {
                    // === Gemini Implementation (Default) ===
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const actualModelId = modelId || "gemini-2.5-pro";
                    // Convert OpenAI-style messages to Gemini format
                    const systemMessage = messages.find(m => m.role === "system");
                    const conversationMessages = messages.filter(m => m.role !== "system");

                    const modelOptions = { model: actualModelId };
                    if (systemMessage) {
                        modelOptions.systemInstruction = systemMessage.content;
                    }
                    const model = genAI.getGenerativeModel(modelOptions);

                    // Build Gemini direct contents array
                    const contents = conversationMessages.map(msg => ({
                        role: msg.role === "assistant" ? "model" : "user",
                        parts: [{ text: msg.content }]
                    }));

                    const lastMessage = conversationMessages[conversationMessages.length - 1];
                    let finalPrompt = lastMessage.content;

                    console.log(`💬 Sending to Gemini: ${finalPrompt.substring(0, 100)}...`);

                    const startTime = performance.now();
                    const result = await model.generateContent({ contents: contents });
                    const endTime = performance.now();

                    reply = result.response.text();
                    const usage = result.response.usageMetadata;

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = usage?.promptTokenCount || 0;
                    telemetry.completionTokens = usage?.candidatesTokenCount || 0;
                    telemetry.estimatedCostUsd = await calculateCost('gemini', actualModelId, telemetry.promptTokens, telemetry.completionTokens, pricingMap);
                }

                const globalEndTime = performance.now();
                telemetry.serverProcessingMs = Math.max(0, Math.round(globalEndTime - globalStartTime) - telemetry.latency);
                telemetry.serverCostUsd = parseFloat((pricingMap.server?.cost_per_request || 0.002).toFixed(6));

                console.log(`💬 Reply generated (first 50 chars): ${reply.substring(0, 50)}...`);
                console.log(`📊 Telemetry: `, telemetry);

                return new Response(JSON.stringify({ reply: reply, telemetry: telemetry }), { headers });

            } catch (error) {
                console.error("Chat Error:", error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
            }
        }

        // 3. Classification Endpoint (Outputs JSON)
        if (url.pathname.endsWith("/functions/classify") && req.method === "POST") {
            const globalStartTime = performance.now();
            try {
                const body = await req.json();
                const { transcription, systemPrompt, apiKey, provider, modelId } = body;

                if (!transcription || !systemPrompt || !apiKey) {
                    return new Response(JSON.stringify({ error: "Missing transcription, systemPrompt or apiKey" }), { status: 400, headers });
                }

                console.log(`🏷️ API Key received for Classification... Provider: ${provider || 'gemini'}`);

                let classificationData = null;
                let telemetry = { promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0, latency: 0, serverProcessingMs: 0, serverCostUsd: 0 };
                const pricingMap = await getPricingConfig();

                if (provider === 'openai') {
                    // === OpenAI Implementation ===
                    console.log(`🏷️ Calling OpenAI API for Classification with model: ${modelId}...`);

                    const openai = new OpenAI({ apiKey: apiKey });
                    const startTime = performance.now();
                    const completion = await openai.chat.completions.create({
                        model: modelId || "gpt-4o",
                        response_format: { type: "json_object" },
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `Transição a ser analisada e classificada em formato JSON estrito:\n\n${transcription}` }
                        ]
                    });
                    const endTime = performance.now();

                    let rawJson = completion.choices[0].message.content.trim();
                    // Strip markdown wrapping if present
                    if (rawJson.startsWith("```")) {
                        rawJson = rawJson.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
                    }
                    classificationData = JSON.parse(rawJson);

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = completion.usage ? completion.usage.prompt_tokens : 0;
                    telemetry.completionTokens = completion.usage ? completion.usage.completion_tokens : 0;
                    telemetry.estimatedCostUsd = await calculateCost('openai', modelId || 'gpt-4o', telemetry.promptTokens, telemetry.completionTokens, pricingMap);

                } else if (provider === 'xai') {
                    // === xAI Implementation ===
                    console.log(`🏷️ Calling xAI API for Classification with model: ${modelId}...`);

                    const xaiClient = new OpenAI({ apiKey: apiKey, baseURL: "https://api.x.ai/v1" });
                    const startTime = performance.now();
                    const completion = await xaiClient.chat.completions.create({
                        model: modelId || "grok-3",
                        response_format: { type: "json_object" },
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `Transição a ser analisada e classificada em formato JSON estrito:\n\n${transcription}` }
                        ]
                    });
                    const endTime = performance.now();

                    let rawJson = completion.choices[0].message.content.trim();
                    if (rawJson.startsWith("```")) {
                        rawJson = rawJson.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
                    }
                    classificationData = JSON.parse(rawJson);

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = completion.usage ? completion.usage.prompt_tokens : 0;
                    telemetry.completionTokens = completion.usage ? completion.usage.completion_tokens : 0;
                    telemetry.estimatedCostUsd = await calculateCost('xai', modelId || 'grok-3', telemetry.promptTokens, telemetry.completionTokens, pricingMap);

                } else if (provider === 'anthropic') {
                    // === Anthropic Implementation ===
                    console.log(`🏷️ Calling Anthropic API for Classification with model: ${modelId}...`);

                    const anthropic = new Anthropic({ apiKey: apiKey });
                    const startTime = performance.now();
                    const msgResponse = await anthropic.messages.create({
                        model: modelId || "claude-sonnet-4-6",
                        max_tokens: 2048,
                        system: `Você é um classificador estruturado. Retorne APENAS um JSON válido de acordo com o padrão solicitado, sem comentários extras ou blocos de código. ${systemPrompt}`,
                        messages: [
                            { role: "user", content: `Transição a ser analisada e classificada em formato JSON estrito:\n\n${transcription}` }
                        ]
                    });
                    const endTime = performance.now();

                    let rawJson = msgResponse.content[0].text.trim();
                    if (rawJson.startsWith("```")) {
                        rawJson = rawJson.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
                    }
                    classificationData = JSON.parse(rawJson);

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = msgResponse.usage ? msgResponse.usage.input_tokens : 0;
                    telemetry.completionTokens = msgResponse.usage ? msgResponse.usage.output_tokens : 0;
                    telemetry.estimatedCostUsd = await calculateCost('anthropic', modelId || 'claude-sonnet-4-6', telemetry.promptTokens, telemetry.completionTokens, pricingMap);

                } else {
                    // === Gemini Implementation (Default) ===
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const actualModelId = modelId || "gemini-2.5-pro";
                    const model = genAI.getGenerativeModel({
                        model: actualModelId,
                        generationConfig: { responseMimeType: "application/json" }
                    });

                    const fullPrompt = `[System Instruction: ${systemPrompt}]\n\nTransição a ser analisada e classificada em formato JSON estrito com base nas instruções acima:\n\n${transcription}`;

                    console.log(`🏷️ Sending to Gemini for Classification...`);

                    const startTime = performance.now();
                    const result = await model.generateContent(fullPrompt);
                    const endTime = performance.now();

                    let rawJson = result.response.text().trim();
                    // Strip markdown wrapping if present
                    if (rawJson.startsWith("```")) {
                        rawJson = rawJson.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
                    }
                    classificationData = JSON.parse(rawJson);
                    const usage = result.response.usageMetadata;

                    telemetry.latency = Math.round(endTime - startTime);
                    telemetry.promptTokens = usage?.promptTokenCount || 0;
                    telemetry.completionTokens = usage?.candidatesTokenCount || 0;
                    telemetry.estimatedCostUsd = await calculateCost('gemini', actualModelId, telemetry.promptTokens, telemetry.completionTokens, pricingMap);
                }

                const globalEndTime = performance.now();
                telemetry.serverProcessingMs = Math.max(0, Math.round(globalEndTime - globalStartTime) - telemetry.latency);
                telemetry.serverCostUsd = parseFloat((pricingMap.server?.cost_per_request || 0.002).toFixed(6));

                return new Response(JSON.stringify({ classificationData, telemetry }), { headers });

            } catch (error) {
                console.error("Classification Error:", error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
            }
        }

        // 4. Quick Analysis Endpoint (Hidden Client Style)
        if (url.pathname.endsWith("/functions/analyze") && req.method === "POST") {
            try {
                const body = await req.json();
                const { transcription, query, apiKey } = body;

                if (!transcription || !query || !apiKey) {
                    return new Response(JSON.stringify({ error: "Missing transcription, query or apiKey" }), { status: 400, headers });
                }

                console.log(`🕵️ Quick Analysis Request: "${query.substring(0, 30)}..."`);

                const genAI = new GoogleGenerativeAI(apiKey);
                // Use a fast model for quick interaction, or Pro for better reasoning. 
                // Using 2.0 Flash to match other features.
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

                const systemInstruction = `
                    You are an expert analyst for "Hidden Client" (Secret Shopper) evaluations.
                    A transcription of an interaction will be provided.
                    Answer the user's question based strictly on the provided transcription.
                    Be objective and cite evidence from the text if possible.
                `;

                const fullPrompt = `${systemInstruction}\n\nTranscription:\n${transcription}\n\nQuestion:\n${query}`;

                const result = await model.generateContent(fullPrompt);
                const response = result.response;
                const text = response.text();

                return new Response(JSON.stringify({ result: text }), { headers });

            } catch (error) {
                console.error("Analysis Error:", error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
            }
        }

        // 4. Pricing Configuration Endpoint
        if (url.pathname.endsWith("/functions/pricing")) {
            const pricingFilePath = "pricing.json";

            if (req.method === "GET") {
                try {
                    const file = Bun.file(pricingFilePath);
                    if (await file.exists()) {
                        const pricing = await getPricingConfig();
                        return new Response(JSON.stringify(pricing), { headers });
                    } else {
                        // Default Fallback
                        const default_pricing = await getPricingConfig();
                        return new Response(JSON.stringify(default_pricing), { headers });
                    }
                } catch (error) {
                    console.error("Error reading pricing:", error);
                    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
                }
            }

            if (req.method === "POST") {
                try {
                    const newPricing = await req.json();
                    await Bun.write(pricingFilePath, JSON.stringify(newPricing, null, 4));
                    console.log("💰 Pricing updated successfully!");
                    return new Response(JSON.stringify({ success: true, message: "Pricing updated." }), { headers });
                } catch (error) {
                    console.error("Error writing pricing:", error);
                    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
                }
            }
        }

        // === STATIC FILES (Frontend) ===

        let filePath = url.pathname;
        if (filePath === "/" || filePath === "") filePath = "/index.html";

        // Security check implementation for path traversal isn't strictly necessary for local dev tool but good practice
        // Bun.file("public" + filePath) is relatively safe.

        const file = Bun.file("public" + filePath);

        if (await file.exists()) {
            return new Response(file);
        }

        // 404
        return new Response("Not Found", { status: 404 });
    },
});
