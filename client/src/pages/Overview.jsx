// pages/Overview.jsx
import React from 'react';
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatINR, formatPercent, formatDateTime } from '../utils/formatters';
import { AllocationChart } from '../components/AllocationChart';
import { TrendChart } from '../components/TrendChart';
import { HealthRing } from '../components/HealthRing';

export function Overview() {
  const { portfolio, health, family, scope, setActiveTab, toggleMemberConsent, lastSyncTime } = usePortfolio();

  if (!portfolio) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading intelligence dashboard...</p>
      </div>
    );
  }

  const { netWorth, allocation, pnl } = portfolio;
  const isFamily = scope === 'family';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Scope Notice in Family Mode */}
      {isFamily && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">👥</span>
            <div>
              <div className="text-sm font-bold text-white">Consolidated Family Wealth Ledger</div>
              <div className="text-xs text-slate-400">
                Cross-member asset aggregation and look-through privacy controls for Aarav, Father, and Mother.
              </div>
            </div>
          </div>
          <div className="text-xs font-semibold text-cyan-400 bg-white/10 px-3 py-1 rounded-xl border border-white/10">
            {family?.consentedCount || 3} of {family?.totalCount || 3} Members Consented
          </div>
        </div>
      )}

      {/* Main Net Worth & Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Big Net Worth Card */}
        <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>{isFamily ? 'TOTAL FAMILY NET WORTH' : 'TOTAL NET WORTH'}</span>
            <span className="text-slate-400 font-mono text-[11px]">Synced: {formatDateTime(lastSyncTime)}</span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              {formatINR(netWorth.netWorth)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
              <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                +{formatINR(netWorth.todayChangeAmount)} (+{netWorth.todayChangePercent}%)
              </span>
              <span className="text-slate-400 font-normal">today</span>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-600">
                +{formatINR(netWorth.monthlyChangeAmount)} (+{netWorth.monthlyChangePercent}%) 1M
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Gross Assets</span>
              <span className="font-mono font-bold text-slate-800">{formatINR(netWorth.totalAssets)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Liabilities</span>
              <span className="font-mono font-bold text-rose-600">-{formatINR(netWorth.totalLiabilities)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Unrealised P&L</span>
              <span className={`font-mono font-bold ${pnl.absolute >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatINR(pnl.absolute)} ({formatPercent(pnl.percent)})
              </span>
            </div>
          </div>
        </div>

        {/* Health Ring Compact Card */}
        <div
          onClick={() => setActiveTab('health')}
          className="md:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Health Score</span>
              <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mt-0.5">
                Diagnostics Report
              </div>
            </div>
            <span className="text-xs text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          <div className="py-2 flex justify-center">
            <HealthRing score={health?.health?.overallScore || 84} size={90} strokeWidth={8} showLabel={false} />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{health?.concentrationFlags?.length || 0} Concentration Alerts</span>
            <span className="text-indigo-600 font-semibold">Inspect WHY →</span>
          </div>
        </div>
      </div>

      {/* Embedded Trend Area Chart */}
      <TrendChart netWorth={netWorth.netWorth} />

      {/* Family Member Cards (Only in Family Scope) */}
      {isFamily && family?.members && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Family Members & Consent State</h2>
              <p className="text-xs text-slate-500">Toggle member consent to simulate Account Aggregator privacy controls.</p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Click chip to toggle consent</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {family.members.map(member => {
              const isGranted = member.consent === 'granted';
              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isGranted
                      ? 'bg-slate-50/80 border-slate-200'
                      : 'bg-slate-100/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{member.avatar}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{member.name}</div>
                        <div className="text-[11px] text-slate-500">{member.role}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMemberConsent(member.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        isGranted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {isGranted ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}
                      <span>{isGranted ? 'Granted' : 'Pending'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex justify-between text-xs">
                    <span className="text-slate-500">Net Worth:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {isGranted ? formatINR(member.netWorth) : 'Masked (Pending)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Allocation Donut Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">7-Category Wealth Allocation</h2>
            <p className="text-xs text-slate-500">Distribution across liquid, equity, physical and fixed income holdings.</p>
          </div>
          <button
            onClick={() => setActiveTab('assets')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
          >
            Explore holdings <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <AllocationChart categories={allocation.categories} totalAssets={allocation.totalAssets} />
      </div>

      {/* Quick Copilot Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Gemini Wealth Copilot</span>
          </div>
          <h3 className="text-sm font-bold text-white">Ask about real-world market risks and dynamic portfolio impacts</h3>
          <p className="text-xs text-slate-400">
            Get structured answers with FACT, ANALYSIS, POTENTIAL RISK, and SUGGESTION sections.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('copilot')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          Open Copilot
        </button>
      </div>
    </div>
  );
}
