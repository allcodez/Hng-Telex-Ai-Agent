import 'dotenv/config'; // Add this line first
import express from 'express';
import { mastra } from './mastra';

// Add this to verify env vars are loaded
console.log('🔑 Environment check:');
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('  GOOGLE_GENERATIVE_AI_API_KEY:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅ Set' : '❌ Missing');

const app = express();
app.use(express.json());

// Register A2A endpoint
app.post('/a2a/agent/challengeAgent', async (req, res) => {
    try {
        console.log('📨 Received A2A request:', JSON.stringify(req.body, null, 2));

        const { handleA2ARequest } = await import('./a2a-handler');
        const response = await handleA2ARequest(req.body);

        console.log('✅ Sending A2A response:', JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error('❌ A2A endpoint error:', error);
        res.status(500).json({
            jsonrpc: '2.0',
            id: req.body?.id || 'error',
            error: {
                code: -32603,
                message: 'Internal error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'DevChallenge Bot is running',
        endpoints: {
            a2a: '/a2a/agent/challengeAgent'
        }
    });
});

const PORT = process.env.PORT || 4111;
app.listen(PORT, () => {
    console.log(`🚀 DevChallenge Bot running on port ${PORT}`);
    console.log(`📍 A2A endpoint: http://localhost:${PORT}/a2a/agent/challengeAgent`);
});

export { mastra };