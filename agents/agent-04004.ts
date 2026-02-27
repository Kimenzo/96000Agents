import { Agent } from '@mastra/core/agent';

export const agent4004 = new Agent({
  id: 'agent-4004',
  name: 'Agent 4004',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
