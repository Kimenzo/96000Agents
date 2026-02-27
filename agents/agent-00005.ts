import { Agent } from '@mastra/core/agent';

export const agent5 = new Agent({
  id: 'agent-5',
  name: 'Agent 5',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
