/**
 * API routes for scheduler management
 * These endpoints allow registering/unregistering users for scheduled challenges
 */

import { userRegistry, triggerScheduledChallenge } from '../scheduler/cron-scheduler';

/**
 * Register user for scheduled challenges
 * POST /api/scheduler/register
 * Body: { userId: string }
 */
export async function registerUser(userId: string) {
    userRegistry.addUser(userId);
    return {
        success: true,
        message: `User ${userId} registered for scheduled challenges`,
        schedule: {
            morning: '8:00 AM UTC',
            evening: '6:00 PM UTC'
        }
    };
}

/**
 * Unregister user from scheduled challenges
 * POST /api/scheduler/unregister
 * Body: { userId: string }
 */
export async function unregisterUser(userId: string) {
    userRegistry.removeUser(userId);
    return {
        success: true,
        message: `User ${userId} unregistered from scheduled challenges`
    };
}

/**
 * Get scheduler status
 * GET /api/scheduler/status
 */
export async function getSchedulerStatus() {
    return {
        active: true,
        registeredUsers: userRegistry.getUserCount(),
        schedule: {
            morning: {
                time: '8:00 AM UTC',
                cron: '0 8 * * *'
            },
            evening: {
                time: '6:00 PM UTC',
                cron: '0 18 * * *'
            }
        },
        timezone: 'UTC',
        nextRun: getNextScheduledTime()
    };
}

/**
 * Manual trigger for testing
 * POST /api/scheduler/trigger
 * Body: { timeOfDay: 'morning' | 'evening' }
 */
export async function manualTrigger(timeOfDay: 'morning' | 'evening') {
    await triggerScheduledChallenge(timeOfDay);
    return {
        success: true,
        message: `Triggered ${timeOfDay} challenge distribution`,
        affectedUsers: userRegistry.getUserCount()
    };
}

/**
 * Calculate next scheduled run time
 */
function getNextScheduledTime() {
    const now = new Date();
    const morningToday = new Date(now);
    morningToday.setUTCHours(8, 0, 0, 0);

    const eveningToday = new Date(now);
    eveningToday.setUTCHours(18, 0, 0, 0);

    const morningTomorrow = new Date(morningToday);
    morningTomorrow.setUTCDate(morningTomorrow.getUTCDate() + 1);

    if (now < morningToday) {
        return { type: 'morning', time: morningToday.toISOString() };
    } else if (now < eveningToday) {
        return { type: 'evening', time: eveningToday.toISOString() };
    } else {
        return { type: 'morning', time: morningTomorrow.toISOString() };
    }
}