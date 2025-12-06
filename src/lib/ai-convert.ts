import { z } from 'zod';
import { wrapAISDK } from 'langsmith/experimental/vercel';
import * as ai from 'ai';
import { getModelForTask } from './ai-config';

// Wrap AI SDK with LangSmith observability
const { generateText: wrappedGenerateText, generateObject: wrappedGenerateObject } = wrapAISDK(ai);

/**
 * Schema for structured Python → TypeScript conversion
 */
const conversionSchema = z.object({
  typescript_code: z.string().describe('Converted TypeScript code'),
  dependencies: z.array(z.string()).describe('Required npm packages'),
  notes: z.string().describe('Conversion notes and recommendations'),
  original_intent: z.string().describe('Summary of what the Python code does'),
});

export type ConversionResult = z.infer<typeof conversionSchema>;

/**
 * Convert Python trading code to TypeScript using configured AI provider
 *
 * @param pythonCode - Python source code from Lona
 * @param context - Optional context about the trading strategy
 * @returns TypeScript code with dependencies and notes
 */
export async function convertPythonToTypescript(
  pythonCode: string,
  context?: string
): Promise<ConversionResult> {
  const { model, temperature, provider, modelId } = getModelForTask('conversion');
  console.log(`[AI Convert] Using ${provider}:${modelId} for conversion`);

  const systemPrompt = `You are an expert Python and TypeScript developer specializing in algorithmic trading systems.

Your task is to convert Python trading code to TypeScript that works with:
- ccxt library for broker execution (Binance, Bybit, IBKR, etc.)
- Type-safe interfaces and proper error handling
- Modern async/await patterns
- Clean, production-ready code

IMPORTANT - BACKTRADER CONVERSION:
The Python code often uses the backtrader library. When converting backtrader code:
- Convert bt.Strategy classes to TypeScript strategy interfaces
- Convert bt.indicators (SMA, RSI, MACD, etc.) to equivalent calculations or technicalindicators npm package
- Convert self.buy()/self.sell() to ccxt order methods
- Convert self.data.close[0], self.data.open[-1] etc. to array-based candle access
- Convert cerebro.run() flow to async execution loop
- Map bt.feeds.PandasData to our market data format (Timestamp,Symbol,Open,High,Low,Close,Volume)

Backtrader to TypeScript mappings:
- bt.Strategy → class implementing IStrategy interface
- self.data.close[0] → candles[candles.length - 1].close
- self.data.close[-1] → candles[candles.length - 2].close
- bt.indicators.SMA → technicalindicators SMA or manual calculation
- self.buy(size=X) → broker.createOrder(symbol, 'market', 'buy', X)
- self.sell(size=X) → broker.createOrder(symbol, 'market', 'sell', X)
- self.position.size → position tracking via broker.fetchPositions()

Additional requirements:
- Preserve the original trading logic exactly
- Use TypeScript best practices (strict types, interfaces)
- Convert pandas operations to native JavaScript/TypeScript
- Convert numpy to native math operations
- Include comprehensive error handling
- Add type definitions for all functions and variables`;

  const userPrompt = `Convert this Python trading code to TypeScript:

\`\`\`python
${pythonCode}
\`\`\`

${context ? `\n**Strategy Context:**\n${context}` : ''}

Provide a complete TypeScript implementation that:
1. Maintains the exact same trading logic
2. Uses ccxt for broker operations
3. Includes proper TypeScript types
4. Handles errors gracefully
5. Works in a Next.js server environment`;

  try {
    const { object: result } = await wrappedGenerateObject({
      model,
      schema: conversionSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature,
    });

    return result;
  } catch (error) {
    console.error('Error converting Python to TypeScript:', error);
    throw new Error(`Failed to convert code: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate TypeScript code using configured AI provider
 *
 * @param typescriptCode - Generated TypeScript code
 * @returns Validation result with suggestions
 */
export async function validateTypescriptCode(typescriptCode: string): Promise<{
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const { model, temperature, provider, modelId } = getModelForTask('validation');
  console.log(`[AI Convert] Using ${provider}:${modelId} for validation`);

  const { text } = await wrappedGenerateText({
    model,
    system: `You are a TypeScript code reviewer. Analyze the code for:
- Type safety issues
- Runtime errors
- Trading logic bugs
- Performance problems
- Security vulnerabilities

Respond with a JSON object containing:
- isValid: boolean
- issues: string[] (critical problems)
- suggestions: string[] (improvements)`,
    prompt: `Review this TypeScript trading code:\n\n\`\`\`typescript\n${typescriptCode}\n\`\`\``,
    temperature,
  });

  try {
    return JSON.parse(text);
  } catch {
    return {
      isValid: true,
      issues: [],
      suggestions: ['Unable to parse validation result'],
    };
  }
}

/**
 * Generate trading strategy explanation from Python code
 *
 * @param pythonCode - Python trading strategy code
 * @returns Plain English explanation of the strategy
 */
export async function explainStrategy(pythonCode: string): Promise<string> {
  const { model, temperature, provider, modelId } = getModelForTask('explanation');
  console.log(`[AI Convert] Using ${provider}:${modelId} for explanation`);

  const { text } = await wrappedGenerateText({
    model,
    system: `You are a trading strategy analyst. Explain trading code in clear, simple language that a non-programmer can understand.`,
    prompt: `Explain this trading strategy in 2-3 paragraphs:\n\n\`\`\`python\n${pythonCode}\n\`\`\`\n\nInclude:
- What the strategy does
- When it buys/sells
- What indicators or signals it uses
- Risk factors to consider`,
    temperature,
  });

  return text;
}
