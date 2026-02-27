import { Agent } from '@mastra/core/agent';

export const agent8021 = new Agent({
  id: 'agent-8021',
  name: 'Agent 8021',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
