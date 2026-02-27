import { Agent } from '@mastra/core/agent';

export const agent25519 = new Agent({
  id: 'agent-25519',
  name: 'Agent 25519',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
