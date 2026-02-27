import { Agent } from '@mastra/core/agent';

export const agent50 = new Agent({
  id: 'agent-50',
  name: 'Agent 50',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
