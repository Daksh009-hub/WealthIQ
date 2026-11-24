// components/HealthRing.jsx
import React from 'react';

export function HealthRing({ score = 84, size = 110, strokeWidth = 9, showLabel = true, sublabel = 'Health Score' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = '#10b981'; // emerald
  let statusText = 'Strong';
  let bgColor = 'text-emerald-500';

  if (score < 60) {
    color = '#f43f5e'; // rose
    statusText = 'Action Needed';
    bgColor = 'text-rose-500';
  } else if (score < 75) {
    color = '#f59e0b'; // amber
    statusText = 'Moderate';
    bgColor = 'text-amber-500';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{score}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400">/ 100</span>
        </div>
      </div>

      {showLabel && (
        <div className="mt-1.5 text-center">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${score >= 75 ? 'bg-emerald-50 text-emerald-700' : score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
            {statusText}
          </span>
          {sublabel && <span className="block text-[11px] text-slate-500 mt-0.5">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
