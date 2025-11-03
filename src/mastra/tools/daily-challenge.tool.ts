import { createTool } from '@mastra/core';
import { z } from 'zod';
import { GeminiService } from '../../services/gemini.service';
import { stateManager } from '../../services/state-manager.service';
import { ProgrammingLanguage } from '../../types/user-state.types';

const geminiService = new GeminiService();

export const checkStateTool = createTool({
    id: 'checkState',
    description: 'Check if user has an active challenge. MUST be called FIRST before any other action.',

    inputSchema: z.object({
        userId: z.string().default('default_user').describe('User identifier'),
    }),

    execute: async ({ context }: { context: any }) => {
        const { userId = 'default_user' } = context;

        try {
            const userState = stateManager.getUserState(userId);

            if (!userState.currentChallenge || stateManager.needsNewChallenge(userId)) {
                return {
                    status: 'no_challenge',
                    message: 'User needs a new challenge'
                };
            }

            if (userState.currentChallenge.solved) {
                return {
                    status: 'solved',
                    streak: userState.streak,
                    message: 'User already solved today\'s challenge'
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
                message: 'User has active challenge waiting for answer'
            };
        } catch (error) {
            console.error('❌ Error checking state:', error);
            return {
                status: 'error',
                message: 'Could not check state'
            };
        }
    }
});

export const getDailyChallengeTool = createTool({
    id: 'getDailyChallenge',
    description: 'Gets a new daily coding challenge for the user in specified language.',

    inputSchema: z.object({
        userId: z.string().default('default_user').describe('User identifier'),
        language: z.enum(['python', 'javascript', 'typescript', 'java', 'cpp', 'csharp', 'go', 'rust'])
            .describe('Programming language'),
    }),

    execute: async ({ context }: { context: any }) => {
        const { userId = 'default_user', language } = context;

        try {
            console.log(`🎯 Getting challenge for ${userId} in ${language}`);

            stateManager.setPreferredLanguage(userId, language as ProgrammingLanguage);

            const userState = stateManager.getUserState(userId);

            if (stateManager.needsNewChallenge(userId)) {
                console.log(`🔄 Generating new ${language} challenge`);

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
                    streak: userState.streak
                };
            } else {
                if (userState.currentChallenge?.solved) {
                    return {
                        type: 'already_solved',
                        streak: userState.streak,
                        score: userState.score
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
                    streak: userState.streak
                };
            }
        } catch (error) {
            console.error('❌ Error getting challenge:', error);
            return {
                type: 'error',
                message: 'Something went wrong. Please try again.'
            };
        }
    }
});

export const submitAnswerTool = createTool({
    id: 'submitAnswer',
    description: 'Submit an answer to the active challenge. This uses one attempt.',

    inputSchema: z.object({
        userId: z.string().default('default_user').describe('User identifier'),
        answer: z.string().describe('User\'s answer'),
    }),

    execute: async ({ context }: { context: any }) => {
        const { userId = 'default_user', answer } = context;

        try {
            console.log(`📝 ${userId} submitted: ${answer}`);

            const userState = stateManager.getUserState(userId);

            if (!userState.currentChallenge) {
                return {
                    type: 'no_challenge',
                    message: 'No active challenge'
                };
            }

            if (userState.currentChallenge.solved) {
                return {
                    type: 'already_solved',
                    streak: userState.streak
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
                    streak: updatedState.streak
                };
            } else {
                const updatedChallenge = stateManager.incrementAttempts(userId);
                const attemptsLeft = 2 - updatedChallenge!.attempts;

                if (attemptsLeft > 0) {
                    return {
                        type: 'wrong_with_attempts',
                        attemptsLeft
                    };
                } else {
                    return {
                        type: 'wrong_no_attempts',
                        correctAnswer: currentChallenge.correctAnswer
                    };
                }
            }
        } catch (error) {
            console.error('❌ Error submitting answer:', error);
            return {
                type: 'error',
                message: 'Something went wrong'
            };
        }
    }
});

export const getHintTool = createTool({
    id: 'getHint',
    description: 'Get a hint for the current challenge.',

    inputSchema: z.object({
        userId: z.string().default('default_user').describe('User identifier'),
    }),

    execute: async ({ context }: { context: any }) => {
        const { userId = 'default_user' } = context;

        try {
            const userState = stateManager.getUserState(userId);

            if (!userState.currentChallenge) {
                return {
                    type: 'no_challenge',
                    message: 'No active challenge'
                };
            }

            if (userState.currentChallenge.solved) {
                return {
                    type: 'already_solved',
                    message: 'Challenge already solved'
                };
            }

            const attemptsUsed = userState.currentChallenge.attempts;
            const hintIndex = Math.min(attemptsUsed, userState.currentChallenge.hints.length - 1);
            const hint = userState.currentChallenge.hints[hintIndex];

            return {
                type: 'hint',
                hint,
                attemptsLeft: 2 - attemptsUsed
            };
        } catch (error) {
            console.error('❌ Error getting hint:', error);
            return {
                type: 'error',
                message: 'Could not get hint'
            };
        }
    }
});