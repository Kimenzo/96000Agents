import { Agent } from '@mastra/core/agent';

export const agent666 = new Agent({
  id: 'agent-666',
  name: 'Agent 666',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
