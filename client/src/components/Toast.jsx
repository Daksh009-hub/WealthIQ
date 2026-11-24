// components/Toast.jsx
import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

export function Toast() {
  const { toast, hideToast } = usePortfolio();
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-slideUp">
      <div className={`p-4 rounded-xl shadow-xl border flex items-start gap-3 backdrop-blur-md ${
        isSuccess
          ? 'bg-slate-900/95 text-white border-slate-700'
          : isError
          ? 'bg-rose-900/95 text-white border-rose-700'
          : 'bg-indigo-950/95 text-white border-indigo-800'
      }`}>
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />}

        <div className="flex-1 text-xs">
          <div className="font-semibold mb-0.5">
            {isSuccess ? 'Sync Simulation Applied' : isError ? 'Notification' : 'Notice'}
          </div>
          <p className="text-slate-300 leading-relaxed">{toast.message}</p>
        </div>

        <button
          onClick={hideToast}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
