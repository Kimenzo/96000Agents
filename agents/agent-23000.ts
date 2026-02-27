import { Agent } from '@mastra/core/agent';

export const agent23000 = new Agent({
  id: 'agent-23000',
  name: 'Agent 23000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
