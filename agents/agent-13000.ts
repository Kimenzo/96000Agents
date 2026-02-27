import { Agent } from '@mastra/core/agent';

export const agent13000 = new Agent({
  id: 'agent-13000',
  name: 'Agent 13000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
