'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

// Recharts components have defaultProps that conflict with React.createElement typing
const asChartComponent = <P extends Record<string, unknown>>(C: React.ComponentType<P>) =>
  C as React.ComponentType<Record<string, unknown>>;

type MacroData = {
  btcVsM2?: { date: string; btcIndex: number; m2Index: number }[];
  sp500VsRates?: { date: string; sp500: number; fedFunds: number }[];
  tenYVsFed?: { date: string; tenY: number; fedFunds: number }[];
  yieldCurveSpread?: { date: string; value: number }[];
  m2YoY?: { date: string; value: number }[];
  highYieldSpread?: { date: string; value: number }[];
  error?: string;
};

const cardClass = 'rounded-xl bg-card text-card-foreground shadow-md border border-border';
const headerClass = 'text-base font-normal text-secondary pb-2 px-4 pt-4';
const contentClass = 'px-4 pb-4';

function buildSingleLineChart(
  data: { date: string; value: number }[],
  key: string,
  title: string,
  valueSuffix: string,
  lineColor: string,
  refLineY: number | null
) {
  const gridStroke = 'hsl(var(--border))';
  const axisStroke = 'hsl(var(--muted-foreground))';
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--card-foreground))',
  };
  const children: React.ReactNode[] = [
    React.createElement(asChartComponent(CartesianGrid), { key: 'grid', strokeDasharray: '3 3', stroke: gridStroke }),
    React.createElement(asChartComponent(XAxis), {
      key: 'x',
      dataKey: 'date',
      stroke: axisStroke,
      tick: { fontSize: 10 },
      tickFormatter: (v: string) => {
        const d = new Date(v);
        return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
      },
    }),
    React.createElement(asChartComponent(YAxis), {
      key: 'y',
      stroke: axisStroke,
      tick: { fontSize: 10 },
      domain: ['auto', 'auto'],
      tickFormatter: (v: number) => `${v}${valueSuffix}`,
    }),
    React.createElement(asChartComponent(Tooltip), {
      key: 'tooltip',
      contentStyle: tooltipStyle,
      labelFormatter: (label: string) => new Date(label).toLocaleDateString(),
      formatter: (value: number) => [`${Number(value).toFixed(2)}${valueSuffix}`, null],
    }),
    React.createElement(asChartComponent(Line), {
      key: 'line',
      type: 'monotone',
      dataKey: key,
      stroke: lineColor,
      strokeWidth: 2,
      dot: false,
      isAnimationActive: true,
      animationDuration: 600,
    }),
  ];
  if (refLineY !== null) {
    children.push(
      React.createElement(asChartComponent(ReferenceLine), {
        key: 'ref',
        y: refLineY,
        stroke: axisStroke,
        strokeDasharray: '2 2',
      })
    );
  }
  return React.createElement(
    'div',
    { key: title.replace(/\s/g, '-'), className: cardClass },
    React.createElement('h3', { className: headerClass }, title),
    React.createElement(
      'div',
      { className: contentClass + ' h-56' },
      React.createElement(
        ResponsiveContainer as React.ComponentType<{ width?: string; height?: string; children?: React.ReactNode }>,
        { width: '100%', height: '100%' },
        React.createElement(asChartComponent(LineChart), { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } }, children)
      )
    )
  );
}

function buildBtcM2Chart(data: { date: string; btcIndex: number; m2Index: number }[]) {
  const gridStroke = 'hsl(var(--border))';
  const axisStroke = 'hsl(var(--muted-foreground))';
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--card-foreground))',
  };
  return React.createElement(
    'div',
    { key: 'btc-m2', className: cardClass },
    React.createElement('h3', { className: headerClass }, 'Bitcoin vs US M2 (indexed to 100)'),
    React.createElement(
      'div',
      { className: contentClass + ' h-56' },
      React.createElement(
        ResponsiveContainer as React.ComponentType<{ width?: string; height?: string; children?: React.ReactNode }>,
        { width: '100%', height: '100%' },
        React.createElement(asChartComponent(LineChart), { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
          React.createElement(asChartComponent(CartesianGrid), { strokeDasharray: '3 3', stroke: gridStroke }),
          React.createElement(asChartComponent(XAxis), {
            dataKey: 'date',
            stroke: axisStroke,
            tick: { fontSize: 10 },
            tickFormatter: (v: string) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
            },
          }),
          React.createElement(asChartComponent(YAxis), { stroke: axisStroke, tick: { fontSize: 10 }, domain: ['auto', 'auto'] }),
          React.createElement(asChartComponent(Tooltip), {
            contentStyle: tooltipStyle,
            labelFormatter: (label: string) => new Date(label).toLocaleDateString(),
            formatter: (value: number) => [value.toFixed(1), null],
          }),
          React.createElement(asChartComponent(Legend), {
            wrapperStyle: { fontSize: 11 },
            formatter: (name: string) => (name === 'btcIndex' ? 'BTC' : name === 'm2Index' ? 'M2' : name),
          }),
          React.createElement(asChartComponent(ReferenceLine), { y: 100, stroke: axisStroke, strokeDasharray: '2 2' }),
          React.createElement(asChartComponent(Line), {
            type: 'monotone',
            dataKey: 'btcIndex',
            name: 'btcIndex',
            stroke: '#f7931a',
            strokeWidth: 2,
            dot: false,
            isAnimationActive: true,
            animationDuration: 600,
          }),
          React.createElement(asChartComponent(Line), {
            type: 'monotone',
            dataKey: 'm2Index',
            name: 'm2Index',
            stroke: '#4A90E2',
            strokeWidth: 1.5,
            dot: false,
            isAnimationActive: true,
            animationDuration: 600,
          })
        )
      )
    )
  );
}

