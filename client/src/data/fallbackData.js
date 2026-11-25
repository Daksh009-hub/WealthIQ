export const initialPortfolio = {
  "scope": "me",
  "netWorth": {
    "netWorth": 0,
    "totalAssets": 0,
    "totalLiabilities": 0,
    "totalInvested": 0,
    "unrealisedPnL": 0,
    "unrealisedPnLPercent": 0,
    "todayChangeAmount": 0,
    "todayChangePercent": 0.42,
    "monthlyChangeAmount": 0,
    "monthlyChangePercent": 3.85,
    "formula": "Net Worth = sum(currentValue of assets) - sum(liabilities)",
    "dataUsed": {
      "assetsCount": 0,
      "liabilitiesCount": 0,
      "totalAssets": 0,
      "totalLiabilities": 0
    }
  },
  "allocation": {
    "totalAssets": 0,
    "categories": [
      {
        "category": "Stocks",
        "value": 0,
        "invested": 0,
        "percent": 0,
        "pnl": 0,
        "pnlPercent": 0,
        "count": 0,
        "assets": []
      },
      {
        "category": "Mutual Funds",
        "value": 0,
        "invested": 0,
        "percent": 0,
        "pnl": 0,
        "pnlPercent": 0,
        "count": 0,
        "assets": []
      },
      {
        "category": "Insurance",
        "value": 0,
        "invested": 0,
        "percent": 0,
        "pnl": 0,
        "pnlPercent": 0,
        "count": 0,
        "assets": []
      },
      {
        "category": "Gold",
        "value": 0,
        "invested": 0,
        "percent": 0,
        "pnl": 0,
        "pnlPercent": 0,
        "count": 0,
        "assets": []
      },
      {
        "category": "Property",
        "value": 0,
        "invested": 0,
        "percent": 0,
        "pnl": 0,
        "pnlPercent": 0,
        "count": 0,
        "assets": []
      },
      {
        "category": "Vehicles",
        "value": 0,
        "invested": 0,
        "percent": 0,
        "pnl": 0,
        "pnlPercent": 0,
        "count": 0,
        "assets": []
      },
      {
        "category": "Cash/Deposits",
        "value": 0,
        "invested": 0,
        "percent": 0,
        "pnl": 0,
        "pnlPercent": 0,
        "count": 0,
        "assets": []
      }
    ],
    "formula": "Category % = (sum(currentValue in Category) / totalAssets) * 100"
  },
  "pnl": {
    "current": 0,
    "invested": 0,
    "absolute": 0,
    "percent": 0,
    "formula": "Unrealised P/L = current minus invested, percent = (absolute / invested) * 100"
  },
  "sectorExposure": {
    "totalEquity": 0,
    "totalStockValue": 0,
    "totalFundValue": 0,
    "sectors": [],
    "formula": "Look-Through Sector % = (Direct Stock Value + sum(Fund Value × Sector Weight %)) / Total Equity * 100"
  },
  "overlaps": {
    "totalEquity": 0,
    "overlapsCount": 0,
    "overlaps": [],
    "formula": "Detected companies held simultaneously via direct equity and underlying mutual fund holdings"
  },
  "concentrationFlags": [],
  "health": {
    "overallScore": 60,
    "status": "Moderate",
    "components": [
      {
        "key": "concentration",
        "name": "Concentration Risk",
        "score": 100,
        "status": "Healthy",
        "formulaText": "100 − 3×max(0, topSector% − 22) − 3×max(0, topCompany% − 10)",
        "dataUsed": {
          "topSector": "N/A",
          "topSectorPercent": 0,
          "sectorPenalty": 0,
          "topCompany": "N/A",
          "topCompanyPercent": 0,
          "companyPenalty": 0
        },
        "explanation": "Evaluates single-sector and single-stock look-through concentration against safe baselines (22% sector, 10% company). Currently top sector is None at 0.0% and top stock is None at 0.0%."
      },
      {
        "key": "allocation",
        "name": "Asset Class Balance",
        "score": 100,
        "status": "Healthy",
        "formulaText": "100 − 2.5×max(0, (property+vehicles)% − 50) − 3×max(0, gold% − 15)",
        "dataUsed": {
          "propertyVehiclesValue": 0,
          "propertyVehiclesPercent": 0,
          "goldValue": 0,
          "goldPercent": 0,
          "penaltyPropVeh": 0,
          "penaltyGold": 0
        },
        "explanation": "Checks for over-allocation into illiquid physical assets (property + vehicles > 50%) or precious metals (gold > 15%). Currently property & vehicles make up 0.0% and gold makes up 0.0%."
      },
      {
        "key": "diversification",
        "name": "Multi-Asset Breadth",
        "score": 0,
        "status": "Narrow",
        "formulaText": "asset classes held ÷ 6 × 100 (cap 100)",
        "dataUsed": {
          "distinctAssetClassesCount": 0,
          "heldClasses": [],
          "baselineRequired": 6
        },
        "explanation": "Checks spread across 6 core pillars: Direct Equities, Mutual Funds, Fixed Income / Cash, Gold, Real Estate, and Insurance protection. Currently active across 0 of 6 pillars."
      },
      {
        "key": "liquidity",
        "name": "Emergency Liquidity",
        "score": 0,
        "status": "Low Buffer",
        "formulaText": "(cash + deposits) ÷ ₹60,000 mock monthly expenses ÷ 6 months × 100 (cap 100)",
        "dataUsed": {
          "cashAndDeposits": 0,
          "monthlyExpenses": 60000,
          "monthsTarget": 6,
          "requiredReserve": 360000,
          "coverageMonths": 0
        },
        "explanation": "Measures liquid runway in savings & FDs against standard 6-month buffer (₹3.60 Lakh based on ₹60,000/mo expenses). Current liquid reserves: ₹0 (0.0 months buffer)."
      },
      {
        "key": "riskLevel",
        "name": "Growth vs Volatility Risk",
        "score": 100,
        "status": "Balanced",
        "formulaText": "100 − 2×max(0, equity% of assets − 35)",
        "dataUsed": {
          "totalEquity": 0,
          "totalAssets": 0,
          "equityPercent": 0,
          "equityPenalty": 0
        },
        "explanation": "Measures equity volatility exposure against a benchmark 35% asset proportion. Higher equity proportion yields higher expected growth but adds drawdown volatility. Currently equity is 0.0% of total assets."
      }
    ],
    "formula": "Overall Health Score = average of (Concentration, Allocation, Diversification, Liquidity, Risk Level)"
  }
};

