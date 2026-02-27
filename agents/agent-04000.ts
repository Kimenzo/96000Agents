import { Agent } from '@mastra/core/agent';

export const agent4000 = new Agent({
  id: 'agent-4000',
  name: 'Agent 4000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
