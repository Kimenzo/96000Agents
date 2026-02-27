import { Agent } from '@mastra/core/agent';

export const agent5090 = new Agent({
  id: 'agent-5090',
  name: 'Agent 5090',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
