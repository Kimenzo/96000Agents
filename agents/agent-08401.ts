import { Agent } from '@mastra/core/agent';

export const agent8401 = new Agent({
  id: 'agent-8401',
  name: 'Agent 8401',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
