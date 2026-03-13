
const { OpenAI } = require("openai");

exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { messages, apiKey, provider, modelId } = JSON.parse(event.body);

        if (!messages || !apiKey) {
            return { statusCode: 400, body: "Missing messages or apiKey" };
        }

        let reply = "";

        if (provider === 'openai') {
            // OpenAI implementation
            const openai = new OpenAI({ apiKey: apiKey });
            const completion = await openai.chat.completions.create({
                messages: messages,
                model: modelId || "gpt-4o",
            });
            reply = completion.choices[0].message.content;
        } else {
            // Gemini (placeholder or implement later if using Netlify functions natively for Gemini)
            reply = "Netlify Functions: Integração Gemini ainda não configurada neste handler (usa-se chat_v2 localmente).";
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                reply: reply
            }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
