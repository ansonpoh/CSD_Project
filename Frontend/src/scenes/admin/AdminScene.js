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
      mapPreviewByMapId: {},
      selectedQuizMapId: '',
      bankQuestions: [],
      bankDraft: [],
      mapQuiz: null,
      quizDraftLoading: false,
      missions: [],
      flaggedReflections: []
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
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="question-bank">
              <span><span class="dash-nav__label">Quiz Bank</span><br/><span class="dash-nav__hint">Build and publish map quizzes</span></span>
              <span class="dash-nav__hint">07</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="missions">
              <span><span class="dash-nav__label">Real-World Missions</span><br/><span class="dash-nav__hint">Manage Gen Alpha observation missions</span></span>
              <span class="dash-nav__hint">08</span>
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
            <section class="dash-section" data-section-panel="question-bank"><div id="admin-question-bank"></div></section>
            <section class="dash-section" data-section-panel="missions"><div id="admin-missions"></div></section>
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
    if (action === 'show-submission-history') {
      event.preventDefault();
      void this.showSubmissionHistory(actionEl.dataset.contributorId);
      return;
    }
    if (action === 'close-history-modal') {
      event.preventDefault();
      const modal = this.portalRoot.querySelector('#history-modal-overlay');
      if (modal) modal.remove();
      return;
    }
    if (action === 'ban-contributor' || action === 'unban-contributor') {
      event.preventDefault();
      const contributorId = actionEl.dataset.contributorId;
      if (!contributorId) return;
      void this.toggleContributorStatus(contributorId, action === 'unban-contributor');
    }
    if (action === 'load-quiz-map') {
      event.preventDefault();
      void this.loadQuizMapData();
      return;
    }
    if (action === 'generate-bank-draft') {
      event.preventDefault();
      void this.generateBankDraft();
      return;
    }
    if (action === 'add-blank-question') {
      event.preventDefault();
      this._readDraftFromForm();
      this.state.bankDraft.push({ scenarioText: '', options: [{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }] });
      this.renderQuestionBankSection();
      return;
    }
    if (action === 'add-draft-option') {
      event.preventDefault();
      this._readDraftFromForm();
      const idx = Number(actionEl.dataset.questionIndex);
      if (this.state.bankDraft[idx]) {
        this.state.bankDraft[idx].options.push({ optionText: '', isCorrect: false });
        this.renderQuestionBankSection();
      }
      return;
    }
    if (action === 'remove-draft-question') {
      event.preventDefault();
      this._readDraftFromForm();
      const idx = Number(actionEl.dataset.questionIndex);
      this.state.bankDraft.splice(idx, 1);
      this.renderQuestionBankSection();
      return;
    }
    if (action === 'save-bank-draft') {
      event.preventDefault();
      void this.saveBankDraft();
      return;
    }
    if (action === 'approve-bank-question') {
      event.preventDefault();
      void this.approveBankQuestion(actionEl.dataset.bankQuestionId);
      return;
    }
    if (action === 'reject-bank-question') {
      event.preventDefault();
      void this.rejectBankQuestion(actionEl.dataset.bankQuestionId);
      return;
    }
    if (action === 'create-map-quiz') {
      event.preventDefault();
      void this.createMapQuiz();
      return;
    }
    if (action === 'add-to-quiz') {
      event.preventDefault();
      void this.addBankQuestionToQuiz(actionEl.dataset.bankQuestionId);
      return;
    }
    if (action === 'remove-from-quiz') {
      event.preventDefault();
      void this.removeFromMapQuiz(actionEl.dataset.questionId);
      return;
    }
    if (action === 'publish-map-quiz') {
      event.preventDefault();
      void this.publishMapQuiz();
      return;
    }
    if (action === 'unpublish-map-quiz') {
      event.preventDefault();
      void this.unpublishMapQuiz();
      return;
    }
    if (action === 'create-mission') {
      event.preventDefault();
      void this.createMission();
      return;
    }
    if (action === 'toggle-mission-active') {
      event.preventDefault();
      void this.toggleMissionActive(actionEl.dataset.missionId, actionEl.dataset.value === 'true');
      return;
    }
    if (action === 'approve-reflection' || action === 'reject-reflection') {
      event.preventDefault();
      void this.reviewReflection(actionEl.dataset.attemptId, action === 'approve-reflection');
      return;
    }
  };

  handleChange = (event) => {
    if (event.target?.id === 'telemetry-map-select') {
      this.state.selectedTelemetryMapId = event.target.value || '';
      void this.refreshTelemetry();
    }
    if (event.target?.id === 'quiz-map-select') {
      this.state.selectedQuizMapId = event.target.value || '';
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
        telemetry,
        missions,
        flaggedReflections
      ] = await Promise.all([
        apiService.getAdministratorBySupabaseId(uid).catch(() => null),
        apiService.getContentQueue().catch(() => []),
        apiService.getMapReviewQueue().catch(() => []),
        apiService.getApprovedUnpublishedMaps().catch(() => []),
        apiService.getOpenContentFlags().catch(() => []),
        apiService.getAllContributors().catch(() => []),
        apiService.getAllMaps().catch(() => []),
        apiService.getAllTopics().catch(() => []),
        apiService.getEncounterTelemetryDashboard().catch(() => null),
        apiService.getAllMissions().catch(() => []),
        apiService.getFlaggedReflections().catch(() => [])
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
      this.state.missions = Array.isArray(missions) ? missions : [];
      this.state.flaggedReflections = Array.isArray(flaggedReflections) ? flaggedReflections : [];
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
      this.renderQuestionBankSection();
      this.renderMissionsSection();
      this.setStatus('Dashboard refreshed.', false);
    } catch (error) {
      this.renderProfile();
      this.renderOverview(true);
      this.renderReviewSection(true);
      this.renderMapReviewSection(true);
      this.renderFlagsSection(true);
      this.renderContributorsSection(true);
      this.renderTelemetrySection(true);
      this.renderQuestionBankSection();
      this.renderMissionsSection();
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
          <button type="button" class="dash-button dash-button--secondary" data-action="show-submission-history" data-contributor-id="${escapeHtml(selected.contributorId || '')}">List Submission History</button>
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

  async showSubmissionHistory(contributorId) {
    if (!contributorId) return;
    this.setStatus('Loading submission history...', false);
    
    try {
      const history = await apiService.getContentsByContributorId(contributorId);
      this.renderHistoryModal(history || []);
      this.setStatus('History loaded.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to load submission history'), true);
    }
  }

  renderHistoryModal(historyData) {
    let modal = this.portalRoot?.querySelector('#history-modal-overlay');
    if (modal) modal.remove();

    const rows = historyData.map((item) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
        <td style="padding: 12px 8px;">${renderBadge(item.status || 'UNKNOWN')}</td>
        <td style="padding: 12px 8px; color: #a1a1aa;">${escapeHtml(formatDate(item.submittedAt))}</td>
        <td style="padding: 12px 8px;">${escapeHtml(item.topic?.topicName || 'None')}</td>
        <td style="padding: 12px 8px; color: #a1a1aa;">${escapeHtml(previewText(item.body || '', 60))}</td>
      </tr>
    `).join('');

    modal = document.createElement('div');
    modal.id = 'history-modal-overlay';
    // Use an overlay style that integrates closely with the dark theme
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding: 24px;';
    
    modal.innerHTML = `
      <div class="dash-card" style="width: 100%; max-width: 800px; max-height: 80vh; overflow-y: auto; background-color: #12080b; border: 1px solid rgba(255,255,255,0.1);">
        <div class="dash-inline" style="margin-bottom: 16px;">
          <h3 style="margin: 0;">Submission History</h3>
          <button type="button" class="dash-button dash-button--ghost" data-action="close-history-modal">Close</button>
        </div>
        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.2);">
              <th style="padding: 12px 8px;">Status</th>
              <th style="padding: 12px 8px;">Submitted At</th>
              <th style="padding: 12px 8px;">Topic</th>
              <th style="padding: 12px 8px;">Body Preview</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="4" style="text-align: center; padding: 24px; color: #a1a1aa;">No submissions found for this contributor.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    this.portalRoot?.appendChild(modal);
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
    if (this.state.activeSection === 'question-bank') {
      await this.loadQuizMapData();
      return;
    }
    if (this.state.activeSection === 'missions') {
      await this.refreshMissions();
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
      telemetry: ['Telemetry', 'Inspect encounter funnel metrics with optional map filtering.'],
      'question-bank': ['Quiz Bank', 'Generate, approve, and publish quiz questions for each map.'],
      'missions': ['Real-World Missions', 'Manage offline missions and review flagged reflections.']
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

  renderQuestionBankSection() {
    const container = this.portalRoot?.querySelector('#admin-question-bank');
    if (!container) return;

    const maps = this.state.maps || [];
    const mapOptions = maps.map((m) =>
      `<option value="${escapeHtml(m.mapId)}" ${this.state.selectedQuizMapId === m.mapId ? 'selected' : ''}>${escapeHtml(m.name || m.mapId)}</option>`
    ).join('');

    const bankQuestions = this.state.bankQuestions || [];
    const mapQuiz = this.state.mapQuiz;
    const draft = this.state.bankDraft || [];

    const approvedQuestions = bankQuestions.filter((q) => q.status === 'APPROVED');
    const quizQuestionIds = new Set((mapQuiz?.questions || []).map((q) => q.questionId));

    const bankHtml = bankQuestions.length === 0
      ? renderEmptyState('No questions in bank', 'Generate a draft or add questions for this map.')
      : bankQuestions.map((q) => `
        <div class="dash-card" style="margin-bottom:10px;padding:14px 16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div style="flex:1;">
              <p style="margin:0 0 8px;font-size:14px;">${escapeHtml(q.scenarioText)}</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
                ${(q.options || []).map((o) => `
                  <span style="font-size:12px;padding:2px 8px;border-radius:4px;background:${o.isCorrect ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'};border:1px solid ${o.isCorrect ? '#4ade80' : 'rgba(255,255,255,0.12)'};">
                    ${escapeHtml(o.optionText)}${o.isCorrect ? ' ✓' : ''}
                  </span>`).join('')}
              </div>
              <span style="font-size:11px;color:#b58d84;">${q.isMultiSelect ? 'Multi-select' : 'Single-select'}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;min-width:120px;align-items:flex-end;">
              ${renderBadge(q.status)}
              ${q.status === 'PENDING_REVIEW' ? `
                <button class="dash-button" style="font-size:12px;padding:4px 10px;" data-action="approve-bank-question" data-bank-question-id="${q.bankQuestionId}">Approve</button>
                <button class="dash-button dash-button--secondary" style="font-size:12px;padding:4px 10px;" data-action="reject-bank-question" data-bank-question-id="${q.bankQuestionId}">Reject</button>
              ` : ''}
              ${q.status === 'APPROVED' && mapQuiz && !quizQuestionIds.has(q.bankQuestionId) ? `
                <button class="dash-button" style="font-size:12px;padding:4px 10px;" data-action="add-to-quiz" data-bank-question-id="${q.bankQuestionId}">Add to Quiz</button>
              ` : ''}
            </div>
          </div>
        </div>`).join('');

    const quizHtml = !mapQuiz
      ? `<div style="margin-bottom:16px;">${renderEmptyState('No quiz for this map', 'Create a quiz to start adding questions.')}</div>
         <button class="dash-button" data-action="create-map-quiz">Create Quiz</button>`
      : `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <strong>${escapeHtml(mapQuiz.title || 'Untitled Quiz')}</strong>
            <span style="margin-left:8px;">${renderBadge(mapQuiz.isPublished ? 'published' : 'draft')}</span>
            <p class="dash-muted" style="margin:4px 0 0;">${escapeHtml(mapQuiz.description || '')}</p>
          </div>
          ${mapQuiz.isPublished
            ? `<button class="dash-button dash-button--secondary" data-action="unpublish-map-quiz">Unpublish</button>`
            : `<button class="dash-button" data-action="publish-map-quiz" ${(mapQuiz.questions || []).length === 0 ? 'disabled' : ''}>Publish</button>`}
        </div>
        <div>
          ${(mapQuiz.questions || []).length === 0
            ? renderEmptyState('No questions added yet', 'Approve questions in the bank, then add them here.')
            : (mapQuiz.questions || []).map((q, i) => `
              <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 12px;margin-bottom:6px;background:rgba(255,255,255,0.04);border-radius:6px;border:1px solid rgba(255,255,255,0.08);">
                <div style="flex:1;">
                  <span style="font-size:12px;color:#b58d84;">Q${i + 1}${q.isMultiSelect ? ' · multi' : ''}</span>
                  <p style="margin:4px 0 0;font-size:13px;">${escapeHtml(q.scenarioText)}</p>
                </div>
                ${!mapQuiz.isPublished ? `<button class="dash-button dash-button--secondary" style="font-size:12px;padding:4px 10px;margin-left:12px;" data-action="remove-from-quiz" data-question-id="${q.questionId}">Remove</button>` : ''}
              </div>`).join('')}
        </div>`;

    const isGenerating = Boolean(this.state.quizDraftLoading);

    const draftHtml = `
      <article class="dash-card" style="margin-top:20px;">
        <div class="dash-card__headline">
          <h3>Draft Questions</h3>
          <span class="dash-muted">${draft.length > 0 ? `${draft.length} question${draft.length !== 1 ? 's' : ''} — edit then save to bank` : 'Add questions manually or generate from map content'}</span>
        </div>
        ${isGenerating ? `
          <div style="display:flex;align-items:center;gap:12px;padding:20px 0;">
            <div style="width:20px;height:20px;border:3px solid rgba(255,163,123,0.3);border-top-color:#ff9c6a;border-radius:50%;animation:dash-spin 0.8s linear infinite;flex-shrink:0;"></div>
            <span style="color:#b58d84;font-size:14px;">Generating questions from map content...</span>
          </div>
        ` : ''}
        <form id="draft-questions-form">
          ${draft.map((q, i) => `
            <div style="padding:14px;margin-bottom:12px;background:rgba(255,255,255,0.04);border-radius:6px;border:1px solid rgba(255,255,255,0.08);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="font-size:12px;color:#b58d84;font-weight:600;">Question ${i + 1}</label>
                <button type="button" class="dash-button dash-button--secondary" style="font-size:11px;padding:2px 8px;" data-action="remove-draft-question" data-question-index="${i}">Remove</button>
              </div>
              <textarea name="scenario_${i}" style="width:100%;padding:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#eef4ff;font-size:13px;resize:vertical;" rows="2" placeholder="Enter question / scenario text...">${escapeHtml(q.scenarioText)}</textarea>
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
                <span style="font-size:11px;color:#b58d84;">Options — check the correct answer(s)</span>
                ${(q.options || []).map((o, j) => `
                  <div style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" name="correct_${i}_${j}" ${o.isCorrect ? 'checked' : ''} style="accent-color:#ff9c6a;width:16px;height:16px;flex-shrink:0;">
                    <input type="text" name="option_${i}_${j}" value="${escapeHtml(o.optionText)}" placeholder="Option text..." style="flex:1;padding:6px 8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#eef4ff;font-size:13px;">
                  </div>`).join('')}
                <button type="button" class="dash-button dash-button--ghost" style="font-size:12px;padding:4px 10px;align-self:flex-start;" data-action="add-draft-option" data-question-index="${i}">+ Add Option</button>
              </div>
            </div>`).join('')}
          <div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap;">
            <button type="button" class="dash-button" data-action="add-blank-question" ${isGenerating ? 'disabled' : ''}>+ Add Question</button>
            <button type="button" class="dash-button dash-button--secondary" data-action="generate-bank-draft" ${isGenerating ? 'disabled' : ''}>${isGenerating ? 'Generating...' : 'Generate AI Draft'}</button>
            ${draft.length > 0 && !isGenerating ? `<button type="button" class="dash-button" style="margin-left:auto;" data-action="save-bank-draft">Save All to Bank</button>` : ''}
          </div>
        </form>
      </article>`;

    container.innerHTML = `
      <article class="dash-card" style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <select id="quiz-map-select" style="flex:1;min-width:200px;padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,163,123,0.3);border-radius:6px;color:#eef4ff;">
            <option value="">— Select a map —</option>
            ${mapOptions}
          </select>
          <button class="dash-button" data-action="load-quiz-map">Load</button>
        </div>
      </article>

      ${this.state.selectedQuizMapId ? `
        ${draftHtml}
        <div class="dash-grid dash-grid--two" style="align-items:start;margin-top:20px;">
          <article class="dash-card">
            <div class="dash-card__headline"><h3>Question Bank</h3><span class="dash-muted">${bankQuestions.length} questions</span></div>
            ${bankHtml}
          </article>
          <article class="dash-card">
            <div class="dash-card__headline"><h3>Map Quiz</h3><span class="dash-muted">${approvedQuestions.length} approved available</span></div>
            ${quizHtml}
          </article>
        </div>
      ` : renderEmptyState('Select a map to begin', 'Choose a map above to manage its quiz questions.')}
    `;
  }

  async loadQuizMapData() {
    const mapId = this.state.selectedQuizMapId;
    if (!mapId) {
      this.setStatus('Please select a map first.', true);
      return;
    }
    this.setStatus('Loading quiz data...', false);
    try {
      const [bankQuestions, mapQuiz] = await Promise.all([
        apiService.getBankQuestionsByMap(mapId).catch(() => []),
        apiService.getQuizForAdmin(mapId).catch(() => null)
      ]);
      this.state.bankQuestions = Array.isArray(bankQuestions) ? bankQuestions : [];
      this.state.mapQuiz = mapQuiz || null;
      this.state.bankDraft = [];
      this.renderQuestionBankSection();
      this.setStatus('Quiz data loaded.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to load quiz data'), true);
    }
  }

  async generateBankDraft() {
    const mapId = this.state.selectedQuizMapId;
    if (!mapId) return;
    this.state.quizDraftLoading = true;
    this.renderQuestionBankSection();
    this.setStatus('Generating AI draft questions...', false);
    try {
      const draft = await apiService.generateBankDraft(mapId);
      this.state.bankDraft = Array.isArray(draft) ? draft : [];
      this.state.quizDraftLoading = false;
      this.renderQuestionBankSection();
      this.setStatus(`Draft generated: ${this.state.bankDraft.length} questions ready to review.`, false);
    } catch (error) {
      this.state.quizDraftLoading = false;
      this.renderQuestionBankSection();
      this.setStatus(getErrorMessage(error, 'Failed to generate draft questions'), true);
    }
  }

  _readDraftFromForm() {
    const form = this.portalRoot?.querySelector('#draft-questions-form');
    if (!form || !this.state.bankDraft.length) return;
    this.state.bankDraft = this.state.bankDraft.map((q, i) => ({
      ...q,
      scenarioText: form.querySelector(`[name="scenario_${i}"]`)?.value ?? q.scenarioText,
      options: q.options.map((o, j) => ({
        optionText: form.querySelector(`[name="option_${i}_${j}"]`)?.value ?? o.optionText,
        isCorrect: form.querySelector(`[name="correct_${i}_${j}"]`)?.checked ?? o.isCorrect
      }))
    }));
  }

  async saveBankDraft() {
    const mapId = this.state.selectedQuizMapId;
    if (!mapId || !this.state.bankDraft.length) return;

    this._readDraftFromForm();

    const questions = this.state.bankDraft.map((q) => ({
      scenarioText: q.scenarioText,
      options: q.options.filter((o) => o.optionText.trim()).map((o) => ({
        optionText: o.optionText.trim(),
        isCorrect: o.isCorrect
      }))
    })).filter((q) => q.scenarioText.trim() && q.options.length >= 2);

    this.setStatus('Saving questions to bank...', false);
    try {
      const saved = await apiService.saveBankQuestions(mapId, questions);
      this.state.bankQuestions = [...(this.state.bankQuestions || []), ...(Array.isArray(saved) ? saved : [])];
      this.state.bankDraft = [];
      this.renderQuestionBankSection();
      showToast(this.toastHost, `${saved.length} questions saved to bank.`);
      this.setStatus('Questions saved.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to save questions'), true);
    }
  }

  async approveBankQuestion(bankQuestionId) {
    if (!bankQuestionId) return;
    this.setStatus('Approving question...', false);
    try {
      const updated = await apiService.approveBankQuestion(bankQuestionId);
      this.state.bankQuestions = this.state.bankQuestions.map((q) =>
        q.bankQuestionId === bankQuestionId ? updated : q
      );
      this.renderQuestionBankSection();
      showToast(this.toastHost, 'Question approved.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to approve question'), true);
    }
  }

  async rejectBankQuestion(bankQuestionId) {
    if (!bankQuestionId) return;
    this.setStatus('Rejecting question...', false);
    try {
      const updated = await apiService.rejectBankQuestion(bankQuestionId);
      this.state.bankQuestions = this.state.bankQuestions.map((q) =>
        q.bankQuestionId === bankQuestionId ? updated : q
      );
      this.renderQuestionBankSection();
      showToast(this.toastHost, 'Question rejected.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to reject question'), true);
    }
  }

  async createMapQuiz() {
    const mapId = this.state.selectedQuizMapId;
    if (!mapId) return;
    const mapName = this.state.maps.find((m) => m.mapId === mapId)?.name || 'Map Quiz';
    this.setStatus('Creating quiz...', false);
    try {
      const quiz = await apiService.createQuiz({ mapId, title: `${mapName} Quiz`, description: '' });
      this.state.mapQuiz = quiz;
      this.renderQuestionBankSection();
      showToast(this.toastHost, 'Quiz created.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to create quiz'), true);
    }
  }

  async addBankQuestionToQuiz(bankQuestionId) {
    const quizId = this.state.mapQuiz?.quizId;
    if (!quizId || !bankQuestionId) return;
    this.setStatus('Adding question to quiz...', false);
    try {
      await apiService.addBankQuestionToQuiz(quizId, bankQuestionId);
      const updated = await apiService.getQuizForAdmin(this.state.selectedQuizMapId);
      this.state.mapQuiz = updated;
      this.renderQuestionBankSection();
      showToast(this.toastHost, 'Question added to quiz.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to add question to quiz'), true);
    }
  }

  async removeFromMapQuiz(questionId) {
    const quizId = this.state.mapQuiz?.quizId;
    if (!quizId || !questionId) return;
    this.setStatus('Removing question...', false);
    try {
      const updated = await apiService.removeQuizQuestion(quizId, questionId);
      this.state.mapQuiz = updated;
      this.renderQuestionBankSection();
      showToast(this.toastHost, 'Question removed.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to remove question'), true);
    }
  }

  async publishMapQuiz() {
    const quizId = this.state.mapQuiz?.quizId;
    if (!quizId) return;
    this.setStatus('Publishing quiz...', false);
    try {
      const updated = await apiService.publishQuiz(quizId);
      this.state.mapQuiz = updated;
      this.renderQuestionBankSection();
      showToast(this.toastHost, 'Quiz published — learners can now access it.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to publish quiz'), true);
    }
  }

  async unpublishMapQuiz() {
    const quizId = this.state.mapQuiz?.quizId;
    if (!quizId) return;
    this.setStatus('Unpublishing quiz...', false);
    try {
      const updated = await apiService.unpublishQuiz(quizId);
      this.state.mapQuiz = updated;
      this.renderQuestionBankSection();
      showToast(this.toastHost, 'Quiz unpublished.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to unpublish quiz'), true);
    }
  }

  renderMissionsSection() {
    const container = this.portalRoot?.querySelector('#admin-missions');
    if (!container) return;

    const missions = this.state.missions;
    const flagged = this.state.flaggedReflections;

    const missionRows = missions.map((m) => `
      <article class="dash-row-card">
        <div class="dash-row-card__header">
          <div>
            <div class="dash-row-card__title">${escapeHtml(m.title || 'Untitled')}</div>
            <div class="dash-row-card__meta">
              <span>${escapeHtml(m.type || '')}</span>
              <span>${m.rewardXp} XP · ${m.rewardGold} Gold</span>
            </div>
          </div>
          ${renderBadge(m.isActive ? 'ACTIVE' : 'INACTIVE')}
        </div>
        <div class="dash-row-card__body">${escapeHtml(m.description || '')}</div>
        <div class="dash-button-group">
          ${m.isActive
            ? `<button type="button" class="dash-button dash-button--secondary" data-action="toggle-mission-active" data-mission-id="${escapeHtml(m.missionId || '')}" data-value="false">Deactivate</button>`
            : `<button type="button" class="dash-button dash-button--success" data-action="toggle-mission-active" data-mission-id="${escapeHtml(m.missionId || '')}" data-value="true">Activate</button>`}
        </div>
      </article>
    `).join('');

    const flaggedRows = flagged.map((a) => `
      <article class="dash-row-card">
        <div class="dash-row-card__header">
          <div>
            <div class="dash-row-card__title">${escapeHtml(a.mission?.title || 'Unknown mission')}</div>
            <div class="dash-row-card__meta">
              <span>Learner: ${escapeHtml(String(a.learnerId || ''))}</span>
              <span>${escapeHtml(formatDate(a.submittedAt))}</span>
            </div>
          </div>
          ${renderBadge('FLAGGED_FOR_REVIEW')}
        </div>
        <div class="dash-row-card__body" style="font-style:italic;">"${escapeHtml(a.reflection || '')}"</div>
        <div class="dash-detail-list" style="margin-bottom:8px;">
          <span>AI note: ${escapeHtml(a.aiReviewNote || 'None')}</span>
        </div>
        <div class="dash-button-group">
          <button type="button" class="dash-button dash-button--success" data-action="approve-reflection" data-attempt-id="${escapeHtml(a.attemptId || '')}">Approve &amp; Reward</button>
          <button type="button" class="dash-button dash-button--danger" data-action="reject-reflection" data-attempt-id="${escapeHtml(a.attemptId || '')}">Reject</button>
        </div>
      </article>
    `).join('');

    container.innerHTML = `
      <article class="dash-card" style="margin-bottom:20px;">
        <div class="dash-card__headline">
          <h3>Create New Mission</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <input id="mission-title" type="text" placeholder="Mission title" style="padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,163,123,0.3);border-radius:6px;color:#eef4ff;font-size:13px;">
          <select id="mission-type" style="padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,163,123,0.3);border-radius:6px;color:#eef4ff;font-size:13px;">
            <option value="OBSERVATION">Observation</option>
            <option value="INTERACTION">Interaction</option>
          </select>
          <textarea id="mission-description" rows="3" placeholder="Describe the mission..." style="padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,163,123,0.3);border-radius:6px;color:#eef4ff;font-size:13px;resize:vertical;"></textarea>
          <div style="display:flex;gap:10px;">
            <input id="mission-xp" type="number" placeholder="XP reward" style="width:115px;padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,163,123,0.3);border-radius:6px;color:#eef4ff;font-size:13px;">
            <input id="mission-gold" type="number" placeholder="Gold reward" style="width:115px;padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,163,123,0.3);border-radius:6px;color:#eef4ff;font-size:13px;">
            <button type="button" class="dash-button" data-action="create-mission" style="margin-left:auto;">Add Mission</button>
          </div>
        </div>
      </article>

      <div class="dash-grid dash-grid--two" style="align-items:start;">
        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Mission Pool</h3>
            <span class="dash-muted">${missions.length} missions</span>
          </div>
          <div class="dash-list">
            ${missionRows || renderEmptyState('No missions yet', 'Add missions above')}
          </div>
        </article>
        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Flagged Reflections</h3>
            <span class="dash-muted">${flagged.length} awaiting review</span>
          </div>
          <div class="dash-list">
            ${flaggedRows || renderEmptyState('No flagged reflections', 'AI-approved reflections appear here when confidence is low.')}
          </div>
        </article>
      </div>
    `;
  }

  async refreshMissions() {
    this.setStatus('Refreshing missions...', false);
    try {
      const [missions, flaggedReflections] = await Promise.all([
        apiService.getAllMissions().catch(() => []),
        apiService.getFlaggedReflections().catch(() => [])
      ]);
      this.state.missions = Array.isArray(missions) ? missions : [];
      this.state.flaggedReflections = Array.isArray(flaggedReflections) ? flaggedReflections : [];
      this.renderMissionsSection();
      this.setStatus('Missions refreshed.', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Unable to refresh missions'), true);
    }
  }

  async createMission() {
    const title = this.portalRoot?.querySelector('#mission-title')?.value?.trim() || '';
    const description = this.portalRoot?.querySelector('#mission-description')?.value?.trim() || '';
    const type = this.portalRoot?.querySelector('#mission-type')?.value || 'OBSERVATION';
    const rewardXp = Number(this.portalRoot?.querySelector('#mission-xp')?.value) || 50;
    const rewardGold = Number(this.portalRoot?.querySelector('#mission-gold')?.value) || 20;

    if (!title || !description) {
      this.setStatus('Title and description are required.', true);
      return;
    }

    this.setStatus('Creating mission...', false);
    try {
      const mission = await apiService.createMission({ title, description, type, rewardXp, rewardGold });
      this.state.missions = [...this.state.missions, mission];
      this.renderMissionsSection();
      showToast(this.toastHost, 'Mission created.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to create mission'), true);
    }
  }

  async toggleMissionActive(missionId, active) {
    if (!missionId) return;
    this.setStatus(active ? 'Activating mission...' : 'Deactivating mission...', false);
    try {
      const updated = await apiService.setMissionActive(missionId, active);
      this.state.missions = this.state.missions.map((m) => m.missionId === missionId ? updated : m);
      this.renderMissionsSection();
      showToast(this.toastHost, active ? 'Mission activated.' : 'Mission deactivated.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to update mission'), true);
    }
  }

  async reviewReflection(attemptId, approve) {
    if (!attemptId) return;
    this.setStatus(approve ? 'Approving reflection...' : 'Rejecting reflection...', false);
    try {
      await apiService.reviewReflection(attemptId, approve, approve ? 'Approved by admin.' : 'Rejected by admin.');
      this.state.flaggedReflections = this.state.flaggedReflections.filter((a) => a.attemptId !== attemptId);
      this.renderMissionsSection();
      showToast(this.toastHost, approve ? 'Reflection approved — reward granted.' : 'Reflection rejected.');
      this.setStatus('', false);
    } catch (error) {
      this.setStatus(getErrorMessage(error, 'Failed to review reflection'), true);
    }
  }

  async logout() {
    await supabase.auth.signOut();
    gameState.clearState();
    routeToLogin(this, { hardReload: true });
  }
}