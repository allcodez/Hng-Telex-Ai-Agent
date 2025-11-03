import { triggerScheduledChallenge } from '../src/scheduler/cron-scheduler';

console.log('🌅 Triggering morning challenge...');
triggerScheduledChallenge('morning')
    .then(() => {
        console.log('✅ Morning challenge triggered successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error triggering morning challenge:', error);
        process.exit(1);
    });