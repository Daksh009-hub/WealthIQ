// utils/formatters.js

export function formatINR(val, options = {}) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const num = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (options.compact !== false) {
    if (num >= 10000000) {
      return `${sign}₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `${sign}₹${(num / 100000).toFixed(2)} Lakh`;
    }
  }

  return `${sign}₹${num.toLocaleString('en-IN')}`;
}

export function formatPercent(val, decimals = 1) {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}%`;
}

export function formatDateTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' +
           d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}
