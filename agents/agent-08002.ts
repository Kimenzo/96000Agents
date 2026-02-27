import { Agent } from '@mastra/core/agent';

export const agent8002 = new Agent({
  id: 'agent-8002',
  name: 'Agent 8002',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
