'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { X, Sparkles, Zap, TrendingUp } from 'lucide-react';
import Image from 'next/image';

type LonaBannerProps = {
  variant?: 'compact' | 'full';
  dismissible?: boolean;
};

/**
 * Lona.agency promotional banner with animations
 *
 * Usage:
 * ```tsx
 * <LonaBanner variant="compact" dismissible />
 * ```
 */
export function LonaBanner({ variant = 'full', dismissible = false }: LonaBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isDismissed) return null;

  if (variant === 'compact') {
    return (
      <div
        className={`
          relative overflow-hidden rounded-lg border border-primary/20
          transition-all duration-700 ease-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
        `}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-shift" />

        {/* Shimmer effect */}
        <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/5 to-transparent" />

        <div className="relative flex items-center justify-between gap-4 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Badge variant="default" className="bg-linear-to-r from-blue-600 to-purple-600 animate-pulse-glow">
                <Sparkles className="h-3 w-3 mr-1 inline animate-spin-slow" />
                New
              </Badge>
            </div>

            <p className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500 animate-bounce-subtle" />
              Want the strategy for tomorrow&apos;s <span className="font-bold text-primary">100€ live challenge</span>?
              <span className="hidden sm:inline">Generated in 15 seconds with plain English</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="shrink-0 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 animate-pulse-subtle group"
            >
              <Link href="https://lona.agency" target="_blank" rel="noopener noreferrer">
                Try Lona Free
                <TrendingUp className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 hover:rotate-90 transition-transform duration-300"
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
            50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          @keyframes pulse-subtle {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          .animate-gradient-shift {
            background-size: 200% 200%;
            animation: gradient-shift 8s ease infinite;
          }
          .animate-shimmer {
            animation: shimmer 3s infinite;
          }
          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
          .animate-spin-slow {
            animation: spin-slow 3s linear infinite;
          }
          .animate-bounce-subtle {
            animation: bounce-subtle 2s ease-in-out infinite;
          }
          .animate-pulse-subtle {
            animation: pulse-subtle 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border border-primary/20
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
    >
      {/* Background image with parallax effect */}
      <div className="absolute inset-0 opacity-30">
        <Image
          src="/lona-banner.png"
          alt="Lona Trading Platform"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-gradient-rotate" />

      {/* Floating orbs */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-float-slower" />

      {/* Shimmer effect */}
      <div className="absolute inset-0 animate-shimmer-slow bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative p-6 md:p-8 backdrop-blur-md bg-background/50">
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 hover:rotate-90 transition-all duration-300"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="default"
                className="bg-linear-to-r from-blue-600 to-purple-600 animate-pulse-glow"
              >
                <Sparkles className="h-3 w-3 mr-1 animate-spin-slow" />
                Free Beta
              </Badge>
              <Badge variant="outline" className="border-purple-500/50 animate-pulse-subtle">
                <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                AI-Powered
              </Badge>
              <Badge variant="outline" className="border-green-500/50">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                Live in 15s
              </Badge>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold tracking-tight bg-linear-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-text">
              Generate Trading Strategies in Plain English
            </h3>

            <p className="text-muted-foreground max-w-2xl">
              Want the strategy that will run in tomorrow&apos;s{' '}
              <span className="font-semibold text-foreground">100€ live challenge</span>?
              <br />
              <span className="text-sm">
                Generated in 15 seconds with plain English. No coding required.
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              {[
                { icon: <TrendingUp className="h-4 w-4" />, text: 'Backtesting included', delay: '0s' },
                { icon: <Sparkles className="h-4 w-4" />, text: 'No credit card needed', delay: '0.2s' },
                { icon: <Zap className="h-4 w-4" />, text: 'AI-generated strategies', delay: '0.4s' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 animate-fade-in-up"
                  style={{ animationDelay: item.delay }}
                >
                  <span className="text-green-500">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <Button
              asChild
              size="lg"
              className="
                text-base bg-linear-to-r from-blue-600 to-purple-600
                hover:from-blue-700 hover:to-purple-700
                shadow-lg hover:shadow-xl hover:shadow-purple-500/50
                transform hover:scale-105 transition-all duration-300
                group
              "
            >
              <Link href="https://lona.agency" target="_blank" rel="noopener noreferrer">
                <Sparkles className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                Try Lona Free
                <TrendingUp className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground animate-pulse">
              Powered by AI • lona.agency
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-rotate {
          0%, 100% {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2));
          }
          33% {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2), rgba(59, 130, 246, 0.2));
          }
          66% {
            background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2));
          }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(-10px); }
        }
        @keyframes shimmer-slow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradient-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-rotate {
          animation: gradient-rotate 10s ease infinite;
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        .animate-float-slower {
          animation: float-slower 8s ease-in-out infinite;
        }
        .animate-shimmer-slow {
          animation: shimmer-slow 4s infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-gradient-text {
          background-size: 200% 200%;
          animation: gradient-text 5s ease infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
