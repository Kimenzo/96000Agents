import { Agent } from '@mastra/core/agent';

export const agent360 = new Agent({
  id: 'agent-360',
  name: 'Agent 360',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
