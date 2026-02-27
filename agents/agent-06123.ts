import { Agent } from '@mastra/core/agent';

export const agent6123 = new Agent({
  id: 'agent-6123',
  name: 'Agent 6123',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
