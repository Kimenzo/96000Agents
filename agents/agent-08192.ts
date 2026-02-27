import { Agent } from '@mastra/core/agent';

export const agent8192 = new Agent({
  id: 'agent-8192',
  name: 'Agent 8192',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
