import { Agent } from '@mastra/core/agent';

export const agent3100 = new Agent({
  id: 'agent-3100',
  name: 'Agent 3100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
