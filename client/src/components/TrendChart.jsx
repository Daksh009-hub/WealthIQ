// components/TrendChart.jsx
import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatINR, formatPercent } from '../utils/formatters';
import { TrendingUp, Layers } from 'lucide-react';

export function TrendChart({ netWorth = 6580000 }) {
  const [trendData, setTrendData] = useState([]);
  const [timeRange, setTimeRange] = useState('1Y'); // '3M' | '6M' | '1Y'

  useEffect(() => {
    fetch('/api/portfolio/trend')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.trend) {
          setTrendData(data.trend);
        }
      })
      .catch(err => console.error('Error fetching trend:', err));
  }, [netWorth]);

  const displayedData = React.useMemo(() => {
    if (!trendData.length) return [];
    if (timeRange === '3M') return trendData.slice(-3);
    if (timeRange === '6M') return trendData.slice(-6);
    return trendData;
  }, [trendData, timeRange]);

  const startValue = displayedData[0]?.netWorth || netWorth;
  const endValue = displayedData[displayedData.length - 1]?.netWorth || netWorth;
  const growth = endValue - startValue;
  const growthPercent = startValue > 0 ? (growth / startValue) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs border border-slate-800 space-y-1.5 min-w-[180px]">
          <div className="text-slate-400 font-medium">{label}</div>
          <div className="font-mono text-base font-bold text-white">{formatINR(data.netWorth)}</div>
          <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800">
            <div className="flex justify-between text-indigo-300">
              <span>Equities & Funds:</span>
              <span className="font-mono">{formatINR(data.equity)}</span>
            </div>
            <div className="flex justify-between text-cyan-300">
              <span>Liquid & Cash:</span>
              <span className="font-mono">{formatINR(data.liquid)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Physical Assets:</span>
              <span className="font-mono">{formatINR(data.physical)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
      {/* Header with growth and time toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Wealth Trajectory</span>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              {formatPercent(growthPercent)} ({formatINR(growth)})
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Historical growth across all accumulated asset categories</div>
        </div>

        {/* Time filters */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto text-xs font-semibold">
          {['3M', '6M', '1Y'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === range
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Area Chart */}
      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#wealthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
