import { Agent } from '@mastra/core/agent';

export const agent8001 = new Agent({
  id: 'agent-8001',
  name: 'Agent 8001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
