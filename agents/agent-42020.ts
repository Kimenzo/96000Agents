import { Agent } from '@mastra/core/agent';

export const agent42020 = new Agent({
  id: 'agent-42020',
  name: 'Agent 42020',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
