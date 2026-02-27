import { Agent } from '@mastra/core/agent';

export const agent18485 = new Agent({
  id: 'agent-18485',
  name: 'Agent 18485',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
