// services/portfolioEngine.js
// Deterministic calculation engine for WealthIQ
import { FUND_LOOKTHROUGH } from '../data/mockData.js';

export function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const num = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (num >= 10000000) {
    return `${sign}₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `${sign}₹${(num / 100000).toFixed(2)} Lakh`;
  }
  return `${sign}₹${num.toLocaleString('en-IN')}`;
}

export function calculateTotalNetWorth(assets = [], liabilities = []) {
  const totalAssets = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalInvested = assets.reduce((sum, a) => sum + (Number(a.investedValue) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const unrealisedPnL = totalAssets - totalInvested;
  const unrealisedPnLPercent = totalInvested > 0 ? (unrealisedPnL / totalInvested) * 100 : 0;

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    totalInvested,
    unrealisedPnL,
    unrealisedPnLPercent,
    todayChangeAmount: Math.round(totalAssets * 0.0042),
    todayChangePercent: 0.42,
    monthlyChangeAmount: Math.round(totalAssets * 0.0385),
    monthlyChangePercent: 3.85,
    formula: 'Net Worth = sum(currentValue of assets) - sum(liabilities)',
    dataUsed: {
      assetsCount: assets.length,
      liabilitiesCount: liabilities.length,
      totalAssets,
      totalLiabilities
    }
  };
}

export function calculateAssetAllocation(assets = []) {
  const CATEGORIES = [
    'Stocks',
    'Mutual Funds',
    'Insurance',
    'Gold',
    'Property',
    'Vehicles',
    'Cash/Deposits'
  ];

  const totalAssets = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const allocation = [];

  for (const cat of CATEGORIES) {
    const catAssets = assets.filter(a => a.category === cat);
    const value = catAssets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
    const invested = catAssets.reduce((sum, a) => sum + (Number(a.investedValue) || 0), 0);
    const percent = totalAssets > 0 ? (value / totalAssets) * 100 : 0;
    const pnl = value - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

    allocation.push({
      category: cat,
      value,
      invested,
      percent,
      pnl,
      pnlPercent,
      count: catAssets.length,
      assets: catAssets.map(a => ({
        id: a.id,
        name: a.name,
        currentValue: a.currentValue,
        investedValue: a.investedValue,
        owner: a.owner
      }))
    });
  }

  return {
    totalAssets,
    categories: allocation,
    formula: 'Category % = (sum(currentValue in Category) / totalAssets) * 100'
  };
}

export function calculateProfitLoss(assets = []) {
  const current = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const invested = assets.reduce((sum, a) => sum + (Number(a.investedValue) || 0), 0);
  const absolute = current - invested;
  const percent = invested > 0 ? (absolute / invested) * 100 : 0;

  return {
    current,
    invested,
    absolute,
    percent,
    formula: 'Unrealised P/L = current minus invested, percent = (absolute / invested) * 100'
  };
}

export function calculateSectorExposure(assets = []) {
  const directStocks = assets.filter(a => a.category === 'Stocks');
  const mutualFunds = assets.filter(a => a.category === 'Mutual Funds');

  const totalStockValue = directStocks.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const totalFundValue = mutualFunds.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const totalEquity = totalStockValue + totalFundValue;

  const sectorMap = {};

  const ensureSector = (sector) => {
    if (!sectorMap[sector]) {
      sectorMap[sector] = {
        sector,
        rupeeAmount: 0,
        directAmount: 0,
        fundAmount: 0,
        routes: []
      };
    }
  };

  // 1. Direct stocks: 100% to their sector
  for (const stock of directStocks) {
    const sector = stock.sector || 'Other';
    ensureSector(sector);
    const val = Number(stock.currentValue) || 0;
    sectorMap[sector].rupeeAmount += val;
    sectorMap[sector].directAmount += val;
    sectorMap[sector].routes.push({
      type: 'direct',
      name: stock.name,
      owner: stock.owner,
      amount: val,
      percentageOfSector: 0 // computed below
    });
  }

  // 2. Mutual funds: look-through to sector weights
  for (const fund of mutualFunds) {
    const val = Number(fund.currentValue) || 0;
    const info = fund.fundKey && FUND_LOOKTHROUGH[fund.fundKey];
    if (info && info.sectorWeights) {
      for (const [sector, weight] of Object.entries(info.sectorWeights)) {
        ensureSector(sector);
        const lookThroughVal = (val * weight) / 100;
        sectorMap[sector].rupeeAmount += lookThroughVal;
        sectorMap[sector].fundAmount += lookThroughVal;
        sectorMap[sector].routes.push({
          type: 'fund',
          name: fund.name,
          owner: fund.owner,
          fundValue: val,
          weightPercent: weight,
          amount: lookThroughVal
        });
      }
    } else {
      ensureSector('Other');
      sectorMap['Other'].rupeeAmount += val;
      sectorMap['Other'].fundAmount += val;
      sectorMap['Other'].routes.push({
        type: 'fund',
        name: fund.name,
        owner: fund.owner,
        fundValue: val,
        weightPercent: 100,
        amount: val
      });
    }
  }

  const sectors = Object.values(sectorMap).map(sec => {
    const percent = totalEquity > 0 ? (sec.rupeeAmount / totalEquity) * 100 : 0;
    const directPercent = totalEquity > 0 ? (sec.directAmount / totalEquity) * 100 : 0;
    const fundPercent = totalEquity > 0 ? (sec.fundAmount / totalEquity) * 100 : 0;
    return {
      ...sec,
      percent,
      directPercent,
      fundPercent
    };
  }).sort((a, b) => b.percent - a.percent);

  return {
    totalEquity,
    totalStockValue,
    totalFundValue,
    sectors,
    formula: 'Look-Through Sector % = (Direct Stock Value + sum(Fund Value × Sector Weight %)) / Total Equity * 100'
  };
}

export function detectAssetOverlap(assets = []) {
  const directStocks = assets.filter(a => a.category === 'Stocks');
  const mutualFunds = assets.filter(a => a.category === 'Mutual Funds');
  const totalEquity = directStocks.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0) +
                      mutualFunds.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);

  // Core companies to cross-check across direct stocks and funds
  const TRACKED_COMPANIES = [
    { name: 'Infosys', sector: 'Technology' },
    { name: 'HDFC Bank', sector: 'Financials' },
    { name: 'Reliance', sector: 'Energy' },
    { name: 'Tata Motors', sector: 'Auto' },
    { name: 'ITC', sector: 'FMCG' }
  ];

  const overlaps = [];

  for (const comp of TRACKED_COMPANIES) {
    const routes = [];
    let directExposure = 0;
    let fundExposure = 0;

    // Check direct stock holdings
    for (const stock of directStocks) {
      if (stock.name.toLowerCase().includes(comp.name.toLowerCase())) {
        const val = Number(stock.currentValue) || 0;
        directExposure += val;
        routes.push({
          source: 'Direct Holding',
          name: stock.name,
          owner: stock.owner,
          amount: val,
          description: `Direct equity holding in ${stock.name} (${stock.owner})`
        });
      }
    }

    // Check mutual funds look-through top companies
    for (const fund of mutualFunds) {
      const fundInfo = fund.fundKey && FUND_LOOKTHROUGH[fund.fundKey];
      if (fundInfo && fundInfo.topCompanies) {
        for (const [coName, weight] of Object.entries(fundInfo.topCompanies)) {
          if (coName.toLowerCase().includes(comp.name.toLowerCase())) {
            const val = ((Number(fund.currentValue) || 0) * weight) / 100;
            fundExposure += val;
            routes.push({
              source: fund.name,
              name: fund.name,
              owner: fund.owner,
              weight,
              amount: val,
              description: `Via ${fund.name} (${weight}% portfolio weight, ${fund.owner})`
            });
          }
        }
      }
    }

    const totalExposure = directExposure + fundExposure;

    // An overlap exists if there are multiple routes (e.g. direct + 1 or more funds, or multiple funds)
    if (routes.length > 1) {
      const percentOfEquity = totalEquity > 0 ? (totalExposure / totalEquity) * 100 : 0;
      overlaps.push({
        company: comp.name,
        sector: comp.sector,
        totalExposure,
        directExposure,
        fundExposure,
        routesCount: routes.length,
        routes,
        percentOfEquity,
        formula: 'Total Exposure = Direct Stock Value + sum(Mutual Fund Value × Fund Holding %)'
      });
    }
  }

  overlaps.sort((a, b) => b.totalExposure - a.totalExposure);

  return {
    totalEquity,
    overlapsCount: overlaps.length,
    overlaps,
    formula: 'Detected companies held simultaneously via direct equity and underlying mutual fund holdings'
  };
}

export function detectConcentrationRisk(assets = [], sectorExposure, overlapData) {
  const totalEquity = sectorExposure?.totalEquity || 0;
  const flags = [];

  // 1. Sector Concentration: Flag top non-"Other" sector above 25% of equity (High above 35%)
  const topSector = sectorExposure?.sectors?.find(s => s.sector !== 'Other');
  if (topSector && topSector.percent > 25) {
    const isHigh = topSector.percent > 35;
    flags.push({
      id: `conc_sector_${topSector.sector.toLowerCase()}`,
      type: 'Sector Concentration',
      level: isHigh ? 'High' : 'Moderate',
      subject: `${topSector.sector} Sector`,
      percent: topSector.percent,
      threshold: isHigh ? 35 : 25,
      calculation: `${topSector.sector} look-through exposure is ${topSector.percent.toFixed(1)}% of total equity (${formatINR(topSector.rupeeAmount)} out of ${formatINR(totalEquity)}). Triggered ${isHigh ? 'High (>35%)' : 'Moderate (>25%)'} concentration threshold.`,
      explanation: `Approximately ${topSector.percent.toFixed(1)}% of your equity exposure is linked to the ${topSector.sector} sector when direct stocks and mutual funds are combined. Heavy sector concentration makes the portfolio vulnerable to industry-specific corrections.`,
      dataUsed: {
        sector: topSector.sector,
        directRupee: topSector.directAmount,
        fundRupee: topSector.fundAmount,
        totalRupee: topSector.rupeeAmount,
        totalEquity,
        percent: topSector.percent
      }
    });
  }

  // 2. Single Company Concentration: Flag any single company above 12% look-through (High above 18%)
  const overlaps = overlapData?.overlaps || [];
  for (const item of overlaps) {
    if (item.percentOfEquity > 12) {
      const isHigh = item.percentOfEquity > 18;
      flags.push({
        id: `conc_company_${item.company.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'Single Company Overlap Risk',
        level: isHigh ? 'High' : 'Moderate',
        subject: item.company,
        percent: item.percentOfEquity,
        threshold: isHigh ? 18 : 12,
        calculation: `${item.company} aggregated look-through value is ${formatINR(item.totalExposure)} (${item.percentOfEquity.toFixed(1)}% of equity). Triggered ${isHigh ? 'High (>18%)' : 'Moderate (>12%)'} single-stock threshold across ${item.routes.length} holding routes.`,
        explanation: `Hidden exposure detected: You hold ${item.company} directly and additionally through ${item.routes.length - 1} mutual fund(s), creating an effective ${item.percentOfEquity.toFixed(1)}% stake of your total equity.`,
        dataUsed: {
          company: item.company,
          sector: item.sector,
          totalExposure: item.totalExposure,
          directExposure: item.directExposure,
          fundExposure: item.fundExposure,
          percentOfEquity: item.percentOfEquity,
          routes: item.routes
        }
      });
    }
  }

  return flags;
}

