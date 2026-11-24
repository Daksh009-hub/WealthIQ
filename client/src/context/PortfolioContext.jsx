// context/PortfolioContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [scope, setScope] = useState('me'); // 'me' | 'family'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'assets' | 'health' | 'market' | 'copilot'
  
  const [portfolio, setPortfolio] = useState(null);
  const [health, setHealth] = useState(null);
  const [family, setFamily] = useState(null);
  const [assets, setAssets] = useState([]);
  const [news, setNews] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(prev => (prev?.id ? null : prev));
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Fetch all core data for current scope
  const fetchData = useCallback(async (currentScope = scope) => {
    try {
      setIsLoading(true);
      const [resPortfolio, resHealth, resAssets, resFamily] = await Promise.all([
        fetch(`/api/portfolio?scope=${currentScope}`).then(r => r.json()),
        fetch(`/api/portfolio/health?scope=${currentScope}`).then(r => r.json()),
        fetch(`/api/assets?scope=${currentScope}`).then(r => r.json()),
        fetch('/api/family').then(r => r.json())
      ]);

      if (resPortfolio.success) {
        setPortfolio(resPortfolio);
        setLastSyncTime(resPortfolio.lastSyncTime);
      }
      if (resHealth.success) {
        setHealth(resHealth);
      }
      if (resAssets.success) {
        setAssets(resAssets.assets || []);
      }
      if (resFamily.success) {
        setFamily(resFamily);
      }
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
      showToast('Error connecting to backend services', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [scope, showToast]);

  // Fetch news data
  const fetchNews = useCallback(async (currentScope = scope) => {
    try {
      const res = await fetch(`/api/news?scope=${currentScope}`);
      const data = await res.json();
      if (data.success) {
        setNews(data.news || []);
      }
      return data;
    } catch (err) {
      console.error('Failed to load market news:', err);
    }
  }, [scope]);

  // Initial load
  useEffect(() => {
    fetchData(scope);
  }, [scope, fetchData]);

  // Trigger sync
  const triggerSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      });
      const data = await res.json();

      if (data.success) {
        setLastSyncTime(data.lastSyncTime);
        showToast(data.message, 'success', 6000);
        // Refresh all data
        await fetchData(scope);
        // Also refresh news if available
        fetchNews(scope);
      } else {
        showToast(data.error || 'Sync simulation failed', 'error');
      }
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Failed to execute sync simulation', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Family Member Consent
  const toggleMemberConsent = async (memberId) => {
    try {
      const res = await fetch('/api/family/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Member consent status updated', 'info', 3000);
        await fetchData(scope);
      }
    } catch (err) {
      console.error('Consent update error:', err);
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        scope,
        setScope,
        activeTab,
        setActiveTab,
        portfolio,
        health,
        family,
        assets,
        news,
        setNews,
        lastSyncTime,
        isLoading,
        isSyncing,
        isAiLoading,
        setIsAiLoading,
        toast,
        showToast,
        hideToast,
        triggerSync,
        toggleMemberConsent,
        fetchData,
        fetchNews
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
