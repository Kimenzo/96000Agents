import { Agent } from '@mastra/core/agent';

export const agent2015 = new Agent({
  id: 'agent-2015',
  name: 'Agent 2015',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
