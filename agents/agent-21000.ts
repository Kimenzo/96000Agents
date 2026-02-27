import { Agent } from '@mastra/core/agent';

export const agent21000 = new Agent({
  id: 'agent-21000',
  name: 'Agent 21000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
