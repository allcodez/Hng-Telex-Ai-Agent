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
                data?: any;
                file_url?: string | null;
            }>;
            messageId: string;
            taskId: string;
            metadata?: any;
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
                kind: 'message';
                role: 'agent';
                parts: Array<{
                    kind: 'text' | 'file';
                    text?: string;
                    data?: any;
                    file_url?: string | null;
                    file_name?: string;
                    mime_type?: string;
                }>;
                messageId: string;
                taskId: string;
                metadata?: any;
            };
        };
        artifacts: Array<{
            artifactId: string;
            name: string;
            parts: Array<{
                kind: 'text' | 'data' | 'file';
                text?: string;
                data?: any;
                file_url?: string | null;
                file_name?: string;
                mime_type?: string;
            }>;
        }>;
        history: Array<{
            kind: 'message';
            role: 'user' | 'agent';
            parts: Array<{
                kind: 'text';
                text: string;
                data?: any;
                file_url?: string | null;
            }>;
            messageId: string;
            taskId: string | null;
            metadata?: any;
        }>;
        kind: 'task';
    };
    error: null | {
        code: number;
        message: string;
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

    // Extract userId from taskId or messageId
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
        const responseMessageId = `msg-${Date.now()}`;

        // Build artifacts
        const artifacts: any[] = [
            {
                artifactId: `artifact-${Date.now()}`,
                name: 'challengeAgentResponse',
                parts: [
                    {
                        kind: 'text',
                        text: responseText,
                        data: null,
                        file_url: null
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

        // Build history
        const history = [
            {
                kind: 'message' as const,
                role: 'user' as const,
                parts: [
                    {
                        kind: 'text' as const,
                        text: userMessage,
                        data: null,
                        file_url: null
                    }
                ],
                messageId: message.messageId,
                taskId: taskId,
                metadata: null
            },
            {
                kind: 'message' as const,
                role: 'agent' as const,
                parts: [
                    {
                        kind: 'text' as const,
                        text: responseText,
                        data: null,
                        file_url: null
                    }
                ],
                messageId: responseMessageId,
                taskId: taskId,
                metadata: null
            }
        ];

        // Return A2A compliant response
        return {
            jsonrpc: '2.0',
            id: requestId,
            result: {
                id: taskId,
                contextId: `ctx-${userId}`,
                status: {
                    state: 'completed',
                    timestamp: new Date().toISOString(),
                    message: {
                        kind: 'message',
                        role: 'agent',
                        parts: [
                            {
                                kind: 'text',
                                text: responseText,
                                data: null,
                                file_url: null
                            }
                        ],
                        messageId: responseMessageId,
                        taskId: taskId,
                        metadata: null
                    }
                },
                artifacts,
                history,
                kind: 'task'
            },
            error: null
        };

    } catch (error) {
        console.error('❌ Error processing A2A request:', error);

        const errorMessageId = `error-${Date.now()}`;

        // Return error response
        return {
            jsonrpc: '2.0',
            id: requestId,
            result: {
                id: taskId,
                contextId: `ctx-${userId}`,
                status: {
                    state: 'failed',
                    timestamp: new Date().toISOString(),
                    message: {
                        kind: 'message',
                        role: 'agent',
                        parts: [
                            {
                                kind: 'text',
                                text: '❌ Something went wrong. Please try again.',
                                data: null,
                                file_url: null
                            }
                        ],
                        messageId: errorMessageId,
                        taskId: taskId,
                        metadata: null
                    }
                },
                artifacts: [
                    {
                        artifactId: `error-${Date.now()}`,
                        name: 'ErrorDetails',
                        parts: [
                            {
                                kind: 'text',
                                text: error instanceof Error ? error.message : 'Unknown error',
                                data: null,
                                file_url: null
                            }
                        ]
                    }
                ],
                history: [],
                kind: 'task'
            },
            error: {
                code: -32603,
                message: error instanceof Error ? error.message : 'Internal error'
            }
        };
    }
}

// Export for Mastra A2A route
export const a2aConfig = {
    agent: challengeAgent,
    handler: handleA2ARequest
};