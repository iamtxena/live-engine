import { executePythonCode, validatePythonSyntax } from '@/lib/python-executor';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * API Route: /api/execute
 *
 * Execute Python trading code (sandboxed)
 *
 * NOTE: For security and performance, we recommend converting
 * Python → TypeScript via /api/convert instead
 */

export async function POST(request: NextRequest) {
  try {
    const { code, inputs } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing required parameter: code' }, { status: 400 });
    }

    // Validate Python syntax
    const validation = validatePythonSyntax(code);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid Python code',
          validationErrors: validation.errors,
        },
        { status: 400 },
      );
    }

    // Execute Python code (currently returns recommendation to convert)
    const result = await executePythonCode(code, inputs);

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      recommendation: result.recommendation,
      alternative: {
        endpoint: '/api/convert',
        message:
          'Convert Python to TypeScript using Grok AI for better performance and type safety',
      },
    });
  } catch (error) {
    console.error('Python execution error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute Python code',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET: API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/execute',
    method: 'POST',
    description: 'Execute Python trading code (currently recommends conversion to TypeScript)',
    parameters: {
      code: {
        type: 'string',
        required: true,
        description: 'Python code to execute',
      },
      inputs: {
        type: 'object',
        required: false,
        description: 'Input variables for the Python code',
      },
    },
    note: 'For production use, convert Python → TypeScript via /api/convert endpoint using Grok AI',
    example: {
      code: `
def calculate_profit(buy_price, sell_price, quantity):
    return (sell_price - buy_price) * quantity

result = calculate_profit(100, 150, 10)
print(f"Profit: $\{result}")
`,
      inputs: {},
    },
  });
}
