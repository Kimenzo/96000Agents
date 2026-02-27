import { Agent } from '@mastra/core/agent';

export const agent4337 = new Agent({
  id: 'agent-4337',
  name: 'Agent 4337',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
