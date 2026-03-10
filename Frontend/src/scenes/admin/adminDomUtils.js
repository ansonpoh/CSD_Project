export function createAdminModal({ width, maxHeight }) {
  const modal = document.createElement('div');
  modal.style.position = 'absolute';
  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.width = width;
  modal.style.maxHeight = maxHeight;
  modal.style.overflowY = 'auto';
  modal.style.padding = '24px';
  modal.style.background = 'rgba(42, 23, 19, 0.98)';
  modal.style.border = '2px solid #c8870a';
  modal.style.borderRadius = '10px';
  modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
  modal.style.zIndex = '1000';
  return modal;
}

export function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeCssSelector(value) {
  return String(value).replace(/["\\]/g, '\\$&');
}

export function previewText(value, maxLength) {
  if (!value) return '';
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

export function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function formatMetric(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return Math.round(num).toLocaleString();
}

export function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00%';
  return `${num.toFixed(2)}%`;
}
