// pages/Market.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Newspaper,
  RefreshCw,
  ExternalLink,
  Layers,
  Clock,
  Radio,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatINR } from '../utils/formatters';
import { VerificationBadge } from '../components/Badge';
import { WhyPanel } from '../components/WhyPanel';
import { MarketShockSimulator } from '../components/MarketShockSimulator';

export function Market() {
  const { news, setNews, scope, fetchNews, showToast } = usePortfolio();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadNews();
  }, [scope]);

  // Real-time live auto-polling every 30 seconds if autoUpdate is enabled
  useEffect(() => {
    if (autoUpdate) {
      intervalRef.current = setInterval(() => {
        fetchNews(scope);
      }, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoUpdate, scope, fetchNews]);

  const loadNews = async () => {
    try {
      setIsRefreshing(true);
      await fetchNews(scope);
      showToast('Live market intelligence refreshed', 'info', 2500);
    } catch (err) {
      console.error('Error fetching market intelligence:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Live News & Real-Time Portfolio Impacts
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              Live Feed Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Breaking financial news filtered by what you actually own, computing real-time rupee impacts across direct stocks and funds.
          </p>
        </div>

        {/* Controls: Auto-update toggle & Refresh button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              autoUpdate
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            Auto-Refresh: {autoUpdate ? 'ON (30s)' : 'PAUSED'}
          </button>

          <button
            onClick={loadNews}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Fetching...' : 'Refresh Now'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Market Shock Simulator Component */}
      <MarketShockSimulator scope={scope} />

      {/* Live News Cards Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Real-Time Grounded News & Sensitivity Calculations ({news.length})
          </span>
          <span className="text-[11px] text-slate-400">Updates dynamically based on current market wires</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {news.map((item, idx) => {
            const exposure = item.yourExposure || {};
            const liveImpact = item.liveImpact || {};
            const isPositive = liveImpact.direction === 'positive';

            return (
              <div
                key={item.id || idx}
                className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {item.category}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.publishedTime}
                      </span>
                    </div>

                    {/* Live Impact Pill */}
                    {liveImpact.totalImpactRupees !== undefined && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                        isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>Impact: {isPositive ? '+' : ''}{formatINR(liveImpact.totalImpactRupees)} ({isPositive ? '+' : ''}{liveImpact.portfolioImpactPercent}%)</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug hover:text-indigo-600 transition-colors">
                    {item.headline}
                  </h3>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Source: <span className="text-slate-600 font-medium">{item.source}</span></span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* YOUR EXPOSURE */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span>YOUR EXPOSURE: {exposure.company}</span>
                    <span className="font-mono text-indigo-700">{formatINR(exposure.totalRupee)} ({exposure.percentOfEquity}% of Equity)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 font-mono">
                    <div>Direct: <span className="font-semibold text-slate-900">{formatINR(exposure.directAmount)}</span></div>
                    <div>In Funds: <span className="font-semibold text-slate-900">{formatINR(exposure.fundAmount)}</span></div>
                  </div>
                </div>

                {/* Impact Explanation */}
                <div className="text-xs text-slate-600 leading-relaxed bg-amber-50/30 p-2.5 rounded-lg border border-amber-100">
                  {liveImpact.explanation || item.potentialImpact}
                </div>

                <WhyPanel
                  title="WHY does this move your portfolio?"
                  calculation={`Direct impact: ${formatINR(liveImpact.directImpactRupees || 0)} + Indirect fund impact: ${formatINR(liveImpact.fundImpactRupees || 0)} = Net Portfolio Impact: ${formatINR(liveImpact.totalImpactRupees || 0)}`}
                  dataUsed={{
                    company: exposure.company,
                    totalRupee: exposure.totalRupee,
                    directAmount: exposure.directAmount,
                    fundAmount: exposure.fundAmount
                  }}
                  explanation="News items are prioritized strictly based on your actual verified holdings. The AI dynamic calculation models look-through sensitivity so you know the exact rupee effect on your wealth."
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
