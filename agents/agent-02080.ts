import { Agent } from '@mastra/core/agent';

export const agent2080 = new Agent({
  id: 'agent-2080',
  name: 'Agent 2080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
