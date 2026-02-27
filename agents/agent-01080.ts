import { Agent } from '@mastra/core/agent';

export const agent1080 = new Agent({
  id: 'agent-1080',
  name: 'Agent 1080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
