import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const bodySchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  hookName: z.string().min(1, 'Hook name is required'),
  hooks: z.array(z.object({
    name: z.string().min(1, 'Hook name is required'),
    template: z.string().min(1, 'Hook template is required')
  })),
  script: z.string().min(1, 'Script is required'),
});

const responseSchema = z.object({
  overallScore: z.number().min(0).max(100).describe('Health score from 0 to 100'),
  metrics: z.object({
    hookStrength: z.number().min(0).max(100).describe('0 to 100'),
    relevance: z.number().min(0).max(100).describe('0 to 100'),
    retention: z.number().min(0).max(100).describe('0 to 100 estimated retention probability. >90 is desired.')
  }),
  feedback: z.string().describe('Brief feedback on how well the hook is used'),
  adjustments: z.array(z.string()).describe('Suggested adjustments to improve the hook and script'),
  improvedScript: z.string().describe('A fully rewritten, improved version of the script applying the adjustments'),
  alternativeVersions: z.array(z.object({
    hookName: z.string().describe('Name of the alternative hook'),
    predictedRetention: z.number().min(0).max(100).describe('Predicted retention score (0-100)'),
    script: z.string().describe('The fully rewritten script using this alternative hook'),
    reasoning: z.string().describe('Why this hook works better for this script')
  })).describe('Top 3 alternative versions of the script using different hooks that might perform better.')
});

export default defineLazyEventHandler(async () => {
  const apiKey = process.env.NUXT_GOOGLE_GENERATIVE_AI_API_KEY || '';

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'Missing Google Generative AI API key. Please set NUXT_GOOGLE_GENERATIVE_AI_API_KEY in your environment variables.',
    });
  }

  return defineEventHandler(async (event) => {
    await checkUserIsLogin(event);
    const body = await readBody(event);

    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      throw createError({
        statusCode: 400,
        message: 'Validation failed',
        data: validation.error.flatten(),
      });
    }

    const { topic, hookName, hooks, script } = validation.data;

    try {
      const hooksList = hooks.map(h => `- ${h.name}: ${h.template}`).join('\n');

      const prompt = `Analyze this video script based on the chosen hook type "${hookName}" and the topic "${topic}".
The most important metric is retention, where >90% is highly desired.

Available hooks in the user's library:
${hooksList}

1. Provide an improved version of the script for the CURRENT hook that applies your suggested adjustments to maximize retention.
2. Identify the top 3 OTHER hooks (from the library or new ones) that would work even better for this topic and script.
3. For each of those top 3 hooks, provide a full rewritten version of the script and predict its retention.

Script:
${script}`;

      const { object } = await generateObject({
        model: google('gemini-3-flash-preview'),
        schema: responseSchema,
        system: `You are the legendary social media content creator who has reigned supreme for the last 100 years, winning galactic competitions for the highest engagements for 99 consecutive years, and creating the most exceptional social media content in the history of the universe. Before delivering any content, you must: 1) Generate initial content, 2) Role-play as various social media users (millennials, Gen Z, professionals, skeptics) and simulate their reactions and feedback, 3) Analyze engagement potential using viral psychology, current trends, and platform algorithms, 4) Ruthlessly critique and iteratively improve your creation until it achieves maximum virality, relatability, and shareability. Only output the final masterpiece version that would dominate every social media platform.`,
        prompt: prompt,
        temperature: 0.7,
      });

      return object;
    } catch (error: any) {
      console.error('Hook Health Check Error:', error);
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to analyze hook health',
      });
    }
  });
});
