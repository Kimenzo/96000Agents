import { Agent } from '@mastra/core/agent';

export const agent8004 = new Agent({
  id: 'agent-8004',
  name: 'Agent 8004',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
