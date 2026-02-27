import { Agent } from '@mastra/core/agent';

export const agent8100 = new Agent({
  id: 'agent-8100',
  name: 'Agent 8100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
