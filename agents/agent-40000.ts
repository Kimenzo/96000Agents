import { Agent } from '@mastra/core/agent';

export const agent40000 = new Agent({
  id: 'agent-40000',
  name: 'Agent 40000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
