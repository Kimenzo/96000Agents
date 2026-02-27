import { Agent } from '@mastra/core/agent';

export const agent5601 = new Agent({
  id: 'agent-5601',
  name: 'Agent 5601',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
