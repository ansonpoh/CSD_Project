const STYLE_ID = 'modern-dashboard-portal-styles';

const STATUS_CLASS_MAP = {
  approved: 'dash-badge dash-badge--success',
  published: 'dash-badge dash-badge--success',
  reviewed: 'dash-badge dash-badge--success',
  active: 'dash-badge dash-badge--success',
  pending_review: 'dash-badge dash-badge--warning',
  needs_review: 'dash-badge dash-badge--warning',
  open: 'dash-badge dash-badge--warning',
  draft: 'dash-badge dash-badge--warning',
  rejected: 'dash-badge dash-badge--danger',
  dismissed: 'dash-badge dash-badge--danger',
  inactive: 'dash-badge dash-badge--muted'
};

export function ensureDashboardPortalStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dash-shell {
      position: fixed;
      inset: 0;
      z-index: 1200;
      overflow: hidden;
      font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
      color: #eef4ff;
    }

    .dash-shell * {
      box-sizing: border-box;
    }

    .dash-shell--contributor {
      --dash-bg-primary: #07111f;
      --dash-bg-secondary: rgba(10, 24, 46, 0.78);
      --dash-surface: rgba(14, 28, 54, 0.78);
      --dash-border: rgba(110, 191, 255, 0.24);
      --dash-accent: #64d2ff;
      --dash-warm: #ffc56d;
      --dash-text-soft: #98b3d9;
      --dash-text-muted: #7d91b3;
      --dash-shadow: rgba(0, 0, 0, 0.42);
    }

    .dash-shell--admin {
      --dash-bg-primary: #140c10;
      --dash-bg-secondary: rgba(29, 16, 18, 0.82);
      --dash-surface: rgba(36, 20, 24, 0.8);
      --dash-border: rgba(255, 163, 123, 0.22);
      --dash-accent: #ff9c6a;
      --dash-warm: #ffd36f;
      --dash-text-soft: #dcb6ab;
      --dash-text-muted: #b58d84;
      --dash-shadow: rgba(0, 0, 0, 0.48);
    }

    .dash-shell__backdrop {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top left, rgba(109, 210, 255, 0.16), transparent 28%),
        radial-gradient(circle at 78% 18%, rgba(255, 197, 109, 0.18), transparent 22%),
        radial-gradient(circle at 78% 78%, rgba(46, 148, 255, 0.18), transparent 26%),
        linear-gradient(145deg, var(--dash-bg-primary), #03070d 72%);
    }

    .dash-shell--admin .dash-shell__backdrop {
      background:
        radial-gradient(circle at top left, rgba(255, 156, 106, 0.16), transparent 26%),
        radial-gradient(circle at 82% 22%, rgba(255, 211, 111, 0.16), transparent 20%),
        radial-gradient(circle at 82% 76%, rgba(255, 107, 107, 0.18), transparent 28%),
        linear-gradient(145deg, var(--dash-bg-primary), #050406 72%);
    }

    .dash-shell__grain {
      position: absolute;
      inset: 0;
      opacity: 0.16;
      background-image:
        linear-gradient(transparent 0, rgba(255, 255, 255, 0.02) 50%, transparent 100%),
        radial-gradient(rgba(255, 255, 255, 0.08) 0.8px, transparent 0.8px);
      background-size: 100% 140px, 18px 18px;
      pointer-events: none;
    }

    .dash-shell__layout {
      position: relative;
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 24px;
      width: 100%;
      height: 100%;
      padding: 24px;
    }

    .dash-sidebar,
    .dash-main {
      position: relative;
      backdrop-filter: blur(18px);
      background: var(--dash-bg-secondary);
      border: 1px solid var(--dash-border);
      box-shadow: 0 28px 70px var(--dash-shadow);
    }

    .dash-sidebar {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 28px 22px;
      border-radius: 28px;
      overflow: auto;
      min-height: 0;
    }

    .dash-main {
      border-radius: 30px;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-height: 0;
    }

    .dash-sidebar::before,
    .dash-main::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 28%);
      pointer-events: none;
    }

    .dash-brand {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dash-brand__eyebrow {
      display: inline-flex;
      align-self: flex-start;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--dash-accent);
      letter-spacing: 0.14em;
      font-size: 11px;
      text-transform: uppercase;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .dash-brand h1 {
      margin: 0;
      font-size: 33px;
      line-height: 1.02;
      letter-spacing: -0.03em;
    }

    .dash-brand p,
    .dash-muted {
      margin: 0;
      color: var(--dash-text-soft);
      line-height: 1.55;
    }

    .dash-profile-card {
      display: grid;
      gap: 6px;
      padding: 16px 18px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .dash-profile-card__label {
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--dash-text-muted);
    }

    .dash-profile-card__value {
      font-size: 17px;
      font-weight: 700;
    }

    .dash-nav {
      display: grid;
      gap: 10px;
    }

    .dash-nav__button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid transparent;
      background: rgba(255, 255, 255, 0.03);
      color: #f2f6ff;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      text-align: left;
    }

    .dash-nav__button:hover,
    .dash-nav__button:focus-visible {
      transform: translateX(4px);
      border-color: rgba(255, 255, 255, 0.09);
      background: rgba(255, 255, 255, 0.07);
      outline: none;
    }

    .dash-nav__button.is-active {
      background: linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.03));
      border-color: rgba(255, 255, 255, 0.12);
    }

    .dash-nav__label {
      font-size: 15px;
      font-weight: 700;
    }

    .dash-nav__hint {
      color: var(--dash-text-muted);
      font-size: 12px;
    }

    .dash-sidebar__actions {
      display: grid;
      gap: 10px;
      margin-top: auto;
      padding-top: 4px;
      position: sticky;
      bottom: 0;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0), var(--dash-bg-secondary) 28%);
    }

    .dash-main__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 26px 28px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .dash-main__title h2 {
      margin: 0;
      font-size: 30px;
      letter-spacing: -0.03em;
    }

    .dash-main__title p {
      margin: 8px 0 0;
      color: var(--dash-text-soft);
    }

    .dash-main__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: flex-end;
    }

    .dash-scroll {
      overflow: auto;
      padding: 24px 28px 28px;
    }

    .dash-section {
      display: none;
      animation: dash-fade 220ms ease;
    }

    .dash-section.is-active {
      display: block;
    }

    .dash-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.9fr);
      gap: 18px;
      margin-bottom: 22px;
    }

    .dash-card {
      position: relative;
      padding: 22px;
      border-radius: 24px;
      background: var(--dash-surface);
      border: 1px solid rgba(255, 255, 255, 0.07);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
      overflow: hidden;
    }

    .dash-card h3,
    .dash-card h4 {
      margin: 0 0 10px;
      letter-spacing: -0.03em;
    }

    .dash-card p {
      margin: 0;
      color: var(--dash-text-soft);
      line-height: 1.55;
    }

    .dash-card__headline,
    .dash-inline {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .dash-grid {
      display: grid;
      gap: 18px;
    }

    .dash-grid--metrics {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 22px;
    }

    .dash-grid--two {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dash-metric {
      display: grid;
      gap: 12px;
      min-height: 148px;
    }

    .dash-metric__label {
      color: var(--dash-text-muted);
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .dash-metric__value {
      font-size: clamp(28px, 3vw, 40px);
      font-weight: 700;
      letter-spacing: -0.05em;
    }

    .dash-metric__delta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--dash-text-soft);
      font-size: 13px;
    }

    .dash-list {
      display: grid;
      gap: 14px;
    }

    .dash-row-card {
      padding: 18px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      display: grid;
      gap: 14px;
    }

    .dash-row-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .dash-row-card__title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    .dash-row-card__meta,
    .dash-detail-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
      color: var(--dash-text-muted);
      font-size: 13px;
    }

    .dash-row-card__body {
      color: #e6edf9;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .dash-form {
      display: grid;
      gap: 18px;
    }

    .dash-form__grid,
    .dash-split {
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dash-field {
      display: grid;
      gap: 8px;
    }

    .dash-field label {
      color: var(--dash-text-soft);
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .dash-input,
    .dash-select,
    .dash-textarea {
      width: 100%;
      padding: 13px 14px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(6, 12, 24, 0.48);
      color: #f4f7ff;
    }

    .dash-textarea {
      min-height: 120px;
      resize: vertical;
      line-height: 1.5;
    }

    .dash-button {
      border: 0;
      border-radius: 16px;
      padding: 12px 16px;
      cursor: pointer;
      font-weight: 700;
      letter-spacing: -0.02em;
      transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
      color: #0c1018;
      background: linear-gradient(135deg, var(--dash-accent), var(--dash-warm));
    }

    .dash-button:hover,
    .dash-button:focus-visible {
      transform: translateY(-1px);
      filter: brightness(1.04);
      outline: none;
    }

    .dash-button:disabled {
      opacity: 0.62;
      cursor: not-allowed;
      transform: none;
    }

    .dash-button--secondary {
      color: #eef4ff;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.07);
    }

    .dash-button--ghost {
      color: #eef4ff;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .dash-button--danger {
      color: #fff5f5;
      background: linear-gradient(135deg, #ff7f7f, #ff5f8b);
    }

    .dash-button--success {
      color: #071711;
      background: linear-gradient(135deg, #73f3a8, #3fd4ae);
    }

    .dash-button-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .dash-status {
      min-height: 22px;
      color: var(--dash-text-soft);
      font-size: 14px;
    }

    .dash-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 8px 0 4px;
    }

    .dash-badge {
      display: inline-flex;
      align-items: center;
      padding: 7px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .dash-badge--warning {
      color: #302100;
      background: #ffd36f;
    }

    .dash-badge--success {
      color: #042012;
      background: #74f0ad;
    }

    .dash-badge--danger {
      color: #30070e;
      background: #ff909e;
    }

    .dash-badge--muted {
      color: #dde6f8;
      background: rgba(255,255,255,0.11);
    }

    .dash-mini-list {
      display: grid;
      gap: 10px;
    }

    .dash-mini-list__item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(255,255,255,0.04);
      color: var(--dash-text-soft);
    }

    .dash-empty {
      padding: 28px 22px;
      border-radius: 22px;
      background: rgba(255,255,255,0.04);
      border: 1px dashed rgba(255,255,255,0.12);
      color: var(--dash-text-soft);
      text-align: center;
      line-height: 1.6;
    }

    .dash-toasts {
      position: fixed;
      right: 22px;
      bottom: 22px;
      display: grid;
      gap: 10px;
      z-index: 1300;
      pointer-events: none;
    }

    .dash-toast {
      min-width: 260px;
      max-width: min(420px, calc(100vw - 40px));
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(8, 14, 26, 0.92);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
      color: #f4f7ff;
      transform: translateY(0);
      opacity: 1;
      transition: transform 200ms ease, opacity 200ms ease;
    }

    .dash-toast.is-exit {
      opacity: 0;
      transform: translateY(8px);
    }

    .dash-link-button {
      border: 0;
      background: transparent;
      padding: 0;
      color: var(--dash-accent);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }

    .dash-link-button:hover,
    .dash-link-button:focus-visible {
      text-decoration: underline;
      outline: none;
    }

    @keyframes dash-fade {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 1200px) {
      .dash-hero,
      .dash-grid--metrics,
      .dash-grid--two,
      .dash-form__grid,
      .dash-split {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 980px) {
      .dash-shell__layout {
        grid-template-columns: 1fr;
        padding: 16px;
      }

      .dash-nav {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .dash-main__header {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    @media (max-width: 720px) {
      .dash-hero,
      .dash-grid--metrics,
      .dash-grid--two,
      .dash-form__grid,
      .dash-split {
        grid-template-columns: 1fr;
      }

      .dash-main__header,
      .dash-scroll {
        padding-left: 18px;
        padding-right: 18px;
      }

      .dash-sidebar {
        padding: 22px 18px;
      }
    }
  `;

  document.head.appendChild(style);
}

export function createDashboardRoot(variant) {
  const root = document.createElement('div');
  root.className = `dash-shell dash-shell--${variant}`;
  return root;
}

export function destroyDashboardRoot(root) {
  if (root?.parentNode) {
    root.parentNode.removeChild(root);
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(String(value));
  return date.toLocaleString();
}

export function previewText(value, maxLength = 200) {
  if (!value) return '';
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

export function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export function renderEmptyState(title, body) {
  return `
    <div class="dash-empty">
      <strong>${escapeHtml(title)}</strong><br/>
      ${escapeHtml(body)}
    </div>
  `;
}

export function renderBadge(label) {
  const normalized = String(label || 'unknown').toLowerCase();
  const className = STATUS_CLASS_MAP[normalized] || 'dash-badge dash-badge--muted';
  return `<span class="${className}">${escapeHtml(label || 'UNKNOWN')}</span>`;
}

export function createToastHost() {
  const host = document.createElement('div');
  host.className = 'dash-toasts';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'false');
  return host;
}

export function showToast(host, message) {
  if (!host) return;
  const toast = document.createElement('div');
  toast.className = 'dash-toast';
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  host.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('is-exit');
    window.setTimeout(() => {
      toast.remove();
    }, 220);
  }, 2400);
}
