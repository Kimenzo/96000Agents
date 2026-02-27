import { Agent } from '@mastra/core/agent';

export const agent10001 = new Agent({
  id: 'agent-10001',
  name: 'Agent 10001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
