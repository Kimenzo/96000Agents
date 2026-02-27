import { Agent } from '@mastra/core/agent';

export const agent36525 = new Agent({
  id: 'agent-36525',
  name: 'Agent 36525',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
