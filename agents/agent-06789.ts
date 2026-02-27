import { Agent } from '@mastra/core/agent';

export const agent6789 = new Agent({
  id: 'agent-6789',
  name: 'Agent 6789',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
