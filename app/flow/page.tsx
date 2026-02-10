'use client';

import Image from 'next/image';
import Link from 'next/link';
import logoSrc from '../../reallogo/logo-transparent-png.png';
import MoneyFlowDashboard from '@/components/dashboard/MoneyFlowDashboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';

export default function FlowPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* ── Header ── */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            {/* Left: Back + Logo */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <div className="flex items-center gap-2.5">
                <Image
                  src={logoSrc}
                  alt="Stonkscan"
                  width={28}
                  height={28}
                  className="object-contain"
                />
                <span className="text-lg font-light text-foreground">Stonkscan</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/screener"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Screener
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-foreground">Capital Flow Tracker</h1>
              <p className="text-sm text-muted-foreground">
                Track where money is moving across asset classes and sectors
              </p>
            </div>
          </div>
        </header>

        {/* ── Dashboard ── */}
        <MoneyFlowDashboard />

        {/* ── Footer ── */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="text-center text-sm text-secondary">
            <p>
              Stonkscan &copy; {new Date().getFullYear()} &middot;{' '}
              {process.env.NEXT_PUBLIC_SITE_URL
                ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
                : 'stonkscan.com'}
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
