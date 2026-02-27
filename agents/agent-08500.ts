import { Agent } from '@mastra/core/agent';

export const agent8500 = new Agent({
  id: 'agent-8500',
  name: 'Agent 8500',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
