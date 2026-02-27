import { Agent } from '@mastra/core/agent';

export const agent11000 = new Agent({
  id: 'agent-11000',
  name: 'Agent 11000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
