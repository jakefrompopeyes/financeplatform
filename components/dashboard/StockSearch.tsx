'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
  country: string;
}

interface StockSearchProps {
  onSelectStock?: (symbol: string) => void;
}

export default function StockSearch({ onSelectStock }: StockSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentStockSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search stocks with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 0) {
        setIsTransitioning(true);
        setLoading(true);
        try {
          const response = await fetch(`/api/stock-search?query=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          // Small delay to show transition
          setTimeout(() => {
            setResults(data.results || []);
            setShowDropdown(true);
            setTimeout(() => setIsTransitioning(false), 100);
          }, 150);
        } catch (error) {
          console.error('Error searching stocks:', error);
          setResults([]);
          setIsTransitioning(false);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        if (recentSearches.length > 0) {
          setShowDropdown(true);
        } else {
          setShowDropdown(false);
        }
        setIsTransitioning(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, recentSearches.length]);

  const handleSelectStock = (symbol: string) => {
    // Add to recent searches
    const updated = [symbol, ...recentSearches.filter(s => s !== symbol)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentStockSearches', JSON.stringify(updated));

    // Clear search and close dropdown
    setQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);

    // Call parent callback if provided (for backward compatibility)
    if (onSelectStock) {
      onSelectStock(symbol);
    }
    
    // Navigate to stock page
    router.push(`/stock/${symbol.toUpperCase()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectStock(results[selectedIndex].symbol);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search stocks by symbol or name (e.g., AAPL, Tesla)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length > 0 || recentSearches.length > 0) {
              setShowDropdown(true);
            }
          }}
          className="pl-10 pr-10 h-11 bg-background border-border"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div 
            className={`transition-all duration-500 ease-in-out ${
              isTransitioning 
                ? 'opacity-0 translate-y-4' 
                : 'opacity-100 translate-y-0'
            }`}
          >
            {/* Recent Searches */}
            {query.length === 0 && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Recent Searches
                </div>
                {recentSearches.map((symbol, index) => (
                  <button
                    key={symbol}
                    onClick={() => handleSelectStock(symbol)}
                    className="w-full px-3 py-2 text-left hover:bg-accent rounded-md transition-all duration-200 animate-in fade-in slide-in-from-top-1"
                    style={{ 
                      animationDelay: `${index * 50}ms`,
                      animationDuration: '400ms',
                      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div className="font-medium text-sm">{symbol}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {query.length > 0 && (
              <>
                {results.length > 0 ? (
                  <div className="p-2">
                    {results.map((result, index) => (
                      <button
                        key={`${result.symbol}-${result.exchange}`}
                        onClick={() => handleSelectStock(result.symbol)}
                        className={cn(
                          "w-full px-3 py-3 text-left hover:bg-accent rounded-md transition-all duration-200 animate-in fade-in slide-in-from-top-2",
                          selectedIndex === index && "bg-accent"
                        )}
                        style={{ 
                          animationDelay: isTransitioning ? '0ms' : `${index * 50}ms`,
                          animationDuration: '400ms',
                          animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{result.symbol}</div>
                            <div className="text-xs text-muted-foreground truncate">{result.name}</div>
                          </div>
                          <div className="ml-4 text-right flex-shrink-0">
                            <div className="text-xs text-muted-foreground">{result.exchange}</div>
                            <div className="text-xs text-muted-foreground">{result.type}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !loading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
                    No stocks found for &quot;{query}&quot;
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

