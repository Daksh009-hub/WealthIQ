// routes/api.js
import express from 'express';
import {
  getUserAssets,
  getUserLiabilities,
  getFamilyAssets,
  getFamilyLiabilities,
  getFamilyMembers,
  toggleMemberConsent,
  syncPortfolio,
  getLastSyncTime
} from '../services/assetAggregator.js';
import {
  calculateTotalNetWorth,
  calculateAssetAllocation,
  calculateSectorExposure,
  detectAssetOverlap,
  detectConcentrationRisk,
  calculateHealthScore,
  compilePortfolio
} from '../services/portfolioEngine.js';
import {
  analyzePortfolioWithGemini,
  askCopilot,
  fetchLiveNewsWithGrounding,
  getApiKeyStatus,
  saveApiKey
} from '../services/gemini.js';
import {
  fetchRealLiveNews,
  simulateMarketShock
} from '../services/liveNewsService.js';
import {
  calculateAIDynamicPortfolio,
  generateWealthTrend
} from '../services/aiCalculationEngine.js';

const router = express.Router();

function getScopedData(scope = 'me') {
  const isFamily = scope === 'family';
  const assets = isFamily ? getFamilyAssets() : getUserAssets();
  const liabilities = isFamily ? getFamilyLiabilities() : getUserLiabilities();
  const members = getFamilyMembers();
  return { assets, liabilities, members, isFamily };
}

