import { Agent } from '@mastra/core/agent';

export const agent3500 = new Agent({
  id: 'agent-3500',
  name: 'Agent 3500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
