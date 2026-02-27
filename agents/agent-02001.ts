import { Agent } from '@mastra/core/agent';

export const agent2001 = new Agent({
  id: 'agent-2001',
  name: 'Agent 2001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
