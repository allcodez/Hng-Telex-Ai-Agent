import { triggerScheduledChallenge } from '../src/scheduler/cron-scheduler';

console.log('🌆 Triggering evening challenge...');
triggerScheduledChallenge('evening')
    .then(() => {
        console.log('✅ Evening challenge triggered successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error triggering evening challenge:', error);
        process.exit(1);
    });