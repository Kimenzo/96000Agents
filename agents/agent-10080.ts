import { Agent } from '@mastra/core/agent';

export const agent10080 = new Agent({
  id: 'agent-10080',
  name: 'Agent 10080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
