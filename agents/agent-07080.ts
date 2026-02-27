import { Agent } from '@mastra/core/agent';

export const agent7080 = new Agent({
  id: 'agent-7080',
  name: 'Agent 7080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
