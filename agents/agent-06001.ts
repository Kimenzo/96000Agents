import { Agent } from '@mastra/core/agent';

export const agent6001 = new Agent({
  id: 'agent-6001',
  name: 'Agent 6001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
