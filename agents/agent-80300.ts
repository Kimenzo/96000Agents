import { Agent } from '@mastra/core/agent';

export const agent80300 = new Agent({
  id: 'agent-80300',
  name: 'Agent 80300',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
