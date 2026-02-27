import { Agent } from '@mastra/core/agent';

export const agent80400 = new Agent({
  id: 'agent-80400',
  name: 'Agent 80400',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
