import { Agent } from '@mastra/core/agent';

export const agent3090 = new Agent({
  id: 'agent-3090',
  name: 'Agent 3090',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
