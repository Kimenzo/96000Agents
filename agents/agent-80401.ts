import { Agent } from '@mastra/core/agent';

export const agent80401 = new Agent({
  id: 'agent-80401',
  name: 'Agent 80401',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
