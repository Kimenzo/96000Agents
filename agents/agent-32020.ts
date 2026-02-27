import { Agent } from '@mastra/core/agent';

export const agent32020 = new Agent({
  id: 'agent-32020',
  name: 'Agent 32020',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
