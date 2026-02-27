import { Agent } from '@mastra/core/agent';

export const agent3002 = new Agent({
  id: 'agent-3002',
  name: 'Agent 3002',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
