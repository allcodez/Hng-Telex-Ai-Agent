import { mastra } from './mastra';
import { initializeScheduler, userRegistry } from './scheduler/cron-scheduler';
import { registerUser, unregisterUser, getSchedulerStatus, manualTrigger } from './api/scheduler-routes';

console.log('🚀 Starting DevChallenge Bot...');

initializeScheduler();

userRegistry.addUser('default_user');

console.log('✅ DevChallenge Bot is running!');
console.log('📅 Scheduled challenges: 8 AM & 6 PM UTC');
console.log('🔗 Agent endpoint: /api/agents/challengeAgent');

export {
    mastra,
    registerUser,
    unregisterUser,
    getSchedulerStatus,
    manualTrigger
};