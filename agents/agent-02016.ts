import { Agent } from '@mastra/core/agent';

export const agent2016 = new Agent({
  id: 'agent-2016',
  name: 'Agent 2016',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
