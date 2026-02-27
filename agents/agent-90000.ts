import { Agent } from '@mastra/core/agent';

export const agent90000 = new Agent({
  id: 'agent-90000',
  name: 'Agent 90000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
