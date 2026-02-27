import { Agent } from '@mastra/core/agent';

export const agent14400 = new Agent({
  id: 'agent-14400',
  name: 'Agent 14400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
