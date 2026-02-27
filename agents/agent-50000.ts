import { Agent } from '@mastra/core/agent';

export const agent50000 = new Agent({
  id: 'agent-50000',
  name: 'Agent 50000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
