import { Agent } from '@mastra/core/agent';

export const agent4340 = new Agent({
  id: 'agent-4340',
  name: 'Agent 4340',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
