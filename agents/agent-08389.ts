import { Agent } from '@mastra/core/agent';

export const agent8389 = new Agent({
  id: 'agent-8389',
  name: 'Agent 8389',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
