import { Agent } from '@mastra/core/agent';

export const agent8784 = new Agent({
  id: 'agent-8784',
  name: 'Agent 8784',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
