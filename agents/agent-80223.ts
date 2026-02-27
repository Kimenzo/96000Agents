import { Agent } from '@mastra/core/agent';

export const agent80223 = new Agent({
  id: 'agent-80223',
  name: 'Agent 80223',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
