import Phaser from 'phaser';
import { supabase } from '../../config/supabaseClient.js';
import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';
import { routeToLogin } from '../shared/authRouting.js';
import {
  createDashboardRoot,
  createToastHost,
  destroyDashboardRoot,
  ensureDashboardPortalStyles,
  escapeHtml,
  formatDate,
  getErrorMessage,
  previewText,
  renderBadge,
  renderEmptyState,
  showToast
} from '../portal/dashboardUi.js';

function metricOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
    this.portalRoot = null;
    this.toastHost = null;
    this.state = {
      activeSection: 'overview',
      adminProfile: null,
      reviewQueue: [],
      flags: [],
      contributors: [],
      telemetry: null,
      maps: [],
      selectedContributorId: null,
      selectedTelemetryMapId: ''
    };
  }

  create() {
    this.cameras.main.setBackgroundColor(0x12080b);
    this.input.enabled = false;
    ensureDashboardPortalStyles();
    this.mountPortal();
    void this.loadDashboard();

    this.events.once('shutdown', () => this.destroyPortal());
    this.events.once('destroy', () => this.destroyPortal());
  }

  mountPortal() {
    this.portalRoot = createDashboardRoot('admin');
    this.portalRoot.innerHTML = `
      <div class="dash-shell__backdrop"></div>
      <div class="dash-shell__grain"></div>
      <div class="dash-shell__layout">
        <aside class="dash-sidebar">
          <div class="dash-brand">
            <span class="dash-brand__eyebrow">Operations Console</span>
            <h1>Admin Command</h1>
            <p>A clean moderation surface for pending lessons, flagged reports, contributor accounts, and encounter telemetry.</p>
          </div>

          <div class="dash-profile-card">
            <span class="dash-profile-card__label">Signed In</span>
            <span class="dash-profile-card__value" id="admin-profile-name">Loading admin...</span>
            <span class="dash-muted" id="admin-profile-subtitle">Fetching admin profile</span>
          </div>

          <nav class="dash-nav">
            <button type="button" class="dash-nav__button is-active" data-action="show-section" data-section="overview">
              <span><span class="dash-nav__label">Overview</span><br/><span class="dash-nav__hint">Queue health and snapshot</span></span>
              <span class="dash-nav__hint">01</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="review">
              <span><span class="dash-nav__label">Review Queue</span><br/><span class="dash-nav__hint">Moderate pending content</span></span>
              <span class="dash-nav__hint">02</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="flags">
              <span><span class="dash-nav__label">Flag Reports</span><br/><span class="dash-nav__hint">Resolve learner complaints</span></span>
              <span class="dash-nav__hint">03</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="contributors">
              <span><span class="dash-nav__label">Contributors</span><br/><span class="dash-nav__hint">Profile and status lookup</span></span>
              <span class="dash-nav__hint">04</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="telemetry">
              <span><span class="dash-nav__label">Telemetry</span><br/><span class="dash-nav__hint">Encounter funnel metrics</span></span>
              <span class="dash-nav__hint">05</span>
            </button>
          </nav>

          <div class="dash-sidebar__actions">
            <button type="button" class="dash-button dash-button--secondary" data-action="refresh-dashboard">Refresh dashboard</button>
            <button type="button" class="dash-button dash-button--ghost" data-action="logout">Logout</button>
          </div>
        </aside>

        <section class="dash-main">
          <header class="dash-main__header">
            <div class="dash-main__title">
              <h2 id="admin-main-title">Overview</h2>
              <p id="admin-main-subtitle">A modern moderation workspace that keeps operational bottlenecks visible.</p>
            </div>
            <div class="dash-main__actions">
              <button type="button" class="dash-button dash-button--secondary" data-action="refresh-current">Refresh current section</button>
              <button type="button" class="dash-button" data-action="show-section" data-section="review">Open review queue</button>
              <button type="button" class="dash-button dash-button--ghost" data-action="logout">Logout</button>
            </div>
          </header>

          <div class="dash-scroll">
            <div id="admin-status" class="dash-status"></div>
            <section class="dash-section is-active" data-section-panel="overview"><div id="admin-overview"></div></section>
            <section class="dash-section" data-section-panel="review"><div id="admin-review"></div></section>
            <section class="dash-section" data-section-panel="flags"><div id="admin-flags"></div></section>
            <section class="dash-section" data-section-panel="contributors"><div id="admin-contributors"></div></section>
            <section class="dash-section" data-section-panel="telemetry"><div id="admin-telemetry"></div></section>
          </div>
        </section>
      </div>
    `;

    this.toastHost = createToastHost();
    this.portalRoot.appendChild(this.toastHost);
    document.body.appendChild(this.portalRoot);

    this.portalRoot.addEventListener('click', this.handleClick);
    this.portalRoot.addEventListener('change', this.handleChange);
  }

  destroyPortal() {
    if (this.portalRoot) {
      this.portalRoot.removeEventListener('click', this.handleClick);
      this.portalRoot.removeEventListener('change', this.handleChange);
    }
    destroyDashboardRoot(this.portalRoot);
    this.portalRoot = null;
    this.toastHost = null;
  }

  handleClick = (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    if (action === 'show-section') {
      event.preventDefault();
      this.showSection(actionEl.dataset.section || 'overview');
      return;
    }
    if (action === 'refresh-dashboard') {
      event.preventDefault();
      void this.loadDashboard();
      return;
    }
    if (action === 'refresh-current') {
      event.preventDefault();
      void this.refreshCurrentSection();
      return;
    }
    if (action === 'logout') {
      event.preventDefault();
      void this.logout();
      return;
    }
    if (action === 'approve-content' || action === 'reject-content') {
      event.preventDefault();
      void this.moderateContent(actionEl.dataset.contentId, action === 'approve-content' ? 'approve' : 'reject');
      return;
    }
    if (action === 'flag-review' || action === 'flag-dismiss') {
      event.preventDefault();
      void this.resolveFlag(actionEl.dataset.flagId, action === 'flag-review' ? 'REVIEWED' : 'DISMISSED');
      return;
    }
    if (action === 'select-contributor' || action === 'show-contributor-panel') {
      event.preventDefault();
      this.state.selectedContributorId = actionEl.dataset.contributorId || null;
      this.renderContributorsSection();
      if (action === 'show-contributor-panel') {
        this.showSection('contributors');
      }
      return;
    }
    if (action === 'ban-contributor' || action === 'unban-contributor') {
      event.preventDefault();
      const contributorId = actionEl.dataset.contributorId;
      if (!contributorId) return;
      void this.toggleContributorStatus(contributorId, action === 'unban-contributor');
    }
  };

  handleChange = (event) => {
    if (event.target?.id === 'telemetry-map-select') {
      this.state.selectedTelemetryMapId = event.target.value || '';
      void this.refreshTelemetry();
    }
  };

  async loadDashboard() {
    this.setStatus('Loading admin dashboard...', false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error('No active admin session');

      const [adminProfile, reviewQueue, flags, contributors, maps, telemetry] = await Promise.all([
        apiService.getAdministratorBySupabaseId(uid).catch(() => null),
        apiService.getContentQueue().catch(() => []),
        apiService.getOpenContentFlags().catch(() => []),
        apiService.getAllContributors().catch(() => []),
        apiService.getAllMaps().catch(() => []),
        apiService.getEncounterTelemetryDashboard().catch(() => null)
      ]);

      this.state.adminProfile = adminProfile;
      this.state.reviewQueue = Array.isArray(reviewQueue) ? reviewQueue : [];
      this.state.flags = Array.isArray(flags) ? flags : [];
      this.state.contributors = Array.isArray(contributors) ? contributors : [];
      this.state.maps = Array.isArray(maps) ? maps : [];
      this.state.telemetry = telemetry;

      if (!this.state.selectedContributorId && this.state.contributors[0]?.contributorId) {
        this.state.selectedContributorId = this.state.contributors[0].contributorId;
      }

      gameState.setAdministrator(adminProfile);
      gameState.setRole('admin');

      this.renderProfile();
      this.renderOverview();
      this.renderReviewSection();
      this.renderFlagsSection();
      this.renderContributorsSection();
      this.renderTelemetrySection();
      this.setStatus('Dashboard refreshed.', false);
    } catch (error) {
      this.renderProfile();
      this.renderOverview(true);
      this.renderReviewSection(true);
      this.renderFlagsSection(true);
      this.renderContributorsSection(true);
      this.renderTelemetrySection(true);
      this.setStatus(getErrorMessage(error, 'Unable to load admin dashboard'), true);
    }
  }

  renderProfile() {
    const nameEl = this.portalRoot?.querySelector('#admin-profile-name');
    const subtitleEl = this.portalRoot?.querySelector('#admin-profile-subtitle');
    if (nameEl) {
      nameEl.textContent = this.state.adminProfile?.fullName || this.state.adminProfile?.email || 'Administrator';
    }
    if (subtitleEl) {
      subtitleEl.textContent = this.state.adminProfile?.email || 'Moderation and operations';
    }
  }

  renderOverview(hasError = false) {
    const container = this.portalRoot?.querySelector('#admin-overview');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Dashboard unavailable', 'We could not load moderation and telemetry data right now.');
      return;
    }

    const telemetry = this.state.telemetry || {};
    const recentReview = [...this.state.reviewQueue].slice(0, 3).map((row) => `
      <div class="dash-mini-list__item">
        <div>
          <strong>${escapeHtml(row?.title || 'Untitled content')}</strong><br/>
          <span class="dash-muted">${escapeHtml(row?.topic?.topicName || 'Unknown topic')}</span>
        </div>
        <div style="text-align:right;">
          ${renderBadge('PENDING_REVIEW')}<br/>
          <span class="dash-muted">${escapeHtml(formatDate(row?.submittedAt))}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="dash-hero">
        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Moderation cockpit</h3>
            ${renderBadge('ADMIN')}
          </div>
          <p>Review, reporting, contributor oversight, and telemetry all live here so admins can move faster without opening modal after modal.</p>
          <div class="dash-button-group" style="margin-top:18px;">
            <button type="button" class="dash-button" data-action="show-section" data-section="review">Process queue</button>
            <button type="button" class="dash-button dash-button--secondary" data-action="show-section" data-section="flags">Resolve reports</button>
          </div>
        </article>

        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Funnel summary</h3>
            <span class="dash-muted">Live snapshot</span>
          </div>
          <div class="dash-mini-list">
            <div class="dash-mini-list__item"><span>Map entered</span><strong>${metricOrZero(telemetry.mapEntered)}</strong></div>
            <div class="dash-mini-list__item"><span>Combat won</span><strong>${metricOrZero(telemetry.combatWon)}</strong></div>
            <div class="dash-mini-list__item"><span>Reward claimed</span><strong>${metricOrZero(telemetry.rewardClaimed)}</strong></div>
          </div>
        </article>
      </div>

      <div class="dash-grid dash-grid--metrics">
        <article class="dash-card dash-metric"><span class="dash-metric__label">Pending review</span><span class="dash-metric__value">${this.state.reviewQueue.length}</span><span class="dash-metric__delta">Content awaiting approval</span></article>
        <article class="dash-card dash-metric"><span class="dash-metric__label">Open flags</span><span class="dash-metric__value">${this.state.flags.length}</span><span class="dash-metric__delta">Learner reports to resolve</span></article>
        <article class="dash-card dash-metric"><span class="dash-metric__label">Contributors</span><span class="dash-metric__value">${this.state.contributors.length}</span><span class="dash-metric__delta">Profiles in the content program</span></article>
        <article class="dash-card dash-metric"><span class="dash-metric__label">Win rate</span><span class="dash-metric__value">${Number(telemetry.winRate || 0).toFixed(1)}%</span><span class="dash-metric__delta">Encounter completion quality</span></article>
      </div>

      <div class="dash-grid dash-grid--two">
        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Newest queue items</h3>
            <button type="button" class="dash-link-button" data-action="show-section" data-section="review">Open queue</button>
          </div>
          <div class="dash-mini-list">
            ${recentReview || renderEmptyState('Queue is clear', 'No content is waiting for moderation right now.')}
          </div>
        </article>

        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Admin focus</h3>
            <span class="dash-muted">Next best action</span>
          </div>
          <p>${this.state.flags.length > 0
            ? 'There are open learner reports waiting for a resolution. Clear those first so content trust stays high.'
            : this.state.reviewQueue.length > 0
              ? 'The review queue has pending lessons. Approving or rejecting them now keeps contributor throughput healthy.'
              : 'Your moderation queues are under control. Use telemetry to inspect where learners are dropping in the encounter flow.'}</p>
          <div class="dash-button-group" style="margin-top:18px;">
            <button type="button" class="dash-button" data-action="show-section" data-section="${this.state.flags.length > 0 ? 'flags' : this.state.reviewQueue.length > 0 ? 'review' : 'telemetry'}">Go there now</button>
            <button type="button" class="dash-button dash-button--ghost" data-action="show-section" data-section="contributors">Open contributor directory</button>
          </div>
        </article>
      </div>
    `;
  }

  renderReviewSection(hasError = false) {
    const container = this.portalRoot?.querySelector('#admin-review');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Review queue unavailable', 'Pending lesson content could not be loaded from the backend.');
      return;
    }

    const contributorMap = Object.fromEntries(
      this.state.contributors.map((contributor) => [contributor.contributorId, contributor])
    );
    const rows = [...this.state.reviewQueue].sort((left, right) => {
      const leftTime = new Date(left?.submittedAt || 0).getTime();
      const rightTime = new Date(right?.submittedAt || 0).getTime();
      return rightTime - leftTime;
    });

    const cards = rows.map((row) => {
      const contributor = contributorMap[row?.contributorId];
      return `
        <article class="dash-row-card">
          <div class="dash-row-card__header">
            <div>
              <div class="dash-row-card__title">${escapeHtml(row?.title || 'Untitled content')}</div>
              <div class="dash-row-card__meta">
                <span>${escapeHtml(row?.topic?.topicName || 'Unknown topic')}</span>
                <span>${escapeHtml(formatDate(row?.submittedAt))}</span>
                <span>${escapeHtml(row?.contentId || 'Missing id')}</span>
              </div>
            </div>
            ${renderBadge('PENDING_REVIEW')}
          </div>
          <div class="dash-row-card__body">${escapeHtml(previewText(row?.body || row?.description || '', 280) || 'No preview available.')}</div>
          <div class="dash-inline">
            <div class="dash-detail-list">
              <span>Contributor:
                <button type="button" class="dash-link-button" data-action="show-contributor-panel" data-contributor-id="${escapeHtml(row?.contributorId || '')}">
                  ${escapeHtml(contributor?.fullName || contributor?.email || row?.contributorId || 'Unknown contributor')}
                </button>
              </span>
            </div>
            <div class="dash-button-group">
              <button type="button" class="dash-button dash-button--success" data-action="approve-content" data-content-id="${escapeHtml(row?.contentId || '')}">Approve</button>
              <button type="button" class="dash-button dash-button--danger" data-action="reject-content" data-content-id="${escapeHtml(row?.contentId || '')}">Reject</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">Pending moderation queue</h3>
            <p>Approve or reject submitted lesson content without bouncing through modal dialogs.</p>
          </div>
          <button type="button" class="dash-button dash-button--secondary" data-action="refresh-current">Refresh queue</button>
        </div>
      </div>
      <div class="dash-list">
        ${cards || renderEmptyState('Queue cleared', 'There is no pending lesson content at the moment.')}
      </div>
    `;
  }

  renderFlagsSection(hasError = false) {
    const container = this.portalRoot?.querySelector('#admin-flags');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Flag queue unavailable', 'Content reports could not be loaded from the backend.');
      return;
    }

    const rows = [...this.state.flags].sort((left, right) => {
      const leftTime = new Date(left?.createdAt || 0).getTime();
      const rightTime = new Date(right?.createdAt || 0).getTime();
      return rightTime - leftTime;
    });

    const cards = rows.map((row) => `
      <article class="dash-row-card">
        <div class="dash-row-card__header">
          <div>
            <div class="dash-row-card__title">${escapeHtml(row?.content?.title || 'Untitled content')}</div>
            <div class="dash-row-card__meta">
              <span>${escapeHtml(row?.content?.topic?.topicName || 'Unknown topic')}</span>
              <span>${escapeHtml(formatDate(row?.createdAt))}</span>
              <span>${escapeHtml(row?.reason || 'UNKNOWN')}</span>
            </div>
          </div>
          ${renderBadge('OPEN')}
        </div>
        <div class="dash-row-card__body">${escapeHtml(row?.details || 'No additional details provided.')}</div>
        <div class="dash-detail-list">
          <span>Reported by: ${escapeHtml(row?.reportedBy?.username || row?.reportedBy?.learnerId || row?.reportedBy || 'Unknown learner')}</span>
          <span>Content ID: ${escapeHtml(row?.content?.contentId || 'Unknown')}</span>
        </div>
        <textarea class="dash-textarea" data-flag-notes="${escapeHtml(row?.contentFlagId || '')}" placeholder="Resolution notes (required when dismissing)"></textarea>
        <div class="dash-button-group">
          <button type="button" class="dash-button dash-button--success" data-action="flag-review" data-flag-id="${escapeHtml(row?.contentFlagId || '')}">Mark reviewed</button>
          <button type="button" class="dash-button dash-button--danger" data-action="flag-dismiss" data-flag-id="${escapeHtml(row?.contentFlagId || '')}">Dismiss</button>
        </div>
      </article>
    `).join('');

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">Open content reports</h3>
            <p>Resolve learner flags with clearer notes and less modal friction.</p>
          </div>
          <button type="button" class="dash-button dash-button--secondary" data-action="refresh-current">Refresh reports</button>
        </div>
      </div>
      <div class="dash-list">
        ${cards || renderEmptyState('No open reports', 'There are no flagged content reports waiting for review.')}
      </div>
    `;
  }

  renderContributorsSection(hasError = false) {
    const container = this.portalRoot?.querySelector('#admin-contributors');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Contributor directory unavailable', 'Contributor profiles could not be loaded right now.');
      return;
    }

    const selected = this.state.contributors.find((contributor) => contributor.contributorId === this.state.selectedContributorId)
      || this.state.contributors[0]
      || null;

    const directory = this.state.contributors.map((contributor) => `
      <button type="button" class="dash-row-card" data-action="select-contributor" data-contributor-id="${escapeHtml(contributor.contributorId || '')}" style="text-align:left;">
        <div class="dash-row-card__header">
          <div class="dash-row-card__title">${escapeHtml(contributor.fullName || contributor.email || 'Unknown contributor')}</div>
          ${renderBadge(contributor.isActive ? 'ACTIVE' : 'INACTIVE')}
        </div>
        <div class="dash-row-card__meta">
          <span>${escapeHtml(contributor.email || 'No email')}</span>
          <span>${escapeHtml(contributor.contributorId || 'Unknown id')}</span>
        </div>
        <div class="dash-row-card__body">${escapeHtml(previewText(contributor.bio || 'No bio provided.', 140))}</div>
      </button>
    `).join('');

    const details = selected ? `
      <article class="dash-card">
        <div class="dash-card__headline">
          <h3>${escapeHtml(selected.fullName || selected.email || 'Contributor')}</h3>
          ${renderBadge(selected.isActive ? 'ACTIVE' : 'INACTIVE')}
        </div>
        <div class="dash-mini-list">
          <div class="dash-mini-list__item"><span>Email</span><strong>${escapeHtml(selected.email || 'Unknown')}</strong></div>
          <div class="dash-mini-list__item"><span>Contributor ID</span><strong>${escapeHtml(selected.contributorId || 'Unknown')}</strong></div>
          <div class="dash-mini-list__item"><span>Supabase User ID</span><strong>${escapeHtml(selected.supabaseUserId || 'Unknown')}</strong></div>
          <div class="dash-mini-list__item"><span>Created</span><strong>${escapeHtml(formatDate(selected.createdAt))}</strong></div>
          <div class="dash-mini-list__item"><span>Updated</span><strong>${escapeHtml(formatDate(selected.updatedAt))}</strong></div>
        </div>
        <div class="dash-divider"></div>
        <p>${escapeHtml(selected.bio || 'No bio provided.')}</p>
        <div class="dash-button-group" style="margin-top:18px;">
          ${selected.isActive
            ? `<button type="button" class="dash-button dash-button--danger" data-action="ban-contributor" data-contributor-id="${escapeHtml(selected.contributorId || '')}">Ban contributor</button>`
            : `<button type="button" class="dash-button dash-button--success" data-action="unban-contributor" data-contributor-id="${escapeHtml(selected.contributorId || '')}">Unban contributor</button>`}
        </div>
      </article>
    ` : renderEmptyState('No contributors found', 'Once contributor accounts exist, this directory will show their profile details.');

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">Contributor directory</h3>
            <p>Browse contributor profiles and inspect details without leaving the dashboard.</p>
          </div>
          <button type="button" class="dash-button dash-button--secondary" data-action="refresh-current">Refresh contributors</button>
        </div>
      </div>
      <div class="dash-split">
        <div class="dash-list">
          ${directory || renderEmptyState('No contributors yet', 'Contributor accounts will appear here once they are created.')}
        </div>
        <div>${details}</div>
      </div>
    `;
  }

  renderTelemetrySection(hasError = false) {
    const container = this.portalRoot?.querySelector('#admin-telemetry');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Telemetry unavailable', 'Encounter funnel metrics could not be loaded from the game service.');
      return;
    }

    const telemetry = this.state.telemetry || {};
    const mapOptions = [
      '<option value="">All maps</option>',
      ...this.state.maps.map((map) => (
        `<option value="${escapeHtml(map?.mapId || '')}"${this.state.selectedTelemetryMapId === map?.mapId ? ' selected' : ''}>${escapeHtml(map?.name || 'Unnamed map')}</option>`
      ))
    ].join('');

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">Encounter telemetry</h3>
            <p>Filter by map to inspect where learners are entering, fighting, winning, and claiming rewards.</p>
          </div>
          <div class="dash-button-group">
            <select id="telemetry-map-select" class="dash-select" style="min-width:220px;">${mapOptions}</select>
            <button type="button" class="dash-button dash-button--secondary" data-action="refresh-current">Refresh telemetry</button>
          </div>
        </div>
      </div>

      <div class="dash-grid dash-grid--metrics">
        <article class="dash-card dash-metric"><span class="dash-metric__label">Map entered</span><span class="dash-metric__value">${metricOrZero(telemetry.mapEntered)}</span><span class="dash-metric__delta">Learner sessions entering a map</span></article>
        <article class="dash-card dash-metric"><span class="dash-metric__label">Combat started</span><span class="dash-metric__value">${metricOrZero(telemetry.combatStarted)}</span><span class="dash-metric__delta">Encounter attempts initiated</span></article>
        <article class="dash-card dash-metric"><span class="dash-metric__label">Combat won</span><span class="dash-metric__value">${metricOrZero(telemetry.combatWon)}</span><span class="dash-metric__delta">Successful encounter completions</span></article>
        <article class="dash-card dash-metric"><span class="dash-metric__label">Reward claimed</span><span class="dash-metric__value">${metricOrZero(telemetry.rewardClaimed)}</span><span class="dash-metric__delta">Learners finishing the loop</span></article>
      </div>

      <div class="dash-grid dash-grid--two">
        <article class="dash-card">
          <div class="dash-card__headline"><h3>Conversion rates</h3><span class="dash-muted">Percentages</span></div>
          <div class="dash-mini-list">
            <div class="dash-mini-list__item"><span>Talk rate</span><strong>${Number(telemetry.talkRate || 0).toFixed(2)}%</strong></div>
            <div class="dash-mini-list__item"><span>Unlock rate</span><strong>${Number(telemetry.unlockRate || 0).toFixed(2)}%</strong></div>
            <div class="dash-mini-list__item"><span>Win rate</span><strong>${Number(telemetry.winRate || 0).toFixed(2)}%</strong></div>
            <div class="dash-mini-list__item"><span>Loss rate</span><strong>${Number(telemetry.lossRate || 0).toFixed(2)}%</strong></div>
            <div class="dash-mini-list__item"><span>Reward claim rate</span><strong>${Number(telemetry.rewardClaimRate || 0).toFixed(2)}%</strong></div>
          </div>
        </article>
        <article class="dash-card">
          <div class="dash-card__headline"><h3>Interpretation</h3><span class="dash-muted">What to watch</span></div>
          <p>${Number(telemetry.rewardClaimRate || 0) < 30
            ? 'Reward claim rate is low, which suggests learners are dropping before the final loop completes. Inspect map flow and encounter difficulty.'
            : Number(telemetry.winRate || 0) < 50
              ? 'Win rate is under half, so difficulty or encounter clarity may be too harsh. Review monster pairing and combat pacing.'
              : 'The encounter funnel looks relatively healthy. Use map-specific filtering to isolate where learners still lose momentum.'}</p>
        </article>
      </div>
    `;
  }

  async moderateContent(contentId, action) {
    if (!contentId) return;
    this.setStatus(action === 'approve' ? 'Approving content...' : 'Rejecting content...', false);

    try {
      if (action === 'approve') {
        await apiService.approveContent(contentId);
        showToast(this.toastHost, 'Content approved.');
      } else {
        await apiService.rejectContent(contentId);
        showToast(this.toastHost, 'Content rejected.');
      }

      this.state.reviewQueue = this.state.reviewQueue.filter((row) => row?.contentId !== contentId);
      this.renderOverview();
      this.renderReviewSection();
      this.setStatus('Review queue updated.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to update content moderation status'), true);
    }
  }

  async resolveFlag(flagId, status) {
    if (!flagId) return;

    const notesEl = this.portalRoot?.querySelector(`[data-flag-notes="${CSS.escape(flagId)}"]`);
    const resolutionNotes = notesEl?.value?.trim() || '';
    if (status === 'DISMISSED' && !resolutionNotes) {
      this.setStatus('Resolution notes are required before dismissing a flag.', true);
      return;
    }

    this.setStatus(status === 'REVIEWED' ? 'Marking flag as reviewed...' : 'Dismissing flag...', false);

    try {
      await apiService.reviewContentFlag(flagId, {
        status,
        resolutionNotes: resolutionNotes || null
      });

      this.state.flags = this.state.flags.filter((row) => row?.contentFlagId !== flagId);
      this.renderOverview();
      this.renderFlagsSection();
      showToast(this.toastHost, status === 'REVIEWED' ? 'Flag marked reviewed.' : 'Flag dismissed.');
      this.setStatus('Flag queue updated.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to resolve content flag'), true);
    }
  }

  async refreshCurrentSection() {
    if (this.state.activeSection === 'telemetry') {
      await this.refreshTelemetry();
      return;
    }
    await this.loadDashboard();
  }

  async refreshTelemetry() {
    this.setStatus('Refreshing telemetry...', false);
    try {
      this.state.telemetry = await apiService.getEncounterTelemetryDashboard(this.state.selectedTelemetryMapId || null);
      this.renderTelemetrySection();
      this.setStatus('Telemetry refreshed.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to refresh telemetry'), true);
    }
  }

  async toggleContributorStatus(contributorId, shouldActivate) {
    this.setStatus(shouldActivate ? 'Reactivating contributor...' : 'Banning contributor...', false);
    try {
      if (shouldActivate) {
        await apiService.updateContributor(contributorId, { isActive: true });
      } else {
        await apiService.deactivateContributor(contributorId);
      }

      this.state.contributors = this.state.contributors.map((contributor) => {
        if (contributor?.contributorId !== contributorId) return contributor;
        return {
          ...contributor,
          isActive: shouldActivate
        };
      });

      this.renderOverview();
      this.renderContributorsSection();
      showToast(this.toastHost, shouldActivate ? 'Contributor reactivated.' : 'Contributor banned.');
      this.setStatus('Contributor status updated.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to update contributor status'), true);
    }
  }

  setStatus(message, isError) {
    const statusEl = this.portalRoot?.querySelector('#admin-status');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? '#ffb8c6' : '';
  }

  showSection(section) {
    this.state.activeSection = section;
    const config = {
      overview: ['Overview', 'A modern moderation workspace that keeps operational bottlenecks visible.'],
      review: ['Review Queue', 'Approve or reject submitted lesson content in a cleaner flow.'],
      flags: ['Flag Reports', 'Resolve learner reports and keep audit notes attached to the decision.'],
      contributors: ['Contributors', 'Inspect contributor profiles and active status without modal sprawl.'],
      telemetry: ['Telemetry', 'Inspect encounter funnel metrics with optional map filtering.']
    };

    this.portalRoot?.querySelectorAll('.dash-nav__button[data-section]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.section === section);
    });
    this.portalRoot?.querySelectorAll('.dash-section').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.sectionPanel === section);
    });

    const [title, subtitle] = config[section] || config.overview;
    const titleEl = this.portalRoot?.querySelector('#admin-main-title');
    const subtitleEl = this.portalRoot?.querySelector('#admin-main-subtitle');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  async logout() {
    await supabase.auth.signOut();
    gameState.clearState();
    routeToLogin(this, { hardReload: true });
  }
}
