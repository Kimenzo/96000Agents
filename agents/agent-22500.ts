import { Agent } from '@mastra/core/agent';

export const agent22500 = new Agent({
  id: 'agent-22500',
  name: 'Agent 22500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
