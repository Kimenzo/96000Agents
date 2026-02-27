import { Agent } from '@mastra/core/agent';

export const agent4444 = new Agent({
  id: 'agent-4444',
  name: 'Agent 4444',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
