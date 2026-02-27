import { Agent } from '@mastra/core/agent';

export const agent6923 = new Agent({
  id: 'agent-6923',
  name: 'Agent 6923',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
