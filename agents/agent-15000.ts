import { Agent } from '@mastra/core/agent';

export const agent15000 = new Agent({
  id: 'agent-15000',
  name: 'Agent 15000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
