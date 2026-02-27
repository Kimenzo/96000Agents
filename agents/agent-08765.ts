import { Agent } from '@mastra/core/agent';

export const agent8765 = new Agent({
  id: 'agent-8765',
  name: 'Agent 8765',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
