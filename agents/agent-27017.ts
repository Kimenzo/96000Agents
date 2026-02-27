import { Agent } from '@mastra/core/agent';

export const agent27017 = new Agent({
  id: 'agent-27017',
  name: 'Agent 27017',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
