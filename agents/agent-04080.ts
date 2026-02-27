import { Agent } from '@mastra/core/agent';

export const agent4080 = new Agent({
  id: 'agent-4080',
  name: 'Agent 4080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
