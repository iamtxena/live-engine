import { Client } from 'langsmith';
import { traceable } from 'langsmith/traceable';

/**
 * LangSmith client for observability and tracing
 * Used to monitor AI SDK calls (Grok conversions, etc.)
 */
export const langsmithClient = new Client({
  apiKey: process.env.LANGCHAIN_API_KEY,
});

/**
 * Ensure all pending traces are flushed (important for serverless)
 */
export async function flushTraces() {
  await langsmithClient.awaitPendingTraceBatches();
}

/**
 * Create a traceable function for custom operations
 *
 * Example:
 * const myFunction = createTraceable('my-function', async (input) => {
 *   // Your logic here
 * });
 */
export function createTraceable<TInput, TOutput>(
  name: string,
  fn: (input: TInput) => Promise<TOutput>,
  options?: {
    tags?: string[];
    metadata?: Record<string, unknown>;
  },
) {
  return traceable(fn, {
    name,
    tags: options?.tags || [],
    metadata: options?.metadata || {},
    client: langsmithClient,
  });
}

/**
 * Traced Python → TypeScript conversion
 */
export const tracedConversion = createTraceable<
  { pythonCode: string; context?: string },
  { pythonCode: string; context?: string }
>('python-to-typescript', async ({ pythonCode, context }) => {
  // This will be called from ai-convert.ts
  // LangSmith will automatically capture the trace
  return { pythonCode, context };
});
