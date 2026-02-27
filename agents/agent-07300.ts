import { Agent } from '@mastra/core/agent';

export const agent7300 = new Agent({
  id: 'agent-7300',
  name: 'Agent 7300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
