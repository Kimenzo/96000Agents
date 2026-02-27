import { Agent } from '@mastra/core/agent';

export const agent76561 = new Agent({
  id: 'agent-76561',
  name: 'Agent 76561',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
