// components/SyncButton.jsx
import React from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatDateTime } from '../utils/formatters';

export function SyncButton() {
  const { triggerSync, isSyncing, lastSyncTime } = usePortfolio();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={triggerSync}
        disabled={isSyncing}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-200 disabled:opacity-60 cursor-pointer"
        title="Simulate broker data refresh"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Syncing...' : 'Sync Portfolio'}</span>
      </button>
      {lastSyncTime && (
        <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-slate-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Synced: {formatDateTime(lastSyncTime)}</span>
        </span>
      )}
    </div>
  );
}
