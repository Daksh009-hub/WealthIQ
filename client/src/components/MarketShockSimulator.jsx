// components/MarketShockSimulator.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { Sliders, Zap, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { formatINR, formatPercent } from '../utils/formatters';

export function MarketShockSimulator({ scope = 'me' }) {
  const [shockType, setShockType] = useState('tech_pullback');
  const [severity, setSeverity] = useState(1);
  const [simulation, setSimulation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const SHOCK_OPTIONS = [
    { id: 'tech_pullback', label: 'Global Tech Pullback (-6%)' },
    { id: 'rbi_rate_hike', label: 'RBI Rate Hike (+50bps)' },
    { id: 'crude_spike', label: 'Crude Oil Surge ($95/bbl)' },
    { id: 'broad_bull_rally', label: 'Broad Market Rally (+4.5%)' }
  ];

  useEffect(() => {
    runSimulation();
  }, [shockType, severity, scope]);

  const runSimulation = () => {
    setIsLoading(true);
    fetch('/api/news/simulate-shock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shockType, severity, scope })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSimulation(res.simulation);
        }
      })
      .catch(err => console.error('Shock simulation error:', err))
      .finally(() => setIsLoading(false));
  };

  if (!simulation) return null;

  const chartData = simulation.holdingsImpact.map(h => ({
    name: h.company,
    delta: h.totalDelta,
    directDelta: h.directDelta,
    fundDelta: h.fundDelta,
    exposure: h.totalExposure,
    multiplier: h.multiplierPercent
  }));

  const isPositive = simulation.totalNetDelta >= 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs border border-slate-800 space-y-1">
          <div className="font-bold text-slate-100">{label} Impact</div>
          <div className="text-slate-300">Total Exposure: <span className="font-mono">{formatINR(item.exposure)}</span></div>
          <div className={`font-mono font-bold ${item.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Estimated Delta: {formatINR(item.delta)} ({item.multiplier > 0 ? '+' : ''}{item.multiplier}%)
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            Direct holding: {formatINR(item.directDelta)} | Look-through funds: {formatINR(item.fundDelta)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Market Shock & Stress Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Test how real-world macroeconomic events ripple across direct holdings and mutual funds.
          </p>
        </div>

        {/* Shock selector pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {SHOCK_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setShockType(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                shockType === opt.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity slider & Result summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-7 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Event Severity Multiplier:</span>
            </span>
            <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
              {severity.toFixed(1)}x Shock
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>0.5x (Mild)</span>
            <span>1.0x (Baseline Scenario)</span>
            <span>2.5x (Severe Stress)</span>
          </div>
        </div>

        {/* Projected Impact Card */}
        <div className={`md:col-span-5 p-4 rounded-xl border ${
          isPositive ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
        }`}>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
            Estimated Net Portfolio Impact
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatINR(simulation.totalNetDelta)}
            </span>
            <span className={`text-xs font-bold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              ({isPositive ? '+' : ''}{simulation.netWorthImpactPercent}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            Projected Net Worth: <span className="font-mono font-bold text-slate-900">{formatINR(simulation.projectedNetWorth)}</span>
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart of Asset Deltas */}
      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-600 block">Holding-by-Holding Impact Breakdown:</span>
        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#334155' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.delta >= 0 ? '#10b981' : '#f43f5e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
