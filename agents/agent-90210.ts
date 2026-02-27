import { Agent } from '@mastra/core/agent';

export const agent90210 = new Agent({
  id: 'agent-90210',
  name: 'Agent 90210',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
