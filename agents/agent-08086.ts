import { Agent } from '@mastra/core/agent';

export const agent8086 = new Agent({
  id: 'agent-8086',
  name: 'Agent 8086',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
