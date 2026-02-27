import { Agent } from '@mastra/core/agent';

export const agent20 = new Agent({
  id: 'agent-20',
  name: 'Agent 20',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
