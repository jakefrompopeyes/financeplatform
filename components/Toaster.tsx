'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from 'next-themes';

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={(resolvedTheme as 'light' | 'dark') ?? 'dark'}
      position="bottom-right"
      toastOptions={{
        duration: 3500,
        classNames: {
          toast: 'bg-background border border-border text-foreground shadow-lg',
          success: 'border-green-500/50',
        },
      }}
    />
  );
}
