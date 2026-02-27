import { Agent } from '@mastra/core/agent';

export const agent6400 = new Agent({
  id: 'agent-6400',
  name: 'Agent 6400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
