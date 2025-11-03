import { challengeAgent } from './mastra/agents/challenge.agent';

interface A2ARequest {
    jsonrpc: '2.0';
    method: string;
    params: {
        taskId: string;
        message: {
            role: string;
            content: string;
        };
        context?: {
            conversationId?: string;
            userId?: string;
            history?: any[];
        };
    };
    id: number;
}

interface A2AResponse {
    jsonrpc: '2.0';
    result: {
        taskId: string;
        status: 'completed' | 'failed';
        artifacts: Array<{
            type: 'text' | 'image' | 'file';
            title: string;
            content: string;
        }>;
        message: {
            role: 'assistant';
            content: string;
        };
    };
    id: number;
}

export async function handleA2ARequest(request: A2ARequest): Promise<A2AResponse> {
    const { taskId, message, context } = request.params;
    const userMessage = message.content;

    // Extract userId from context or use conversationId as fallback
    const userId = context?.userId || context?.conversationId || 'default_user';

    try {
        console.log(`📨 A2A Request - Task: ${taskId}, User: ${userId}`);
        console.log(`💬 Message: ${userMessage}`);

        // Pass userId in the context so tools can access it
        const result = await challengeAgent.generate(userMessage, {
            resourceId: userId,
            // userId: userId, // Make sure userId is available in context
        });

        console.log('🤖 Agent result:', JSON.stringify(result, null, 2));

        // Extract the agent's response
        let responseText = result.text || 'No response generated.';

        // If there were tool calls, the response should already be formatted
        if (result.toolResults && result.toolResults.length > 0) {
            console.log('🔧 Tool results:', result.toolResults);
        }

        return {
            jsonrpc: '2.0',
            result: {
                taskId,
                status: 'completed',
                artifacts: [
                    {
                        type: 'text',
                        title: 'DevChallenge Bot',
                        content: responseText
                    }
                ],
                message: {
                    role: 'assistant',
                    content: responseText
                }
            },
            id: request.id
        };

    } catch (error) {
        console.error('❌ Error processing A2A request:', error);

        return {
            jsonrpc: '2.0',
            result: {
                taskId,
                status: 'failed',
                artifacts: [
                    {
                        type: 'text',
                        title: 'Error',
                        content: `❌ Something went wrong. Please try again.`
                    }
                ],
                message: {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.'
                }
            },
            id: request.id
        };
    }
}

// Export for Mastra A2A route
export const a2aConfig = {
    agent: challengeAgent,
    handler: handleA2ARequest
};