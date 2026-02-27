import { Agent } from '@mastra/core/agent';

export const agent5672 = new Agent({
  id: 'agent-5672',
  name: 'Agent 5672',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
