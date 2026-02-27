import { Agent } from '@mastra/core/agent';

export const agent4608 = new Agent({
  id: 'agent-4608',
  name: 'Agent 4608',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
