// App.jsx
import React from 'react';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { Overview } from './pages/Overview';
import { Assets } from './pages/Assets';
import { Health } from './pages/Health';
import { Market } from './pages/Market';
import { Copilot } from './pages/Copilot';

function AppContent() {
  const { activeTab } = usePortfolio();

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'assets' && <Assets />}
        {activeTab === 'health' && <Health />}
        {activeTab === 'market' && <Market />}
        {activeTab === 'copilot' && <Copilot />}
      </main>

      <footer className="bg-white border-t border-slate-200/80 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 space-y-1.5">
          <p className="font-medium text-slate-700">
            WEALTHIQ — Your wealth. One intelligent view.
          </p>
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto">
            Disclaimer: Educational insights only, not financial advice. No returns guaranteed. All financial data is mock/sandbox. Family data is shown only for members with granted consent.
          </p>
        </div>
      </footer>

      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}
