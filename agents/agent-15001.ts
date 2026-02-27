import { Agent } from '@mastra/core/agent';

export const agent15001 = new Agent({
  id: 'agent-15001',
  name: 'Agent 15001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
