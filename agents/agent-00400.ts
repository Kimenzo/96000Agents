import { Agent } from '@mastra/core/agent';

export const agent400 = new Agent({
  id: 'agent-400',
  name: 'Agent 400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
