// components/AllocationChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '../utils/formatters';

const CATEGORY_COLORS = {
  'Stocks': '#6366f1', // Indigo
  'Mutual Funds': '#06b6d4', // Cyan
  'Insurance': '#10b981', // Emerald
  'Gold': '#f59e0b', // Amber
  'Property': '#8b5cf6', // Violet
  'Vehicles': '#ec4899', // Pink
  'Cash/Deposits': '#3b82f6' // Blue
};

export function AllocationChart({ categories = [], totalAssets = 0 }) {
  const data = categories
    .filter(c => c.value > 0)
    .map(c => ({
      name: c.category,
      value: c.value,
      percent: c.percent,
      color: CATEGORY_COLORS[c.category] || '#94a3b8'
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg text-xs border border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-semibold">{item.name}</span>
          </div>
          <div className="font-mono text-sm">{formatINR(item.value)}</div>
          <div className="text-slate-300 text-[11px] mt-0.5">{item.percent.toFixed(1)}% of total wealth</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      {/* Donut Chart */}
      <div className="relative w-56 h-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={65}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Assets</span>
          <span className="text-base font-bold text-slate-900 font-mono">{formatINR(totalAssets)}</span>
          <span className="text-[10px] text-slate-500">{data.length} categories</span>
        </div>
      </div>

      {/* Category List / Legend */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {data.map((cat, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: cat.color }} />
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-800 block truncate">{cat.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">{formatINR(cat.value)}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
              {cat.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
