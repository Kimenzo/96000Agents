import { Agent } from '@mastra/core/agent';

export const agent21001 = new Agent({
  id: 'agent-21001',
  name: 'Agent 21001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
