import { Mastra } from '@mastra/core';
import { challengeAgent } from './mastra/agents/challenge.agent';
import express from 'express';

const app = express();
app.use(express.json());

// Initialize Mastra
const mastra = new Mastra({
    agents: {
        challengeAgent,
    },
});

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
                message: 'Internal error'
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