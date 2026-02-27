import { Agent } from '@mastra/core/agent';

export const agent1900 = new Agent({
  id: 'agent-1900',
  name: 'Agent 1900',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
