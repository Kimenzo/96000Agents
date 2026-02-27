import { Agent } from '@mastra/core/agent';

export const agent80101 = new Agent({
  id: 'agent-80101',
  name: 'Agent 80101',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
