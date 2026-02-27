import { Agent } from '@mastra/core/agent';

export const agent2017 = new Agent({
  id: 'agent-2017',
  name: 'Agent 2017',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
