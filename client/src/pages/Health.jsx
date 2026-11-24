// pages/Health.jsx
import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Layers,
  Sparkles,
  BarChart3,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
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
import { usePortfolio } from '../context/PortfolioContext';
import { formatINR } from '../utils/formatters';
import { HealthRing } from '../components/HealthRing';
import { WhyPanel } from '../components/WhyPanel';
import { RiskBadge, VerificationBadge } from '../components/Badge';
import { AIDynamicComparator } from '../components/AIDynamicComparator';

export function Health() {
  const { health, scope, isAiLoading, setIsAiLoading, showToast } = usePortfolio();
  const [aiSummary, setAiSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!health) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-slate-400">Evaluating look-through exposure and health metrics...</p>
      </div>
    );
  }

  const { health: healthData, concentrationFlags, overlaps, sectorExposure } = health;

  // Chart data for look-through sector exposure (Direct vs Fund)
  const sectorChartData = (sectorExposure?.sectors || []).map(s => ({
    name: s.sector,
    'Direct Stocks': Math.round(s.directAmount),
    'Mutual Funds (Look-Through)': Math.round(s.fundAmount),
    percent: s.percent
  }));

  const handleGenerateSummary = async () => {
    try {
      setIsGenerating(true);
      setIsAiLoading(true);
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summary',
          scope,
          question: 'Provide a comprehensive portfolio health summary with risk and diversification insights'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary(data.data);
        showToast('AI Portfolio Analysis Generated', 'success');
      } else {
        showToast(data.error || 'Failed to generate summary', 'error');
      }
    } catch (err) {
      console.error('Error generating AI summary:', err);
      showToast('Error requesting AI summary', 'error');
    } finally {
      setIsGenerating(false);
      setIsAiLoading(false);
    }
  };

  const CustomSectorTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const direct = payload.find(p => p.dataKey === 'Direct Stocks')?.value || 0;
      const fund = payload.find(p => p.dataKey === 'Mutual Funds (Look-Through)')?.value || 0;
      const total = direct + fund;
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs border border-slate-800 space-y-1">
          <div className="font-bold text-slate-100">{label} Sector</div>
          <div className="text-slate-300">Total Look-Through: <span className="font-mono font-bold text-white">{formatINR(total)} ({item.percent.toFixed(1)}%)</span></div>
          <div className="text-indigo-300">Direct Stocks: <span className="font-mono text-white">{formatINR(direct)}</span></div>
          <div className="text-cyan-300">Via Funds: <span className="font-mono text-white">{formatINR(fund)}</span></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Portfolio Health & Risk Diagnostics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic look-through calculations augmented with AI dynamic real-world stress modeling.
          </p>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Generate AI Summary</span>
            </>
          )}
        </button>
      </div>

      {/* AI Summary Card (If generated) */}
      {aiSummary && (
        <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 space-y-4 animate-scaleUp">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Gemini Wealth Copilot: Diagnostic Synthesis</h2>
            </div>
            <VerificationBadge level={1} verified={true} label="Verified against portfolio engine" />
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/10">
            {aiSummary.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>What Looks Healthy</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{aiSummary.portfolioHealth}</p>
            </div>

            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-1.5">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Risk & Concentration Observations</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {aiSummary.risks?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* AI DYNAMIC REAL-WORLD COMPARATOR (Key Upgrade requested by user!) */}
      <AIDynamicComparator scope={scope} />

      {/* Look-Through Sector Exposure Bar Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Look-Through Sector Breakdown</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct equity holdings stacked against mutual fund look-through weights.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            Total Equity: {formatINR(sectorExposure?.totalEquity || 0)}
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomSectorTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Direct Stocks" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Mutual Funds (Look-Through)" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hidden Overlap Detected Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Hidden Overlap Cross-Dissection</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Companies held simultaneously through direct shares and underlying mutual fund portfolios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overlaps?.overlaps?.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{item.company}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-200 text-slate-700">
                      {item.sector}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Reached through <span className="font-bold text-indigo-700">{item.routesCount} holding paths</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-extrabold text-slate-900 text-sm">
                    {formatINR(item.totalExposure)}
                  </div>
                  <div className="text-[11px] font-bold text-indigo-600">
                    {item.percentOfEquity.toFixed(1)}% of Equity
                  </div>
                </div>
              </div>

              {/* Routes Breakdown */}
              <div className="space-y-1 pt-2 border-t border-slate-200/60 text-xs">
                {item.routes.map((route, rIdx) => (
                  <div key={rIdx} className="flex justify-between items-center text-[11px] text-slate-600">
                    <span className="truncate pr-2">{route.description || route.source}</span>
                    <span className="font-mono font-medium text-slate-900 shrink-0">{formatINR(route.amount)}</span>
                  </div>
                ))}
              </div>

              <WhyPanel
                title={`WHY: ${item.company} Overlap?`}
                formula="Total Exposure = Direct Stock Value + sum(Fund Value × Company Weight %)"
                calculation={`Direct: ${formatINR(item.directExposure)} + Fund look-through: ${formatINR(item.fundExposure)} = Total: ${formatINR(item.totalExposure)} (${item.percentOfEquity.toFixed(1)}% of total equity)`}
                dataUsed={{
                  company: item.company,
                  directExposure: item.directExposure,
                  fundExposure: item.fundExposure,
                  totalExposure: item.totalExposure,
                  percentOfEquity: `${item.percentOfEquity.toFixed(1)}%`
                }}
                relevantHoldings={item.routes}
                explanation={`Holding ${item.company} directly while simultaneously holding index and thematic mutual funds creates compounding exposure. When tech equities correct, the loss occurs across both direct and fund accounts.`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
