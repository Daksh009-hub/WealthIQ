import React, { useState, useEffect, useCallback } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chaos'); // 'chaos' | 'inventory' | 'orders'
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [invariants, setInvariants] = useState({ ok: true, invariants: [] });
  const [loading, setLoading] = useState(false);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch core data
  const fetchData = useCallback(async () => {
    try {
      const [invRes, storesRes, invReportRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/stores'),
        fetch('/api/invariants')
      ]);

      if (invRes.ok) setInventory(await invRes.json());
      if (storesRes.ok) setStores(await storesRes.json());
      if (invReportRes.ok) setInvariants(await invReportRes.json());
      setLastUpdated(new Date().toLocaleTimeString());
      setErrorMsg(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setErrorMsg('Failed to connect to API backend. Ensure API is running on port 4000.');
    }
  }, []);

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

  // Run Flash Sale S1
  const handleRunFlashSale = async () => {
    setScenarioRunning(true);
    setScenarioResult(null);
    try {
      const res = await fetch('/api/chaos/scenarios/flash-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoReset: true })
      });
      const data = await res.json();
      setScenarioResult(data);
      fetchData();
    } catch (err) {
      setErrorMsg('Error executing flash sale scenario: ' + err.message);
    } finally {
      setScenarioRunning(false);
    }
  };

  // Reset database
  const handleResetDb = async () => {
    if (!confirm('Reset database to clean initial seed?')) return;
    setLoading(true);
    try {
      await fetch('/api/admin/reset', { method: 'POST' });
      setScenarioResult(null);
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

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Navbar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1e293b',
        paddingBottom: 18,
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            width: 42,
            height: 42,
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

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? '#064e3b' : '#1e293b',
              color: autoRefresh ? '#34d399' : '#94a3b8',
              border: `1px solid ${autoRefresh ? '#059669' : '#334155'}`,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}>
            {autoRefresh ? '● Live Polling (1.5s)' : '○ Polling Paused'}
          </button>

          <button
            onClick={fetchData}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}>
            ↻ Refresh
          </button>

          <button
            onClick={handleResetDb}
            disabled={loading || scenarioRunning}
            style={{
              background: '#881337',
              color: '#fda4af',
              border: '1px solid #be123c',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}>
            Reset Seed Data
          </button>

          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#64748b' }} className="font-mono">
              {lastUpdated}
            </span>
          )}
        </div>
      </header>

      {/* Global Error Banner */}
      {errorMsg && (
        <div style={{
          background: '#450a0a',
          border: '1px solid #991b1b',
          color: '#fca5a5',
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 13
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Invariants Scoreboard (Always visible at top) */}
      <section style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: 18,
        marginBottom: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Invariant Panel
            </h2>
            <span style={{
              background: invariants.ok ? '#064e3b' : '#7f1d1d',
              color: invariants.ok ? '#4ade80' : '#f87171',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700
            }}>
              {invariants.ok ? 'ALL 6 INVARIANTS GREEN ✓' : 'INVARIANT VIOLATION DETECTED ✗'}
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Continuous Mathematical Verification
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12
        }}>
          {invariants.invariants && invariants.invariants.map(inv => (
            <div key={inv.id} style={{
              background: inv.ok ? '#061a1a' : '#260d14',
              border: `1px solid ${inv.ok ? '#134e4a' : '#881337'}`,
              borderRadius: 8,
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="font-mono" style={{
                  fontWeight: 700,
                  fontSize: 13,
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
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                {inv.details}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Grid: Chaos Lab / Vibe Check & Live Inventory */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Left Column: Vibe Check (Chaos Lab) & S1 Demo */}
        <div>
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <span style={{
                  color: '#f43f5e',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Round-1 Judging Showcase
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                  Vibe Check (Chaos Lab)
                </h3>
              </div>
              <span style={{
                background: '#312e81',
                color: '#a5b4fc',
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 6,
                fontWeight: 600
              }}>
                Scenario S1 (P0)
              </span>
            </div>

            <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 16 }}>
              <strong>Flash Sale Concurrency:</strong> 50 buyers execute atomic reservations simultaneously (<code style={{ background: '#1e293b', padding: '1px 5px', borderRadius: 4 }}>Promise.all</code>) for the scarce <strong>HyperX Headset (stock: 10)</strong>.
            </p>

            <div style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              borderRadius: 8,
              padding: 14,
              marginBottom: 18
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                <strong>Expected Mathematical Outcome:</strong>
              </div>
              <ul style={{ fontSize: 12, color: '#e2e8f0', paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Exactly <strong style={{ color: '#34d399' }}>10 orders succeed</strong> (HTTP 201)</li>
                <li>Exactly <strong style={{ color: '#fb7185' }}>40 rejected with OUT_OF_STOCK</strong> (HTTP 409)</li>
                <li><strong style={{ color: '#38bdf8' }}>0 overselling</strong> &middot; Reserved = 10, On-hand = 10</li>
                <li>All 6 invariants remain <strong>100% green</strong></li>
              </ul>
            </div>

            <button
              onClick={handleRunFlashSale}
              disabled={scenarioRunning}
              style={{
                width: '100%',
                background: scenarioRunning ? '#475569' : 'linear-gradient(135deg, #2563eb, #06b6d4)',
                color: '#fff',
                border: 'none',
                padding: '14px 20px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                boxShadow: scenarioRunning ? 'none' : '0 4px 14px rgba(6,182,212,0.3)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8
              }}>
              {scenarioRunning ? 'Executing 50 Concurrent Checkouts...' : '⚡ Trigger S1 Flash Sale (50 vs 10)'}
            </button>

            {/* Scenario Result Card */}
            {scenarioResult && (
              <div style={{
                marginTop: 20,
                background: scenarioResult.passed ? '#06241b' : '#330a13',
                border: `1px solid ${scenarioResult.passed ? '#059669' : '#dc2626'}`,
                borderRadius: 10,
                padding: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: scenarioResult.passed ? '#059669' : '#dc2626',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 4
                    }}>
                      {scenarioResult.passed ? 'VERIFIED PASS ✓' : 'FAILED ✗'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                      {scenarioResult.name}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: 11, color: '#94a3b8' }}>
                    {scenarioResult.durationMs}ms
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  marginBottom: 12
                }}>
                  <div style={{ background: '#090d16', padding: '10px', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Succeeded</div>
                    <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: '#34d399' }}>
                      {scenarioResult.actual.succeeded} / 10
                    </div>
                  </div>
                  <div style={{ background: '#090d16', padding: '10px', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Out of Stock</div>
                    <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: '#fb7185' }}>
                      {scenarioResult.actual.outOfStock} / 40
                    </div>
                  </div>
                  <div style={{ background: '#090d16', padding: '10px', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Invariants</div>
                    <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>
                      {scenarioResult.actual.invariantsGreen ? 'GREEN' : 'RED'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  <strong>Sample Success IDs:</strong>
                  <div className="font-mono" style={{ fontSize: 11, color: '#38bdf8', marginTop: 4 }}>
                    {scenarioResult.samples?.successOrders?.join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Store Availability Controls */}
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 12,
            padding: 20
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
        </div>

        {/* Right Column: Live Multi-Store Inventory Table */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                Live Inventory Across Stores
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>
                Atomic reserves dynamically tracked with PostgreSQL CHECK constraints
              </p>
            </div>
            <span style={{
              background: '#1e293b',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              color: '#38bdf8'
            }} className="font-mono">
              {inventory.length} Stock Records
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '8px 10px' }}>Store</th>
                  <th style={{ padding: '8px 10px' }}>Product</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Initial</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>On-Hand</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Reserved</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Available</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row, idx) => {
                  const isScarce = row.sku === 'sku-flash';
                  return (
                    <tr key={`${row.store_id}-${row.sku}`} style={{
                      borderBottom: '1px solid #1e293b',
                      background: isScarce ? 'rgba(6,182,212,0.06)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')
                    }}>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 600 }}>{row.store_name}</div>
                        <span className="font-mono" style={{ fontSize: 10, color: '#64748b' }}>{row.store_id}</span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: isScarce ? 700 : 500, color: isScarce ? '#38bdf8' : '#f8fafc' }}>
                          {row.product_name}
                        </div>
                        <span className="font-mono" style={{ fontSize: 10, color: '#64748b' }}>{row.sku}</span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }} className="font-mono">
                        {row.initial_stock}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }} className="font-mono">
                        {row.on_hand}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span className="font-mono" style={{
                          fontWeight: 700,
                          color: row.reserved > 0 ? '#fb7185' : '#94a3b8'
                        }}>
                          {row.reserved}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 700,
                          background: row.available === 0 ? '#7f1d1d' : (row.available < 5 ? '#78350f' : '#064e3b'),
                          color: row.available === 0 ? '#fca5a5' : (row.available < 5 ? '#fde047' : '#86efac')
                        }} className="font-mono">
                          {row.available}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right' }} className="font-mono">
                        ₹{(row.price_paise / 100).toLocaleString('en-IN')}
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
  );
}
