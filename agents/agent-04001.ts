import { Agent } from '@mastra/core/agent';

export const agent4001 = new Agent({
  id: 'agent-4001',
  name: 'Agent 4001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
