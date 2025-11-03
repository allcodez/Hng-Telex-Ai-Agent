import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { challengeAgent } from './agents/challenge.agent';

export const mastra = new Mastra({
    agents: { challengeAgent },
    storage: new LibSQLStore({
        // Use memory storage (doesn't persist between restarts)
        // For persistent storage, use: url: 'file:./mastra.db'
        url: ':memory:',
    }),
});

export { challengeAgent };