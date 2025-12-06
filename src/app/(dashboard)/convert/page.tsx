'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CodeEditor } from '@/components/editors/code-editor';

const SAMPLE_PYTHON = `# SMA Crossover Strategy
def calculate_sma(prices, period):
    """Calculate Simple Moving Average"""
    if len(prices) < period:
        return None
    return sum(prices[-period:]) / period

def trading_strategy(current_price, historical_prices):
    """
    Simple Moving Average Crossover Strategy
    Buy when short SMA crosses above long SMA
    Sell when short SMA crosses below long SMA
    """
    sma_20 = calculate_sma(historical_prices, 20)
    sma_50 = calculate_sma(historical_prices, 50)

    if sma_20 is None or sma_50 is None:
        return "HOLD"

    if sma_20 > sma_50:
        return "BUY"
    elif sma_20 < sma_50:
        return "SELL"
    else:
        return "HOLD"
`;

interface ConversionResult {
  success: boolean;
  conversion: {
    typescript: string;
    dependencies: string[];
    notes: string;
    intent: string;
  };
  validation?: {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  };
  explanation?: string;
}

export default function ConvertPage() {
  const [pythonCode, setPythonCode] = useState(SAMPLE_PYTHON);
  const [typescriptCode, setTypescriptCode] = useState('// TypeScript code will appear here after conversion');
  const [strategyName, setStrategyName] = useState('');
  const [validateCode, setValidateCode] = useState(true);
  const [explainCode, setExplainCode] = useState(true);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pythonCode,
          validate: validateCode,
          explain: explainCode,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || 'Conversion failed');
      }
      return res.json() as Promise<ConversionResult>;
    },
    onSuccess: (data) => {
      setTypescriptCode(data.conversion.typescript);
      setConversionResult(data);
    },
  });

  const saveStrategyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: strategyName || 'Untitled Strategy',
          python_code: pythonCode,
          typescript_code: typescriptCode,
          explanation: conversionResult?.explanation,
          dependencies: conversionResult?.conversion.dependencies,
          conversion_notes: conversionResult?.conversion.notes,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save strategy');
      }
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Code Converter</h1>
        <p className="text-muted-foreground">
          Convert Python trading strategies to TypeScript using AI
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Python Code</h2>
            <Badge variant="outline">Editable</Badge>
          </div>
          <CodeEditor
            value={pythonCode}
            onChange={setPythonCode}
            language="python"
            height="450px"
          />
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">TypeScript Code</h2>
            <Badge variant="outline">Editable</Badge>
          </div>
          <CodeEditor
            value={typescriptCode}
            onChange={setTypescriptCode}
            language="typescript"
            height="450px"
          />
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="validate"
              checked={validateCode}
              onChange={(e) => setValidateCode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="validate" className="cursor-pointer">
              Validate TypeScript
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="explain"
              checked={explainCode}
              onChange={(e) => setExplainCode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="explain" className="cursor-pointer">
              Explain Strategy
            </Label>
          </div>

          <Button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending || !pythonCode.trim()}
          >
            {convertMutation.isPending ? 'Converting...' : 'Convert to TypeScript'}
          </Button>

          {convertMutation.isError && (
            <Badge variant="destructive">
              Error: {convertMutation.error?.message}
            </Badge>
          )}
        </div>
      </Card>

      {conversionResult && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {conversionResult.validation && (
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Validation</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={conversionResult.validation.isValid ? 'default' : 'destructive'}>
                      {conversionResult.validation.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>

                  {conversionResult.validation.issues.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">Issues:</h3>
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {conversionResult.validation.issues.map((issue, i) => (
                          <li key={i} className="text-destructive">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {conversionResult.validation.suggestions.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">Suggestions:</h3>
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {conversionResult.validation.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Conversion Details</h2>
              <div className="space-y-3">
                {conversionResult.conversion.dependencies.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">Dependencies:</h3>
                    <div className="flex flex-wrap gap-2">
                      {conversionResult.conversion.dependencies.map((dep, i) => (
                        <Badge key={i} variant="secondary">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {conversionResult.conversion.notes && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">Notes:</h3>
                    <p className="text-sm">{conversionResult.conversion.notes}</p>
                  </div>
                )}

                {conversionResult.conversion.intent && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">Original Intent:</h3>
                    <p className="text-sm">{conversionResult.conversion.intent}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {conversionResult.explanation && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Strategy Explanation</h2>
              <p className="whitespace-pre-wrap text-sm">{conversionResult.explanation}</p>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Save as Strategy</h2>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[250px] space-y-2">
                <Label htmlFor="strategyName">Strategy Name</Label>
                <Input
                  id="strategyName"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="My Trading Strategy"
                />
              </div>

              <Button
                onClick={() => saveStrategyMutation.mutate()}
                disabled={saveStrategyMutation.isPending}
                variant="default"
              >
                {saveStrategyMutation.isPending ? 'Saving...' : 'Save Strategy'}
              </Button>

              {saveStrategyMutation.isSuccess && (
                <Badge variant="default">Strategy saved!</Badge>
              )}

              {saveStrategyMutation.isError && (
                <Badge variant="destructive">
                  Error: {saveStrategyMutation.error?.message}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Save this strategy to manage and execute it via paper or live trading.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
