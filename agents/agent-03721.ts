import { Agent } from '@mastra/core/agent';

export const agent3721 = new Agent({
  id: 'agent-3721',
  name: 'Agent 3721',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
