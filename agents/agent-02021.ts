import { Agent } from '@mastra/core/agent';

export const agent2021 = new Agent({
  id: 'agent-2021',
  name: 'Agent 2021',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
