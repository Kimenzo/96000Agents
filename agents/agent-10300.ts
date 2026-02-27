import { Agent } from '@mastra/core/agent';

export const agent10300 = new Agent({
  id: 'agent-10300',
  name: 'Agent 10300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
