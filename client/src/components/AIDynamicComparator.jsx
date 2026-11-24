// components/AIDynamicComparator.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Sparkles,
  AlertTriangle,
  Scale,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Info
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export function AIDynamicComparator({ scope = 'me' }) {
  const [regime, setRegime] = useState('high_volatility'); // 'standard' | 'high_volatility' | 'rising_rates'
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/portfolio/ai-dynamic?scope=${scope}&regime=${regime}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.aiDynamic);
        }
      })
      .catch(err => console.error('Error fetching AI dynamic model:', err))
      .finally(() => setIsLoading(false));
  }, [scope, regime]);

  if (!data) return null;

  const chartData = data.radarMetrics.map(m => ({
    dimension: m.dimension,
    'Static Formula (Ideal)': m.staticScore,
    'AI Real-World Model (Stress-Tested)': m.aiScore,
    whyDelta: m.whyDelta
  }));

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const staticVal = payload.find(p => p.dataKey === 'Static Formula (Ideal)')?.value || 0;
      const aiVal = payload.find(p => p.dataKey === 'AI Real-World Model (Stress-Tested)')?.value || 0;
      const item = payload[0].payload;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs border border-slate-800 space-y-2 max-w-xs">
          <div className="font-bold text-slate-100">{label} Dimension</div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Static Heuristic:</span>
            <span className="font-mono font-bold text-slate-100">{staticVal}/100</span>
          </div>
          <div className="flex justify-between items-center text-indigo-300">
            <span>AI Dynamic Model:</span>
            <span className="font-mono font-bold text-cyan-300">{aiVal}/100</span>
          </div>
          <div className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-800 leading-relaxed">
            {item.whyDelta}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              AI Dynamic Calculation Model vs Static Heuristic
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Real-World Stress Testing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Static formulas assume ideal, independent conditions. AI calculates real-world covariance, sector beta, and liquidity haircuts.
          </p>
        </div>

        {/* Macro Regime Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto text-xs font-semibold">
          {[
            { id: 'standard', label: 'Normal Market' },
            { id: 'high_volatility', label: '⚡ High Volatility' },
            { id: 'rising_rates', label: '📈 Rising Rates' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setRegime(opt.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                regime === opt.id
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Static Formula Score (Ideal)
          </span>
          <div className="text-3xl font-bold font-mono text-slate-800">
            {data.comparison.staticScore}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Heuristic baseline assuming unweighted sector independence.</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-indigo-500/10 via-cyan-500/10 to-transparent rounded-xl border border-indigo-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              AI Real-World Stress Score
            </span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {data.comparison.gapDelta} pts
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-indigo-900">
            {data.comparison.aiRealWorldScore}
            <span className="text-xs font-normal text-indigo-500 ml-1">/ 100</span>
          </div>
          <p className="text-xs text-indigo-950 mt-1 font-medium">
            Factoring in Tech Beta (1.38x) and cross-fund simultaneous drawdown.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Stressed Net Worth (Haircut)
          </span>
          <div className="text-3xl font-bold font-mono text-slate-900">
            {formatINR(data.stressTestedNetWorth)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Discounting illiquid real estate & vehicles under forced liquidation.
          </p>
        </div>
      </div>

      {/* Side-by-Side Chart */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
          <span>Dimensional Comparison: Static vs AI Real-World</span>
          <span className="text-slate-400 font-normal">Hover bars to view why the score changes</span>
        </div>
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Static Formula (Ideal)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="AI Real-World Model (Stress-Tested)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Why Static Formulas Fail in the Real World */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <span>Why Static Formulas Fail in Real-World Scenarios:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.failReasonsOfStaticFormulas?.map((reason, i) => (
            <div key={i} className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1">
              <span className="font-semibold text-slate-800 block text-[11px]">{reason.flaw}</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">{reason.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
