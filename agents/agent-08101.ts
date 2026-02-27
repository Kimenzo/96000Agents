import { Agent } from '@mastra/core/agent';

export const agent8101 = new Agent({
  id: 'agent-8101',
  name: 'Agent 8101',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