function buildSp500RatesChart(data: { date: string; sp500: number; fedFunds: number }[]) {
  const gridStroke = 'hsl(var(--border))';
  const axisStroke = 'hsl(var(--muted-foreground))';
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--card-foreground))',
  };
  return React.createElement(
    'div',
    { key: 'sp500-rates', className: cardClass },
    React.createElement('h3', { className: headerClass }, 'S&P 500 (SPY) vs Fed Funds Rate'),
    React.createElement(
      'div',
      { className: contentClass + ' h-56' },
      React.createElement(
        ResponsiveContainer as React.ComponentType<{ width?: string; height?: string; children?: React.ReactNode }>,
        { width: '100%', height: '100%' },
        React.createElement(asChartComponent(LineChart), { data, margin: { top: 8, right: 32, left: 0, bottom: 0 } },
          React.createElement(asChartComponent(CartesianGrid), { strokeDasharray: '3 3', stroke: gridStroke }),
          React.createElement(asChartComponent(XAxis), {
            dataKey: 'date',
            stroke: axisStroke,
            tick: { fontSize: 10 },
            tickFormatter: (v: string) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
            },
          }),
          React.createElement(asChartComponent(YAxis), {
            yAxisId: 'left',
            stroke: axisStroke,
            tick: { fontSize: 10 },
            domain: ['auto', 'auto'],
            tickFormatter: (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`,
          }),
          React.createElement(asChartComponent(YAxis), {
            yAxisId: 'right',
            orientation: 'right',
            stroke: axisStroke,
            tick: { fontSize: 10 },
            domain: ['auto', 'auto'],
            tickFormatter: (v: number) => `${v}%`,
          }),
          React.createElement(asChartComponent(Tooltip), {
            contentStyle: tooltipStyle,
            labelFormatter: (label: string) => new Date(label).toLocaleDateString(),
            formatter: (value: number, name: string) =>
              name === 'sp500' ? [`$${value.toFixed(2)}`, 'SPY'] : [`${value.toFixed(2)}%`, 'Fed Funds'],
          }),
          React.createElement(asChartComponent(Legend), {
            wrapperStyle: { fontSize: 11 },
            formatter: (name: string) => (name === 'sp500' ? 'S&P 500 (SPY)' : 'Fed Funds Rate'),
          }),
          React.createElement(asChartComponent(Line), {
            yAxisId: 'left',
            type: 'monotone',
            dataKey: 'sp500',
            name: 'sp500',
            stroke: '#22c55e',
            strokeWidth: 2,
            dot: false,
            isAnimationActive: true,
            animationDuration: 600,
          }),
          React.createElement(asChartComponent(Line), {
            yAxisId: 'right',
            type: 'monotone',
            dataKey: 'fedFunds',
            name: 'fedFunds',
            stroke: '#ef4444',
            strokeWidth: 1.5,
            dot: false,
            isAnimationActive: true,
            animationDuration: 600,
          })
        )
      )
    )
  );
}

function buildTenYFedChart(data: { date: string; tenY: number; fedFunds: number }[]) {
  const gridStroke = 'hsl(var(--border))';
  const axisStroke = 'hsl(var(--muted-foreground))';
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--card-foreground))',
  };
  return React.createElement(
    'div',
    { key: 'teny-fed', className: cardClass },
    React.createElement('h3', { className: headerClass }, '10Y Treasury vs Fed Funds Rate'),
    React.createElement(
      'div',
      { className: contentClass + ' h-56' },
      React.createElement(
        ResponsiveContainer as React.ComponentType<{ width?: string; height?: string; children?: React.ReactNode }>,
        { width: '100%', height: '100%' },
        React.createElement(asChartComponent(LineChart), { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
          React.createElement(asChartComponent(CartesianGrid), { strokeDasharray: '3 3', stroke: gridStroke }),
          React.createElement(asChartComponent(XAxis), {
            dataKey: 'date',
            stroke: axisStroke,
            tick: { fontSize: 10 },
            tickFormatter: (v: string) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
            },
          }),
          React.createElement(asChartComponent(YAxis), {
            stroke: axisStroke,
            tick: { fontSize: 10 },
            domain: ['auto', 'auto'],
            tickFormatter: (v: number) => `${v}%`,
          }),
          React.createElement(asChartComponent(Tooltip), {
            contentStyle: tooltipStyle,
            labelFormatter: (label: string) => new Date(label).toLocaleDateString(),
            formatter: (value: number, name: string) =>
              [`${value.toFixed(2)}%`, name === 'tenY' ? '10Y Treasury' : 'Fed Funds'],
          }),
          React.createElement(asChartComponent(Legend), { wrapperStyle: { fontSize: 11 } }),
          React.createElement(asChartComponent(Line), {
            type: 'monotone',
            dataKey: 'tenY',
            name: '10Y Treasury',
            stroke: '#8b5cf6',
            strokeWidth: 2,
            dot: false,
            isAnimationActive: true,
            animationDuration: 600,
          }),
          React.createElement(asChartComponent(Line), {
            type: 'monotone',
            dataKey: 'fedFunds',
            name: 'Fed Funds',
            stroke: '#ef4444',
            strokeWidth: 1.5,
            dot: false,
            isAnimationActive: true,
            animationDuration: 600,
          })
        )
      )
    )
  );
}

export default function MacroCharts() {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/macro-charts');
        const json = await res.json();
        if (json.error) {
          setData({ error: json.error });
        } else {
          setData(json);
        }
      } catch (e) {
        setData({ error: 'Failed to load macro charts' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return React.createElement(
      'div',
      { className: 'space-y-4' },
      React.createElement('h2', { className: 'text-2xl font-normal text-foreground' }, 'Key macro charts'),
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
        [1, 2, 3].map((i) =>
          React.createElement(
            'div',
            { key: i, className: cardClass + ' p-4' },
            React.createElement('div', { className: 'h-6 bg-muted rounded w-40 mb-4' }),
            React.createElement('div', { className: 'h-56 bg-muted rounded' })
          )
        )
      )
    );
  }

  const anyChart =
    (data?.btcVsM2?.length ?? 0) > 0 ||
    (data?.sp500VsRates?.length ?? 0) > 0 ||
    (data?.tenYVsFed?.length ?? 0) > 0 ||
    (data?.yieldCurveSpread?.length ?? 0) > 0 ||
    (data?.m2YoY?.length ?? 0) > 0 ||
    (data?.highYieldSpread?.length ?? 0) > 0;
  if (!data || (data.error && !anyChart)) {
    return React.createElement(
      'div',
      { className: 'space-y-4' },
      React.createElement('h2', { className: 'text-2xl font-normal text-foreground' }, 'Key macro charts'),
      React.createElement(
        'div',
        { className: cardClass + ' py-8 px-4' },
        React.createElement(
          'p',
          { className: 'text-center text-muted-foreground' },
          data?.error ?? 'No macro chart data available. Configure FRED_API_KEY and FMP_API_KEY in .env.local.'
        )
      )
    );
  }

  const hasAny =
    (data.btcVsM2?.length ?? 0) > 0 ||
    (data.sp500VsRates?.length ?? 0) > 0 ||
    (data.tenYVsFed?.length ?? 0) > 0 ||
    (data.yieldCurveSpread?.length ?? 0) > 0 ||
    (data.m2YoY?.length ?? 0) > 0 ||
    (data.highYieldSpread?.length ?? 0) > 0;

  if (!hasAny) {
    return React.createElement(
      'div',
      { className: 'space-y-4' },
      React.createElement('h2', { className: 'text-2xl font-normal text-foreground' }, 'Key macro charts'),
      React.createElement(
        'div',
        { className: cardClass + ' py-8 px-4' },
        React.createElement(
          'p',
          { className: 'text-center text-muted-foreground' },
          'No chart data returned. Check API keys and try again.'
        )
      )
    );
  }

  const charts: React.ReactNode[] = [];
  if (data.btcVsM2 != null && data.btcVsM2.length > 0) {
    charts.push(buildBtcM2Chart(data.btcVsM2));
  }
  if (data.sp500VsRates != null && data.sp500VsRates.length > 0) {
    charts.push(buildSp500RatesChart(data.sp500VsRates));
  }
  if (data.tenYVsFed != null && data.tenYVsFed.length > 0) {
    charts.push(buildTenYFedChart(data.tenYVsFed));
  }
  if (data.yieldCurveSpread != null && data.yieldCurveSpread.length > 0) {
    charts.push(
      buildSingleLineChart(
        data.yieldCurveSpread,
        'value',
        '10Y-2Y Yield curve spread (inversion = recession signal)',
        '%',
        '#8b5cf6',
        0
      )
    );
  }
  if (data.m2YoY != null && data.m2YoY.length > 0) {
    charts.push(
      buildSingleLineChart(data.m2YoY, 'value', 'M2 money supply (year-over-year % change)', '%', '#22c55e', null)
    );
  }
  if (data.highYieldSpread != null && data.highYieldSpread.length > 0) {
    charts.push(
      buildSingleLineChart(
        data.highYieldSpread,
        'value',
        'High yield credit spread (OAS)',
        '%',
        '#ef4444',
        null
      )
    );
  }

  return React.createElement(
    'div',
    { className: 'space-y-4' },
    React.createElement('h2', { className: 'text-2xl font-normal text-foreground' }, 'Key macro charts'),
    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' }, charts)
  );
}
