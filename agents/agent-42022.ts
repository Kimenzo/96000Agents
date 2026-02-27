import { Agent } from '@mastra/core/agent';

export const agent42022 = new Agent({
  id: 'agent-42022',
  name: 'Agent 42022',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
