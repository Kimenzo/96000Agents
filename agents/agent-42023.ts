import { Agent } from '@mastra/core/agent';

export const agent42023 = new Agent({
  id: 'agent-42023',
  name: 'Agent 42023',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
