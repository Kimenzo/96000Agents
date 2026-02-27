import { Agent } from '@mastra/core/agent';

export const agent6250 = new Agent({
  id: 'agent-6250',
  name: 'Agent 6250',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
