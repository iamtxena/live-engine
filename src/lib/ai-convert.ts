import * as ai from 'ai';
import { wrapAISDK } from 'langsmith/experimental/vercel';
import { z } from 'zod';
import { getModelForTask } from './ai-config';

// Wrap AI SDK with LangSmith observability
const { generateText: wrappedGenerateText, generateObject: wrappedGenerateObject } = wrapAISDK(ai);

/**
 * Schema for structured Python → TypeScript conversion
 */
const conversionSchema = z.object({
  typescript_code: z.string().describe('Converted runtime-safe JavaScript code'),
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
  context?: string,
): Promise<ConversionResult> {
  const { model, temperature, provider, modelId } = getModelForTask('conversion');
  console.log(`[AI Convert] Using ${provider}:${modelId} for conversion`);

  const systemPrompt = `You are an expert Python and TypeScript developer specializing in algorithmic trading systems.

Your task is to convert Python trading code to runtime-safe JavaScript that works with:
- ccxt library for broker execution (Binance, Bybit, IBKR, etc.)
- Plain JavaScript runtime semantics and proper error handling
- Modern async/await patterns
- Clean, production-ready code

CRITICAL - CODE FORMAT REQUIREMENTS:
The generated code runs inside a Function constructor (new Function()), NOT as an ES module.
You MUST follow these rules:
- Do NOT use import or export statements (they cause "Cannot use import statement outside a module")
- Do NOT use "require()" calls
- Do NOT use TypeScript-only syntax (no interfaces, type aliases, enums, generics, type annotations, or "as" assertions)
- Output plain JavaScript that is valid in Node.js Function() execution
- Implement indicator calculations (SMA, RSI, EMA, MACD, Bollinger Bands, etc.) as plain functions using Math and Array methods
- The main entry point MUST be a function named "tradingStrategy" that takes a single "context" parameter and returns a result object
- Do NOT reference external type names like Exchange, Order, Position, or Candle

The context parameter has this shape:
{
  candles: Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }>;
  currentPrice: number;
  position: { asset: string; quantity: number; entry_price: number; current_price: number; pnl: number; pnl_percentage: number } | null;
  parameters: Record<string, unknown>;
}

The function must return: { signal: 'buy' | 'sell' | 'hold'; reason?: string; amount?: number; indicators?: Record<string, number> }

IMPORTANT - BACKTRADER CONVERSION:
The Python code often uses the backtrader library. When converting backtrader code:
- Convert bt.Strategy classes to a plain tradingStrategy function
- Convert bt.indicators (SMA, RSI, MACD, etc.) to inline helper functions
- Convert self.buy()/self.sell() to return { signal: 'buy' } / { signal: 'sell' }
- Convert self.data.close[0], self.data.open[-1] etc. to array-based candle access
- Map bt.feeds.PandasData to our candle format

Backtrader to TypeScript mappings:
- bt.Strategy → function tradingStrategy(context)
- self.data.close[0] → candles[candles.length - 1].close
- self.data.close[-1] → candles[candles.length - 2].close
- bt.indicators.SMA → inline calculateSMA() function
- self.buy(size=X) → return { signal: 'buy', amount: X, reason: '...' }
- self.sell(size=X) → return { signal: 'sell', amount: X, reason: '...' }
- self.position.size → context.position?.quantity ?? 0

Additional requirements:
- Preserve the original trading logic exactly
- Keep the output JavaScript-only while preserving TypeScript-compatible structure
- Convert pandas operations to native JavaScript/TypeScript
- Convert numpy to native math operations
- Include comprehensive error handling
- ALL code must be self-contained with zero external dependencies`;

  const userPrompt = `Convert this Python trading code to runtime-safe JavaScript:

\`\`\`python
${pythonCode}
\`\`\`

${context ? `\n**Strategy Context:**\n${context}` : ''}

Provide a complete JavaScript implementation that:
1. Maintains the exact same trading logic
2. Is completely self-contained (NO import/export/require statements)
3. Defines a "tradingStrategy(context)" function as the entry point
4. Implements all indicators as inline helper functions
5. Returns { signal: 'buy' | 'sell' | 'hold', reason: string, indicators?: Record<string, number> }
6. Handles errors gracefully`;

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
    throw new Error(
      `Failed to convert code: ${error instanceof Error ? error.message : String(error)}`,
    );
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
- Function-constructor compatibility (no import/export/require, runnable without module context)

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
    system:
      'You are a trading strategy analyst. Explain trading code in clear, simple language that a non-programmer can understand.',
    prompt: `Explain this trading strategy in 2-3 paragraphs:\n\n\`\`\`python\n${pythonCode}\n\`\`\`\n\nInclude:
- What the strategy does
- When it buys/sells
- What indicators or signals it uses
- Risk factors to consider`,
    temperature,
  });

  return text;
}
