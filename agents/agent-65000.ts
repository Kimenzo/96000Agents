import { Agent } from '@mastra/core/agent';

export const agent65000 = new Agent({
  id: 'agent-65000',
  name: 'Agent 65000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
