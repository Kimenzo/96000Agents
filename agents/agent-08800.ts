import { Agent } from '@mastra/core/agent';

export const agent8800 = new Agent({
  id: 'agent-8800',
  name: 'Agent 8800',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
