import { Agent } from '@mastra/core/agent';

export const agent50001 = new Agent({
  id: 'agent-50001',
  name: 'Agent 50001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
