// components/AssetModal.jsx
import React from 'react';
import { X, Building2, TrendingUp, TrendingDown, Layers, Calendar, ExternalLink } from 'lucide-react';
import { formatINR, formatPercent, formatDateTime } from '../utils/formatters';

export function AssetModal({ asset, onClose }) {
  if (!asset) return null;

  const isPositive = asset.gainLoss >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-scaleUp">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                {asset.category}
              </span>
              {asset.sector && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {asset.sector}
                </span>
              )}
              {asset.owner && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  Owner: {asset.owner}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{asset.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 block mb-0.5">Current Value</span>
            <span className="text-xl font-bold font-mono text-slate-900">{formatINR(asset.currentValue)}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 block mb-0.5">Invested Value</span>
            <span className="text-xl font-bold font-mono text-slate-700">{formatINR(asset.investedValue)}</span>
          </div>
        </div>

        {/* Gain/Loss & Allocation */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 mb-5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Unrealised P&L:</span>
            <div className={`font-semibold font-mono flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{formatINR(asset.gainLoss)} ({formatPercent(asset.gainLossPercent)})</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Share of Total Wealth:</span>
            <span className="font-semibold text-slate-900 font-mono">
              {asset.percentOfTotal ? asset.percentOfTotal.toFixed(2) : '0.00'}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Data Source:</span>
            <span className="font-medium text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">
              {asset.source}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Last Synced Timestamp:</span>
            <span className="text-slate-500 font-mono">
              {formatDateTime(asset.lastUpdated)}
            </span>
          </div>
        </div>

        {/* Mutual fund look-through info if applicable */}
        {asset.fundKey && (
          <div className="mb-5 p-3 rounded-xl bg-cyan-50/50 border border-cyan-200/60 text-xs text-cyan-950">
            <div className="font-semibold flex items-center gap-1.5 mb-1 text-cyan-900">
              <Layers className="w-3.5 h-3.5 text-cyan-700" />
              <span>Look-Through Transparency</span>
            </div>
            <p className="text-[11px] text-cyan-800 leading-relaxed">
              This fund's underlying portfolio is automatically dissected by WealthIQ's deterministic engine.
              Holdings in Infosys, HDFC Bank, Reliance, etc. are attributed toward your aggregate sector and single-stock exposure.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
