import { Agent } from '@mastra/core/agent';

export const agent2018 = new Agent({
  id: 'agent-2018',
  name: 'Agent 2018',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
