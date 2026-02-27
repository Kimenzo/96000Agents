import { Agent } from '@mastra/core/agent';

export const agent64 = new Agent({
  id: 'agent-64',
  name: 'Agent 64',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
