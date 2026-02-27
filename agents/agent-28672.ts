import { Agent } from '@mastra/core/agent';

export const agent28672 = new Agent({
  id: 'agent-28672',
  name: 'Agent 28672',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
