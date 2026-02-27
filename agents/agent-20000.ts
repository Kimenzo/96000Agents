import { Agent } from '@mastra/core/agent';

export const agent20000 = new Agent({
  id: 'agent-20000',
  name: 'Agent 20000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
