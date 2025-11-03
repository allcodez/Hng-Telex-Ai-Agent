import { challengeAgent } from './mastra/agents/challenge.agent';

// Telex A2A Request Format
interface A2ARequest {
    jsonrpc: '2.0';
    id: string;
    method: 'message/send';
    params: {
        message: {
            kind: 'message';
            role: 'user';
            parts: Array<{
                kind: 'text';
                text: string;
            }>;
            messageId: string;
            taskId: string;
        };
        configuration?: {
            blocking: boolean;
        };
    };
}

// Telex A2A Response Format
interface A2AResponse {
    jsonrpc: '2.0';
    id: string;
    result: {
        id: string;
        contextId: string;
        status: {
            state: 'completed' | 'failed';
            timestamp: string;
            message: {
                messageId: string;
                role: 'agent';
                parts: Array<{
                    kind: 'text';
                    text: string;
                }>;
                kind: 'message';
            };
        };
        artifacts: Array<{
            artifactId: string;
            name: string;
            parts: Array<{
                kind: 'text' | 'data';
                text?: string;
                data?: any;
            }>;
        }>;
        history?: any[];
    };
}

export async function handleA2ARequest(request: A2ARequest): Promise<A2AResponse> {
    const { id: requestId, params } = request;
    const { message } = params;
    const taskId = message.taskId;

    // Extract user message from parts
    const userMessage = message.parts
        .filter(part => part.kind === 'text')
        .map(part => part.text)
        .join(' ');

    // Extract userId from taskId or messageId (Telex should provide this)
    const userId = message.messageId || taskId || 'default_user';

    try {
        console.log(`📨 A2A Request`);
        console.log(`  Task ID: ${taskId}`);
        console.log(`  User ID: ${userId}`);
        console.log(`  Message: ${userMessage}`);

        // Call the agent with resourceId
        const result = await challengeAgent.generate(userMessage, {
            resourceId: userId,
        });

        console.log('🤖 Agent response generated');

        // Extract the agent's response text
        const responseText = result.text || 'No response generated.';

        // Build artifacts
        const artifacts: any[] = [
            {
                artifactId: `artifact-${Date.now()}`,
                name: 'challengeAgentResponse',
                parts: [
                    {
                        kind: 'text',
                        text: responseText
                    }
                ]
            }
        ];

        // If there were tool results, add them as data artifacts
        if (result.toolResults && result.toolResults.length > 0) {
            console.log('🔧 Tool results:', result.toolResults.length);

            artifacts.push({
                artifactId: `tool-${Date.now()}`,
                name: 'ToolResults',
                parts: [
                    {
                        kind: 'data',
                        data: result.toolResults
                    }
                ]
            });
        }

        // Return A2A compliant response
        return {
            jsonrpc: '2.0',
            id: requestId,
            result: {
                id: taskId,
                contextId: `context-${userId}`,
                status: {
                    state: 'completed',
                    timestamp: new Date().toISOString(),
                    message: {
                        messageId: `response-${Date.now()}`,
                        role: 'agent',
                        parts: [
                            {
                                kind: 'text',
                                text: responseText
                            }
                        ],
                        kind: 'message'
                    }
                },
                artifacts,
                history: []
            }
        };

    } catch (error) {
        console.error('❌ Error processing A2A request:', error);

        // Return error response
        return {
            jsonrpc: '2.0',
            id: requestId,
            result: {
                id: taskId,
                contextId: `context-${userId}`,
                status: {
                    state: 'failed',
                    timestamp: new Date().toISOString(),
                    message: {
                        messageId: `error-${Date.now()}`,
                        role: 'agent',
                        parts: [
                            {
                                kind: 'text',
                                text: '❌ Something went wrong. Please try again.'
                            }
                        ],
                        kind: 'message'
                    }
                },
                artifacts: [
                    {
                        artifactId: `error-${Date.now()}`,
                        name: 'ErrorDetails',
                        parts: [
                            {
                                kind: 'text',
                                text: error instanceof Error ? error.message : 'Unknown error'
                            }
                        ]
                    }
                ],
                history: []
            }
        };
    }
}

// Export for Mastra A2A route
export const a2aConfig = {
    agent: challengeAgent,
    handler: handleA2ARequest
};