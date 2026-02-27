import { Agent } from '@mastra/core/agent';

export const agent311 = new Agent({
  id: 'agent-311',
  name: 'Agent 311',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
