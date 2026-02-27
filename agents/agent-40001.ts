import { Agent } from '@mastra/core/agent';

export const agent40001 = new Agent({
  id: 'agent-40001',
  name: 'Agent 40001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
