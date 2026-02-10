'use client';

import { useState } from 'react';
import Image from 'next/image';
import logoSrc from '../reallogo/logo-transparent-png.png';

import MarketPulse from '@/components/dashboard/MarketPulse';
import MarketOverview from '@/components/dashboard/MarketOverview';
import CryptoPrices from '@/components/dashboard/CryptoPrices';
import EconomicIndicators from '@/components/dashboard/EconomicIndicators';
import FearGreedIndex from '@/components/dashboard/FearGreedIndex';
import MacroCharts from '@/components/dashboard/MacroCharts';
import StockSearch from '@/components/dashboard/StockSearch';
import PriceTickerCarousel from '@/components/dashboard/PriceTickerCarousel';
import WatchlistTable from '@/components/dashboard/WatchlistTable';
import MoneyFlowDashboard from '@/components/dashboard/MoneyFlowDashboard';
import AssetLeaderboard from '@/components/dashboard/AssetLeaderboard';
import { ThemeToggle } from '@/components/ThemeToggle';

import {
  BarChart3,
  Bitcoin,
  Landmark,
  Activity,
  LayoutGrid,
  ArrowRightLeft,
  Trophy,
} from 'lucide-react';

type TabKey = 'all' | 'markets' | 'crypto' | 'economy' | 'sentiment' | 'flow' | 'leaderboard';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <LayoutGrid className="w-4 h-4" /> },
  { key: 'markets', label: 'Markets', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-4 h-4" /> },
  { key: 'economy', label: 'Economy', icon: <Landmark className="w-4 h-4" /> },
  { key: 'sentiment', label: 'Sentiment', icon: <Activity className="w-4 h-4" /> },
  { key: 'flow', label: 'Capital Flow', icon: <ArrowRightLeft className="w-4 h-4" /> },
  { key: 'leaderboard', label: 'Asset Leaderboard', icon: <Trophy className="w-4 h-4" /> },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  return (
    <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
      <div className="container mx-auto px-4 py-6 max-w-[1800px]">
        {/* ── Header ── */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Image
                src={logoSrc}
                alt="Stonkscan"
                width={36}
                height={36}
                className="object-contain"
              />
              <h1 className="text-3xl font-light text-foreground">
                Stonkscan
              </h1>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                Beta
              </span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <a
                href="/screener"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Screener
              </a>
              <ThemeToggle />
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex justify-center mb-5">
            <StockSearch />
          </div>

          {/* Price Ticker Carousel */}
          <PriceTickerCarousel />
        </header>

        {/* ── Market Pulse Strip ── */}
        <section className="mb-6" aria-label="Market pulse">
          <MarketPulse />
        </section>

        {/* ── Tab Navigation ── */}
        <nav className="mb-8 flex items-center gap-1 overflow-x-auto scrollbar-hide" aria-label="Dashboard sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
              }`}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Main Content ── */}
        <div className="space-y-8">
          {/* ═══ ALL Tab — Watchlist-first layout ═══ */}
          {activeTab === 'all' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Hero: Full-width Watchlist Table */}
              <WatchlistTable />
            </div>
          )}

          {/* ═══ Markets Tab ═══ */}
          {activeTab === 'markets' && (
            <div className="animate-in fade-in duration-300">
              <MarketOverview />
            </div>
          )}

          {/* ═══ Crypto Tab ═══ */}
          {activeTab === 'crypto' && (
            <div className="animate-in fade-in duration-300">
              <CryptoPrices />
            </div>
          )}

          {/* ═══ Economy Tab ═══ */}
          {activeTab === 'economy' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <EconomicIndicators />
              <MacroCharts />
            </div>
          )}

          {/* ═══ Sentiment Tab ═══ */}
          {activeTab === 'sentiment' && (
            <div className="animate-in fade-in duration-300">
              <FearGreedIndex />
            </div>
          )}

          {/* ═══ Capital Flow Tab ═══ */}
          {activeTab === 'flow' && (
            <div className="animate-in fade-in duration-300">
              <MoneyFlowDashboard />
            </div>
          )}

          {/* ═══ Asset Leaderboard Tab ═══ */}
          {activeTab === 'leaderboard' && (
            <div className="animate-in fade-in duration-300">
              <AssetLeaderboard />
            </div>
          )}
        </div>

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
