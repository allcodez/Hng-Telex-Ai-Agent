import { createTool } from '@mastra/core';
import { z } from 'zod';
import { GeminiService } from '../../services/gemini.service';
import { stateManager } from '../../services/state-manager.service';
import { ProgrammingLanguage } from '../../types/user-state.types';

const geminiService = new GeminiService();

// Helper function to extract userId from context
function extractUserId(context: any): string {
    return context?.userId ||
        context?.resourceid ||
        'default_user';
}

export const checkStateTool = createTool({
    id: 'checkState',
    description: 'Check if user has an active challenge. MUST be called FIRST before any other action.',

    inputSchema: z.object({
        userId: z.string().optional().describe('User identifier'),
    }),

    execute: async ({ context }) => {
        const userId = extractUserId(context);

        console.log('🔍 Checking state for user:', userId);

        try {
            const userState = stateManager.getUserState(userId);

            if (!userState.currentChallenge || stateManager.needsNewChallenge(userId)) {
                return {
                    status: 'no_challenge',
                    message: 'User needs a new challenge',
                    userId
                };
            }

            if (userState.currentChallenge.solved) {
                return {
                    status: 'solved',
                    streak: userState.streak,
                    score: userState.score,
                    message: `You already solved today's challenge! ✅\n\n📊 Score: ${userState.score} | Streak: ${userState.streak} 🔥\n\nCome back tomorrow at 8 AM or 6 PM for a new challenge.`,
                    userId
                };
            }

            return {
                status: 'has_active_challenge',
                challenge: {
                    title: userState.currentChallenge.title,
                    question: userState.currentChallenge.question,
                    language: userState.preferredLanguage
                },
                attemptsUsed: userState.currentChallenge.attempts,
                attemptsLeft: 2 - userState.currentChallenge.attempts,
                message: `You have an active ${userState.preferredLanguage} challenge waiting for your answer.\n\nAttempts used: ${userState.currentChallenge.attempts}/2`,
                userId
            };
        } catch (error) {
            console.error('❌ Error checking state:', error);
            return {
                status: 'error',
                message: 'Could not check state',
                userId
            };
        }
    }
});

export const getDailyChallengeTool = createTool({
    id: 'getDailyChallenge',
    description: 'Gets a new daily coding challenge for the user in specified language.',

    inputSchema: z.object({
        userId: z.string().optional().describe('User identifier'),
        language: z.enum(['python', 'javascript', 'typescript', 'java', 'cpp', 'csharp', 'go', 'rust'])
            .describe('Programming language'),
    }),

    execute: async ({ context }) => {
        const userId = extractUserId(context);
        const language = context?.language;

        console.log(`🎯 Getting challenge for user ${userId} in ${language}`);

        if (!language) {
            return {
                type: 'error',
                message: 'Please specify a programming language.',
                userId
            };
        }

        try {
            stateManager.setPreferredLanguage(userId, language as ProgrammingLanguage);

            const userState = stateManager.getUserState(userId);

            if (stateManager.needsNewChallenge(userId)) {
                console.log(`🔄 Generating new ${language} challenge for ${userId}`);

                const challenge = await geminiService.generateDailyChallenge(language as ProgrammingLanguage);
                stateManager.setCurrentChallenge(userId, challenge);

                return {
                    type: 'new_challenge',
                    challenge: {
                        title: challenge.title,
                        question: challenge.question,
                        language: language
                    },
                    score: userState.score,
                    streak: userState.streak,
                    message: `🎯 ${language.toUpperCase()} Challenge\n\n**${challenge.title}**\n\n${challenge.question}\n\n📊 Score: ${userState.score} | Streak: ${userState.streak} 🔥\n\nSubmit your answer (2 attempts available)`,
                    userId
                };
            } else {
                if (userState.currentChallenge?.solved) {
                    return {
                        type: 'already_solved',
                        streak: userState.streak,
                        score: userState.score,
                        message: `You already solved today's challenge! ✅\n\n📊 Score: ${userState.score} | Streak: ${userState.streak} 🔥\n\nCome back tomorrow for a new one.`,
                        userId
                    };
                }

                return {
                    type: 'existing_challenge',
                    challenge: {
                        title: userState.currentChallenge?.title,
                        question: userState.currentChallenge?.question,
                        language: userState.preferredLanguage
                    },
                    attemptsLeft: 2 - (userState.currentChallenge?.attempts || 0),
                    score: userState.score,
                    streak: userState.streak,
                    message: `You already have an active ${userState.preferredLanguage} challenge.\n\n**${userState.currentChallenge?.title}**\n\n${userState.currentChallenge?.question}\n\nAttempts left: ${2 - (userState.currentChallenge?.attempts || 0)}\n\nSubmit your answer!`,
                    userId
                };
            }
        } catch (error) {
            console.error('❌ Error getting challenge:', error);
            return {
                type: 'error',
                message: 'Something went wrong generating the challenge. Please try again.',
                userId
            };
        }
    }
});

