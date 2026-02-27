import { Agent } from '@mastra/core/agent';

export const agent86000 = new Agent({
  id: 'agent-86000',
  name: 'Agent 86000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
