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

const TILESET_IMAGE_PATHS = {
  'terrain_tiles_v2.1': 'assets/basic_tileset_and_assets_standard/terrain_tiles_v2.1.png',
  'stone_tiles_v2.1': 'assets/basic_tileset_and_assets_standard/stone_tiles_v2.1.png',
  'tiles-all-32x32': 'assets/basic caves and dungeons 32x32 standard - v1.0/tiles/tiles-all-32x32.png',
  'assets-all': 'assets/basic caves and dungeons 32x32 standard - v1.0/assets/assets-all.png',
  'water_and_island_tiles_v2.1': 'assets/basic_tileset_and_assets_standard/water_and_island_tiles_v2.1.png',
  'fence_tiles': 'assets/basic_tileset_and_assets_standard/fence_tiles.png',
  '1_Terrains_and_Fences_32x32': 'assets/map4/1_Terrains_and_Fences_32x32.png',
  '7_Villas_32x32': 'assets/map4/7_Villas_32x32.png',
  '17_Garden_32x32': 'assets/map4/17_Garden_32x32.png'
};

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
    this.portalRoot = null;
    this.toastHost = null;
    this.mapPreviewTilesetImageCache = new Map();
    this.state = {
      activeSection: 'overview',
      adminProfile: null,
      reviewQueue: [],
      mapReviewQueue: [],
      approvedUnpublishedMaps: [],
      flags: [],
      contributors: [],
      telemetry: null,
      maps: [],
      topics: [],
      selectedContributorId: null,
      selectedTelemetryMapId: '',
      mapPreviewByMapId: {}
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
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="map-review">
              <span><span class="dash-nav__label">Map Review</span><br/><span class="dash-nav__hint">Approve, reject, then publish maps</span></span>
              <span class="dash-nav__hint">03</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="flags">
              <span><span class="dash-nav__label">Flag Reports</span><br/><span class="dash-nav__hint">Resolve learner complaints</span></span>
              <span class="dash-nav__hint">04</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="contributors">
              <span><span class="dash-nav__label">Contributors</span><br/><span class="dash-nav__hint">Profile and status lookup</span></span>
              <span class="dash-nav__hint">05</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="telemetry">
              <span><span class="dash-nav__label">Telemetry</span><br/><span class="dash-nav__hint">Encounter funnel metrics</span></span>
              <span class="dash-nav__hint">06</span>
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
            <section class="dash-section" data-section-panel="map-review"><div id="admin-map-review"></div></section>
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
    if (action === 'approve-map' || action === 'reject-map') {
      event.preventDefault();
      void this.moderateMapSubmission(actionEl.dataset.mapId, action === 'approve-map' ? 'approve' : 'reject');
      return;
    }
    if (action === 'publish-map') {
      event.preventDefault();
      void this.publishApprovedMap(actionEl.dataset.mapId);
      return;
    }
    if (action === 'create-topic') {
      event.preventDefault();
      void this.createTopicForMapPublishing();
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

      const [
        adminProfile,
        reviewQueue,
        mapReviewQueue,
        approvedUnpublishedMaps,
        flags,
        contributors,
        maps,
        topics,
        telemetry
      ] = await Promise.all([
        apiService.getAdministratorBySupabaseId(uid).catch(() => null),
        apiService.getContentQueue().catch(() => []),
        apiService.getMapReviewQueue().catch(() => []),
        apiService.getApprovedUnpublishedMaps().catch(() => []),
        apiService.getOpenContentFlags().catch(() => []),
        apiService.getAllContributors().catch(() => []),
        apiService.getAllMaps().catch(() => []),
        apiService.getAllTopics().catch(() => []),
        apiService.getEncounterTelemetryDashboard().catch(() => null)
      ]);

      this.state.adminProfile = adminProfile;
      this.state.reviewQueue = Array.isArray(reviewQueue) ? reviewQueue : [];
      this.state.mapReviewQueue = Array.isArray(mapReviewQueue) ? mapReviewQueue : [];
      this.state.approvedUnpublishedMaps = Array.isArray(approvedUnpublishedMaps) ? approvedUnpublishedMaps : [];
      this.state.flags = Array.isArray(flags) ? flags : [];
      this.state.contributors = Array.isArray(contributors) ? contributors : [];
      this.state.maps = Array.isArray(maps) ? maps : [];
      this.state.topics = Array.isArray(topics) ? topics : [];
      this.state.telemetry = telemetry;
      this.primeMapPreviews(this.state.mapReviewQueue);

      if (!this.state.selectedContributorId && this.state.contributors[0]?.contributorId) {
        this.state.selectedContributorId = this.state.contributors[0].contributorId;
      }

      gameState.setAdministrator(adminProfile);
      gameState.setRole('admin');

      this.renderProfile();
      this.renderOverview();
      this.renderReviewSection();
      this.renderMapReviewSection();
      this.renderFlagsSection();
      this.renderContributorsSection();
      this.renderTelemetrySection();
      this.setStatus('Dashboard refreshed.', false);
    } catch (error) {
      this.renderProfile();
      this.renderOverview(true);
      this.renderReviewSection(true);
      this.renderMapReviewSection(true);
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

  renderMapReviewSection(hasError = false) {
    const container = this.portalRoot?.querySelector('#admin-map-review');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Map review unavailable', 'Map moderation queues could not be loaded.');
      return;
    }

    const pendingCards = [...(this.state.mapReviewQueue || [])].map((row) => `
      <article class="dash-row-card">
        <div class="dash-row-card__header">
          <div>
            <div class="dash-row-card__title">${escapeHtml(row?.name || 'Untitled map')}</div>
            <div class="dash-row-card__meta">
              <span>${escapeHtml(row?.mapId || 'Unknown id')}</span>
              <span>${escapeHtml(row?.asset || 'No asset')}</span>
            </div>
          </div>
          ${renderBadge('PENDING_REVIEW')}
        </div>
        <div class="dash-row-card__body">${escapeHtml(row?.description || 'No description provided.')}</div>
        ${this.renderMapPreviewBlock(row)}
        <textarea class="dash-textarea" style="min-height:88px;" data-map-reject-reason="${escapeHtml(row?.mapId || '')}" placeholder="Rejection reason (required if rejecting)"></textarea>
        <div class="dash-button-group">
          <button type="button" class="dash-button dash-button--success" data-action="approve-map" data-map-id="${escapeHtml(row?.mapId || '')}">Approve</button>
          <button type="button" class="dash-button dash-button--danger" data-action="reject-map" data-map-id="${escapeHtml(row?.mapId || '')}">Reject</button>
        </div>
      </article>
    `).join('');

    const topicOptions = (this.state.topics || []).map((topic) => (
      `<option value="${escapeHtml(topic?.topicId || '')}">${escapeHtml(topic?.topicName || 'Untitled topic')}</option>`
    )).join('');

    const approvedCards = [...(this.state.approvedUnpublishedMaps || [])].map((row) => `
      <article class="dash-row-card">
        <div class="dash-row-card__header">
          <div>
            <div class="dash-row-card__title">${escapeHtml(row?.name || 'Untitled map')}</div>
            <div class="dash-row-card__meta">
              <span>${escapeHtml(row?.mapId || 'Unknown id')}</span>
              <span>${escapeHtml(formatDate(row?.approvedAt))}</span>
            </div>
          </div>
          ${renderBadge('APPROVED')}
        </div>
        <div class="dash-row-card__body">${escapeHtml(row?.description || 'No description provided.')}</div>
        <div class="dash-form__grid">
          <div class="dash-field">
            <label>Assign topic before publish</label>
            <select class="dash-select" data-map-topic-id="${escapeHtml(row?.mapId || '')}">
              <option value="">Select topic</option>
              ${topicOptions}
            </select>
          </div>
        </div>
        <div class="dash-button-group">
          <button type="button" class="dash-button" data-action="publish-map" data-map-id="${escapeHtml(row?.mapId || '')}">Publish map</button>
        </div>
      </article>
    `).join('');

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">Map moderation</h3>
            <p>Contributors submit maps for review. Approve/reject pending maps, then assign topic and publish approved maps.</p>
          </div>
          <button type="button" class="dash-button dash-button--secondary" data-action="refresh-current">Refresh map queues</button>
        </div>
      </div>
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline" style="align-items:flex-start;">
          <div>
            <h4 style="margin:0 0 8px;">Create publishing topic</h4>
            <p>Add a new topic so it appears in the publish dropdown for approved maps.</p>
          </div>
        </div>
        <div class="dash-form__grid">
          <div class="dash-field">
            <label for="admin-topic-name">Topic name</label>
            <input id="admin-topic-name" class="dash-input" type="text" placeholder="e.g. Algebra Foundations" />
          </div>
          <div class="dash-field">
            <label for="admin-topic-description">Description (optional)</label>
            <textarea id="admin-topic-description" class="dash-textarea" placeholder="Brief topic description"></textarea>
          </div>
        </div>
        <div class="dash-button-group">
          <button type="button" class="dash-button" data-action="create-topic">Create topic</button>
        </div>
      </div>
      <div class="dash-grid dash-grid--two">
        <div>
          <div class="dash-card" style="margin-bottom:12px;">
            <h4 style="margin:0;">Pending map submissions</h4>
          </div>
          <div class="dash-list">
            ${pendingCards || renderEmptyState('No pending maps', 'All submitted maps have been processed.')}
          </div>
        </div>
        <div>
          <div class="dash-card" style="margin-bottom:12px;">
            <h4 style="margin:0;">Approved but unpublished</h4>
          </div>
          <div class="dash-list">
            ${approvedCards || renderEmptyState('No maps awaiting publish', 'Publish queue is clear right now.')}
          </div>
        </div>
      </div>
    `;

    this.paintReadyMapPreviews();
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

  async moderateMapSubmission(mapId, action) {
    if (!mapId) return;

    this.setStatus(action === 'approve' ? 'Approving map...' : 'Rejecting map...', false);
    try {
      if (action === 'approve') {
        await apiService.approveMapSubmission(mapId);
        showToast(this.toastHost, 'Map approved.');
      } else {
        const reasonEl = this.portalRoot?.querySelector(`[data-map-reject-reason="${CSS.escape(mapId)}"]`);
        const reason = reasonEl?.value?.trim() || '';
        if (!reason) {
          this.setStatus('Rejection reason is required.', true);
          return;
        }
        await apiService.rejectMapSubmission(mapId, reason);
        showToast(this.toastHost, 'Map rejected.');
      }
      await this.loadDashboard();
      this.showSection('map-review');
      this.setStatus('Map moderation queue updated.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to moderate map submission'), true);
    }
  }

  async publishApprovedMap(mapId) {
    if (!mapId) return;

    const topicEl = this.portalRoot?.querySelector(`[data-map-topic-id="${CSS.escape(mapId)}"]`);
    const topicId = topicEl?.value?.trim() || '';
    if (!topicId) {
      this.setStatus('Select a topic before publishing.', true);
      return;
    }

    this.setStatus('Publishing map...', false);
    try {
      await apiService.publishApprovedMap(mapId, topicId);
      showToast(this.toastHost, 'Map published.');
      await this.loadDashboard();
      this.showSection('map-review');
      this.setStatus('Map published successfully.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to publish map'), true);
    }
  }

  async createTopicForMapPublishing() {
    const nameEl = this.portalRoot?.querySelector('#admin-topic-name');
    const descriptionEl = this.portalRoot?.querySelector('#admin-topic-description');
    const topicName = nameEl?.value?.trim() || '';
    const description = descriptionEl?.value?.trim() || '';

    if (!topicName) {
      this.setStatus('Topic name is required.', true);
      return;
    }

    this.setStatus('Creating topic...', false);
    try {
      await apiService.createTopic({
        topicName,
        description: description || null
      });
      const topics = await apiService.getAllTopics().catch(() => this.state.topics);
      this.state.topics = Array.isArray(topics) ? topics : this.state.topics;
      if (nameEl) nameEl.value = '';
      if (descriptionEl) descriptionEl.value = '';
      this.renderMapReviewSection();
      showToast(this.toastHost, 'Topic created.');
      this.setStatus('Topic created. You can now assign it when publishing maps.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to create topic'), true);
    }
  }

  primeMapPreviews(rows) {
    (rows || []).forEach((row) => {
      const mapId = row?.mapId;
      if (!mapId) return;

      const existing = this.state.mapPreviewByMapId[mapId];
      if (existing?.status) return;

      const isEditorMap = String(row?.asset || '').startsWith('editor-draft:');
      this.state.mapPreviewByMapId[mapId] = {
        status: isEditorMap ? 'loading' : 'unsupported',
        payload: null,
        error: null
      };
      if (!isEditorMap) return;
      void this.loadMapPreviewPayload(mapId);
    });
  }

  async loadMapPreviewPayload(mapId) {
    try {
      const payload = await apiService.getEditorMapData(mapId);
      const previewErrorMessage = payload?.reason || payload?.message || 'Map data is missing layer information.';
      this.state.mapPreviewByMapId[mapId] = {
        status: payload?.layers ? 'ready' : 'error',
        payload: payload?.layers ? payload : null,
        error: payload?.layers ? null : previewErrorMessage
      };
    } catch (error) {
      this.state.mapPreviewByMapId[mapId] = {
        status: 'error',
        payload: null,
        error: getErrorMessage(error, 'Unable to load map preview.')
      };
    }

    if (this.state.activeSection === 'map-review') {
      this.renderMapReviewSection();
    }
  }

  renderMapPreviewBlock(row) {
    const mapId = row?.mapId || '';
    if (!mapId) {
      return '<div class="dash-row-card__body">Map preview unavailable (missing map ID).</div>';
    }

    const preview = this.state.mapPreviewByMapId[mapId];
    const status = preview?.status || 'loading';
    const isEditorMap = String(row?.asset || '').startsWith('editor-draft:');
    if (!preview) {
      this.state.mapPreviewByMapId[mapId] = {
        status: isEditorMap ? 'loading' : 'unsupported',
        payload: null,
        error: null
      };
      if (isEditorMap) {
        void this.loadMapPreviewPayload(mapId);
      }
    }

    if (status === 'unsupported') {
      return '<div class="dash-row-card__body">Preview is available only for maps submitted from the in-game editor.</div>';
    }
    if (status === 'loading') {
      return '<div class="dash-row-card__body">Loading map preview...</div>';
    }
    if (status === 'error') {
      return `<div class="dash-row-card__body">${escapeHtml(preview?.error || 'Unable to render map preview.')}</div>`;
    }

    const payload = preview?.payload || {};
    return `
      <div class="dash-row-card__body" style="padding:0; white-space:normal; line-height:1.35;">
        <div style="padding:6px 10px 0;">
          <strong>Map preview</strong>
          <div class="dash-row-card__meta" style="margin-top:2px;">
            <span>${escapeHtml(`${Number(payload.width || 0)} x ${Number(payload.height || 0)}`)}</span>
            <span>${escapeHtml(payload.tilesetKey || 'Unknown tileset')}</span>
            <span>${escapeHtml(`NPC ${Array.isArray(payload?.spawns?.npcs) ? payload.spawns.npcs.length : 0} | Monster ${Array.isArray(payload?.spawns?.monsters) ? payload.spawns.monsters.length : 0}`)}</span>
          </div>
        </div>
        <canvas
          data-map-preview-canvas="${escapeHtml(mapId)}"
          style="display:block; width:100%; max-height:180px; border-radius:10px; background:#11151f; margin-top:6px;"
        ></canvas>
      </div>
    `;
  }

  paintReadyMapPreviews() {
    const canvases = this.portalRoot?.querySelectorAll('canvas[data-map-preview-canvas]');
    if (!canvases?.length) return;

    canvases.forEach((canvasEl) => {
      const mapId = canvasEl.getAttribute('data-map-preview-canvas');
      if (!mapId) return;

      const preview = this.state.mapPreviewByMapId[mapId];
      if (preview?.status !== 'ready' || !preview.payload) return;
      void this.drawMapPreviewCanvas(canvasEl, preview.payload);
    });
  }

  async drawMapPreviewCanvas(canvasEl, payload) {
    const tileSize = Math.max(1, Number(payload?.tileSize || 32));
    const width = Math.max(1, Number(payload?.width || 1));
    const height = Math.max(1, Number(payload?.height || 1));
    const worldWidth = width * tileSize;
    const worldHeight = height * tileSize;

    const maxPreviewWidth = 540;
    const maxPreviewHeight = 220;
    const scale = Math.min(maxPreviewWidth / worldWidth, maxPreviewHeight / worldHeight, 1);
    const previewWidth = Math.max(1, Math.floor(worldWidth * scale));
    const previewHeight = Math.max(1, Math.floor(worldHeight * scale));

    canvasEl.width = previewWidth;
    canvasEl.height = previewHeight;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, previewWidth, previewHeight);

    const offscreen = document.createElement('canvas');
    offscreen.width = worldWidth;
    offscreen.height = worldHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.fillStyle = '#0f1724';
    offCtx.fillRect(0, 0, worldWidth, worldHeight);

    const layers = [
      payload?.layers?.ground,
      payload?.layers?.decor
    ];

    const tilesetImage = await this.loadMapPreviewTilesetImage(payload?.tilesetKey || 'terrain_tiles_v2.1');
    if (tilesetImage) {
      this.drawTiledLayers(offCtx, layers, tilesetImage, tileSize);
      this.drawTiledLayers(offCtx, [payload?.layers?.collision], tilesetImage, tileSize, 0.5);
    } else {
      this.drawFallbackLayers(offCtx, layers, tileSize);
      this.drawFallbackLayers(offCtx, [payload?.layers?.collision], tileSize, 'rgba(255, 90, 90, 0.45)');
    }

    this.drawSpawnMarkers(offCtx, payload?.spawns, tileSize);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, previewWidth, previewHeight);
  }

  async loadMapPreviewTilesetImage(tilesetKey) {
    const cacheKey = tilesetKey || 'terrain_tiles_v2.1';
    const cached = this.mapPreviewTilesetImageCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const relativePath = TILESET_IMAGE_PATHS[cacheKey];
    if (!relativePath) {
      this.mapPreviewTilesetImageCache.set(cacheKey, null);
      return null;
    }

    const image = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `/${relativePath}`;
    });

    this.mapPreviewTilesetImageCache.set(cacheKey, image);
    return image;
  }

  drawTiledLayers(ctx, layers, tilesetImage, tileSize, alpha = 1) {
    if (!tilesetImage || !tilesetImage.width || !tilesetImage.height) return;

    const columns = Math.max(1, Math.floor(tilesetImage.width / tileSize));
    const originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;

    (layers || []).forEach((layer) => {
      if (!Array.isArray(layer)) return;
      for (let y = 0; y < layer.length; y += 1) {
        const row = layer[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < row.length; x += 1) {
          const tileId = Number(row[x]);
          if (!Number.isInteger(tileId) || tileId < 0) continue;
          const sx = (tileId % columns) * tileSize;
          const sy = Math.floor(tileId / columns) * tileSize;
          ctx.drawImage(
            tilesetImage,
            sx,
            sy,
            tileSize,
            tileSize,
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize
          );
        }
      }
    });

    ctx.globalAlpha = originalAlpha;
  }

  drawFallbackLayers(ctx, layers, tileSize, color = 'rgba(120, 176, 255, 0.65)') {
    ctx.fillStyle = color;
    (layers || []).forEach((layer) => {
      if (!Array.isArray(layer)) return;
      for (let y = 0; y < layer.length; y += 1) {
        const row = layer[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < row.length; x += 1) {
          const tileId = Number(row[x]);
          if (!Number.isInteger(tileId) || tileId < 0) continue;
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    });
  }

  drawSpawnMarkers(ctx, spawns, tileSize) {
    const npcSpawns = Array.isArray(spawns?.npcs) ? spawns.npcs : [];
    const monsterSpawns = Array.isArray(spawns?.monsters) ? spawns.monsters : [];

    ctx.fillStyle = '#5ef4a7';
    npcSpawns.forEach(({ x, y }) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      ctx.beginPath();
      ctx.arc((x + 0.5) * tileSize, (y + 0.5) * tileSize, Math.max(2, tileSize * 0.18), 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#ff9752';
    monsterSpawns.forEach(({ x, y }) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      ctx.beginPath();
      ctx.arc((x + 0.5) * tileSize, (y + 0.5) * tileSize, Math.max(2, tileSize * 0.18), 0, Math.PI * 2);
      ctx.fill();
    });
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
      'map-review': ['Map Review', 'Approve submitted maps, then assign topics and publish them.'],
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
