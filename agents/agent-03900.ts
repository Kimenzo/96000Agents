import { Agent } from '@mastra/core/agent';

export const agent3900 = new Agent({
  id: 'agent-3900',
  name: 'Agent 3900',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
