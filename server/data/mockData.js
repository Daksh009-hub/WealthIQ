// Mock financial data (Clearly labelled Demo / Sandbox Data)
// Production implementation can connect to authorised Account Aggregator / broker / financial-data providers. PAN alone does not grant unrestricted access to a person's assets.

export const FUND_LOOKTHROUGH = {
  nifty50: {
    name: 'Nifty 50 Index',
    sectorWeights: {
      Financials: 36,
      Technology: 13,
      Energy: 10,
      FMCG: 8,
      Auto: 6,
      Other: 27
    },
    topCompanies: {
      'HDFC Bank': 13,
      'Reliance': 9,
      'Infosys': 6,
      'ITC': 4,
      'Tata Motors': 2
    }
  },
  flexicap: {
    name: 'Flexi Cap Fund',
    sectorWeights: {
      Technology: 25,
      Financials: 25,
      Auto: 8,
      Healthcare: 10,
      Other: 32
    },
    topCompanies: {
      'HDFC Bank': 8,
      'Infosys': 7,
      'Reliance': 5
    }
  },
  techopp: {
    name: 'Technology Opportunities Fund',
    sectorWeights: {
      Technology: 80,
      Financials: 5,
      Other: 15
    },
    topCompanies: {
      'Infosys': 20
    }
  },
  midcap: {
    name: 'Mid Cap Fund',
    sectorWeights: {
      Technology: 12,
      Financials: 12,
      Auto: 14,
      Industrials: 20,
      Healthcare: 12,
      Other: 30
    },
    topCompanies: {
      'Tata Motors': 4
    }
  }
};

export const INITIAL_MEMBERS = [
  {
    id: 'me',
    name: 'Aarav Sharma',
    relation: 'Me',
    role: 'Primary Account Holder',
    consent: 'granted',
    avatar: '👨‍💼'
  },
  {
    id: 'father',
    name: 'Father (Rajesh Sharma)',
    relation: 'Father',
    role: 'Family Member',
    consent: 'granted',
    avatar: '👴'
  },
  {
    id: 'mother',
    name: 'Mother (Sunita Sharma)',
    relation: 'Mother',
    role: 'Family Member',
    consent: 'granted',
    avatar: '👵'
  }
];

