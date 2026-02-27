import { Agent } from '@mastra/core/agent';

export const agent2380 = new Agent({
  id: 'agent-2380',
  name: 'Agent 2380',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
