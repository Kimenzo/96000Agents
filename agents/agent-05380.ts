import { Agent } from '@mastra/core/agent';

export const agent5380 = new Agent({
  id: 'agent-5380',
  name: 'Agent 5380',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