export const INITIAL_ASSETS = [
  // --- Aarav Sharma (Me) ---
  // Direct Stocks
  {
    id: 'ast_me_stk_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Stocks',
    name: 'Reliance Industries',
    currentValue: 180000,
    investedValue: 150000,
    source: 'Zerodha Kite',
    lastUpdated: '2026-11-24T18:30:00Z',
    sector: 'Energy'
  },
  {
    id: 'ast_me_stk_2',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Stocks',
    name: 'HDFC Bank',
    currentValue: 210000,
    investedValue: 190000,
    source: 'Zerodha Kite',
    lastUpdated: '2026-11-24T18:30:00Z',
    sector: 'Financials'
  },
  {
    id: 'ast_me_stk_3',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Stocks',
    name: 'Infosys',
    currentValue: 260000,
    investedValue: 200000,
    source: 'Zerodha Kite',
    lastUpdated: '2026-11-24T18:30:00Z',
    sector: 'Technology'
  },
  {
    id: 'ast_me_stk_4',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Stocks',
    name: 'Tata Motors',
    currentValue: 120000,
    investedValue: 140000,
    source: 'Zerodha Kite',
    lastUpdated: '2026-11-24T18:30:00Z',
    sector: 'Auto'
  },
  {
    id: 'ast_me_stk_5',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Stocks',
    name: 'ITC',
    currentValue: 90000,
    investedValue: 80000,
    source: 'Zerodha Kite',
    lastUpdated: '2026-11-24T18:30:00Z',
    sector: 'FMCG'
  },
  // Mutual Funds
  {
    id: 'ast_me_mf_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Mutual Funds',
    name: 'Nifty 50 Index Fund',
    currentValue: 300000,
    investedValue: 250000,
    source: 'Groww',
    lastUpdated: '2026-11-24T18:30:00Z',
    fundKey: 'nifty50'
  },
  {
    id: 'ast_me_mf_2',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Mutual Funds',
    name: 'Flexi Cap Fund',
    currentValue: 220000,
    investedValue: 180000,
    source: 'Groww',
    lastUpdated: '2026-11-24T18:30:00Z',
    fundKey: 'flexicap'
  },
  {
    id: 'ast_me_mf_3',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Mutual Funds',
    name: 'Technology Opportunities Fund',
    currentValue: 150000,
    investedValue: 120000,
    source: 'Groww',
    lastUpdated: '2026-11-24T18:30:00Z',
    fundKey: 'techopp'
  },
  {
    id: 'ast_me_mf_4',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Mutual Funds',
    name: 'Mid Cap Fund',
    currentValue: 140000,
    investedValue: 100000,
    source: 'Groww',
    lastUpdated: '2026-11-24T18:30:00Z',
    fundKey: 'midcap'
  },
  // Insurance
  {
    id: 'ast_me_ins_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Insurance',
    name: 'Life Insurance (Surrender Value)',
    currentValue: 180000,
    investedValue: 200000,
    source: 'HDFC Life Portal',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  // Gold
  {
    id: 'ast_me_gold_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Gold',
    name: 'Digital Gold (24K 999)',
    currentValue: 150000,
    investedValue: 110000,
    source: 'MMTC-PAMP / PayTM',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  // Property
  {
    id: 'ast_me_prop_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Property',
    name: 'Residential Flat (2BHK, Whitefield)',
    currentValue: 2800000,
    investedValue: 2400000,
    source: 'Sub-Registrar / Valuation Model',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  {
    id: 'ast_me_prop_2',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Property',
    name: 'Land Parcel (Mysuru Outer Ring)',
    currentValue: 900000,
    investedValue: 700000,
    source: 'Guidance Value Registry',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  // Vehicles
  {
    id: 'ast_me_veh_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Vehicles',
    name: 'Car (Hyundai Creta 2022)',
    currentValue: 450000,
    investedValue: 700000,
    source: 'Vahan Parivahan / Spinny',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  {
    id: 'ast_me_veh_2',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Vehicles',
    name: 'Bike (Royal Enfield Hunter)',
    currentValue: 60000,
    investedValue: 90000,
    source: 'Vahan Parivahan',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  // Cash / Deposits
  {
    id: 'ast_me_cash_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Cash/Deposits',
    name: 'Savings Account',
    currentValue: 220000,
    investedValue: 220000,
    source: 'HDFC Bank NetBanking',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  {
    id: 'ast_me_cash_2',
    owner: 'Aarav Sharma',
    memberId: 'me',
    category: 'Cash/Deposits',
    name: 'Fixed Deposit (7.25% p.a.)',
    currentValue: 300000,
    investedValue: 300000,
    source: 'ICICI Bank Fixed Deposit',
    lastUpdated: '2026-11-24T18:30:00Z'
  },

  // --- Father ---
  {
    id: 'ast_fa_stk_1',
    owner: 'Father',
    memberId: 'father',
    category: 'Stocks',
    name: 'Reliance Industries',
    currentValue: 400000,
    investedValue: 300000,
    source: 'ICICI Direct',
    lastUpdated: '2026-11-24T18:30:00Z',
    sector: 'Energy'
  },
  {
    id: 'ast_fa_stk_2',
    owner: 'Father',
    memberId: 'father',
    category: 'Stocks',
    name: 'HDFC Bank',
    currentValue: 350000,
    investedValue: 280000,
    source: 'ICICI Direct',
    lastUpdated: '2026-11-24T18:30:00Z',
    sector: 'Financials'
  },
  {
    id: 'ast_fa_mf_1',
    owner: 'Father',
    memberId: 'father',
    category: 'Mutual Funds',
    name: 'Nifty 50 Index Fund',
    currentValue: 500000,
    investedValue: 400000,
    source: 'CAMS eKYC',
    lastUpdated: '2026-11-24T18:30:00Z',
    fundKey: 'nifty50'
  },
  {
    id: 'ast_fa_prop_1',
    owner: 'Father',
    memberId: 'father',
    category: 'Property',
    name: 'Ancestral House (Jaipur)',
    currentValue: 4500000,
    investedValue: 3800000,
    source: 'Family Deed / Registry',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  {
    id: 'ast_fa_cash_1',
    owner: 'Father',
    memberId: 'father',
    category: 'Cash/Deposits',
    name: 'Fixed Deposit (Senior Citizen)',
    currentValue: 800000,
    investedValue: 800000,
    source: 'State Bank of India',
    lastUpdated: '2026-11-24T18:30:00Z'
  },

  // --- Mother ---
  {
    id: 'ast_mo_ins_1',
    owner: 'Mother',
    memberId: 'mother',
    category: 'Insurance',
    name: 'Life Insurance Policy',
    currentValue: 250000,
    investedValue: 280000,
    source: 'LIC of India',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  {
    id: 'ast_mo_gold_1',
    owner: 'Mother',
    memberId: 'mother',
    category: 'Gold',
    name: 'Physical Gold Jewellery (Hallmarked)',
    currentValue: 600000,
    investedValue: 400000,
    source: 'Tanishq Vault / Locker',
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  {
    id: 'ast_mo_mf_1',
    owner: 'Mother',
    memberId: 'mother',
    category: 'Mutual Funds',
    name: 'Flexi Cap Fund',
    currentValue: 300000,
    investedValue: 250000,
    source: 'KFintech Portal',
    lastUpdated: '2026-11-24T18:30:00Z',
    fundKey: 'flexicap'
  },
  {
    id: 'ast_mo_cash_1',
    owner: 'Mother',
    memberId: 'mother',
    category: 'Cash/Deposits',
    name: 'Fixed Deposit',
    currentValue: 500000,
    investedValue: 500000,
    source: 'Bank of Baroda',
    lastUpdated: '2026-11-24T18:30:00Z'
  }
];

export const INITIAL_LIABILITIES = [
  {
    id: 'lia_me_1',
    owner: 'Aarav Sharma',
    memberId: 'me',
    name: 'Car Loan (HDFC)',
    amount: 150000,
    category: 'Auto Loan',
    institution: 'HDFC Bank',
    emi: 14200,
    lastUpdated: '2026-11-24T18:30:00Z'
  },
  {
    id: 'lia_fa_1',
    owner: 'Father',
    memberId: 'father',
    name: 'Home Loan (SBI)',
    amount: 600000,
    category: 'Home Loan',
    institution: 'State Bank of India',
    emi: 35000,
    lastUpdated: '2026-11-24T18:30:00Z'
  }
];
