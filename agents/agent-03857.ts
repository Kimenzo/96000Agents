import { Agent } from '@mastra/core/agent';

export const agent3857 = new Agent({
  id: 'agent-3857',
  name: 'Agent 3857',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
