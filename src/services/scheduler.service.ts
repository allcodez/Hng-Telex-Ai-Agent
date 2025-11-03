/**
 * Scheduler for proactive 8 AM and 6 PM challenges
 *
 * This sends automatic challenges to users at scheduled times
 * using their last selected programming language.
 */

import { stateManager } from './state-manager.service';
import { GeminiService } from './gemini.service';

const geminiService = new GeminiService();

export class ChallengeScheduler {
    /**
     * Send scheduled challenge to user
     * Called automatically at 8 AM and 6 PM daily
     */
    async sendScheduledChallenge(userId: string, timeOfDay: 'morning' | 'evening') {
        try {
            const userState = stateManager.getUserState(userId);

            // Check if user needs new challenge
            if (!stateManager.needsNewChallenge(userId)) {
                console.log(`User ${userId} already has today's challenge`);
                return null;
            }

            // Generate challenge in user's preferred language
            const language = userState.preferredLanguage;
            const challenge = await geminiService.generateDailyChallenge(language);
            stateManager.setCurrentChallenge(userId, challenge);

            const message = this.formatScheduledMessage(timeOfDay, challenge, language);

            console.log(`✅ Sent ${timeOfDay} challenge to ${userId} (${language})`);

            // In production, this would call Telex API to send message
            return {
                userId,
                timeOfDay,
                language,
                challenge: challenge.title,
                message,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`❌ Error sending scheduled challenge:`, error);
            return null;
        }
    }

    private formatScheduledMessage(
        timeOfDay: 'morning' | 'evening',
        challenge: any,
        language: string
    ): string {
        const greeting = timeOfDay === 'morning'
            ? 'Good morning!'
            : 'Good evening!';

        return `${greeting} 🎯

Your daily ${language} challenge is ready:

**${challenge.title}**
${challenge.question}

Submit your answer (you have 2 attempts)`;
    }

    getScheduleExpressions(timezone: string = 'UTC') {
        return {
            morning: '0 8 * * *',
            evening: '0 18 * * *',
            timezone
        };
    }
}

export const challengeScheduler = new ChallengeScheduler();

/**
 * IMPLEMENTATION NOTES:
 *
 * To implement automatic scheduling:
 *
 * 1. Using node-cron:
 * ```typescript
 * import cron from 'node-cron';
 *
 * // Morning challenges (8 AM)
 * cron.schedule('0 8 * * *', async () => {
 *   const users = getAllActiveUsers();
 *   for (const user of users) {
 *     await challengeScheduler.sendScheduledChallenge(user.id, 'morning');
 *   }
 * });
 *
 * // Evening challenges (6 PM)
 * cron.schedule('0 18 * * *', async () => {
 *   const users = getAllActiveUsers();
 *   for (const user of users) {
 *     await challengeScheduler.sendScheduledChallenge(user.id, 'evening');
 *   }
 * });
 * ```
 *
 * 2. Using cloud scheduler (AWS EventBridge, Google Cloud Scheduler):
 * - Create scheduled event for 8 AM
 * - Create scheduled event for 6 PM
 * - Each event triggers your API endpoint
 * - Endpoint loops through users and sends challenges
 *
 * 3. Integration with Telex:
 * - Get Telex webhook URL for each user
 * - POST challenge message to webhook
 * - Message appears in user's Telex channel
 */