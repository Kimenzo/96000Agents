import { Agent } from '@mastra/core/agent';

export const agent4060 = new Agent({
  id: 'agent-4060',
  name: 'Agent 4060',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
