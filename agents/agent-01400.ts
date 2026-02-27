import { Agent } from '@mastra/core/agent';

export const agent1400 = new Agent({
  id: 'agent-1400',
  name: 'Agent 1400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
