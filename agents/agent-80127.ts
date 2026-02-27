import { Agent } from '@mastra/core/agent';

export const agent80127 = new Agent({
  id: 'agent-80127',
  name: 'Agent 80127',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
