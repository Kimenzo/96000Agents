import { Agent } from '@mastra/core/agent';

export const agent5250 = new Agent({
  id: 'agent-5250',
  name: 'Agent 5250',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
