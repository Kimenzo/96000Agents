import { Agent } from '@mastra/core/agent';

export const agent4096 = new Agent({
  id: 'agent-4096',
  name: 'Agent 4096',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
