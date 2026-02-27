import { Agent } from '@mastra/core/agent';

export const agent3380 = new Agent({
  id: 'agent-3380',
  name: 'Agent 3380',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
