import { Agent } from '@mastra/core/agent';

export const agent4100 = new Agent({
  id: 'agent-4100',
  name: 'Agent 4100',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
