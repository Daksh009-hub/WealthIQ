import React, { useState, useEffect, useCallback } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chaos'); // 'chaos' | 'shop' | 'staff' | 'attention'
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [invariants, setInvariants] = useState({ ok: true, invariants: [] });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [attentionItems, setAttentionItems] = useState([]);
  const [chaosConfig, setChaosConfig] = useState({ delayMsMin: 200, delayMsMax: 500, duplicateCount: 1, dropProbability: 0 });
  const [loading, setLoading] = useState(false);
  const [runningScenario, setRunningScenario] = useState(null);
  const [scenarioResults, setScenarioResults] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Cart state for Shop
  const [cart, setCart] = useState([]);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [cartTtlRemaining, setCartTtlRemaining] = useState(null);

  // Fetch core data
  const fetchData = useCallback(async () => {
    try {
      const [invRes, storesRes, invReportRes, ordersRes, attRes, chaosRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/stores'),
        fetch('/api/invariants'),
        fetch('/api/orders?limit=25'),
        fetch('/api/staff/attention'),
        fetch('/api/chaos/config')
      ]);

      if (invRes.ok) setInventory(await invRes.json());
      if (storesRes.ok) setStores(await storesRes.json());
      if (invReportRes.ok) setInvariants(await invReportRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (attRes.ok) setAttentionItems(await attRes.json());
      if (chaosRes.ok) setChaosConfig(await chaosRes.json());

      if (selectedOrder) {
        const orderRes = await fetch(`/api/orders/${selectedOrder.id}`);
        if (orderRes.ok) setSelectedOrder(await orderRes.json());
      }

      setLastUpdated(new Date().toLocaleTimeString());
      setErrorMsg(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setErrorMsg('Failed to connect to API backend. Ensure API is running on port 4000.');
    }
  }, [selectedOrder]);

  useEffect(() => {
    fetchData();
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(fetchData, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchData]);

  // Cart TTL countdown timer
  useEffect(() => {
    if (!checkoutOrder) {
      setCartTtlRemaining(null);
      return;
    }
    const timer = setInterval(() => {
      // Find earliest reservation expiry from items
      let earliest = null;
      checkoutOrder.subOrders?.forEach(s => {
        s.items?.forEach(i => {
          if (i.reservation_expires_at) {
            const exp = new Date(i.reservation_expires_at).getTime();
            if (!earliest || exp < earliest) earliest = exp;
          }
        });
      });

      if (earliest) {
        const diffSecs = Math.max(0, Math.floor((earliest - Date.now()) / 1000));
        setCartTtlRemaining(diffSecs);
        if (diffSecs === 0) {
          fetchData();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutOrder, fetchData]);

  // Run Scenario
  const handleRunScenario = async (scenarioName) => {
    setRunningScenario(scenarioName);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/chaos/scenarios/${scenarioName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoReset: true })
      });
      const data = await res.json();
      setScenarioResults(prev => ({ ...prev, [data.scenarioId || scenarioName]: data }));
      setSuccessMsg(`Scenario ${data.name || scenarioName} finished (${data.passed ? 'PASSED' : 'FAILED'}).`);
      await fetchData();
    } catch (err) {
      setErrorMsg(`Error running scenario ${scenarioName}: ${err.message}`);
    } finally {
      setRunningScenario(null);
    }
  };

  // Reset database
  const handleResetDb = async () => {
    if (!confirm('Reset database and payment simulator to initial seed?')) return;
    setLoading(true);
    try {
      await fetch('/api/admin/reset', { method: 'POST' });
      setScenarioResults({});
      setSelectedOrder(null);
      setCheckoutOrder(null);
      setCart([]);
      setSuccessMsg('Database and simulator reset successfully.');
      await fetchData();
    } catch (err) {
      setErrorMsg('Failed to reset DB: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle store status
  const handleToggleStore = async (storeId, currentStatus) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'DOWN' : 'AVAILABLE';
    try {
      await fetch(`/api/stores/${storeId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchData();
    } catch (err) {
      setErrorMsg('Error toggling store status: ' + err.message);
    }
  };

  // Update chaos config
  const handleUpdateChaos = async (updates) => {
    try {
      const res = await fetch('/api/chaos/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) setChaosConfig(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Cart operations
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.storeId === item.store_id && i.sku === item.sku);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        storeId: item.store_id,
        storeName: item.store_name,
        sku: item.sku,
        productName: item.product_name,
        unitPricePaise: item.price_paise,
        qty: 1
      }];
    });
  };

  const removeFromCart = (storeId, sku) => {
    setCart(prev => prev.filter(i => !(i.storeId === storeId && i.sku === sku)));
  };

  // Checkout cart
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `cart_${Date.now()}`
        },
        body: JSON.stringify({
          items: cart.map(c => ({ storeId: c.storeId, sku: c.sku, qty: c.qty })),
          customerName: 'Daksh (Online Buyer)',
          ttlSeconds: 60
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Checkout failed');

      setCheckoutOrder(data);
      setCart([]);
      setSelectedOrder(data);
      setSuccessMsg(`Order ${data.id} created with active reservations!`);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pay order via simulator
  const handlePayOrder = async (orderId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setSuccessMsg(`Payment initiated (ID: ${data.paymentId}). Awaiting webhook capture...`);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sub-order ops
  const handleSubOrderAction = async (subOrderId, action) => {
    try {
      const res = await fetch(`/api/sub-orders/${subOrderId}/${action}`, {
        method: 'POST',
        headers: { 'x-role': 'store', 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Action ${action} failed`);
      setSelectedOrder(data);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    if (!confirm('Cancel this entire order?')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');
      setSelectedOrder(data);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // View order detail
  const handleSelectOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        setSelectedOrder(await res.json());
        setActiveTab('staff');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Retry refund
  const handleRetryRefund = async (subOrderId) => {
    try {
      const res = await fetch(`/api/staff/refunds/${subOrderId}/retry`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Refund request dispatched to gateway.');
        fetchData();
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Navbar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1e293b',
        paddingBottom: 18,
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            width: 44,
            height: 44,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 22,
            color: '#fff',
            boxShadow: '0 0 20px rgba(6,182,212,0.4)'
          }}>
            B
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Bussin</h1>
              <span style={{
                background: '#1e293b',
                color: '#38bdf8',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                fontWeight: 600,
                border: '1px solid #334155'
              }}>
                PS04 FINTECH
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              &ldquo;Orders so reliable, it&rsquo;s bussin.&rdquo; &middot; Multi-Store Invariant Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: 6, background: '#0f172a', padding: 4, borderRadius: 8, border: '1px solid #1e293b' }}>
          {[
            { id: 'chaos', label: '⚡ Vibe Check (Chaos Lab)' },
            { id: 'shop', label: '🛒 Customer Shop' },
            { id: 'staff', label: '📋 Staff Console' },
            { id: 'attention', label: `⚠️ Needs Attention (${attentionItems.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? '#1e293b' : 'transparent',
                color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                border: activeTab === tab.id ? '1px solid #334155' : '1px solid transparent',
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600
              }}>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Global Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? '#064e3b' : '#1e293b',
              color: autoRefresh ? '#34d399' : '#94a3b8',
              border: `1px solid ${autoRefresh ? '#059669' : '#334155'}`,
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600
            }}>
            {autoRefresh ? '● Polling (1.5s)' : '○ Paused'}
          </button>

          <button
            onClick={fetchData}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600
            }}>
            ↻ Refresh
          </button>

          <button
            onClick={handleResetDb}
            disabled={loading || runningScenario}
            style={{
              background: '#881337',
              color: '#fda4af',
              border: '1px solid #be123c',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600
            }}>
            Reset DB
          </button>
        </div>
      </header>

      {/* Alert Banners */}
      {errorMsg && (
        <div style={{
          background: '#450a0a',
          border: '1px solid #991b1b',
          color: '#fca5a5',
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          background: '#064e3b',
          border: '1px solid #059669',
          color: '#86efac',
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Invariants Scoreboard (Persistent Top Bar) */}
      <section style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Invariant Panel
            </h2>
            <span style={{
              background: invariants.ok ? '#064e3b' : '#7f1d1d',
              color: invariants.ok ? '#4ade80' : '#f87171',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700
            }}>
              {invariants.ok ? 'ALL 6 INVARIANTS GREEN ✓' : 'INVARIANT VIOLATION DETECTED ✗'}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Continuous Mathematical Verification of Money & Stock
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10
        }}>
          {invariants.invariants && invariants.invariants.map(inv => (
            <div key={inv.id} style={{
              background: inv.ok ? '#061a1a' : '#260d14',
              border: `1px solid ${inv.ok ? '#134e4a' : '#881337'}`,
              borderRadius: 8,
              padding: '10px 12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="font-mono" style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: inv.ok ? '#2dd4bf' : '#fb7185'
                }}>
                  {inv.id}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: inv.ok ? '#34d399' : '#f43f5e'
                }}>
                  {inv.ok ? 'PASS ✓' : 'FAIL ✗'}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                {inv.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                {inv.details}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VIEW 1: CHAOS LAB / VIBE CHECK */}
      {activeTab === 'chaos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Left Column: Failure Injection Scenarios */}
          <div>
            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Vibe Check (Chaos Scenarios)</h3>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>
                    Reproducible failure injection test harnesses with real-time verification
                  </p>
                </div>
              </div>

              {/* Scenario Action Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* S1 Card */}
                <div style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#312e81', color: '#c7d2fe', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        S1 (P0)
                      </span>
                      <strong style={{ fontSize: 14 }}>Flash Sale Concurrency</strong>
                    </div>
                    {scenarioResults['S1'] && (
                      <span style={{
                        background: scenarioResults['S1'].passed ? '#064e3b' : '#7f1d1d',
                        color: scenarioResults['S1'].passed ? '#4ade80' : '#f87171',
                        fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                      }}>
                        {scenarioResults['S1'].passed ? 'PASS ✓' : 'FAIL ✗'} ({scenarioResults['S1'].durationMs}ms)
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    50 concurrent buyers each order 1 unit of scarce sku-flash (stock: 10). Exactly 10 succeed, 40 get OUT_OF_STOCK, 0 overselling.
                  </p>
                  <button
                    onClick={() => handleRunScenario('flash-sale')}
                    disabled={runningScenario !== null}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                      color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700
                    }}>
                    {runningScenario === 'flash-sale' ? 'Running 50 Checkouts...' : '⚡ Run S1 Flash Sale'}
                  </button>
                </div>

                {/* S2 Card */}
                <div style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#312e81', color: '#c7d2fe', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        S2 (P0)
                      </span>
                      <strong style={{ fontSize: 14 }}>Abandoned Reservations & TTL Sweeper</strong>
                    </div>
                    {scenarioResults['S2'] && (
                      <span style={{
                        background: scenarioResults['S2'].passed ? '#064e3b' : '#7f1d1d',
                        color: scenarioResults['S2'].passed ? '#4ade80' : '#f87171',
                        fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                      }}>
                        {scenarioResults['S2'].passed ? 'PASS ✓' : 'FAIL ✗'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    5 reservations created with 10s TTL. Nobody pays. Sweeper releases inventory exactly once and cancels orders.
                  </p>
                  <button
                    onClick={() => handleRunScenario('abandoned')}
                    disabled={runningScenario !== null}
                    style={{
                      background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700
                    }}>
                    {runningScenario === 'abandoned' ? 'Waiting for TTL Expiry...' : '⏱ Run S2 Abandoned Sweeper'}
                  </button>
                </div>

                {/* S3 Card */}
                <div style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#312e81', color: '#c7d2fe', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        S3 (P0)
                      </span>
                      <strong style={{ fontSize: 14 }}>Duplicate Webhooks (Idempotent Ledger)</strong>
                    </div>
                    {scenarioResults['S3'] && (
                      <span style={{
                        background: scenarioResults['S3'].passed ? '#064e3b' : '#7f1d1d',
                        color: scenarioResults['S3'].passed ? '#4ade80' : '#f87171',
                        fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                      }}>
                        {scenarioResults['S3'].passed ? 'PASS ✓' : 'FAIL ✗'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    Payment captured webhook is re-sent 5 times. Exactly 1 CHARGE is recorded in ledger, 4 duplicates logged in timeline.
                  </p>
                  <button
                    onClick={() => handleRunScenario('duplicate-webhooks')}
                    disabled={runningScenario !== null}
                    style={{
                      background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700
                    }}>
                    {runningScenario === 'duplicate-webhooks' ? 'Testing Duplicates...' : '🔁 Run S3 Duplicate Webhooks'}
                  </button>
                </div>

                {/* S4 Card */}
                <div style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#312e81', color: '#c7d2fe', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        S4 (P1)
                      </span>
                      <strong style={{ fontSize: 14 }}>Store Failure Mid-Order</strong>
                    </div>
                    {scenarioResults['S4'] && (
                      <span style={{
                        background: scenarioResults['S4'].passed ? '#064e3b' : '#7f1d1d',
                        color: scenarioResults['S4'].passed ? '#4ade80' : '#f87171',
                        fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                      }}>
                        {scenarioResults['S4'].passed ? 'PASS ✓' : 'FAIL ✗'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    3-store split order is paid. Store A dispatches, Store B accepts, Store C crashes. Store C part is cancelled and refunded; Store A dispatched part is preserved; Store B continues.
                  </p>
                  <button
                    onClick={() => handleRunScenario('store-failure')}
                    disabled={runningScenario !== null}
                    style={{
                      background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700
                    }}>
                    {runningScenario === 'store-failure' ? 'Injecting Mid-Order Failure...' : '💥 Run S4 Store Failure'}
                  </button>
                </div>
              </div>
            </div>

            {/* Gateway Chaos Sliders */}
            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 20
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                Payment Gateway Chaos Controls
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Webhook Delay: {chaosConfig.delayMsMin}ms – {chaosConfig.delayMsMax}ms
                  </label>
                  <input
                    type="range" min="100" max="3000" step="100"
                    value={chaosConfig.delayMsMax}
                    onChange={(e) => handleUpdateChaos({ delayMsMax: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Duplicate Webhooks: {chaosConfig.duplicateCount}x
                  </label>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={chaosConfig.duplicateCount}
                    onChange={(e) => handleUpdateChaos({ duplicateCount: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Drop Probability (Reconciler Test): {Math.round(chaosConfig.dropProbability * 100)}%
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={chaosConfig.dropProbability}
                    onChange={(e) => handleUpdateChaos({ dropProbability: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Store Inventory & Health */}
          <div>
            {/* Store Health & Outage Injection */}
            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                Store Health & Failure Injection (R4)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stores.map(store => (
                  <div key={store.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#090d16',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #1e293b'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{store.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }} className="font-mono">{store.id}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: store.status === 'AVAILABLE' ? '#064e3b' : '#7f1d1d',
                        color: store.status === 'AVAILABLE' ? '#34d399' : '#f87171'
                      }}>
                        {store.status}
                      </span>
                      <button
                        onClick={() => handleToggleStore(store.id, store.status)}
                        style={{
                          background: store.status === 'AVAILABLE' ? '#450a0a' : '#064e3b',
                          color: store.status === 'AVAILABLE' ? '#fca5a5' : '#86efac',
                          border: `1px solid ${store.status === 'AVAILABLE' ? '#991b1b' : '#059669'}`,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                        {store.status === 'AVAILABLE' ? 'Inject Outage' : 'Restore Store'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Inventory Table */}
            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700 }}>
                  Live Multi-Store Inventory
                </h4>
                <span style={{ fontSize: 11, color: '#38bdf8' }} className="font-mono">
                  {inventory.length} Stock Records
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '6px 8px' }}>Store</th>
                      <th style={{ padding: '6px 8px' }}>Product</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Initial</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>On-Hand</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Reserved</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Avail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((row) => {
                      const isScarce = row.sku === 'sku-flash';
                      return (
                        <tr key={`${row.store_id}-${row.sku}`} style={{
                          borderBottom: '1px solid #1e293b',
                          background: isScarce ? 'rgba(6,182,212,0.06)' : 'transparent'
                        }}>
                          <td style={{ padding: '8px' }}>
                            <div style={{ fontWeight: 600 }}>{row.store_name}</div>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ fontWeight: isScarce ? 700 : 500, color: isScarce ? '#38bdf8' : '#f8fafc' }}>
                              {row.product_name}
                            </div>
                            <span className="font-mono" style={{ fontSize: 10, color: '#64748b' }}>{row.sku}</span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }} className="font-mono">{row.initial_stock}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }} className="font-mono">{row.on_hand}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span className="font-mono" style={{ fontWeight: 700, color: row.reserved > 0 ? '#fb7185' : '#94a3b8' }}>
                              {row.reserved}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                              background: row.available === 0 ? '#7f1d1d' : '#064e3b',
                              color: row.available === 0 ? '#fca5a5' : '#86efac'
                            }} className="font-mono">
                              {row.available}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SHOP (CUSTOMER STOREFRONT) */}
      {activeTab === 'shop' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          {/* Product Catalog Grouped by Store */}
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
              Multi-Store Marketplace Catalog
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {stores.map(store => {
                const storeItems = inventory.filter(i => i.store_id === store.id);
                const isDown = store.status === 'DOWN';
                return (
                  <div key={store.id} style={{
                    background: '#0f172a',
                    border: `1px solid ${isDown ? '#991b1b' : '#1e293b'}`,
                    borderRadius: 12,
                    padding: 16,
                    opacity: isDown ? 0.7 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <strong style={{ fontSize: 16 }}>{store.name}</strong>
                        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }} className="font-mono">{store.id}</span>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: isDown ? '#7f1d1d' : '#064e3b', color: isDown ? '#fca5a5' : '#86efac'
                      }}>
                        {isDown ? 'STORE OFFLINE' : 'ACTIVE'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      {storeItems.map(item => (
                        <div key={item.sku} style={{
                          background: '#090d16',
                          border: '1px solid #1e293b',
                          borderRadius: 8,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                              {item.product_name}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }} className="font-mono">{item.sku}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginTop: 8 }}>
                              ₹{(item.price_paise / 100).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: 11, color: item.available > 0 ? '#34d399' : '#f43f5e', marginTop: 4 }}>
                              {item.available > 0 ? `${item.available} in stock` : 'Out of stock'}
                            </div>
                          </div>

                          <button
                            onClick={() => addToCart(item)}
                            disabled={item.available <= 0 || isDown}
                            style={{
                              marginTop: 10,
                              background: '#1e293b',
                              color: '#38bdf8',
                              border: '1px solid #334155',
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600
                            }}>
                            {isDown ? 'Store Offline' : item.available <= 0 ? 'Out of Stock' : '+ Add to Cart'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart & Checkout Panel */}
          <div>
            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 20
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
                Multi-Store Cart
              </h3>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
                  Your cart is empty. Add products from multiple stores above!
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {cart.map(c => (
                      <div key={`${c.storeId}-${c.sku}`} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#090d16', padding: '10px 12px', borderRadius: 8, border: '1px solid #1e293b'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.productName}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {c.storeName} &middot; ₹{(c.unitPricePaise / 100).toLocaleString('en-IN')} &times; {c.qty}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>
                            ₹{((c.unitPricePaise * c.qty) / 100).toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => removeFromCart(c.storeId, c.sku)}
                            style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: 14 }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginBottom: 16, fontSize: 12, color: '#94a3b8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Items Subtotal:</span>
                      <span className="font-mono">
                        ₹{(cart.reduce((a, b) => a + (b.unitPricePaise * b.qty), 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Shipping (₹40 per store):</span>
                      <span className="font-mono">
                        ₹{(([...new Set(cart.map(c => c.storeId))].length * 4000) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 8 }}>
                      <span>Total:</span>
                      <span className="font-mono" style={{ color: '#38bdf8' }}>
                        ₹{((cart.reduce((a, b) => a + (b.unitPricePaise * b.qty), 0) + ([...new Set(cart.map(c => c.storeId))].length * 4000)) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700
                    }}>
                    {loading ? 'Reserving Multi-Store Stock...' : 'Reserve & Checkout (Atomic Cart)'}
                  </button>
                </div>
              )}

              {/* Active Checkout & Payment Countdown */}
              {checkoutOrder && checkoutOrder.status === 'PENDING_PAYMENT' && (
                <div style={{
                  marginTop: 20,
                  background: '#090d16',
                  border: '1px solid #0284c7',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 14, color: '#38bdf8' }}>Reservation Active</strong>
                    {cartTtlRemaining !== null && (
                      <span style={{
                        background: cartTtlRemaining <= 15 ? '#7f1d1d' : '#0369a1',
                        color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700
                      }} className="font-mono">
                        ⏳ {cartTtlRemaining}s remaining
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    Your items across {checkoutOrder.subOrders?.length} store(s) are held in atomic database reservation.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handlePayOrder(checkoutOrder.id)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        background: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: 6, fontSize: 13, fontWeight: 700
                      }}>
                      💳 Pay via Gateway (₹{(checkoutOrder.total_paise / 100).toLocaleString('en-IN')})
                    </button>
                    <button
                      onClick={() => handleCancelOrder(checkoutOrder.id)}
                      style={{
                        background: '#1e293b', color: '#f43f5e', border: '1px solid #334155', padding: '10px', borderRadius: 6, fontSize: 12
                      }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: STAFF CONSOLE */}
      {activeTab === 'staff' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 24 }}>
          {/* Order List */}
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 12,
            padding: 20
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
              Orders Master List
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.length === 0 ? (
                <div style={{ padding: '20px 0', color: '#64748b', fontSize: 13, textAlign: 'center' }}>
                  No orders found. Create orders in Shop or run Chaos Scenarios!
                </div>
              ) : (
                orders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => handleSelectOrder(o.id)}
                    style={{
                      background: selectedOrder?.id === o.id ? '#1e293b' : '#090d16',
                      border: `1px solid ${selectedOrder?.id === o.id ? '#38bdf8' : '#1e293b'}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      cursor: 'pointer'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: 12, color: '#38bdf8' }}>
                        {o.id.slice(0, 13)}...
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: o.status === 'PAID' ? '#064e3b' : (o.status === 'CANCELLED' ? '#7f1d1d' : '#1e293b'),
                        color: o.status === 'PAID' ? '#86efac' : (o.status === 'CANCELLED' ? '#fca5a5' : '#94a3b8')
                      }}>
                        {o.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
                      <span>{o.customer_name} &middot; {o.sub_orders_count || 1} store(s)</span>
                      <strong style={{ color: '#f8fafc' }}>₹{(o.total_paise / 100).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Order Detail & Timeline */}
          <div>
            {selectedOrder ? (
              <div style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                      Order Detail: {selectedOrder.customer_name}
                    </h3>
                    <div className="font-mono" style={{ fontSize: 11, color: '#64748b' }}>
                      ID: {selectedOrder.id}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                      ₹{(selectedOrder.total_paise / 100).toLocaleString('en-IN')}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: selectedOrder.status === 'PAID' ? '#064e3b' : '#7f1d1d',
                      color: selectedOrder.status === 'PAID' ? '#86efac' : '#fca5a5'
                    }}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                {/* Sub-Orders Cards (Two-state chips per part) */}
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  Per-Store Sub-Orders & State Chips (R2)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {selectedOrder.subOrders?.map(sub => (
                    <div key={sub.id} style={{
                      background: '#090d16',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      padding: 14
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <strong>{sub.store_name}</strong>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }} className="font-mono">{sub.store_id}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Payment State Chip */}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: sub.payment_state === 'PAID' ? '#064e3b' : (sub.payment_state === 'REFUNDED' ? '#4c1d95' : '#1e293b'),
                            color: sub.payment_state === 'PAID' ? '#86efac' : (sub.payment_state === 'REFUNDED' ? '#c4b5fd' : '#fca5a5')
                          }}>
                            PAY: {sub.payment_state}
                          </span>
                          {/* Fulfilment State Chip */}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: sub.fulfilment_state === 'DELIVERED' ? '#064e3b' : (sub.fulfilment_state === 'DISPATCHED' ? '#0369a1' : '#1e293b'),
                            color: sub.fulfilment_state === 'DELIVERED' ? '#86efac' : (sub.fulfilment_state === 'DISPATCHED' ? '#7dd3fc' : '#cbd5e1')
                          }}>
                            FULFIL: {sub.fulfilment_state}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 10 }}>
                        {sub.items?.map(i => (
                          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span>{i.product_name} &times; {i.qty}</span>
                            <span className="font-mono" style={{ color: '#94a3b8' }}>
                              Status: {i.reservation_status}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Store Ops Buttons */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sub.fulfilment_state === 'PENDING' && sub.payment_state === 'PAID' && (
                          <button
                            onClick={() => handleSubOrderAction(sub.id, 'accept')}
                            style={{ background: '#0369a1', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            Accept
                          </button>
                        )}
                        {sub.fulfilment_state === 'ACCEPTED' && (
                          <button
                            onClick={() => handleSubOrderAction(sub.id, 'dispatch')}
                            style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            Dispatch (Fulfill Stock)
                          </button>
                        )}
                        {sub.fulfilment_state === 'DISPATCHED' && (
                          <button
                            onClick={() => handleSubOrderAction(sub.id, 'deliver')}
                            style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            Mark Delivered
                          </button>
                        )}
                        {['PENDING', 'ACCEPTED'].includes(sub.fulfilment_state) && (
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for cancelling sub-order:');
                              if (reason) handleSubOrderAction(sub.id, `cancel`);
                            }}
                            style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b', padding: '4px 10px', borderRadius: 4, fontSize: 11 }}>
                            Cancel Part
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vertical Timeline (R5) */}
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  Staff Event Timeline (Append-Only Audit Log)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {selectedOrder.timeline?.map(evt => (
                    <div key={evt.id} style={{
                      background: '#090d16',
                      borderLeft: '3px solid #38bdf8',
                      padding: '8px 12px',
                      borderRadius: '0 6px 6px 0',
                      fontSize: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <strong style={{ color: '#38bdf8' }}>{evt.event_type}</strong>
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                          {new Date(evt.ts).toLocaleTimeString()} &middot; {evt.actor}
                        </span>
                      </div>
                      <div style={{ color: '#e2e8f0' }}>{evt.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: '#0f172a', borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b' }}>
                Select an order from the left to view its per-part states and full audit timeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: NEEDS ATTENTION QUEUE */}
      {activeTab === 'attention' && (
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: 20
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
            Needs Attention & Refund Recovery Queue (R5)
          </h3>
          {attentionItems.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#34d399', fontSize: 14 }}>
              ✓ All sub-orders and refunds are healthy! Zero items need staff attention.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attentionItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#090d16', padding: '14px 16px', borderRadius: 8, border: '1px solid #b91c1c'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>Order: {item.order_id.slice(0, 8)}...</strong>
                      <span style={{ background: '#7f1d1d', color: '#fca5a5', fontSize: 11, padding: '1px 6px', borderRadius: 4 }}>
                        {item.refund_status || 'FLAGGED'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Customer: {item.customer_name} &middot; Store: {item.store_id} &middot; Amount: ₹{(item.total_paise / 100).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>
                      Reason: {item.refund_reason || item.attention_reason || 'Pending refund confirmation'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRetryRefund(item.id)}
                    style={{
                      background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700
                    }}>
                    Retry Refund
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
