import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/dashboard" className="mr-6 flex items-center">
              <Logo size="sm" />
            </Link>
          </div>
          <nav className="flex flex-1 items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/assets"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Assets
            </Link>
            <Link
              href="/dashboard/data"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Data
            </Link>
            <Link
              href="/dashboard/convert"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Convert
            </Link>
            <Link
              href="/dashboard/strategies"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Strategies
            </Link>
            <Link
              href="/dashboard/paper"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Paper
            </Link>
            <Link
              href="/dashboard/live"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Live
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container py-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-6">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Live Engine. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <Link
              href="https://github.com/iamtxena/live-engine"
              target="_blank"
              className="hover:text-primary"
            >
              GitHub
            </Link>
            <Link href="https://lona.agency" target="_blank" className="hover:text-primary">
              Lona
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