export const initialHealth = {
  "overallScore": 94,
  "status": "Strong",
  "components": [
    {
      "key": "concentration",
      "name": "Concentration Risk",
      "score": 100,
      "status": "Healthy",
      "formulaText": "100 − 3×max(0, topSector% − 22) − 3×max(0, topCompany% − 10)",
      "dataUsed": {
        "topSector": "N/A",
        "topSectorPercent": 0,
        "sectorPenalty": 0,
        "topCompany": "N/A",
        "topCompanyPercent": 0,
        "companyPenalty": 0
      },
      "explanation": "Evaluates single-sector and single-stock look-through concentration against safe baselines (22% sector, 10% company). Currently top sector is None at 0.0% and top stock is None at 0.0%."
    },
    {
      "key": "allocation",
      "name": "Asset Class Balance",
      "score": 69,
      "status": "Moderate",
      "formulaText": "100 − 2.5×max(0, (property+vehicles)% − 50) − 3×max(0, gold% − 15)",
      "dataUsed": {
        "propertyVehiclesValue": 4210000,
        "propertyVehiclesPercent": 62.6,
        "goldValue": 150000,
        "goldPercent": 2.2,
        "penaltyPropVeh": 31.4,
        "penaltyGold": 0
      },
      "explanation": "Checks for over-allocation into illiquid physical assets (property + vehicles > 50%) or precious metals (gold > 15%). Currently property & vehicles make up 62.6% and gold makes up 2.2%."
    },
    {
      "key": "diversification",
      "name": "Multi-Asset Breadth",
      "score": 100,
      "status": "Optimal",
      "formulaText": "asset classes held ÷ 6 × 100 (cap 100)",
      "dataUsed": {
        "distinctAssetClassesCount": 6,
        "heldClasses": [
          "Stocks",
          "Mutual Funds",
          "Insurance",
          "Gold",
          "Real Assets",
          "Cash/Deposits"
        ],
        "baselineRequired": 6
      },
      "explanation": "Checks spread across 6 core pillars: Direct Equities, Mutual Funds, Fixed Income / Cash, Gold, Real Estate, and Insurance protection. Currently active across 6 of 6 pillars."
    },
    {
      "key": "liquidity",
      "name": "Emergency Liquidity",
      "score": 100,
      "status": "Well Protected",
      "formulaText": "(cash + deposits) ÷ ₹60,000 mock monthly expenses ÷ 6 months × 100 (cap 100)",
      "dataUsed": {
        "cashAndDeposits": 520000,
        "monthlyExpenses": 60000,
        "monthsTarget": 6,
        "requiredReserve": 360000,
        "coverageMonths": 8.7
      },
      "explanation": "Measures liquid runway in savings & FDs against standard 6-month buffer (₹3.60 Lakh based on ₹60,000/mo expenses). Current liquid reserves: ₹5.20 Lakh (8.7 months buffer)."
    },
    {
      "key": "riskLevel",
      "name": "Growth vs Volatility Risk",
      "score": 100,
      "status": "Balanced",
      "formulaText": "100 − 2×max(0, equity% of assets − 35)",
      "dataUsed": {
        "totalEquity": 0,
        "totalAssets": 6730000,
        "equityPercent": 0,
        "equityPenalty": 0
      },
      "explanation": "Measures equity volatility exposure against a benchmark 35% asset proportion. Higher equity proportion yields higher expected growth but adds drawdown volatility. Currently equity is 0.0% of total assets."
    }
  ],
  "formula": "Overall Health Score = average of (Concentration, Allocation, Diversification, Liquidity, Risk Level)"
};

