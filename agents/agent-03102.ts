import { Agent } from '@mastra/core/agent';

export const agent3102 = new Agent({
  id: 'agent-3102',
  name: 'Agent 3102',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
