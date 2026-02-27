import { Agent } from '@mastra/core/agent';

export const agent8600 = new Agent({
  id: 'agent-8600',
  name: 'Agent 8600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
