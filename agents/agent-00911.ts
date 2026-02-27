import { Agent } from '@mastra/core/agent';

export const agent911 = new Agent({
  id: 'agent-911',
  name: 'Agent 911',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
