import { Agent } from '@mastra/core/agent';

export const agent4140 = new Agent({
  id: 'agent-4140',
  name: 'Agent 4140',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
