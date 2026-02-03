'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  MapPin, 
  Globe, 
  Calendar, 
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyProfileData {
  symbol: string;
  companyName: string | null;
  description: string | null;
  industry: string | null;
  sector: string | null;
  ceo: string | null;
  employees: number | null;
  headquarters: string | null;
  website: string | null;
  ipoDate: string | null;
  exchange: string | null;
  currency: string | null;
  country: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  image: string | null;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isFund: boolean;
}

interface CompanyProfileProps {
  symbol: string;
}

export default function CompanyProfile({ symbol }: CompanyProfileProps) {
  const [data, setData] = useState<CompanyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/company-profile?symbol=${symbol}`);
        const result = await response.json();

        if (result.error) {
          setError(result.error);
          setData(null);
        } else {
          setData(result);
        }
      } catch (err) {
        setError('Failed to load company profile');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchProfile();
    }
  }, [symbol]);

  const formatEmployees = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="pt-6">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silently fail - don't show error card
  }

  const hasDescription = data.description && data.description.length > 0;
  const truncatedDescription = hasDescription && data.description!.length > 300
    ? data.description!.substring(0, 300) + '...'
    : data.description;

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">About {data.companyName || data.symbol}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {data.sector && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {data.sector}
                </span>
              )}
              {data.industry && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {data.industry}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {hasDescription && (
          <div className="mb-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isExpanded ? data.description : truncatedDescription}
            </p>
            {data.description!.length > 300 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {data.ceo && (
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">CEO</p>
                <p className="text-sm font-medium truncate" title={data.ceo}>{data.ceo}</p>
              </div>
            </div>
          )}

          {data.employees && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Employees</p>
                <p className="text-sm font-medium">{formatEmployees(data.employees)}</p>
              </div>
            </div>
          )}

          {data.headquarters && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Headquarters</p>
                <p className="text-sm font-medium truncate" title={data.headquarters}>{data.headquarters}</p>
              </div>
            </div>
          )}

          {data.ipoDate && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">IPO Date</p>
                <p className="text-sm font-medium">{formatDate(data.ipoDate)}</p>
              </div>
            </div>
          )}

          {data.website && (
            <div className="flex items-start gap-2 col-span-2 sm:col-span-1">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Website</p>
                <a
                  href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors truncate"
                >
                  <span className="truncate">{data.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
