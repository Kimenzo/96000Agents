import { Agent } from '@mastra/core/agent';

export const agent4090 = new Agent({
  id: 'agent-4090',
  name: 'Agent 4090',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
