import { Agent } from '@mastra/core/agent';

export const agent4600 = new Agent({
  id: 'agent-4600',
  name: 'Agent 4600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
