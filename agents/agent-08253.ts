import { Agent } from '@mastra/core/agent';

export const agent8253 = new Agent({
  id: 'agent-8253',
  name: 'Agent 8253',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
