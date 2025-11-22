import { NextRequest, NextResponse } from 'next/server';
import { convertPythonToTypescript, validateTypescriptCode, explainStrategy } from '@/lib/ai-convert';
import { flushTraces } from '@/lib/langsmith';

/**
 * API Route: /api/convert
 *
 * Convert Python trading code to TypeScript using Grok AI
 * Includes validation and explanation
 */

export async function POST(request: NextRequest) {
  try {
    const { pythonCode, context, validate, explain } = await request.json();

    if (!pythonCode) {
      return NextResponse.json(
        { error: 'Missing required parameter: pythonCode' },
        { status: 400 }
      );
    }

    console.log('Converting Python code to TypeScript using Grok AI...');

    // Convert Python → TypeScript
    const conversion = await convertPythonToTypescript(pythonCode, context);

    let validation = null;
    let explanation = null;

    // Optionally validate the generated TypeScript
    if (validate) {
      console.log('Validating generated TypeScript code...');
      validation = await validateTypescriptCode(conversion.typescript_code);
    }

    // Optionally explain the strategy
    if (explain) {
      console.log('Generating strategy explanation...');
      explanation = await explainStrategy(pythonCode);
    }

    // Flush LangSmith traces (important for serverless)
    await flushTraces();

    return NextResponse.json({
      success: true,
      conversion: {
        typescript: conversion.typescript_code,
        dependencies: conversion.dependencies,
        notes: conversion.notes,
        intent: conversion.original_intent,
      },
      validation: validation || undefined,
      explanation: explanation || undefined,
    });
  } catch (error) {
    console.error('Code conversion error:', error);

    // Flush traces even on error
    await flushTraces();

    return NextResponse.json(
      {
        error: 'Failed to convert Python code',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Example usage and API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/convert',
    method: 'POST',
    description: 'Convert Python trading code to TypeScript using Grok AI',
    parameters: {
      pythonCode: {
        type: 'string',
        required: true,
        description: 'Python source code to convert',
      },
      context: {
        type: 'string',
        required: false,
        description: 'Additional context about the trading strategy',
      },
      validate: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Validate the generated TypeScript code',
      },
      explain: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Generate a plain English explanation of the strategy',
      },
    },
    example: {
      pythonCode: `
def calculate_sma(prices, period):
    return sum(prices[-period:]) / period

def trading_strategy(current_price, historical_prices):
    sma_20 = calculate_sma(historical_prices, 20)
    sma_50 = calculate_sma(historical_prices, 50)

    if sma_20 > sma_50:
        return "BUY"
    elif sma_20 < sma_50:
        return "SELL"
    else:
        return "HOLD"
`,
      context: 'Simple moving average crossover strategy for BTC/USDT',
      validate: true,
      explain: true,
    },
    response: {
      success: true,
      conversion: {
        typescript: '// TypeScript code here',
        dependencies: ['ccxt'],
        notes: 'Conversion notes',
        intent: 'Summary of strategy',
      },
      validation: {
        isValid: true,
        issues: [],
        suggestions: [],
      },
      explanation: 'Plain English explanation',
    },
  });
}
