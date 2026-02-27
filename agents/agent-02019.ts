import { Agent } from '@mastra/core/agent';

export const agent2019 = new Agent({
  id: 'agent-2019',
  name: 'Agent 2019',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
