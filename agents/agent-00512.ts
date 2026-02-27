import { Agent } from '@mastra/core/agent';

export const agent512 = new Agent({
  id: 'agent-512',
  name: 'Agent 512',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
