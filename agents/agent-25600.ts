import { Agent } from '@mastra/core/agent';

export const agent25600 = new Agent({
  id: 'agent-25600',
  name: 'Agent 25600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
