import { Agent } from '@mastra/core/agent';

export const agent16001 = new Agent({
  id: 'agent-16001',
  name: 'Agent 16001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
