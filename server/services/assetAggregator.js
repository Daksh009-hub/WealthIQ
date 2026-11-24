// services/assetAggregator.js
// Production implementation can connect to authorised Account Aggregator / broker / financial-data providers. PAN alone does not grant unrestricted access to a person's assets.

import { INITIAL_ASSETS, INITIAL_LIABILITIES, INITIAL_MEMBERS } from '../data/mockData.js';

let assetsState = JSON.parse(JSON.stringify(INITIAL_ASSETS));
let liabilitiesState = JSON.parse(JSON.stringify(INITIAL_LIABILITIES));
let membersState = JSON.parse(JSON.stringify(INITIAL_MEMBERS));
let syncCount = 0;
let lastSyncTimestamp = new Date().toISOString();

export function getUserAssets() {
  return assetsState.filter(a => a.memberId === 'me');
}

export function getUserLiabilities() {
  return liabilitiesState.filter(l => l.memberId === 'me');
}

export function getFamilyMembers() {
  return membersState;
}

export function toggleMemberConsent(memberId, consentStatus) {
  const member = membersState.find(m => m.id === memberId);
  if (member) {
    if (consentStatus) {
      member.consent = consentStatus;
    } else {
      member.consent = member.consent === 'granted' ? 'pending' : 'granted';
    }
  }
  return membersState;
}

export function getFamilyAssets() {
  const consentedMemberIds = membersState
    .filter(m => m.consent === 'granted')
    .map(m => m.id);
  return assetsState.filter(a => consentedMemberIds.includes(a.memberId));
}

export function getFamilyLiabilities() {
  const consentedMemberIds = membersState
    .filter(m => m.consent === 'granted')
    .map(m => m.id);
  return liabilitiesState.filter(l => consentedMemberIds.includes(l.memberId));
}

export function getLastSyncTime() {
  return lastSyncTimestamp;
}

export function syncPortfolio() {
  const now = new Date().toISOString();
  lastSyncTimestamp = now;
  syncCount += 1;

  let toastMessage = '';
  let transactionDetails = {};

  if (syncCount === 1) {
    // PRD Section 11:
    // Tata Motors (Aarav) changes from ₹1,20,000 to ₹80,000 and the ₹40,000 is credited to Savings.
    const tataStock = assetsState.find(a => a.memberId === 'me' && a.name === 'Tata Motors');
    const savings = assetsState.find(a => a.memberId === 'me' && a.name === 'Savings Account');

    const previousTata = tataStock ? tataStock.currentValue : 120000;
    const previousSavings = savings ? savings.currentValue : 220000;

    if (tataStock) {
      tataStock.currentValue = 80000;
      tataStock.lastUpdated = now;
    }
    if (savings) {
      savings.currentValue = 260000;
      savings.lastUpdated = now;
    }

    toastMessage = 'Simulated Broker Sync: Sold ₹40,000 Tata Motors shares; proceeds credited to HDFC Savings. Recalculated portfolio.';
    transactionDetails = {
      type: 'rebalance',
      assetModified: 'Tata Motors',
      previousValue: previousTata,
      newValue: 80000,
      delta: -40000,
      creditedTo: 'Savings Account',
      previousSavings,
      newSavings: 260000,
      syncCount
    };
  } else {
    // Subsequent syncs apply small random value drifts to stocks and funds
    const equityAssets = assetsState.filter(a => a.category === 'Stocks' || a.category === 'Mutual Funds');
    const drifts = [];

    equityAssets.forEach(asset => {
      // Drift between -2.5% and +2.5%
      const driftPercent = (Math.random() * 5 - 2.5) / 100;
      const oldValue = asset.currentValue;
      const newValue = Math.round(oldValue * (1 + driftPercent) / 100) * 100;
      asset.currentValue = newValue;
      asset.lastUpdated = now;
      drifts.push({ name: asset.name, delta: newValue - oldValue });
    });

    toastMessage = `Simulated Broker Sync #${syncCount}: Price drift applied to ${equityAssets.length} equity/fund holdings. Timestamps refreshed.`;
    transactionDetails = {
      type: 'market_drift',
      syncCount,
      driftsSummary: drifts.slice(0, 4)
    };
  }

  return {
    syncCount,
    lastSyncTime: now,
    toastMessage,
    transactionDetails
  };
}

export function resetToInitial() {
  assetsState = JSON.parse(JSON.stringify(INITIAL_ASSETS));
  liabilitiesState = JSON.parse(JSON.stringify(INITIAL_LIABILITIES));
  membersState = JSON.parse(JSON.stringify(INITIAL_MEMBERS));
  syncCount = 0;
  lastSyncTimestamp = new Date().toISOString();
}
