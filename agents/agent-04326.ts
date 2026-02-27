import { Agent } from '@mastra/core/agent';

export const agent4326 = new Agent({
  id: 'agent-4326',
  name: 'Agent 4326',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
