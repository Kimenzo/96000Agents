import { Agent } from '@mastra/core/agent';

export const agent6022 = new Agent({
  id: 'agent-6022',
  name: 'Agent 6022',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
