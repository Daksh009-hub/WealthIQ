// components/WhyPanel.jsx
import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Calculator, Database, Layers, ExternalLink } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export function WhyPanel({ dataUsed, formula, calculation, relevantHoldings, newsSource, explanation, title = 'WHY?' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1 px-2 rounded hover:bg-indigo-50"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>{isOpen ? 'Hide calculation details' : `${title} See calculation & evidence`}</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3 text-slate-700 animate-fadeIn">
          {/* Explanation */}
          {explanation && (
            <div>
              <span className="font-semibold text-slate-900 block mb-0.5">Plain-Language Reasoning:</span>
              <p className="text-slate-600 leading-relaxed">{explanation}</p>
            </div>
          )}

          {/* Formula & Calculation */}
          {(formula || calculation) && (
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
              {formula && (
                <div className="flex items-start gap-1.5 text-indigo-700">
                  <Calculator className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 font-sans font-medium">Formula: </span>
                    <span className="font-semibold">{formula}</span>
                  </div>
                </div>
              )}
              {calculation && (
                <div className="flex items-start gap-1.5 text-slate-800">
                  <div className="w-3.5 h-3.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 font-sans font-medium">Execution: </span>
                    <span>{calculation}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Used */}
          {dataUsed && (
            <div>
              <div className="flex items-center gap-1 font-semibold text-slate-900 mb-1">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Portfolio Data Inputs:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                {Object.entries(dataUsed).map(([key, val]) => {
                  if (typeof val === 'object' && val !== null) return null;
                  return (
                    <div key={key} className="truncate">
                      <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                      <span className="font-semibold text-slate-800">
                        {typeof val === 'number' && val > 1000 ? formatINR(val) : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Relevant Holdings Breakdown */}
          {relevantHoldings && relevantHoldings.length > 0 && (
            <div>
              <div className="flex items-center gap-1 font-semibold text-slate-900 mb-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Underlying Holding Routes:</span>
              </div>
              <ul className="space-y-1">
                {relevantHoldings.map((h, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded border border-slate-200 text-[11px]">
                    <span className="text-slate-700 font-medium">{h.source || h.name} {h.owner ? `(${h.owner})` : ''}</span>
                    <span className="font-semibold text-slate-900">{formatINR(h.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* News Source Citation */}
          {newsSource && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
              <span className="text-slate-500">Source: <span className="font-medium text-slate-800">{newsSource.name || 'Financial Intelligence'}</span></span>
              {newsSource.url && (
                <a
                  href={newsSource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  View article <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
