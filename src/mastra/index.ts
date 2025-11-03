import { Mastra } from '@mastra/core';
import { challengeAgent } from './agents/challenge.agent';

export const mastra = new Mastra({
    agents: { challengeAgent },
});

export { challengeAgent };