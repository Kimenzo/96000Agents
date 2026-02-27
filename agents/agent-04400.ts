import { Agent } from '@mastra/core/agent';

export const agent4400 = new Agent({
  id: 'agent-4400',
  name: 'Agent 4400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
