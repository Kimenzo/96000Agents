import { Agent } from '@mastra/core/agent';

export const agent6600 = new Agent({
  id: 'agent-6600',
  name: 'Agent 6600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
