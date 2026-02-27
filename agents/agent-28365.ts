import { Agent } from '@mastra/core/agent';

export const agent28365 = new Agent({
  id: 'agent-28365',
  name: 'Agent 28365',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
