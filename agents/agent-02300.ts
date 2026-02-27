import { Agent } from '@mastra/core/agent';

export const agent2300 = new Agent({
  id: 'agent-2300',
  name: 'Agent 2300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
