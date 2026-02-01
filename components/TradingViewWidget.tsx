'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

// Available indicators for TradingView
export const AVAILABLE_INDICATORS = [
  { id: 'RSI@tv-basicstudies', name: 'RSI', description: 'Relative Strength Index' },
  { id: 'MACD@tv-basicstudies', name: 'MACD', description: 'Moving Average Convergence Divergence' },
  { id: 'BB@tv-basicstudies', name: 'Bollinger Bands', description: 'Price volatility bands' },
  { id: 'MASimple@tv-basicstudies', name: 'SMA', description: 'Simple Moving Average' },
  { id: 'MAExp@tv-basicstudies', name: 'EMA', description: 'Exponential Moving Average' },
  { id: 'Volume@tv-basicstudies', name: 'Volume', description: 'Trading volume' },
  { id: 'VWAP@tv-basicstudies', name: 'VWAP', description: 'Volume Weighted Average Price' },
  { id: 'StochasticRSI@tv-basicstudies', name: 'Stochastic RSI', description: 'Momentum oscillator' },
  { id: 'ADX@tv-basicstudies', name: 'ADX', description: 'Average Directional Index' },
  { id: 'ATR@tv-basicstudies', name: 'ATR', description: 'Average True Range' },
] as const;

export type IndicatorId = typeof AVAILABLE_INDICATORS[number]['id'];

interface TradingViewWidgetProps {
  symbol: string;
  interval?: string;
  range?: string;
  indicators?: IndicatorId[];
}

export default function TradingViewWidget({ symbol, interval = 'D', range = '1M', indicators = [] }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const { theme, systemTheme } = useTheme();
  const [containerId] = useState(() => `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substr(2, 9)}`);
  const currentTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = '';

    // Check if TradingView script is already loaded
    const loadWidget = () => {
      if (window.TradingView && containerRef.current) {
        try {
          // Map range to TradingView range format
          const rangeMap: Record<string, string> = {
            '1D': '1D',
            '1W': '5D',
            '1M': '1M',
            '3M': '3M',
            '12M': '12M',
          };
          
          const tvRange = rangeMap[range] || '1M';
          
          widgetRef.current = new window.TradingView.widget({
            autosize: true,
            symbol: symbol,
            interval: interval,
            range: tvRange,
            timezone: 'Etc/UTC',
            theme: currentTheme === 'dark' ? 'dark' : 'light',
            style: '1',
            locale: 'en',
            toolbar_bg: currentTheme === 'dark' ? '#1e1e1e' : '#f1f3f6',
            enable_publishing: false,
            allow_symbol_change: false,
            container_id: containerId,
            height: 600,
            width: '100%',
            hide_side_toolbar: false,
            studies: indicators,
            show_popup_button: false,
            popup_width: '1000',
            popup_height: '650',
          });
        } catch (error) {
          console.error('Error initializing TradingView widget:', error);
        }
      }
    };

    // If TradingView is already loaded
    if (window.TradingView) {
      loadWidget();
    } else {
      // Load TradingView script
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = loadWidget;
        document.head.appendChild(script);
      } else {
        // Script exists, wait a bit and try loading
        setTimeout(loadWidget, 100);
      }
    }

    return () => {
      // Cleanup widget if it exists
      if (widgetRef.current && widgetRef.current.remove) {
        try {
          widgetRef.current.remove();
        } catch (error) {
          // Widget might already be removed
        }
      }
    };
  }, [symbol, interval, range, containerId, currentTheme, indicators]);

  return (
    <div 
      id={containerId}
      ref={containerRef}
      className="w-full"
      style={{ height: '600px' }}
    />
  );
}

// Extend Window interface for TradingView
declare global {
  interface Window {
    TradingView: any;
  }
}

