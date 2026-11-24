// components/ApiKeyModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle2, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

export function ApiKeyModal({ isOpen, onClose }) {
  const { showToast } = usePortfolio();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [status, setStatus] = useState({ isConfigured: false, maskedKey: null });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/config/key')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setStatus({ isConfigured: data.isConfigured, maskedKey: data.maskedKey });
            if (data.model) setModel(data.model);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/config/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), model })
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ isConfigured: true, maskedKey: data.maskedKey });
        setApiKey('');
        showToast('Gemini API Key connected successfully!', 'success');
        onClose();
      } else {
        showToast(data.error || 'Failed to save API key', 'error');
      }
    } catch (err) {
      showToast('Error connecting to backend', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gemini API Key Setup</h3>
              <p className="text-[11px] text-slate-500">Connect Google Gemini Cloud LLM</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status pill */}
        <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium">Status:</span>
            {status.isConfigured ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Live Gemini Connected ({status.maskedKey})
              </span>
            ) : (
              <span className="font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
                Intelligent Local Engine Active
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            WealthIQ works completely offline with its local contextual engine. Connecting your Gemini key upgrades Copilot to live multi-turn cloud inference and Google Search grounding.
          </p>
        </div>

        {/* Key Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Gemini API Key:
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gemini Model:
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Get key from Google AI Studio</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !apiKey.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Connecting...' : 'Connect Key'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
