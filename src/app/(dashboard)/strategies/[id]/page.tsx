'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CodeEditor } from '@/components/editors/code-editor';
import {
  useStrategy,
  useStrategyLogs,
  useUpdateStrategy,
  useStartStrategy,
  useStopStrategy,
  useDeleteStrategy,
} from '@/lib/hooks/use-strategies';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  running: 'default',
  paused: 'outline',
  error: 'destructive',
  archived: 'secondary',
};

const LOG_COLORS: Record<string, string> = {
  info: 'text-muted-foreground',
  signal: 'text-blue-500',
  trade: 'text-green-500',
  error: 'text-red-500',
};

const ASSETS = [
  { value: 'btcusdt', label: 'BTC/USDT' },
  { value: 'ethusdt', label: 'ETH/USDT' },
  { value: 'bnbusdt', label: 'BNB/USDT' },
  { value: 'solusdt', label: 'SOL/USDT' },
];

const INTERVALS = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('code');

  const { data, isLoading, error } = useStrategy(id);
  const { data: logsData } = useStrategyLogs(id, {
    limit: 100,
    refetchInterval: activeTab === 'monitor' ? 5000 : undefined,
  });

  const updateMutation = useUpdateStrategy();
  const startMutation = useStartStrategy();
  const stopMutation = useStopStrategy();
  const deleteMutation = useDeleteStrategy();

  const [pythonCode, setPythonCode] = useState('');
  const [typescriptCode, setTypescriptCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [asset, setAsset] = useState('btcusdt');
  const [interval, setInterval] = useState('1m');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when data loads
  if (data?.strategy && !hasChanges) {
    if (pythonCode !== data.strategy.python_code) {
      setPythonCode(data.strategy.python_code);
      setTypescriptCode(data.strategy.typescript_code);
      setName(data.strategy.name);
      setDescription(data.strategy.description || '');
      setAsset(data.strategy.asset);
      setInterval(data.strategy.interval);
    }
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id,
      name,
      description,
      python_code: pythonCode,
      typescript_code: typescriptCode,
      asset,
      interval,
    });
    setHasChanges(false);
  };

  const handleStart = async () => {
    await startMutation.mutateAsync(id);
  };

  const handleStop = async () => {
    await stopMutation.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      await deleteMutation.mutateAsync(id);
      router.push('/dashboard/strategies');
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading strategy...
      </div>
    );
  }

  if (error || !data?.strategy) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Strategy not found</p>
        <Link href="/dashboard/strategies">
          <Button variant="outline" className="mt-4">
            Back to Strategies
          </Button>
        </Link>
      </div>
    );
  }

  const strategy = data.strategy;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{strategy.name}</h1>
            <Badge variant={STATUS_COLORS[strategy.status]}>{strategy.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {strategy.asset.toUpperCase()} / {strategy.interval}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {strategy.status === 'running' ? (
            <Button
              variant="destructive"
              onClick={handleStop}
              disabled={stopMutation.isPending}
            >
              {stopMutation.isPending ? 'Stopping...' : 'Stop'}
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={startMutation.isPending || strategy.status === 'archived'}
            >
              {startMutation.isPending ? 'Starting...' : 'Start'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || strategy.status === 'running'}
          >
            Delete
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Python Code</h2>
                <Badge variant="outline">Editable</Badge>
              </div>
              <CodeEditor
                value={pythonCode}
                onChange={(val) => {
                  setPythonCode(val);
                  setHasChanges(true);
                }}
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
                onChange={(val) => {
                  setTypescriptCode(val);
                  setHasChanges(true);
                }}
                language="typescript"
                height="450px"
              />
            </Card>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-4">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              {updateMutation.isSuccess && (
                <Badge variant="default">Changes saved!</Badge>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Strategy Settings</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Optional description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Select
                  value={asset}
                  onValueChange={(val) => {
                    setAsset(val);
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger id="asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSETS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Interval</Label>
                <Select
                  value={interval}
                  onValueChange={(val) => {
                    setInterval(val);
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger id="interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasChanges && (
              <div className="mt-6 flex items-center gap-4">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </Card>

          {strategy.explanation && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Strategy Explanation</h2>
              <p className="whitespace-pre-wrap text-sm">{strategy.explanation}</p>
            </Card>
          )}

          {strategy.dependencies && strategy.dependencies.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Dependencies</h2>
              <div className="flex flex-wrap gap-2">
                {strategy.dependencies.map((dep: string, i: number) => (
                  <Badge key={i} variant="secondary">
                    {dep}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Badge
                  variant={STATUS_COLORS[strategy.status]}
                  className="w-fit text-lg"
                >
                  {strategy.status.toUpperCase()}
                </Badge>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Last Run</span>
                <span className="text-lg font-semibold">
                  {strategy.last_run_at
                    ? new Date(strategy.last_run_at).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Last Signal</span>
                <span className="text-lg font-semibold">
                  {strategy.last_signal_at
                    ? new Date(strategy.last_signal_at).toLocaleString()
                    : 'None'}
                </span>
              </div>
            </Card>
          </div>

          {strategy.error_message && (
            <Card className="border-destructive/50 bg-destructive/10 p-4">
              <h3 className="mb-2 font-semibold text-destructive">Error</h3>
              <p className="text-sm text-destructive">{strategy.error_message}</p>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Execution Log</h2>
            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/50 p-4 font-mono text-sm">
              {logsData?.logs && logsData.logs.length > 0 ? (
                <div className="space-y-1">
                  {logsData.logs.map((log) => (
                    <div key={log.id} className={LOG_COLORS[log.level]}>
                      <span className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>{' '}
                      <span className="font-semibold">[{log.level.toUpperCase()}]</span>{' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No logs yet. Start the strategy to see execution logs.
                </p>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-4">
            {strategy.status === 'running' ? (
              <Button
                variant="destructive"
                onClick={handleStop}
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? 'Stopping...' : 'Stop Strategy'}
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                disabled={startMutation.isPending || strategy.status === 'archived'}
              >
                {startMutation.isPending ? 'Starting...' : 'Start Strategy'}
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              {strategy.status === 'running'
                ? 'Strategy is running. Logs refresh every 5 seconds.'
                : 'Start the strategy to begin automated execution.'}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
