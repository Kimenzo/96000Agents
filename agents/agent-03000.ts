import { Agent } from '@mastra/core/agent';

export const agent3000 = new Agent({
  id: 'agent-3000',
  name: 'Agent 3000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
