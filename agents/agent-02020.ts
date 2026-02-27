import { Agent } from '@mastra/core/agent';

export const agent2020 = new Agent({
  id: 'agent-2020',
  name: 'Agent 2020',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
