import { handleA2ARequest } from './a2a-handler';
import express from 'express';

const app = express();
app.use(express.json());

// A2A endpoint for Telex
app.post('/a2a/agent/challengeAgent', async (req, res) => {
    try {
        const response = await handleA2ARequest(req.body);
        res.json(response);
    } catch (error) {
        console.error('A2A endpoint error:', error);
        res.status(500).json({
            jsonrpc: '2.0',
            id: req.body.id,
            error: {
                code: -32603,
                message: 'Internal error'
            }
        });
    }
});

const PORT = process.env.PORT || 4111;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});