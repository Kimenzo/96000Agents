import { Agent } from '@mastra/core/agent';

export const agent4433 = new Agent({
  id: 'agent-4433',
  name: 'Agent 4433',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
