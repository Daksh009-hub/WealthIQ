// context/PortfolioContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initialPortfolio, initialHealth, initialAssets, initialFamily } from '../data/fallbackData';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [scope, setScope] = useState('me'); // 'me' | 'family'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'assets' | 'health' | 'market' | 'copilot'
  
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [health, setHealth] = useState(initialHealth);
  const [family, setFamily] = useState(initialFamily);
  const [assets, setAssets] = useState(initialAssets);
  const [news, setNews] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
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
      const fetchJson = async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      };

      const [resPortfolio, resHealth, resAssets, resFamily] = await Promise.allSettled([
        fetchJson(`/api/portfolio?scope=${currentScope}`),
        fetchJson(`/api/portfolio/health?scope=${currentScope}`),
        fetchJson(`/api/assets?scope=${currentScope}`),
        fetchJson('/api/family')
      ]);

      if (resPortfolio.status === 'fulfilled' && resPortfolio.value?.success) {
        setPortfolio(resPortfolio.value);
        setLastSyncTime(resPortfolio.value.lastSyncTime);
      }
      if (resHealth.status === 'fulfilled' && resHealth.value?.success) {
        setHealth(resHealth.value);
      }
      if (resAssets.status === 'fulfilled' && resAssets.value?.success) {
        setAssets(resAssets.value.assets || []);
      }
      if (resFamily.status === 'fulfilled' && resFamily.value?.success) {
        setFamily(resFamily.value);
      }
    } catch (err) {
      console.warn('Backend sync note (using cached initial state):', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

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
