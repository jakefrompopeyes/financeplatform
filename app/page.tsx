'use client';

import { useState } from 'react';
import Image from 'next/image';
import MarketOverview from '@/components/dashboard/MarketOverview';

import logoSrc from '../reallogo/logo-transparent-png.png';
import EconomicIndicators from '@/components/dashboard/EconomicIndicators';
import CryptoPrices from '@/components/dashboard/CryptoPrices';
import FearGreedIndex from '@/components/dashboard/FearGreedIndex';
import StockSearch from '@/components/dashboard/StockSearch';
import Watchlist from '@/components/dashboard/Watchlist';
import PriceTickerCarousel from '@/components/dashboard/PriceTickerCarousel';
import MacroCharts from '@/components/dashboard/MacroCharts';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const [recentViewTrigger, setRecentViewTrigger] = useState(0);

  return (
    <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
      <div className="container mx-auto px-4 py-8 max-w-[1800px]">
        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-4xl font-light text-foreground mb-2 flex items-center gap-3">
                <Image
                  src={logoSrc}
                  alt="Stonkscan"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                Stonkscan
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                  Beta
                </span>
              </h1>
              <p className="text-secondary">
                Real-time financial market analytics and insights · stonkscan.com
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/screener"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Stock Screener
              </a>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex justify-center">
            <StockSearch />
          </div>
          
          {/* Price Ticker Carousel */}
          <div className="mt-6">
            <PriceTickerCarousel />
          </div>
        </header>

        {/* Main Content with Watchlist */}
        <div className="flex gap-8">
          {/* Left Column - Main Content */}
          <div className="flex-1 min-w-0 space-y-12">
            {/* Stock Market Overview */}
            <section>
              <MarketOverview />
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Cryptocurrency Prices */}
            <section>
              <CryptoPrices />
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Economic Indicators */}
            <section>
              <EconomicIndicators />
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Key macro charts - built with createElement to avoid SWC parser issues */}
            <section>
              <MacroCharts />
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Fear and Greed Index */}
            <section>
              <FearGreedIndex />
            </section>

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-border">
              <div className="text-center text-sm text-secondary">
                <p>Stonkscan © {new Date().getFullYear()} · stonkscan.com</p>
              </div>
            </footer>
          </div>

          {/* Right Column - Watchlist */}
          <aside className="hidden xl:block w-80 flex-shrink-0">
            <Watchlist key={recentViewTrigger} />
          </aside>
        </div>
      </div>
    </main>
  );
}

