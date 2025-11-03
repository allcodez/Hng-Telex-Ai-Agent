import cron from 'node-cron';
import { challengeScheduler } from '../services/scheduler.service';

/**
 * Active users registry
 * In production, this would come from a database
 */
class UserRegistry {
    private users: Set<string> = new Set();

    addUser(userId: string) {
        this.users.add(userId);
        console.log(`📝 Registered user ${userId} for scheduled challenges`);
    }

    removeUser(userId: string) {
        this.users.delete(userId);
        console.log(`🗑️ Unregistered user ${userId} from scheduled challenges`);
    }

    getAllUsers(): string[] {
        return Array.from(this.users);
    }

    getUserCount(): number {
        return this.users.size;
    }
}

export const userRegistry = new UserRegistry();

/**
 * Initialize cron jobs for scheduled challenges
 */
export function initializeScheduler() {
    console.log('🚀 Initializing challenge scheduler...');

    // Morning challenges - 8:00 AM daily
    cron.schedule('0 8 * * *', async () => {
        console.log('🌅 Running morning challenge distribution...');
        const users = userRegistry.getAllUsers();

        if (users.length === 0) {
            console.log('ℹ️ No users registered for scheduled challenges');
            return;
        }

        console.log(`📤 Sending morning challenges to ${users.length} user(s)`);

        for (const userId of users) {
            try {
                const result = await challengeScheduler.sendScheduledChallenge(userId, 'morning');
                if (result) {
                    // In production, send to Telex here
                    await sendToTelex(userId, result.message);
                }
            } catch (error) {
                console.error(`❌ Failed to send morning challenge to ${userId}:`, error);
            }
        }

        console.log('✅ Morning challenge distribution complete');
    }, {
        timezone: "UTC"
    });

    // Evening challenges - 6:00 PM (18:00) daily
    cron.schedule('0 18 * * *', async () => {
        console.log('🌆 Running evening challenge distribution...');
        const users = userRegistry.getAllUsers();

        if (users.length === 0) {
            console.log('ℹ️ No users registered for scheduled challenges');
            return;
        }

        console.log(`📤 Sending evening challenges to ${users.length} user(s)`);

        for (const userId of users) {
            try {
                const result = await challengeScheduler.sendScheduledChallenge(userId, 'evening');
                if (result) {
                    // In production, send to Telex here
                    await sendToTelex(userId, result.message);
                }
            } catch (error) {
                console.error(`❌ Failed to send evening challenge to ${userId}:`, error);
            }
        }

        console.log('✅ Evening challenge distribution complete');
    }, {
        timezone: "UTC"
    });

    console.log('✅ Scheduler initialized');
    console.log('⏰ Morning challenges: 8:00 AM UTC');
    console.log('⏰ Evening challenges: 6:00 PM UTC');

    // Log next scheduled times
    const now = new Date();
    console.log(`📅 Current time: ${now.toISOString()}`);
}

/**
 * Send message to Telex
 * In production, this would make an API call to Telex
 */
async function sendToTelex(userId: string, message: string): Promise<void> {
    // TODO: Implement actual Telex API integration
    // For now, just log
    console.log(`📨 Would send to Telex user ${userId}:`, message.substring(0, 50) + '...');

    // In production, this would be something like:
    // await telexAPI.sendMessage({
    //   userId,
    //   message,
    //   channelId: getUserChannelId(userId)
    // });
}

/**
 * Manual trigger for testing
 */
export async function triggerScheduledChallenge(timeOfDay: 'morning' | 'evening') {
    console.log(`🧪 Manually triggering ${timeOfDay} challenge distribution...`);
    const users = userRegistry.getAllUsers();

    for (const userId of users) {
        const result = await challengeScheduler.sendScheduledChallenge(userId, timeOfDay);
        if (result) {
            console.log(`✅ Sent ${timeOfDay} challenge to ${userId}`);
        }
    }
}