import { Agent } from '@mastra/core/agent';

export const agent4567 = new Agent({
  id: 'agent-4567',
  name: 'Agent 4567',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
