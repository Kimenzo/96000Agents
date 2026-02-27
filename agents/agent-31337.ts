import { Agent } from '@mastra/core/agent';

export const agent31337 = new Agent({
  id: 'agent-31337',
  name: 'Agent 31337',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
