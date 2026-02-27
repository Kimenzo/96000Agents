import { Agent } from '@mastra/core/agent';

export const agent42 = new Agent({
  id: 'agent-42',
  name: 'Agent 42',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
