import { Agent } from '@mastra/core/agent';

export const agent8380 = new Agent({
  id: 'agent-8380',
  name: 'Agent 8380',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
