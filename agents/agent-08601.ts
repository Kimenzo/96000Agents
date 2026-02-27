import { Agent } from '@mastra/core/agent';

export const agent8601 = new Agent({
  id: 'agent-8601',
  name: 'Agent 8601',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
