import { Agent } from '@mastra/core/agent';

export const agent1024 = new Agent({
  id: 'agent-1024',
  name: 'Agent 1024',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
