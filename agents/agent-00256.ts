import { Agent } from '@mastra/core/agent';

export const agent256 = new Agent({
  id: 'agent-256',
  name: 'Agent 256',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
