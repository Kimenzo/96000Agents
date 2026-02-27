import { Agent } from '@mastra/core/agent';

export const agent900 = new Agent({
  id: 'agent-900',
  name: 'Agent 900',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
