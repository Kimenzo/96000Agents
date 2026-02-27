import { Agent } from '@mastra/core/agent';

export const agent128 = new Agent({
  id: 'agent-128',
  name: 'Agent 128',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
