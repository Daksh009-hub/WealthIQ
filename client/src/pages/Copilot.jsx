// pages/Copilot.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ShieldCheck,
  Bot,
  User,
  AlertTriangle,
  Lightbulb,
  FileText,
  RotateCcw,
  Key,
  ExternalLink
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { VerificationBadge } from '../components/Badge';
import { ApiKeyModal } from '../components/ApiKeyModal';

export function Copilot() {
  const { portfolio, scope, isAiLoading, setIsAiLoading, showToast } = usePortfolio();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ isConfigured: false });

  useEffect(() => {
    fetch('/api/config/key')
      .then(r => r.json())
      .then(d => {
        if (d.success) setKeyStatus({ isConfigured: d.isConfigured, maskedKey: d.maskedKey });
      })
      .catch(e => console.error(e));
  }, []);

  const SUGGESTED_CHIPS = [
    "Where am I over-invested and what should I review?",
    "What is the status of my Tata Motors holding post-sync?",
    "How does my real estate and property allocation look?",
    "Is my gold allocation sufficient as an inflation hedge?",
    "What does consolidated family wealth show for Father and Mother?",
    "What is the biggest risk in my portfolio right now?",
    "How does live news about interest rates affect HDFC Bank?"
  ];

  const [messages, setMessages] = useState([
    {
      id: 'init_welcome',
      role: 'assistant',
      text: `Hello! I am your Gemini Wealth Copilot. I analyze your verified financial portfolio across direct equities, mutual fund look-throughs, physical assets, and live news.

Ask me about your holdings in Tata Motors, Infosys, Real Estate, Gold, family aggregation, or market sensitivity!`,
      sections: {
        fact: "All figures are computed deterministically from your verified portfolio ledger.",
        analysis: "Direct stocks and underlying mutual fund holdings are aggregated to detect hidden overlaps.",
        potentialRisk: "Market drawdowns, sector covariance, and real-world illiquidity factors are evaluated.",
        suggestion: "Use the prompt chips below or type any custom financial question."
      },
      verification: {
        level1: { verified: true, label: "Verified against portfolio data" },
        level2: { verified: false, label: "Verification unavailable" }
      }
    }
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  const handleSendMessage = async (textToSend) => {
    const q = textToSend || inputQuestion;
    if (!q.trim()) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: q
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          scope,
          history: messages.slice(-4).map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await res.json();

      if (data.success) {
        const assistantMsg = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text: data.answer,
          sections: data.sections,
          verification: data.verification,
          isFallback: data.isFallback,
          note: data.note
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        showToast(data.note || 'AI analysis error', 'error');
      }
    } catch (err) {
      console.error('Error in Copilot chat:', err);
      showToast('Failed to connect to Copilot service', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([messages[0]]);
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900">Gemini Wealth Copilot</h1>
              {keyStatus.isConfigured ? (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Gemini Cloud ({keyStatus.maskedKey})
                </span>
              ) : (
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-2.5 h-2.5 text-indigo-600" />
                  <span>Connect Cloud API Key</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Contextual financial reasoning with FACT, ANALYSIS, RISK, and SUGGESTION framework.
            </p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 self-start sm:self-auto px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Chat</span>
        </button>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3 text-amber-500" />
          <span>Ask Copilot about any asset, risk, or market event</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              disabled={isAiLoading}
              className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200 rounded-xl text-xs font-medium transition-all text-left disabled:opacity-50 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 sm:p-6 min-h-[440px] flex flex-col justify-between space-y-4">
        <div className="space-y-5 overflow-y-auto max-h-[580px] pr-2">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end items-start gap-2.5 pl-10">
                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl rounded-tr-xs text-xs font-medium shadow-xs max-w-lg leading-relaxed">
                    {msg.text}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              );
            }

            const sec = msg.sections;

            return (
              <div key={msg.id} className="flex items-start gap-3 pr-4 sm:pr-8">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>

                <div className="flex-1 space-y-2.5">
                  {/* Verification Badges */}
                  {msg.verification && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <VerificationBadge
                        level={1}
                        verified={msg.verification.level1?.verified}
                        label={msg.verification.level1?.label}
                      />
                      {msg.verification.level2?.verified && (
                        <VerificationBadge
                          level={2}
                          verified={true}
                          count={1}
                          label={msg.verification.level2?.label}
                        />
                      )}
                    </div>
                  )}

                  {/* 4 Labelled Sections */}
                  {sec ? (
                    <div className="space-y-2 text-xs">
                      {/* FACT */}
                      {sec.fact && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] tracking-wider">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="uppercase text-indigo-700">FACT</span>
                          </div>
                          <p className="text-slate-800 leading-relaxed font-mono text-[11px]">
                            {sec.fact}
                          </p>
                        </div>
                      )}

                      {/* ANALYSIS */}
                      {sec.analysis && (
                        <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-[11px] tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="uppercase text-indigo-700">ANALYSIS</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">
                            {sec.analysis}
                          </p>
                        </div>
                      )}

                      {/* POTENTIAL RISK */}
                      {sec.potentialRisk && (
                        <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-200/80 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px] tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span className="uppercase text-amber-700">POTENTIAL RISK</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">
                            {sec.potentialRisk}
                          </p>
                        </div>
                      )}

                      {/* SUGGESTION */}
                      {sec.suggestion && (
                        <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/80 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px] tracking-wider">
                            <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="uppercase text-emerald-700">SUGGESTION (EDUCATIONAL)</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">
                            {sec.suggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isAiLoading && (
            <div className="flex items-start gap-3 pr-8 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-200" />
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500">
                Cross-referencing verified ledger figures, look-through weights, and live market data...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about Tata Motors, Infosys, Real Estate, Gold, Family, or Risks..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isAiLoading}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAiLoading || !inputQuestion.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
    </div>
  );
}
