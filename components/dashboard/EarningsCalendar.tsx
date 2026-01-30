'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, TrendingUp, TrendingDown, Building2, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EarningsData {
  symbol: string;
  name: string;
  earningsDate: string;
  reportDate: string;
  fiscalPeriod: string;
  fiscalYear: string;
  estimatedEPS: number | null;
  reportedEPS: number | null;
  surprise: number | null;
  currency: string;
  reportTime: string;
}

export default function EarningsCalendar() {
  const [earnings, setEarnings] = useState<EarningsData[]>([]);
  const [filteredEarnings, setFilteredEarnings] = useState<EarningsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchEarnings();
  }, []);

  useEffect(() => {
    filterEarnings();
  }, [earnings, searchTerm, filterType]);

  const fetchEarnings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/earnings-calendar');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setEarnings(data.earnings || []);
      }
    } catch (err) {
      setError('Failed to fetch earnings calendar');
    } finally {
      setLoading(false);
    }
  };

  const filterEarnings = () => {
    let filtered = [...earnings];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filter by time period
    if (filterType === 'upcoming') {
      filtered = filtered.filter(e => {
        const earningsDate = new Date(e.earningsDate || e.reportDate);
        return earningsDate >= now;
      });
    } else if (filterType === 'past') {
      filtered = filtered.filter(e => {
        const earningsDate = new Date(e.earningsDate || e.reportDate);
        return earningsDate < now;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.symbol.toLowerCase().includes(term) ||
        e.name.toLowerCase().includes(term)
      );
    }

    setFilteredEarnings(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getDaysUntil = (dateString: string) => {
    const earningsDate = new Date(dateString);
    const today = new Date();
    earningsDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = earningsDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatNumber = (num: number | null, decimals: number = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const getReportTimeLabel = (time: string) => {
    const timeLower = time.toLowerCase();
    if (timeLower.includes('bmo') || timeLower.includes('before')) {
      return { label: 'Before Market', color: 'text-blue-500' };
    } else if (timeLower.includes('amc') || timeLower.includes('after')) {
      return { label: 'After Market', color: 'text-purple-500' };
    } else if (timeLower.includes('during')) {
      return { label: 'During Market', color: 'text-orange-500' };
    }
    return { label: 'TBA', color: 'text-muted-foreground' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-primary/10">
          <Calendar className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-light text-foreground">Earnings Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Track upcoming and past earnings reports
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by symbol or company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('upcoming')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              filterType === 'upcoming'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterType('past')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              filterType === 'past'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            Past
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              filterType === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            All
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-red-500/50">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">{error}</p>
              <p className="text-sm text-muted-foreground">
                Earnings calendar data may not be available with your current API plan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings List */}
      {!loading && !error && (
        <>
          {filteredEarnings.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No earnings found matching your search.' : 'No earnings data available.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEarnings.map((earning, index) => {
                const daysUntil = getDaysUntil(earning.earningsDate || earning.reportDate);
                const isPast = daysUntil < 0;
                const isToday = daysUntil === 0;
                const reportTime = getReportTimeLabel(earning.reportTime);
                const hasSurprise = earning.surprise !== null;
                const isPositiveSurprise = hasSurprise && (earning.surprise || 0) > 0;

                return (
                  <Card key={`${earning.symbol}-${earning.reportDate}-${index}`} className={cn(
                    "transition-colors hover:border-primary/50",
                    isToday && "border-primary border-2"
                  )}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Date Section */}
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className={cn(
                              "font-medium text-sm",
                              isToday && "text-primary font-bold"
                            )}>
                              {formatDate(earning.earningsDate || earning.reportDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-6">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className={cn("text-xs", reportTime.color)}>
                              {reportTime.label}
                            </span>
                          </div>
                        </div>

                        {/* Company Info */}
                        <div className="md:col-span-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-bold">{earning.symbol}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate ml-6">
                            {earning.name}
                          </p>
                        </div>

                        {/* Fiscal Period */}
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Fiscal Period</p>
                          <p className="text-sm font-medium">
                            {earning.fiscalPeriod} {earning.fiscalYear}
                          </p>
                        </div>

                        {/* EPS Data */}
                        <div className="md:col-span-3">
                          <div className="space-y-1">
                            {earning.estimatedEPS !== null && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Est. EPS:</span>
                                <span className="font-medium">
                                  ${formatNumber(earning.estimatedEPS)}
                                </span>
                              </div>
                            )}
                            {earning.reportedEPS !== null && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Reported:</span>
                                <span className="font-medium">
                                  ${formatNumber(earning.reportedEPS)}
                                </span>
                              </div>
                            )}
                            {hasSurprise && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Surprise:</span>
                                <span className={cn(
                                  "font-medium flex items-center gap-1",
                                  isPositiveSurprise ? "text-green-500" : "text-red-500"
                                )}>
                                  {isPositiveSurprise ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3" />
                                  )}
                                  {isPositiveSurprise ? '+' : ''}{formatNumber(earning.surprise || 0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Days Until */}
                        <div className="md:col-span-1 text-right">
                          {!isPast && !isToday && (
                            <div className="text-xs text-muted-foreground">
                              {daysUntil}d
                            </div>
                          )}
                          {isToday && (
                            <div className="px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary">
                              Today
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium mb-3">About Earnings Reports</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Before Market Open (BMO):</strong> Reports released before market opens at 9:30 AM ET.
            </p>
            <p>
              <strong>After Market Close (AMC):</strong> Reports released after market closes at 4:00 PM ET.
            </p>
            <p>
              <strong>Surprise %:</strong> The percentage difference between reported and estimated EPS.
              Positive surprises often lead to stock price increases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



