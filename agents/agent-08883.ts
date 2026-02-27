import { Agent } from '@mastra/core/agent';

export const agent8883 = new Agent({
  id: 'agent-8883',
  name: 'Agent 8883',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