// 1. GET /api/portfolio?scope=me|family
router.get('/portfolio', (req, res) => {
  try {
    const scope = req.query.scope || 'me';
    const { assets, liabilities, members } = getScopedData(scope);
    const compiled = compilePortfolio(scope, assets, liabilities, members);

    res.json({
      success: true,
      scope,
      lastSyncTime: getLastSyncTime(),
      netWorth: compiled.netWorth,
      allocation: compiled.allocation,
      pnl: compiled.pnl,
      liabilitiesCount: liabilities.length,
      assetsCount: assets.length
    });
  } catch (err) {
    console.error('Error in /api/portfolio:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/family
router.get('/family', (req, res) => {
  try {
    const members = getFamilyMembers();
    const familyAssets = getFamilyAssets();
    const familyLiabilities = getFamilyLiabilities();

    // Per member stats
    const perMemberStats = members.map(m => {
      const memberAssets = familyAssets.filter(a => a.memberId === m.id);
      const memberLiabilities = familyLiabilities.filter(l => l.memberId === m.id);
      const totalAssets = memberAssets.reduce((s, a) => s + (Number(a.currentValue) || 0), 0);
      const totalLiabilities = memberLiabilities.reduce((s, l) => s + (Number(l.amount) || 0), 0);
      const netWorth = totalAssets - totalLiabilities;
      const totalInvested = memberAssets.reduce((s, a) => s + (Number(a.investedValue) || 0), 0);

      return {
        id: m.id,
        name: m.name,
        relation: m.relation,
        role: m.role,
        consent: m.consent,
        avatar: m.avatar,
        netWorth,
        totalAssets,
        totalLiabilities,
        totalInvested,
        assetCount: memberAssets.length
      };
    });

    const totalFamilyNetWorth = perMemberStats
      .filter(m => m.consent === 'granted')
      .reduce((s, m) => s + m.netWorth, 0);

    // Combined family concentration
    const sectorExposure = calculateSectorExposure(familyAssets);
    const overlaps = detectAssetOverlap(familyAssets);
    const concentration = detectConcentrationRisk(familyAssets, sectorExposure, overlaps);

    res.json({
      success: true,
      members: perMemberStats,
      totalFamilyNetWorth,
      consentedCount: members.filter(m => m.consent === 'granted').length,
      totalCount: members.length,
      combinedConcentration: concentration,
      combinedSectors: sectorExposure.sectors.slice(0, 5)
    });
  } catch (err) {
    console.error('Error in /api/family:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/family/consent
router.post('/family/consent', (req, res) => {
  try {
    const { memberId, consent } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, error: 'memberId required' });
    }
    const updatedMembers = toggleMemberConsent(memberId, consent);
    res.json({
      success: true,
      members: updatedMembers
    });
  } catch (err) {
    console.error('Error in /api/family/consent:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /api/assets?scope=me|family
router.get('/assets', (req, res) => {
  try {
    const scope = req.query.scope || 'me';
    const { assets, liabilities } = getScopedData(scope);
    const totalAssetsValue = assets.reduce((s, a) => s + (Number(a.currentValue) || 0), 0);

    const enrichedAssets = assets.map(a => {
      const cur = Number(a.currentValue) || 0;
      const inv = Number(a.investedValue) || 0;
      const gainLoss = cur - inv;
      const gainLossPercent = inv > 0 ? (gainLoss / inv) * 100 : 0;
      const percentOfTotal = totalAssetsValue > 0 ? (cur / totalAssetsValue) * 100 : 0;

      return {
        ...a,
        gainLoss,
        gainLossPercent,
        percentOfTotal
      };
    });

    res.json({
      success: true,
      scope,
      totalAssetsValue,
      assets: enrichedAssets,
      liabilities
    });
  } catch (err) {
    console.error('Error in /api/assets:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /api/portfolio/health?scope=me|family
router.get('/portfolio/health', (req, res) => {
  try {
    const scope = req.query.scope || 'me';
    const { assets, liabilities, members } = getScopedData(scope);
    const compiled = compilePortfolio(scope, assets, liabilities, members);

    res.json({
      success: true,
      scope,
      health: compiled.health,
      concentrationFlags: compiled.concentrationFlags,
      overlaps: compiled.overlaps,
      sectorExposure: compiled.sectorExposure
    });
  } catch (err) {
    console.error('Error in /api/portfolio/health:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /api/news?scope=me|family (Now augmented with Real Live RSS feeds & Live Impacts)
router.get('/news', async (req, res) => {
  try {
    const scope = req.query.scope || 'me';
    const { assets, liabilities, members } = getScopedData(scope);
    const compiled = compilePortfolio(scope, assets, liabilities, members);

    // Fetch live news with real-time portfolio sensitivity calculation
    const realLiveItems = await fetchRealLiveNews(compiled);

    res.json({
      success: true,
      news: realLiveItems,
      isRealLive: true,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in /api/news:', err);
    // Fallback to grounded / illustrative
    try {
      const { assets, liabilities, members } = getScopedData(req.query.scope || 'me');
      const compiled = compilePortfolio(req.query.scope || 'me', assets, liabilities, members);
      const fallbackResult = await fetchLiveNewsWithGrounding(compiled);
      res.json(fallbackResult);
    } catch (e2) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// POST /api/news/simulate-shock
router.post('/news/simulate-shock', (req, res) => {
  try {
    const { shockType = 'tech_pullback', severity = 1, scope = 'me' } = req.body;
    const { assets, liabilities, members } = getScopedData(scope);
    const compiled = compilePortfolio(scope, assets, liabilities, members);

    const simulationResult = simulateMarketShock(shockType, Number(severity), compiled);
    res.json({
      success: true,
      simulation: simulationResult
    });
  } catch (err) {
    console.error('Error in /api/news/simulate-shock:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/portfolio/ai-dynamic?scope=me|family&regime=standard|high_volatility|rising_rates
// Returns AI Dynamic Real-World Model vs Static Baseline Formula
router.get('/portfolio/ai-dynamic', (req, res) => {
  try {
    const scope = req.query.scope || 'me';
    const regime = req.query.regime || 'standard';
    const { assets, liabilities, members } = getScopedData(scope);
    const compiled = compilePortfolio(scope, assets, liabilities, members);

    const aiDynamicData = calculateAIDynamicPortfolio(compiled, regime);
    res.json({
      success: true,
      scope,
      aiDynamic: aiDynamicData
    });
  } catch (err) {
    console.error('Error in /api/portfolio/ai-dynamic:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/portfolio/trend?scope=me|family
router.get('/portfolio/trend', (req, res) => {
  try {
    const scope = req.query.scope || 'me';
    const { assets, liabilities } = getScopedData(scope);
    const netWorthData = calculateTotalNetWorth(assets, liabilities);
    const trend = generateWealthTrend(netWorthData.netWorth);

    res.json({
      success: true,
      trend
    });
  } catch (err) {
    console.error('Error in /api/portfolio/trend:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/sync
router.post('/sync', (req, res) => {
  try {
    const scope = req.body.scope || 'me';
    const syncResult = syncPortfolio();
    const { assets, liabilities, members } = getScopedData(scope);
    const compiled = compilePortfolio(scope, assets, liabilities, members);

    res.json({
      success: true,
      message: syncResult.toastMessage,
      syncCount: syncResult.syncCount,
      lastSyncTime: syncResult.lastSyncTime,
      transaction: syncResult.transactionDetails,
      portfolio: {
        netWorth: compiled.netWorth,
        allocation: compiled.allocation
      },
      health: compiled.health,
      sectorExposure: compiled.sectorExposure,
      overlaps: compiled.overlaps,
      concentrationFlags: compiled.concentrationFlags
    });
  } catch (err) {
    console.error('Error in /api/sync:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/ai/analyze
router.post('/ai/analyze', async (req, res) => {
  try {
    const { question, scope = 'me', type = 'chat', history = [], userGoal = '', riskProfile = '' } = req.body;
    const { assets, liabilities, members } = getScopedData(scope);
    const compiled = compilePortfolio(scope, assets, liabilities, members);

    if (type === 'summary') {
      const summaryResult = await analyzePortfolioWithGemini(compiled, question, userGoal, riskProfile);
      return res.json(summaryResult);
    }

    // Default: Copilot chat
    const copilotResult = await askCopilot(compiled, question, history);
    res.json(copilotResult);
  } catch (err) {
    console.error('Error in /api/ai/analyze:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      note: 'AI unavailable, add GEMINI_API_KEY'
    });
  }
});

// Config: Get and Set Gemini API Key
router.get('/config/key', (req, res) => {
  res.json({
    success: true,
    ...getApiKeyStatus()
  });
});

router.post('/config/key', (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const result = saveApiKey(apiKey, model);
    res.json({
      success: true,
      message: 'Gemini API Key configured and active',
      ...result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
