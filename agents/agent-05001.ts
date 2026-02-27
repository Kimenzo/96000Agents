import { Agent } from '@mastra/core/agent';

export const agent5001 = new Agent({
  id: 'agent-5001',
  name: 'Agent 5001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
