import { Agent } from '@mastra/core/agent';

export const agent8501 = new Agent({
  id: 'agent-8501',
  name: 'Agent 8501',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
