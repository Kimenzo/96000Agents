import { Agent } from '@mastra/core/agent';

export const agent101 = new Agent({
  id: 'agent-101',
  name: 'Agent 101',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
