import { Agent } from '@mastra/core/agent';

export const agent3080 = new Agent({
  id: 'agent-3080',
  name: 'Agent 3080',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
