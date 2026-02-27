import { Agent } from '@mastra/core/agent';

export const agent300 = new Agent({
  id: 'agent-300',
  name: 'Agent 300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
