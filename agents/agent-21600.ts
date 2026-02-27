import { Agent } from '@mastra/core/agent';

export const agent21600 = new Agent({
  id: 'agent-21600',
  name: 'Agent 21600',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
