import { Agent } from '@mastra/core/agent';

export const agent7400 = new Agent({
  id: 'agent-7400',
  name: 'Agent 7400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
