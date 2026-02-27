import { Agent } from '@mastra/core/agent';

export const agent36000 = new Agent({
  id: 'agent-36000',
  name: 'Agent 36000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
