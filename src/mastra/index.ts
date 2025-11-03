import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { challengeAgent } from './agents/challenge.agent';

export const mastra = new Mastra({
    agents: {
        'challengeAgent': challengeAgent  // ✅ Explicit string key
    },
    storage: new LibSQLStore({
        url: ':memory:',
    }),
});

export { challengeAgent };