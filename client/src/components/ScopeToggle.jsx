// components/ScopeToggle.jsx
import React from 'react';
import { User, Users } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

export function ScopeToggle() {
  const { scope, setScope } = usePortfolio();

  return (
    <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200/80 rounded-xl shadow-xs">
      <button
        onClick={() => setScope('me')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
          scope === 'me'
            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <User className="w-3.5 h-3.5" />
        <span>MY PORTFOLIO</span>
      </button>

      <button
        onClick={() => setScope('family')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
          scope === 'family'
            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        <span>FAMILY PORTFOLIO</span>
      </button>
    </div>
  );
}
