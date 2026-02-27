import { Agent } from '@mastra/core/agent';

export const agent8093 = new Agent({
  id: 'agent-8093',
  name: 'Agent 8093',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
