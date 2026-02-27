import { Agent } from '@mastra/core/agent';

export const agent6080 = new Agent({
  id: 'agent-6080',
  name: 'Agent 6080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