export const initialAssets = [
  {
    "id": "ast_me_stk_1",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Stocks",
    "name": "Reliance Industries",
    "currentValue": 180000,
    "investedValue": 150000,
    "source": "Zerodha Kite",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "sector": "Energy"
  },
  {
    "id": "ast_me_stk_2",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Stocks",
    "name": "HDFC Bank",
    "currentValue": 210000,
    "investedValue": 190000,
    "source": "Zerodha Kite",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "sector": "Financials"
  },
  {
    "id": "ast_me_stk_3",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Stocks",
    "name": "Infosys",
    "currentValue": 260000,
    "investedValue": 200000,
    "source": "Zerodha Kite",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "sector": "Technology"
  },
  {
    "id": "ast_me_stk_4",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Stocks",
    "name": "Tata Motors",
    "currentValue": 120000,
    "investedValue": 140000,
    "source": "Zerodha Kite",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "sector": "Auto"
  },
  {
    "id": "ast_me_stk_5",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Stocks",
    "name": "ITC",
    "currentValue": 90000,
    "investedValue": 80000,
    "source": "Zerodha Kite",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "sector": "FMCG"
  },
  {
    "id": "ast_me_mf_1",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Mutual Funds",
    "name": "Nifty 50 Index Fund",
    "currentValue": 300000,
    "investedValue": 250000,
    "source": "Groww",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "fundKey": "nifty50"
  },
  {
    "id": "ast_me_mf_2",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Mutual Funds",
    "name": "Flexi Cap Fund",
    "currentValue": 220000,
    "investedValue": 180000,
    "source": "Groww",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "fundKey": "flexicap"
  },
  {
    "id": "ast_me_mf_3",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Mutual Funds",
    "name": "Technology Opportunities Fund",
    "currentValue": 150000,
    "investedValue": 120000,
    "source": "Groww",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "fundKey": "techopp"
  },
  {
    "id": "ast_me_mf_4",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Mutual Funds",
    "name": "Mid Cap Fund",
    "currentValue": 140000,
    "investedValue": 100000,
    "source": "Groww",
    "lastUpdated": "2026-11-24T18:30:00Z",
    "fundKey": "midcap"
  },
  {
    "id": "ast_me_ins_1",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Insurance",
    "name": "Life Insurance (Surrender Value)",
    "currentValue": 180000,
    "investedValue": 200000,
    "source": "HDFC Life Portal",
    "lastUpdated": "2026-11-24T18:30:00Z"
  },
  {
    "id": "ast_me_gold_1",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Gold",
    "name": "Digital Gold (24K 999)",
    "currentValue": 150000,
    "investedValue": 110000,
    "source": "MMTC-PAMP / PayTM",
    "lastUpdated": "2026-11-24T18:30:00Z"
  },
  {
    "id": "ast_me_prop_1",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Property",
    "name": "Residential Flat (2BHK, Whitefield)",
    "currentValue": 2800000,
    "investedValue": 2400000,
    "source": "Sub-Registrar / Valuation Model",
    "lastUpdated": "2026-11-24T18:30:00Z"
  },
  {
    "id": "ast_me_prop_2",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Property",
    "name": "Land Parcel (Mysuru Outer Ring)",
    "currentValue": 900000,
    "investedValue": 700000,
    "source": "Guidance Value Registry",
    "lastUpdated": "2026-11-24T18:30:00Z"
  },
  {
    "id": "ast_me_veh_1",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Vehicles",
    "name": "Car (Hyundai Creta 2022)",
    "currentValue": 450000,
    "investedValue": 700000,
    "source": "Vahan Parivahan / Spinny",
    "lastUpdated": "2026-11-24T18:30:00Z"
  },
  {
    "id": "ast_me_veh_2",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Vehicles",
    "name": "Bike (Royal Enfield Hunter)",
    "currentValue": 60000,
    "investedValue": 90000,
    "source": "Vahan Parivahan",
    "lastUpdated": "2026-11-24T18:30:00Z"
  },
  {
    "id": "ast_me_cash_1",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Cash/Deposits",
    "name": "Savings Account",
    "currentValue": 220000,
    "investedValue": 220000,
    "source": "HDFC Bank NetBanking",
    "lastUpdated": "2026-11-24T18:30:00Z"
  },
  {
    "id": "ast_me_cash_2",
    "owner": "Aarav Sharma",
    "memberId": "me",
    "category": "Cash/Deposits",
    "name": "Fixed Deposit (7.25% p.a.)",
    "currentValue": 300000,
    "investedValue": 300000,
    "source": "ICICI Bank Fixed Deposit",
    "lastUpdated": "2026-11-24T18:30:00Z"
  }
];

export const initialFamily = {
  "members": [
    {
      "id": "me",
      "name": "Aarav Sharma",
      "relation": "Me",
      "role": "Primary Account Holder",
      "consent": "granted",
      "avatar": "👨‍💼"
    },
    {
      "id": "father",
      "name": "Father (Rajesh Sharma)",
      "relation": "Father",
      "role": "Family Member",
      "consent": "granted",
      "avatar": "👴"
    },
    {
      "id": "mother",
      "name": "Mother (Sunita Sharma)",
      "relation": "Mother",
      "role": "Family Member",
      "consent": "granted",
      "avatar": "👵"
    }
  ],
  "consentedCount": 0,
  "totalCount": 3
};
