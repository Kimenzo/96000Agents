import { Agent } from '@mastra/core/agent';

export const agent42123 = new Agent({
  id: 'agent-42123',
  name: 'Agent 42123',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