export function calculateHealthScore(assets = [], liabilities = [], sectorExposure, overlapData, totalNetWorth) {
  const totalAssets = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const totalEquity = sectorExposure?.totalEquity || 0;

  // 1. Concentration component
  // Formula: Concentration = 100 - 3×max(0, topSector% - 22) - 3×max(0, topCompany% - 10)
  const topSector = sectorExposure?.sectors?.find(s => s.sector !== 'Other');
  const topSectorPct = topSector ? topSector.percent : 0;

  const topCompany = overlapData?.overlaps?.[0];
  const topCompanyPct = topCompany ? topCompany.percentOfEquity : 0;

  const penaltySector = 3 * Math.max(0, topSectorPct - 22);
  const penaltyCompany = 3 * Math.max(0, topCompanyPct - 10);
  const rawConcentration = 100 - penaltySector - penaltyCompany;
  const scoreConcentration = Math.max(0, Math.min(100, Math.round(rawConcentration)));

  const concentrationComponent = {
    key: 'concentration',
    name: 'Concentration Risk',
    score: scoreConcentration,
    status: scoreConcentration >= 75 ? 'Healthy' : scoreConcentration >= 50 ? 'Moderate' : 'High Risk',
    formulaText: '100 − 3×max(0, topSector% − 22) − 3×max(0, topCompany% − 10)',
    dataUsed: {
      topSector: topSector?.sector || 'N/A',
      topSectorPercent: Number(topSectorPct.toFixed(1)),
      sectorPenalty: Number(penaltySector.toFixed(1)),
      topCompany: topCompany?.company || 'N/A',
      topCompanyPercent: Number(topCompanyPct.toFixed(1)),
      companyPenalty: Number(penaltyCompany.toFixed(1))
    },
    explanation: `Evaluates single-sector and single-stock look-through concentration against safe baselines (22% sector, 10% company). Currently top sector is ${topSector?.sector || 'None'} at ${topSectorPct.toFixed(1)}% and top stock is ${topCompany?.company || 'None'} at ${topCompanyPct.toFixed(1)}%.`
  };

  // 2. Allocation component
  // Formula: Allocation = 100 - 2.5×max(0, (property+vehicles)% - 50) - 3×max(0, gold% - 15)
  const propertyValue = assets.filter(a => a.category === 'Property').reduce((s, a) => s + (Number(a.currentValue) || 0), 0);
  const vehiclesValue = assets.filter(a => a.category === 'Vehicles').reduce((s, a) => s + (Number(a.currentValue) || 0), 0);
  const goldValue = assets.filter(a => a.category === 'Gold').reduce((s, a) => s + (Number(a.currentValue) || 0), 0);

  const propVehPct = totalAssets > 0 ? ((propertyValue + vehiclesValue) / totalAssets) * 100 : 0;
  const goldPct = totalAssets > 0 ? (goldValue / totalAssets) * 100 : 0;

  const penaltyPropVeh = 2.5 * Math.max(0, propVehPct - 50);
  const penaltyGold = 3 * Math.max(0, goldPct - 15);
  const rawAllocation = 100 - penaltyPropVeh - penaltyGold;
  const scoreAllocation = Math.max(0, Math.min(100, Math.round(rawAllocation)));

  const allocationComponent = {
    key: 'allocation',
    name: 'Asset Class Balance',
    score: scoreAllocation,
    status: scoreAllocation >= 75 ? 'Healthy' : scoreAllocation >= 50 ? 'Moderate' : 'Needs Review',
    formulaText: '100 − 2.5×max(0, (property+vehicles)% − 50) − 3×max(0, gold% − 15)',
    dataUsed: {
      propertyVehiclesValue: propertyValue + vehiclesValue,
      propertyVehiclesPercent: Number(propVehPct.toFixed(1)),
      goldValue,
      goldPercent: Number(goldPct.toFixed(1)),
      penaltyPropVeh: Number(penaltyPropVeh.toFixed(1)),
      penaltyGold: Number(penaltyGold.toFixed(1))
    },
    explanation: `Checks for over-allocation into illiquid physical assets (property + vehicles > 50%) or precious metals (gold > 15%). Currently property & vehicles make up ${propVehPct.toFixed(1)}% and gold makes up ${goldPct.toFixed(1)}%.`
  };

  // 3. Diversification component
  // Formula: Diversification = asset classes held ÷ 6 × 100 (cap 100)
  // Categories: Stocks, Mutual Funds, Insurance, Gold, Property/Vehicles, Cash/Deposits
  const categoriesPresent = new Set();
  assets.forEach(a => {
    if (a.currentValue > 0) {
      if (a.category === 'Property' || a.category === 'Vehicles') {
        categoriesPresent.add('Real Assets');
      } else {
        categoriesPresent.add(a.category);
      }
    }
  });

  const distinctCount = categoriesPresent.size;
  const rawDiversification = (distinctCount / 6) * 100;
  const scoreDiversification = Math.min(100, Math.max(0, Math.round(rawDiversification)));

  const diversificationComponent = {
    key: 'diversification',
    name: 'Multi-Asset Breadth',
    score: scoreDiversification,
    status: scoreDiversification >= 80 ? 'Optimal' : scoreDiversification >= 50 ? 'Moderate' : 'Narrow',
    formulaText: 'asset classes held ÷ 6 × 100 (cap 100)',
    dataUsed: {
      distinctAssetClassesCount: distinctCount,
      heldClasses: Array.from(categoriesPresent),
      baselineRequired: 6
    },
    explanation: `Checks spread across 6 core pillars: Direct Equities, Mutual Funds, Fixed Income / Cash, Gold, Real Estate, and Insurance protection. Currently active across ${distinctCount} of 6 pillars.`
  };

  // 4. Liquidity component
  // Formula: Liquidity = (cash + deposits) ÷ ₹60,000 mock monthly expenses ÷ 6 months × 100 (cap 100)
  const cashDeposits = assets
    .filter(a => a.category === 'Cash/Deposits')
    .reduce((s, a) => s + (Number(a.currentValue) || 0), 0);

  const mockMonthlyExpenses = 60000;
  const emergencyTarget = mockMonthlyExpenses * 6; // 3,60,000
  const rawLiquidity = emergencyTarget > 0 ? (cashDeposits / emergencyTarget) * 100 : 0;
  const scoreLiquidity = Math.min(100, Math.max(0, Math.round(rawLiquidity)));

  const liquidityComponent = {
    key: 'liquidity',
    name: 'Emergency Liquidity',
    score: scoreLiquidity,
    status: scoreLiquidity >= 90 ? 'Well Protected' : scoreLiquidity >= 60 ? 'Adequate' : 'Low Buffer',
    formulaText: '(cash + deposits) ÷ ₹60,000 mock monthly expenses ÷ 6 months × 100 (cap 100)',
    dataUsed: {
      cashAndDeposits: cashDeposits,
      monthlyExpenses: mockMonthlyExpenses,
      monthsTarget: 6,
      requiredReserve: emergencyTarget,
      coverageMonths: Number((cashDeposits / mockMonthlyExpenses).toFixed(1))
    },
    explanation: `Measures liquid runway in savings & FDs against standard 6-month buffer (₹3.60 Lakh based on ₹60,000/mo expenses). Current liquid reserves: ${formatINR(cashDeposits)} (${(cashDeposits / mockMonthlyExpenses).toFixed(1)} months buffer).`
  };

  // 5. Risk level component
  // Formula: Risk level = 100 − 2×max(0, equity% of assets − 35)
  const equityPct = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;
  const penaltyEquity = 2 * Math.max(0, equityPct - 35);
  const rawRisk = 100 - penaltyEquity;
  const scoreRisk = Math.max(0, Math.min(100, Math.round(rawRisk)));

  const riskComponent = {
    key: 'riskLevel',
    name: 'Growth vs Volatility Risk',
    score: scoreRisk,
    status: scoreRisk >= 75 ? 'Balanced' : scoreRisk >= 50 ? 'Moderate' : 'Aggressive',
    formulaText: '100 − 2×max(0, equity% of assets − 35)',
    dataUsed: {
      totalEquity,
      totalAssets,
      equityPercent: Number(equityPct.toFixed(1)),
      equityPenalty: Number(penaltyEquity.toFixed(1))
    },
    explanation: `Measures equity volatility exposure against a benchmark 35% asset proportion. Higher equity proportion yields higher expected growth but adds drawdown volatility. Currently equity is ${equityPct.toFixed(1)}% of total assets.`
  };

  const components = [
    concentrationComponent,
    allocationComponent,
    diversificationComponent,
    liquidityComponent,
    riskComponent
  ];

  const overallScore = Math.round(components.reduce((sum, c) => sum + c.score, 0) / components.length);

  return {
    overallScore,
    status: overallScore >= 75 ? 'Strong' : overallScore >= 60 ? 'Moderate' : 'Action Required',
    components,
    formula: 'Overall Health Score = average of (Concentration, Allocation, Diversification, Liquidity, Risk Level)'
  };
}

export function compilePortfolio(scope = 'me', assets = [], liabilities = [], members = []) {
  const netWorthData = calculateTotalNetWorth(assets, liabilities);
  const allocationData = calculateAssetAllocation(assets);
  const pnlData = calculateProfitLoss(assets);
  const sectorExposure = calculateSectorExposure(assets);
  const overlapData = detectAssetOverlap(assets);
  const concentrationFlags = detectConcentrationRisk(assets, sectorExposure, overlapData);
  const healthData = calculateHealthScore(assets, liabilities, sectorExposure, overlapData, netWorthData.netWorth);

  return {
    scope,
    netWorth: netWorthData,
    allocation: allocationData,
    pnl: pnlData,
    sectorExposure,
    overlaps: overlapData,
    concentrationFlags,
    health: healthData
  };
}
