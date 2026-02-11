'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface Strategy {
  id: string;
  name: string;
  description?: string;
  asset: string;
  interval: string;
  status: 'draft' | 'running' | 'paused' | 'error' | 'archived';
  last_run_at?: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  running: 'default',
  paused: 'outline',
  error: 'destructive',
  archived: 'secondary',
};

export default function StrategiesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const res = await fetch('/api/strategies');
      if (!res.ok) {
        if (res.status === 404) {
          return { strategies: [] };
        }
        throw new Error('Failed to fetch strategies');
      }
      return res.json();
    },
  });

  const strategies: Strategy[] = data?.strategies || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strategies</h1>
          <p className="text-muted-foreground">Manage and monitor your trading strategies</p>
        </div>
        <Link href="/dashboard/convert">
          <Button>New Strategy</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading strategies...</div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            Strategies API not available yet. Create the strategies table first.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Run: <code className="rounded bg-muted px-2 py-1">supabase migration up</code>
          </p>
        </Card>
      ) : strategies.length === 0 ? (
        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold">No strategies yet</h2>
          <p className="mt-2 text-muted-foreground">
            Create your first strategy by converting Python code to TypeScript
          </p>
          <Link href="/dashboard/convert">
            <Button className="mt-4">Create Strategy</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <Link key={strategy.id} href={`/dashboard/strategies/${strategy.id}`}>
              <Card className="p-6 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{strategy.name}</h3>
                    {strategy.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {strategy.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={STATUS_COLORS[strategy.status]}>{strategy.status}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{strategy.asset.toUpperCase()}</span>
                  <span>{strategy.interval}</span>
                </div>
                {strategy.last_run_at && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last run: {new Date(strategy.last_run_at).toLocaleString()}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
