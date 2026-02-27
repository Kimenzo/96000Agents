import { Agent } from '@mastra/core/agent';

export const agent80301 = new Agent({
  id: 'agent-80301',
  name: 'Agent 80301',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
