import { Agent } from '@mastra/core/agent';

export const agent8181 = new Agent({
  id: 'agent-8181',
  name: 'Agent 8181',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
