import { Agent } from '@mastra/core/agent';

export const agent42101 = new Agent({
  id: 'agent-42101',
  name: 'Agent 42101',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
