import { Agent } from '@mastra/core/agent';

export const agent8070 = new Agent({
  id: 'agent-8070',
  name: 'Agent 8070',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
