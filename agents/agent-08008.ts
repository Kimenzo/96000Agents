import { Agent } from '@mastra/core/agent';

export const agent8008 = new Agent({
  id: 'agent-8008',
  name: 'Agent 8008',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
