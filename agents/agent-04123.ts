import { Agent } from '@mastra/core/agent';

export const agent4123 = new Agent({
  id: 'agent-4123',
  name: 'Agent 4123',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
