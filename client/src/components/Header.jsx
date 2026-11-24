// components/Header.jsx
import React, { useState } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Database,
  Activity,
  Newspaper,
  MessageSquareText,
  Key
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { ScopeToggle } from './ScopeToggle';
import { SyncButton } from './SyncButton';
import { SandboxBadge } from './Badge';
import { ApiKeyModal } from './ApiKeyModal';

export function Header() {
  const { activeTab, setActiveTab } = usePortfolio();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assets', label: 'Asset Explorer', icon: Database },
    { id: 'health', label: 'Portfolio Health', icon: Activity, badge: 'Core' },
    { id: 'market', label: 'Live Market & News', icon: Newspaper, live: true },
    { id: 'copilot', label: 'Gemini Copilot', icon: MessageSquareText, ai: true }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top bar with Logo, Sandbox Badge, ScopeToggle, Key button, and Sync */}
          <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
            {/* Logo & Tagline */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-sm">
                W
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 tracking-tight text-base">
                    WEALTH<span className="text-indigo-600">IQ</span>
                  </span>
                  <SandboxBadge />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Your wealth. One intelligent view.</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors cursor-pointer"
                title="Configure Gemini Cloud API Key"
              >
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Gemini Key</span>
              </button>

              <ScopeToggle />
              <SyncButton />
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-100 pt-1 -mb-px">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 text-indigo-700 font-bold">
                      {item.badge}
                    </span>
                  )}
                  {item.live && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  {item.ai && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
    </>
  );
}
