import { Agent } from '@mastra/core/agent';

export const agent80 = new Agent({
  id: 'agent-80',
  name: 'Agent 80',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
