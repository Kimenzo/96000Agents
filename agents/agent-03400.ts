import { Agent } from '@mastra/core/agent';

export const agent3400 = new Agent({
  id: 'agent-3400',
  name: 'Agent 3400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
