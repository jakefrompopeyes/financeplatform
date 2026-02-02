'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FuturePriceModelProps {
  symbol: string;
  currentPrice: number;
  eps: number | null;
  pe: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FuturePriceModel({
  symbol,
  currentPrice,
  eps,
  pe,
  open,
  onOpenChange,
}: FuturePriceModelProps) {
  const [epsGrowthPercent, setEpsGrowthPercent] = useState(10);
  const [targetPE, setTargetPE] = useState(pe ?? 25);
  const [yearsAhead, setYearsAhead] = useState(5);

  const hasEps = eps != null && eps > 0;

  const result = useMemo(() => {
    const years = Math.max(0.5, Math.min(20, yearsAhead));
    const growth = epsGrowthPercent / 100;
    const targetPEMult = Math.max(1, Math.min(100, targetPE));

    let futurePrice: number;
    let futureEps: number | null = null;

    if (hasEps) {
      futureEps = eps * Math.pow(1 + growth, years);
      futurePrice = futureEps * targetPEMult;
    } else {
      // No EPS: use price growth only (assume same growth applies to price)
      futurePrice = currentPrice * Math.pow(1 + growth, years);
    }

    const impliedReturn = Math.pow(futurePrice / currentPrice, 1 / years) - 1;
    const impliedReturnPercent = impliedReturn * 100;

    return {
      futurePrice,
      futureEps,
      impliedReturnPercent,
      years,
    };
  }, [currentPrice, eps, hasEps, epsGrowthPercent, targetPE, yearsAhead]);

  const formatNum = (n: number, decimals = 2) =>
    n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const formatPrice = (n: number) => `$${formatNum(n, 2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Future Price Model
          </DialogTitle>
          <DialogDescription>
            Adjust assumptions to estimate a future stock price for {symbol}. Not financial advice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Inputs */}
          <div className="space-y-4">
            {hasEps ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="eps-growth">EPS growth per year (%)</Label>
                  <Input
                    id="eps-growth"
                    type="number"
                    min={-50}
                    max={100}
                    step={0.5}
                    value={epsGrowthPercent}
                    onChange={(e) => setEpsGrowthPercent(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-pe">Target P/E ratio</Label>
                  <Input
                    id="target-pe"
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={targetPE}
                    onChange={(e) => setTargetPE(Number(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">Current P/E: {pe != null ? formatNum(pe, 1) : 'N/A'}</p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="price-growth">Price growth per year (%)</Label>
                <Input
                  id="price-growth"
                  type="number"
                  min={-50}
                  max={100}
                  step={0.5}
                  value={epsGrowthPercent}
                  onChange={(e) => setEpsGrowthPercent(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">No EPS data; using price growth only.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="years">Years ahead</Label>
              <Input
                id="years"
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                value={yearsAhead}
                onChange={(e) => setYearsAhead(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Results */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Current price</p>
            <p className="text-2xl font-semibold">{formatPrice(currentPrice)}</p>

            {hasEps && result.futureEps != null && (
              <p className="text-sm text-muted-foreground">
                Est. EPS in {result.years} yr: {formatNum(result.futureEps, 2)}
              </p>
            )}

            <p className="text-sm font-medium text-muted-foreground">Estimated price in {result.years} year{result.years !== 1 ? 's' : ''}</p>
            <p className={cn(
              "text-2xl font-semibold",
              result.futurePrice > currentPrice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {formatPrice(result.futurePrice)}
            </p>

            <div className="flex items-center gap-2 pt-2 border-t">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Implied annual return:</span>
              <span className={cn(
                "text-sm font-medium",
                result.impliedReturnPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {result.impliedReturnPercent >= 0 ? '+' : ''}{formatNum(result.impliedReturnPercent, 1)}%
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
