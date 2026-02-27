import { Agent } from '@mastra/core/agent';

export const agent5000 = new Agent({
  id: 'agent-5000',
  name: 'Agent 5000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
