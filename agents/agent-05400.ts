import { Agent } from '@mastra/core/agent';

export const agent5400 = new Agent({
  id: 'agent-5400',
  name: 'Agent 5400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
