import { Agent } from '@mastra/core/agent';

export const agent3700 = new Agent({
  id: 'agent-3700',
  name: 'Agent 3700',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
