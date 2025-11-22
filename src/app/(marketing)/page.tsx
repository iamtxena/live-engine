import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-8 md:px-12 lg:px-16">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center">
              <Logo size="sm" />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-6">
              <Link
                href="#features"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Features
              </Link>
              <Link
                href="#stack"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Stack
              </Link>
              <Link
                href="https://github.com/iamtxena/live-engine"
                target="_blank"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                GitHub
              </Link>
            </nav>
            <Button asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container flex flex-col items-center gap-4 pt-16 pb-8 px-8 md:pt-24 md:pb-12 md:px-12 lg:px-16">
        <Badge variant="secondary" className="mb-4">
          Next.js 16 • TypeScript • Tailwind CSS v4
        </Badge>
        <h1 className="max-w-4xl text-center text-4xl font-bold tracking-tight sm:text-6xl">
          Universal Real-Time Trading Engine
        </h1>
        <p className="max-w-2xl text-center text-lg text-muted-foreground">
          Multi-asset market data + paper/live trading bridge. Built to plug directly into{' '}
          <a
            href="https://lona.agency"
            target="_blank"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Lona.agency
          </a>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button size="lg" asChild>
            <Link href="/dashboard">Launch Dashboard</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="https://github.com/iamtxena/live-engine" target="_blank">
              View on GitHub
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-16 px-8 md:px-12 lg:px-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Features</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <h3 className="mb-2 text-xl font-semibold">Multi-Asset Support</h3>
            <p className="text-muted-foreground">
              BTC, ETH, stocks, ETFs, forex, futures... Connect to any market via Binance, Bybit,
              Polygon, and more.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-2 text-xl font-semibold">Real-Time Data</h3>
            <p className="text-muted-foreground">
              WebSocket feeds with tick + 1-min historical storage in Supabase. Lightning-fast
              Redis caching.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-2 text-xl font-semibold">Paper Trading</h3>
            <p className="text-muted-foreground">
              Test strategies risk-free with simulated accounts and testnet execution.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-2 text-xl font-semibold">Live Trading</h3>
            <p className="text-muted-foreground">
              Execute on 100+ exchanges via ccxt (Binance, Bybit, IBKR, Alpaca, etc.)
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-2 text-xl font-semibold">Python → TypeScript</h3>
            <p className="text-muted-foreground">
              Convert Lona strategies using Grok AI. Automatic code translation with validation.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="mb-2 text-xl font-semibold">TradingView Charts</h3>
            <p className="text-muted-foreground">
              Professional-grade charts per asset using lightweight-charts library.
            </p>
          </Card>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="stack" className="container py-16 px-8 md:px-12 lg:px-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Tech Stack</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            'Next.js 16',
            'TypeScript',
            'Tailwind CSS v4',
            'shadcn/ui',
            'Clerk',
            'Supabase',
            'Upstash Redis',
            'xAI SDK (Grok)',
            'LangSmith',
            'ccxt',
            'TradingView Charts',
            'Vercel',
          ].map((tech) => (
            <Badge key={tech} variant="secondary" className="px-3 py-1 text-sm">
              {tech}
            </Badge>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-6">
        <div className="container flex items-center justify-between text-sm text-muted-foreground px-8 md:px-12 lg:px-16">
          <p>© {new Date().getFullYear()} Live Engine. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <Link
              href="https://github.com/iamtxena/live-engine"
              target="_blank"
              className="hover:text-primary"
            >
              GitHub
            </Link>
            <Link
              href="https://lona.agency"
              target="_blank"
              className="hover:text-primary"
            >
              Lona
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
