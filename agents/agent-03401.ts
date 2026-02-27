import { Agent } from '@mastra/core/agent';

export const agent3401 = new Agent({
  id: 'agent-3401',
  name: 'Agent 3401',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
