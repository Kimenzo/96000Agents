import { Agent } from '@mastra/core/agent';

export const agent3001 = new Agent({
  id: 'agent-3001',
  name: 'Agent 3001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