export const submitAnswerTool = createTool({
    id: 'submitAnswer',
    description: 'Submit an answer to the active challenge. This uses one attempt.',

    inputSchema: z.object({
        userId: z.string().optional().describe('User identifier'),
        answer: z.string().describe('User\'s answer'),
    }),

    execute: async ({ context }) => {
        const userId = extractUserId(context);
        const answer = context?.answer;

        console.log(`📝 User ${userId} submitted answer: ${answer}`);

        if (!answer) {
            return {
                type: 'error',
                message: 'Please provide an answer.',
                userId
            };
        }

        try {
            const userState = stateManager.getUserState(userId);

            if (!userState.currentChallenge) {
                return {
                    type: 'no_challenge',
                    message: 'You don\'t have an active challenge. Request a new one by saying a programming language (e.g., "python", "javascript").',
                    userId
                };
            }

            if (userState.currentChallenge.solved) {
                return {
                    type: 'already_solved',
                    streak: userState.streak,
                    score: userState.score,
                    message: `You already solved today's challenge! ✅\n\n📊 Score: ${userState.score} | Streak: ${userState.streak} 🔥\n\nCome back tomorrow for a new one.`,
                    userId
                };
            }

            const currentChallenge = userState.currentChallenge;

            // Flexible answer matching
            const userAnswer = answer.trim().toLowerCase();
            const correctAnswer = currentChallenge.correctAnswer.trim().toLowerCase();
            const isCorrect = userAnswer === correctAnswer ||
                userAnswer.includes(correctAnswer) ||
                correctAnswer.includes(userAnswer);

            if (isCorrect) {
                stateManager.markChallengeSolved(userId);
                const updatedState = stateManager.getUserState(userId);

                return {
                    type: 'correct',
                    correctAnswer: currentChallenge.correctAnswer,
                    score: updatedState.score,
                    streak: updatedState.streak,
                    message: `✅ Correct!\n\nAnswer: ${currentChallenge.correctAnswer}\n\n📊 Score: ${updatedState.score} | Streak: ${updatedState.streak} 🔥\n\nNew challenge tomorrow at 8 AM or 6 PM!`,
                    userId
                };
            } else {
                const updatedChallenge = stateManager.incrementAttempts(userId);
                const attemptsLeft = 2 - updatedChallenge!.attempts;

                if (attemptsLeft > 0) {
                    return {
                        type: 'wrong_with_attempts',
                        attemptsLeft,
                        message: `❌ Incorrect.\n\nAttempts left: ${attemptsLeft}\n\nWant a hint? Say "hint"`,
                        userId
                    };
                } else {
                    return {
                        type: 'wrong_no_attempts',
                        correctAnswer: currentChallenge.correctAnswer,
                        message: `❌ Out of attempts.\n\nCorrect answer: ${currentChallenge.correctAnswer}\n\nNew challenge tomorrow at 8 AM or 6 PM!`,
                        userId
                    };
                }
            }
        } catch (error) {
            console.error('❌ Error submitting answer:', error);
            return {
                type: 'error',
                message: 'Something went wrong processing your answer. Please try again.',
                userId
            };
        }
    }
});

export const getHintTool = createTool({
    id: 'getHint',
    description: 'Get a hint for the current challenge.',

    inputSchema: z.object({
        userId: z.string().optional().describe('User identifier'),
    }),

    execute: async ({ context }) => {
        const userId = extractUserId(context);

        console.log(`💡 User ${userId} requested hint`);

        try {
            const userState = stateManager.getUserState(userId);

            if (!userState.currentChallenge) {
                return {
                    type: 'no_challenge',
                    message: 'You don\'t have an active challenge. Request a new one by saying a programming language.',
                    userId
                };
            }

            if (userState.currentChallenge.solved) {
                return {
                    type: 'already_solved',
                    message: 'You already solved this challenge! ✅',
                    userId
                };
            }

            const attemptsUsed = userState.currentChallenge.attempts;
            const hintIndex = Math.min(attemptsUsed, userState.currentChallenge.hints.length - 1);
            const hint = userState.currentChallenge.hints[hintIndex];

            return {
                type: 'hint',
                hint,
                attemptsLeft: 2 - attemptsUsed,
                message: `💡 Hint: ${hint}\n\nAttempts left: ${2 - attemptsUsed}\n\nTry again!`,
                userId
            };
        } catch (error) {
            console.error('❌ Error getting hint:', error);
            return {
                type: 'error',
                message: 'Could not get hint. Please try again.',
                userId
            };
        }
    }
});