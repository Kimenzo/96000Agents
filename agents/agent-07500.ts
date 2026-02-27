import { Agent } from '@mastra/core/agent';

export const agent7500 = new Agent({
  id: 'agent-7500',
  name: 'Agent 7500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
