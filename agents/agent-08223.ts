import { Agent } from '@mastra/core/agent';

export const agent8223 = new Agent({
  id: 'agent-8223',
  name: 'Agent 8223',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
