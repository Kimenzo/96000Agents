import { Agent } from '@mastra/core/agent';

export const agent6060 = new Agent({
  id: 'agent-6060',
  name: 'Agent 6060',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
