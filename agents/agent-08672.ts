import { Agent } from '@mastra/core/agent';

export const agent8672 = new Agent({
  id: 'agent-8672',
  name: 'Agent 8672',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
