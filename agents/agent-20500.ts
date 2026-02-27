import { Agent } from '@mastra/core/agent';

export const agent20500 = new Agent({
  id: 'agent-20500',
  name: 'Agent 20500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
