import { Agent } from '@mastra/core/agent';

export const agent8023 = new Agent({
  id: 'agent-8023',
  name: 'Agent 8023',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
