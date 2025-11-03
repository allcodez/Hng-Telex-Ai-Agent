import { config } from '@mastra/core';

export default config({
    name: 'devchallenge-bot',

    // LLM Configuration
    llmProviders: {
        google: {
            apiKey: process.env.GEMINI_API_KEY!,
        },
    },
});

