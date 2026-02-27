import { Agent } from '@mastra/core/agent';

export const agent2048 = new Agent({
  id: 'agent-2048',
  name: 'Agent 2048',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
