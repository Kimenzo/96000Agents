import { Agent } from '@mastra/core/agent';

export const agent7001 = new Agent({
  id: 'agent-7001',
  name: 'Agent 7001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
