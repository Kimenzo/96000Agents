import { Agent } from '@mastra/core/agent';

export const agent3300 = new Agent({
  id: 'agent-3300',
  name: 'Agent 3300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
