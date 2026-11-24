// pages/Assets.jsx
import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Layers,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Wallet,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatINR, formatPercent, formatDateTime } from '../utils/formatters';
import { AssetModal } from '../components/AssetModal';

export function Assets() {
  const { assets, scope, isLoading } = usePortfolio();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [selectedPerf, setSelectedPerf] = useState('All'); // 'All' | 'gain' | 'loss'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('currentValue'); // 'currentValue' | 'gainLoss' | 'gainLossPercent' | 'name'
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const CATEGORIES = [
    'All',
    'Stocks',
    'Mutual Funds',
    'Property',
    'Gold',
    'Cash/Deposits',
    'Insurance',
    'Vehicles'
  ];

  // Category counts and total values for filter chips
  const categoryStats = useMemo(() => {
    const stats = { All: { count: assets.length, value: assets.reduce((s, a) => s + (Number(a.currentValue) || 0), 0) } };
    for (const cat of CATEGORIES.slice(1)) {
      const catAssets = assets.filter(a => a.category === cat);
      stats[cat] = {
        count: catAssets.length,
        value: catAssets.reduce((s, a) => s + (Number(a.currentValue) || 0), 0)
      };
    }
    return stats;
  }, [assets]);

  // Overall totals
  const totalAssetsValue = categoryStats.All?.value || 0;
  const totalInvested = assets.reduce((s, a) => s + (Number(a.investedValue) || 0), 0);
  const totalPnL = totalAssetsValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  // Filtered Assets
  const filteredAssets = assets.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesOwner = selectedOwner === 'All' || item.owner === selectedOwner;
    const matchesPerf = selectedPerf === 'All' ||
      (selectedPerf === 'gain' && item.gainLoss >= 0) ||
      (selectedPerf === 'loss' && item.gainLoss < 0);

    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.owner && item.owner.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.sector && item.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.source && item.source.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesOwner && matchesPerf && matchesSearch;
  });

  // Sorted Assets
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal - bVal) : (bVal - aVal);
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Asset Value</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5">{formatINR(totalAssetsValue)}</div>
          <span className="text-[11px] text-slate-500">{assets.length} total holdings</span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Capital Invested</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-700 mt-0.5">{formatINR(totalInvested)}</div>
          <span className="text-[11px] text-slate-400">Ledger cost basis</span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Net Unrealised P&L</span>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-0.5 ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(totalPnL)}
          </div>
          <span className={`text-[11px] font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatPercent(totalPnLPct)} net return
          </span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Active Filtered Assets</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-700 mt-0.5">{sortedAssets.length}</div>
          <span className="text-[11px] text-indigo-600 font-medium">Matching view</span>
        </div>
      </div>

      {/* Category Pills Bar (Clear, visible and distinct) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map(cat => {
          const stat = categoryStats[cat] || { count: 0, value: 0 };
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>{cat}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {stat.count}
              </span>
              <span className={`font-mono text-[11px] ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                ({(stat.value / 100000).toFixed(1)}L)
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Multifactor Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by asset name, ticker, sector, source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-xs"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Owner Filter (If in family mode) */}
          {scope === 'family' && (
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Members</option>
              <option value="Aarav Sharma">Aarav Sharma (Me)</option>
              <option value="Father">Father (Rajesh)</option>
              <option value="Mother">Mother (Sunita)</option>
            </select>
          )}

          {/* Performance Filter */}
          <select
            value={selectedPerf}
            onChange={(e) => setSelectedPerf(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Performance</option>
            <option value="gain">Profitable (+Gain)</option>
            <option value="loss">Drawdown (-Loss)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="currentValue">Sort: Highest Value</option>
            <option value="gainLoss">Sort: Gain / Loss (₹)</option>
            <option value="gainLossPercent">Sort: Gain / Loss (%)</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>

          {/* Grid vs Table View Switch */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CARD GRID VIEW (Clean, modern, clear cards!) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAssets.map(asset => {
            const isGain = asset.gainLoss >= 0;
            const pctOfTotal = asset.percentOfTotal || 0;

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-3 cursor-pointer group"
              >
                {/* Card Top: Category, Owner, Ticker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {asset.category}
                    </span>
                    {asset.sector && (
                      <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {asset.sector}
                      </span>
                    )}
                    {scope === 'family' && asset.owner && (
                      <span className="text-slate-500 font-medium">
                        {asset.owner.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                      {asset.name}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">{asset.source}</div>
                  </div>
                </div>

                {/* Values & P&L */}
                <div className="pt-2 border-t border-slate-50">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Value</span>
                      <span className="text-lg font-black font-mono text-slate-900">{formatINR(asset.currentValue)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Unrealised Gain</span>
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                        isGain ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatINR(asset.gainLoss)} ({formatPercent(asset.gainLossPercent)})
                      </span>
                    </div>
                  </div>

                  {/* Allocation % Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Share of Portfolio</span>
                      <span className="font-mono font-bold text-slate-700">{pctOfTotal.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, pctOfTotal)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Mutual Fund Look-Through Preview */}
                {asset.fundKey && (
                  <div className="bg-cyan-50/60 p-2.5 rounded-xl border border-cyan-100 text-[11px] text-cyan-950 space-y-1">
                    <div className="flex items-center gap-1 font-semibold text-cyan-900">
                      <Layers className="w-3 h-3 text-cyan-700" />
                      <span>Look-Through Dissection Active</span>
                    </div>
                    <div className="text-[10px] text-cyan-800 leading-snug">
                      Top holdings in Infosys, HDFC Bank, Reliance, Tata Motors dissected into your aggregate exposure.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Asset Name</th>
                  {scope === 'family' && <th className="py-3 px-4">Owner</th>}
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current Value</th>
                  <th className="py-3 px-4 text-right">Invested Value</th>
                  <th className="py-3 px-4 text-right">Gain / Loss</th>
                  <th className="py-3 px-4 text-right">% of Wealth</th>
                  <th className="py-3 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAssets.map(asset => {
                  const isGain = asset.gainLoss >= 0;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-indigo-600">
                        {asset.name}
                      </td>
                      {scope === 'family' && <td className="py-3 px-4 text-slate-600">{asset.owner}</td>}
                      <td className="py-3 px-4 text-slate-600">{asset.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatINR(asset.currentValue)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatINR(asset.investedValue)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-semibold ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatINR(asset.gainLoss)} ({formatPercent(asset.gainLossPercent)})
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{(asset.percentOfTotal || 0).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-slate-500">{asset.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sortedAssets.length === 0 && (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
          No assets match the selected category and filter parameters.
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}
    </div>
  );
}
