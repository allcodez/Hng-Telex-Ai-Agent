import { challengeAgent, formatChallengesResponse } from './mastra/agents/challenge.agent';

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
    const { taskId, message } = request.params;
    const userMessage = message.content;

    try {
        console.log(`Processing A2A request - Task: ${taskId}`);
        console.log(`User message: ${userMessage}`);

        const result = await challengeAgent.generate(userMessage);

        let challenges: any[] = [];
        let formattedResponse = '';

        if (result.text) {
            formattedResponse = result.text;
        }

        if (result.toolResults && result.toolResults.length > 0) {
            const toolResult = result.toolResults[0];
            if (toolResult.result?.challenges) {
                challenges = toolResult.result.challenges;
                formattedResponse = formatChallengesResponse(challenges);
            }
        }

        if (challenges.length === 0) {
            formattedResponse = result.text || `I understand you want coding challenges! Please specify:

🎯 **Example requests:**
- "Give me 3 Python problems"
- "Easy JavaScript challenges"
- "Hard Java coding problems"
- "Medium difficulty TypeScript questions"

I'll generate 3 challenges with descriptions, examples, hints, and complexity analysis!`;
        }

        return {
            jsonrpc: '2.0',
            result: {
                taskId,
                status: 'completed',
                artifacts: [
                    {
                        type: 'text',
                        title: challenges.length > 0
                            ? `${challenges[0].language?.toUpperCase() || 'Coding'} Challenges - ${challenges[0].difficulty?.toUpperCase() || 'MEDIUM'}`
                            : 'DevChallenge Bot',
                        content: formattedResponse
                    }
                ],
                message: {
                    role: 'assistant',
                    content: challenges.length > 0
                        ? `I've generated ${challenges.length} ${challenges[0].difficulty} ${challenges[0].language} challenges for you. Check them out below!`
                        : formattedResponse.substring(0, 200) + '...'
                }
            },
            id: request.id
        };

    } catch (error) {
        console.error('Error processing A2A request:', error);

        return {
            jsonrpc: '2.0',
            result: {
                taskId,
                status: 'failed',
                artifacts: [
                    {
                        type: 'text',
                        title: 'Error',
                        content: `❌ Failed to generate challenges: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or rephrase your request.`
                    }
                ],
                message: {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error while generating challenges. Please try again.'
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