// components/Badge.jsx
import React from 'react';
import { ShieldCheck, Globe, AlertCircle, Info, Sparkles } from 'lucide-react';

export function VerificationBadge({ level = 1, verified = true, label, count }) {
  if (level === 1) {
    if (verified) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label || 'Verified against portfolio data'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>{label || 'Verification unavailable'}</span>
      </span>
    );
  }

  // Level 2
  if (verified && count > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <Globe className="w-3.5 h-3.5 text-blue-600" />
        <span>Based on {count} current source{count > 1 ? 's' : ''}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
      <Info className="w-3.5 h-3.5 text-slate-500" />
      <span>{label || 'Verification unavailable'}</span>
    </span>
  );
}

export function SandboxBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-300 uppercase tracking-wider">
      Demo / Sandbox Data
    </span>
  );
}

export function RiskBadge({ level }) {
  if (level === 'High') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        ⚠️ High Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      ⚡ Moderate Risk
    </span>
  );
}
