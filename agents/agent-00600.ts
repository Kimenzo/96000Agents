import { Agent } from '@mastra/core/agent';

export const agent600 = new Agent({
  id: 'agent-600',
  name: 'Agent 600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
