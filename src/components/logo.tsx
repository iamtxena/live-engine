import Image from 'next/image';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: { full: 'h-8', icon: 'h-6 w-6' },
  md: { full: 'h-10', icon: 'h-8 w-8' },
  lg: { full: 'h-12', icon: 'h-10 w-10' },
};

export function Logo({ className = '', variant = 'full', size = 'md' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size].icon} ${className}`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Live Engine logo"
        >
          <title>Live Engine</title>
          <circle cx="16" cy="16" r="16" fill="url(#gradient)" />
          <path d="M18 4L10 16H16L14 28L22 16H16L18 4Z" fill="white" />
          <defs>
            <linearGradient
              id="gradient"
              x1="0"
              y1="0"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={sizeClasses[size].icon}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Live Engine logo"
        >
          <title>Live Engine</title>
          <circle cx="16" cy="16" r="16" fill="url(#gradient)" />
          <path d="M18 4L10 16H16L14 28L22 16H16L18 4Z" fill="white" />
          <defs>
            <linearGradient
              id="gradient"
              x1="0"
              y1="0"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold">LIVE</span>
        <span className="text-xl font-normal opacity-70">ENGINE</span>
      </div>
    </div>
  );
}
