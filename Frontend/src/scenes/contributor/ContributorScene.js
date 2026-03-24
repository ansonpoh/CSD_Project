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

function countByStatus(rows, status) {
  return rows.filter((row) => String(row?.status || '').toUpperCase() === status).length;
}

function buildContentPreview(row) {
  const description = row?.description || row?.body || '';
  const narrations = Array.isArray(row?.narrations) ? row.narrations.join(' ') : '';
  return previewText(description || narrations || 'No preview available yet.', 240);
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0.00%';
  return `${numeric.toFixed(2)}%`;
}

const MAX_APPROVED_NPCS_PER_MAP = 5;

export class ContributorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ContributorScene' });
    this.portalRoot = null;
    this.toastHost = null;
    this.state = {
      activeSection: 'overview',
      profile: null,
      contents: [],
      analytics: null,
      mapSubmissions: [],
      topics: [],
      npcs: [],
      maps: [],
      availableMaps: [],
      mapApprovedNpcCounts: {},
      contentFilters: {
        query: '',
        status: 'ALL',
        topicId: 'ALL',
        sort: 'submitted_desc'
      },
      contentPagination: {
        page: 1,
        pageSize: 10
      },
      isGenerating: false,
      isSubmitting: false
    };
  }

  create() {
    this.cameras.main.setBackgroundColor(0x050d17);
    this.input.enabled = false;
    ensureDashboardPortalStyles();
    this.mountPortal();
    void this.loadInitialData();

    this.events.once('shutdown', () => this.destroyPortal());
    this.events.once('destroy', () => this.destroyPortal());
  }

  mountPortal() {
    this.portalRoot = createDashboardRoot('contributor');
    this.portalRoot.innerHTML = `
      <div class="dash-shell__backdrop"></div>
      <div class="dash-shell__grain"></div>
      <div class="dash-shell__layout">
        <aside class="dash-sidebar">
          <div class="dash-brand">
            <span class="dash-brand__eyebrow">Creator Workspace</span>
            <h1>Contributor Studio</h1>
            <p>Build polished learning content, track moderation status, and jump into map authoring without touching the game UI.</p>
          </div>

          <div class="dash-profile-card">
            <span class="dash-profile-card__label">Signed In</span>
            <span class="dash-profile-card__value" id="contributor-profile-name">Loading contributor...</span>
            <span class="dash-muted" id="contributor-profile-subtitle">Fetching contributor profile</span>
          </div>

          <nav class="dash-nav">
            <button type="button" class="dash-nav__button is-active" data-action="show-section" data-section="overview">
              <span>
                <span class="dash-nav__label">Overview</span><br/>
                <span class="dash-nav__hint">Snapshot and recent activity</span>
              </span>
              <span class="dash-nav__hint">01</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="content">
              <span>
                <span class="dash-nav__label">My Content</span><br/>
                <span class="dash-nav__hint">Submitted lessons and status</span>
              </span>
              <span class="dash-nav__hint">02</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="maps">
              <span>
                <span class="dash-nav__label">My Maps</span><br/>
                <span class="dash-nav__hint">Submitted maps and review outcome</span>
              </span>
              <span class="dash-nav__hint">03</span>
            </button>
            <button type="button" class="dash-nav__button" data-action="show-section" data-section="submit">
              <span>
                <span class="dash-nav__label">New Submission</span><br/>
                <span class="dash-nav__hint">Create fresh lesson content</span>
              </span>
              <span class="dash-nav__hint">04</span>
            </button>
          </nav>

          <div class="dash-sidebar__actions">
            <button type="button" class="dash-button dash-button--secondary" data-action="open-map-editor">Open Map Editor</button>
            <button type="button" class="dash-button dash-button--ghost" data-action="logout">Logout</button>
          </div>
        </aside>

        <section class="dash-main">
          <header class="dash-main__header">
            <div class="dash-main__title">
              <h2 id="contributor-main-title">Overview</h2>
              <p id="contributor-main-subtitle">Track your content pipeline and jump straight into the next submission.</p>
            </div>
            <div class="dash-main__actions">
              <button type="button" class="dash-button dash-button--secondary" data-action="refresh-content">Refresh Data</button>
              <button type="button" class="dash-button" data-action="show-section" data-section="submit">Create Lesson</button>
            </div>
          </header>

          <div class="dash-scroll">
            <div id="contributor-status" class="dash-status" role="status" aria-live="polite" aria-atomic="true"></div>
            <section class="dash-section is-active" data-section-panel="overview"><div id="contributor-overview"></div></section>
            <section class="dash-section" data-section-panel="content"><div id="contributor-content"></div></section>
            <section class="dash-section" data-section-panel="maps"><div id="contributor-maps"></div></section>
            <section class="dash-section" data-section-panel="submit"><div id="contributor-submit"></div></section>
          </div>
        </section>
      </div>
    `;

    this.toastHost = createToastHost();
    this.portalRoot.appendChild(this.toastHost);
    document.body.appendChild(this.portalRoot);

    this.portalRoot.addEventListener('click', this.handleClick);
    this.portalRoot.addEventListener('submit', this.handleSubmitEvent);
    this.portalRoot.addEventListener('input', this.handleInputEvent);
    this.portalRoot.addEventListener('change', this.handleChangeEvent);
  }

  destroyPortal() {
    if (this.portalRoot) {
      this.portalRoot.removeEventListener('click', this.handleClick);
      this.portalRoot.removeEventListener('submit', this.handleSubmitEvent);
      this.portalRoot.removeEventListener('input', this.handleInputEvent);
      this.portalRoot.removeEventListener('change', this.handleChangeEvent);
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

    if (action === 'refresh-content') {
      event.preventDefault();
      void this.loadInitialData();
      return;
    }

    if (action === 'open-map-editor') {
      event.preventDefault();
      this.scene.start('MapEditorScene');
      return;
    }

    if (action === 'logout') {
      event.preventDefault();
      void this.logout();
      return;
    }

    if (action === 'add-narration') {
      event.preventDefault();
      this.addNarrationRow();
      return;
    }

    if (action === 'generate-narrations') {
      event.preventDefault();
      void this.generateNarrations();
      return;
    }

    if (action === 'clear-content-filters') {
      event.preventDefault();
      this.state.contentFilters = {
        query: '',
        status: 'ALL',
        topicId: 'ALL',
        sort: 'submitted_desc'
      };
      this.state.contentPagination.page = 1;
      this.renderContentSection();
      return;
    }

    if (action === 'content-prev-page') {
      event.preventDefault();
      const currentPage = Number(this.state.contentPagination.page || 1);
      this.state.contentPagination.page = Math.max(1, currentPage - 1);
      this.renderContentSection();
      return;
    }

    if (action === 'content-next-page') {
      event.preventDefault();
      const currentPage = Number(this.state.contentPagination.page || 1);
      const pageSize = Math.max(1, Number(this.state.contentPagination.pageSize || 10));
      const totalItems = this.getFilteredContentRows().length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      this.state.contentPagination.page = Math.min(totalPages, currentPage + 1);
      this.renderContentSection();
      return;
    }
  };

  handleSubmitEvent = (event) => {
    if (event.target?.id === 'contributor-submit-form') {
      event.preventDefault();
      void this.submitContent();
    }
  };

  handleInputEvent = (event) => {
    if (event.target?.id !== 'content-filter-query') return;
    this.state.contentFilters.query = event.target.value || '';
    this.state.contentPagination.page = 1;
    this.renderContentSection();
  };

  handleChangeEvent = (event) => {
    const target = event.target;
    if (!target) return;

    if (target.id === 'content-filter-status') {
      this.state.contentFilters.status = target.value || 'ALL';
      this.state.contentPagination.page = 1;
      this.renderContentSection();
      return;
    }
    if (target.id === 'content-filter-topic') {
      this.state.contentFilters.topicId = target.value || 'ALL';
      this.state.contentPagination.page = 1;
      this.renderContentSection();
      return;
    }
    if (target.id === 'content-filter-sort') {
      this.state.contentFilters.sort = target.value || 'submitted_desc';
      this.state.contentPagination.page = 1;
      this.renderContentSection();
      return;
    }
    if (target.id === 'content-page-size') {
      const parsed = Number(target.value);
      this.state.contentPagination.pageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
      this.state.contentPagination.page = 1;
      this.renderContentSection();
    }
  };

  getFilteredContentRows() {
    const rows = [...this.state.contents].sort((left, right) => {
      const leftTime = new Date(left?.submittedAt || 0).getTime();
      const rightTime = new Date(right?.submittedAt || 0).getTime();
      return rightTime - leftTime;
    });
    const filters = this.state.contentFilters || {};
    const query = String(filters.query || '').trim().toLowerCase();
    const selectedStatus = filters.status || 'ALL';
    const selectedTopicId = filters.topicId || 'ALL';
    const selectedSort = filters.sort || 'submitted_desc';

    let filteredRows = rows.filter((row) => {
      const status = String(row?.status || '').trim();
      const topicId = String(row?.topic?.topicId || '').trim();
      const title = String(row?.title || '');
      const topicName = String(row?.topic?.topicName || '');
      const preview = buildContentPreview(row);

      if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;
      if (selectedTopicId !== 'ALL' && topicId !== selectedTopicId) return false;
      if (query) {
        const haystack = `${title} ${topicName} ${preview}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    if (selectedSort === 'submitted_asc') {
      filteredRows = filteredRows.sort((left, right) => (
        new Date(left?.submittedAt || 0).getTime() - new Date(right?.submittedAt || 0).getTime()
      ));
    } else if (selectedSort === 'title_asc') {
      filteredRows = filteredRows.sort((left, right) => (
        String(left?.title || '').localeCompare(String(right?.title || ''), undefined, { sensitivity: 'base' })
      ));
    } else if (selectedSort === 'title_desc') {
      filteredRows = filteredRows.sort((left, right) => (
        String(right?.title || '').localeCompare(String(left?.title || ''), undefined, { sensitivity: 'base' })
      ));
    } else {
      filteredRows = filteredRows.sort((left, right) => (
        new Date(right?.submittedAt || 0).getTime() - new Date(left?.submittedAt || 0).getTime()
      ));
    }

    return filteredRows;
  }

  async loadInitialData() {
    this.setStatus('Loading contributor workspace...', false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error('No active contributor session');

      const profile = await apiService.getContributorBySupabaseId(uid);
      const [contents, analytics, topics, npcs, maps, mapSubmissions] = await Promise.all([
        apiService.getContentByContributor(profile.contributorId).catch(() => []),
        apiService.getMyContributorAnalytics().catch(() => null),
        apiService.getAllTopics().catch(() => []),
        apiService.getAllNPCs().catch(() => []),
        apiService.getAllMaps().catch(() => []),
        apiService.getMyMapSubmissions().catch(() => [])
      ]);

      this.state.profile = profile;
      this.state.contents = Array.isArray(contents) ? contents : [];
      this.state.analytics = analytics || null;
      this.state.mapSubmissions = Array.isArray(mapSubmissions) ? mapSubmissions : [];
      this.state.topics = Array.isArray(topics) ? topics : [];
      this.state.npcs = Array.isArray(npcs) ? npcs : [];
      this.state.maps = Array.isArray(maps) ? maps : [];

      const mapAvailability = await this.resolveMapAvailability(this.state.maps);
      this.state.availableMaps = this.state.maps.filter((map) => {
        const mapId = String(map?.mapId || '');
        return mapId && !mapAvailability.fullMapIds.has(mapId);
      });
      this.state.mapApprovedNpcCounts = mapAvailability.approvedNpcCountByMapId;

      gameState.setContributor(profile);
      gameState.setRole('contributor');

      this.renderProfile();
      this.renderOverview();
      this.renderContentSection();
      this.renderMapSubmissionsSection();
      this.renderSubmitSection();
      this.setStatus('Workspace updated.', false);
    } catch (error) {
      this.renderProfile();
      this.renderOverview(true);
      this.renderContentSection(true);
      this.renderMapSubmissionsSection(true);
      this.renderSubmitSection(true);
      this.setStatus(getErrorMessage(error, 'Unable to load contributor workspace'), true);
    }
  }

  renderProfile() {
    const nameEl = this.portalRoot?.querySelector('#contributor-profile-name');
    const subtitleEl = this.portalRoot?.querySelector('#contributor-profile-subtitle');
    const profile = this.state.profile;

    if (nameEl) {
      nameEl.textContent = profile?.fullName || profile?.email || 'Contributor';
    }
    if (subtitleEl) {
      subtitleEl.textContent = profile?.bio || profile?.email || 'Create and manage lesson content';
    }
  }

  renderOverview(hasError = false) {
    const container = this.portalRoot?.querySelector('#contributor-overview');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Workspace unavailable', 'We could not load contributor data right now. Try refreshing once the backend is ready.');
      return;
    }

    const rows = [...this.state.contents].sort((left, right) => {
      const leftTime = new Date(left?.submittedAt || 0).getTime();
      const rightTime = new Date(right?.submittedAt || 0).getTime();
      return rightTime - leftTime;
    });
    const analytics = this.state.analytics || {};
    const moderationRates = analytics?.moderationRates || {};
    const pendingCount = countByStatus(rows, 'PENDING_REVIEW');
    const approvedCount = Number(moderationRates?.approvedCount ?? countByStatus(rows, 'APPROVED'));
    const rejectedCount = Number(moderationRates?.rejectedCount ?? countByStatus(rows, 'REJECTED'));
    const totalSubmitted = Number(moderationRates?.totalSubmitted ?? rows.length);
    const flaggedCount = Number(moderationRates?.flaggedCount ?? 0);
    const approvalRate = formatPercent(moderationRates?.approvalRate);
    const rejectionRate = formatPercent(moderationRates?.rejectionRate);
    const flaggedRate = formatPercent(moderationRates?.flaggedRate);
    const topPerforming = Array.isArray(analytics?.topPerformingContents)
      ? analytics.topPerformingContents.slice(0, 3)
      : [];

    const recentItems = rows.slice(0, 3).map((row) => `
      <div class="dash-mini-list__item">
        <div>
          <strong>${escapeHtml(row?.title || 'Untitled content')}</strong><br/>
          <span class="dash-muted">${escapeHtml(row?.topic?.topicName || 'Unknown topic')}</span>
        </div>
        <div style="text-align:right;">
          ${renderBadge(row?.status || 'UNKNOWN')}<br/>
          <span class="dash-muted">${escapeHtml(formatDate(row?.submittedAt))}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="dash-hero">
        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Content pipeline at a glance</h3>
            ${renderBadge('CONTRIBUTOR')}
          </div>
          <p>Use this space like a proper content studio: monitor review status, prep the next lesson, and jump into map editing when your lesson needs world context.</p>
          <div class="dash-button-group" style="margin-top:18px;">
            <button type="button" class="dash-button" data-action="show-section" data-section="submit">Start new submission</button>
            <button type="button" class="dash-button dash-button--secondary" data-action="show-section" data-section="content">Review my content</button>
          </div>
        </article>

        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Studio inventory</h3>
            <span class="dash-muted">Ready for authoring</span>
          </div>
          <div class="dash-mini-list">
            <div class="dash-mini-list__item"><span>Topics available</span><strong>${this.state.topics.length}</strong></div>
            <div class="dash-mini-list__item"><span>NPCs available</span><strong>${this.state.npcs.length}</strong></div>
            <div class="dash-mini-list__item"><span>Maps available</span><strong>${this.state.maps.length}</strong></div>
          </div>
        </article>
      </div>

      <div class="dash-grid dash-grid--metrics">
        <article class="dash-card dash-metric">
          <span class="dash-metric__label">Total submissions</span>
          <span class="dash-metric__value">${totalSubmitted}</span>
          <span class="dash-metric__delta">Across all lessons</span>
        </article>
        <article class="dash-card dash-metric">
          <span class="dash-metric__label">Approval Rate</span>
          <span class="dash-metric__value">${approvalRate}</span>
          <span class="dash-metric__delta">${approvedCount} approved</span>
        </article>
        <article class="dash-card dash-metric">
          <span class="dash-metric__label">Rejection Rate</span>
          <span class="dash-metric__value">${rejectionRate}</span>
          <span class="dash-metric__delta">${rejectedCount} rejected</span>
        </article>
        <article class="dash-card dash-metric">
          <span class="dash-metric__label">Flagged Rate</span>
          <span class="dash-metric__value">${flaggedRate}</span>
          <span class="dash-metric__delta">${flaggedCount} flagged</span>
        </article>
      </div>

      <div class="dash-grid dash-grid--two">
        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Recent submissions</h3>
            <button type="button" class="dash-link-button" data-action="show-section" data-section="content">See all</button>
          </div>
          <div class="dash-mini-list">
            ${recentItems || renderEmptyState('No content yet', 'Create your first lesson to start filling the contributor pipeline.')}
          </div>
        </article>

        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Top-performing content</h3>
            <span class="dash-muted">Top 3 by rating</span>
          </div>
          <div class="dash-mini-list">
            ${topPerforming.map((item) => `
              <div class="dash-mini-list__item">
                <span>${escapeHtml(item?.title || 'Untitled content')}</span>
                <strong>${Number(item?.averageRating || 0).toFixed(2)}* (${Number(item?.ratingCount || 0)})</strong>
              </div>
            `).join('') || renderEmptyState('No rated content yet', 'Once learners rate your approved lessons, your top-performing items will appear here.')}
          </div>
        </article>
      </div>

      <div class="dash-grid dash-grid--two" style="margin-top:22px;">
        <article class="dash-card dash-metric">
          <span class="dash-metric__label">Pending Review</span>
          <span class="dash-metric__value">${pendingCount}</span>
          <span class="dash-metric__delta">Awaiting moderation</span>
        </article>
        <article class="dash-card">
          <div class="dash-card__headline">
            <h3>Suggested next step</h3>
            <span class="dash-muted">Momentum builder</span>
          </div>
          <p>${rows.length === 0
            ? 'You have the studio ready to go. Start with a topic, pair it with an NPC and map, and generate draft narrations to speed up the first submission.'
            : pendingCount > 0
              ? 'You already have content in moderation. Use this moment to draft the next lesson, or refine your map setup so future submissions land faster.'
              : 'Your queue is moving well. Keep the cadence up with a fresh lesson or jump into the map editor to deepen the learner flow.'}</p>
          <div class="dash-button-group" style="margin-top:18px;">
            <button type="button" class="dash-button" data-action="show-section" data-section="submit">Draft another lesson</button>
            <button type="button" class="dash-button dash-button--ghost" data-action="open-map-editor">Open map editor</button>
          </div>
        </article>
      </div>
    `;
  }

  renderContentSection(hasError = false) {
    const container = this.portalRoot?.querySelector('#contributor-content');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Content list unavailable', 'We could not read your submitted content right now. Refresh when the services settle.');
      return;
    }

    const rows = [...this.state.contents].sort((left, right) => {
      const leftTime = new Date(left?.submittedAt || 0).getTime();
      const rightTime = new Date(right?.submittedAt || 0).getTime();
      return rightTime - leftTime;
    });
    const filters = this.state.contentFilters || {};
    const selectedStatus = filters.status || 'ALL';
    const selectedTopicId = filters.topicId || 'ALL';
    const selectedSort = filters.sort || 'submitted_desc';

    const topicOptions = new Map();
    this.state.topics.forEach((topic) => {
      const id = String(topic?.topicId || '').trim();
      if (!id) return;
      topicOptions.set(id, topic?.topicName || id);
    });
    rows.forEach((row) => {
      const id = String(row?.topic?.topicId || '').trim();
      if (!id || topicOptions.has(id)) return;
      topicOptions.set(id, row?.topic?.topicName || id);
    });

    const statusValues = Array.from(new Set(
      rows
        .map((row) => String(row?.status || '').trim())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right));

    const filteredRows = this.getFilteredContentRows();
    const pageSize = Math.max(1, Number(this.state.contentPagination.pageSize || 10));
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const currentPage = Math.min(totalPages, Math.max(1, Number(this.state.contentPagination.page || 1)));
    this.state.contentPagination.page = currentPage;
    const startIndex = (currentPage - 1) * pageSize;
    const pagedRows = filteredRows.slice(startIndex, startIndex + pageSize);

    const ratingsPerContent = Array.isArray(this.state.analytics?.ratingsPerContent)
      ? this.state.analytics.ratingsPerContent
      : [];
    const ratingByContentId = new Map(
      ratingsPerContent.map((item) => [String(item?.contentId || ''), item])
    );

    const cards = pagedRows.map((row) => `
      <article class="dash-row-card">
        <div class="dash-row-card__header">
          <div>
            <div class="dash-row-card__title">${escapeHtml(row?.title || 'Untitled content')}</div>
            <div class="dash-row-card__meta">
              <span>${escapeHtml(row?.topic?.topicName || 'Unknown topic')}</span>
              <span>${escapeHtml(formatDate(row?.submittedAt))}</span>
              <span>${escapeHtml(row?.contentId || 'Missing id')}</span>
              <span>Rating ${Number(ratingByContentId.get(String(row?.contentId || ''))?.averageRating || 0).toFixed(2)}* (${Number(ratingByContentId.get(String(row?.contentId || ''))?.ratingCount || 0)})</span>
            </div>
          </div>
          ${renderBadge(row?.status || 'UNKNOWN')}
        </div>
        <div class="dash-row-card__body">${escapeHtml(buildContentPreview(row))}</div>
      </article>
    `).join('');
    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">All submitted content</h3>
            <p>Search, filter, and sort your lessons while keeping moderation state front and center.</p>
          </div>
          <button type="button" class="dash-button dash-button--secondary" data-action="refresh-content">Refresh list</button>
        </div>
      </div>
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-form__grid">
          <div class="dash-field">
            <label for="content-filter-query">Search</label>
            <input id="content-filter-query" class="dash-input" type="search" placeholder="Title, topic, or description..." value="${escapeHtml(filters.query || '')}" />
          </div>
          <div class="dash-field">
            <label for="content-filter-status">Status</label>
            <select id="content-filter-status" class="dash-select">
              <option value="ALL"${selectedStatus === 'ALL' ? ' selected' : ''}>All statuses</option>
              ${statusValues.map((status) => (
                `<option value="${escapeHtml(status)}"${selectedStatus === status ? ' selected' : ''}>${escapeHtml(status)}</option>`
              )).join('')}
            </select>
          </div>
          <div class="dash-field">
            <label for="content-filter-topic">Topic</label>
            <select id="content-filter-topic" class="dash-select">
              <option value="ALL"${selectedTopicId === 'ALL' ? ' selected' : ''}>All topics</option>
              ${Array.from(topicOptions.entries())
                .sort((left, right) => String(left[1]).localeCompare(String(right[1]), undefined, { sensitivity: 'base' }))
                .map(([id, name]) => (
                  `<option value="${escapeHtml(id)}"${selectedTopicId === id ? ' selected' : ''}>${escapeHtml(name)}</option>`
                ))
                .join('')}
            </select>
          </div>
          <div class="dash-field">
            <label for="content-filter-sort">Sort</label>
            <select id="content-filter-sort" class="dash-select">
              <option value="submitted_desc"${selectedSort === 'submitted_desc' ? ' selected' : ''}>Newest first</option>
              <option value="submitted_asc"${selectedSort === 'submitted_asc' ? ' selected' : ''}>Oldest first</option>
              <option value="title_asc"${selectedSort === 'title_asc' ? ' selected' : ''}>Title A-Z</option>
              <option value="title_desc"${selectedSort === 'title_desc' ? ' selected' : ''}>Title Z-A</option>
            </select>
          </div>
        </div>
        <div class="dash-inline" style="margin-top:14px;">
          <span class="dash-muted">Showing ${filteredRows.length} of ${rows.length} submissions</span>
          <div class="dash-button-group">
            <div class="dash-field" style="min-width:130px;">
              <label for="content-page-size">Rows</label>
              <select id="content-page-size" class="dash-select">
                <option value="10"${pageSize === 10 ? ' selected' : ''}>10 per page</option>
                <option value="20"${pageSize === 20 ? ' selected' : ''}>20 per page</option>
                <option value="50"${pageSize === 50 ? ' selected' : ''}>50 per page</option>
              </select>
            </div>
            <button type="button" class="dash-link-button" data-action="clear-content-filters">Clear filters</button>
          </div>
        </div>
      </div>
      <div class="dash-list">
        ${cards || renderEmptyState('No matching submissions', 'Try a different search term or clear the active filters.')}
      </div>
      <div class="dash-card" style="margin-top:18px;">
        <div class="dash-inline">
          <span class="dash-muted">Page ${currentPage} of ${totalPages}</span>
          <div class="dash-button-group">
            <button type="button" class="dash-button dash-button--secondary" data-action="content-prev-page"${currentPage <= 1 ? ' disabled' : ''}>Previous</button>
            <button type="button" class="dash-button dash-button--secondary" data-action="content-next-page"${currentPage >= totalPages ? ' disabled' : ''}>Next</button>
          </div>
        </div>
      </div>
    `;
  }

  renderSubmitSection(hasError = false) {
    const container = this.portalRoot?.querySelector('#contributor-submit');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Submission form unavailable', 'We could not load the data needed for lesson creation.');
      return;
    }
    if (!this.state.topics.length || !this.state.npcs.length || !this.state.maps.length) {
      container.innerHTML = renderEmptyState(
        'Authoring data incomplete',
        'A topic, NPC, and map are all required before contributors can create a lesson. Ask an admin to seed the missing data first.'
      );
      return;
    }
    if (!this.state.availableMaps.length) {
      container.innerHTML = renderEmptyState(
        'No map slots available',
        `All maps already have ${MAX_APPROVED_NPCS_PER_MAP} approved NPCs. Pick another NPC/map pairing after moderation changes or map updates.`
      );
      return;
    }

    const topicOptions = this.state.topics.map((topic) => (
      `<option value="${escapeHtml(topic?.topicId || '')}">${escapeHtml(topic?.topicName || 'Untitled Topic')}</option>`
    )).join('');
    const npcOptions = this.state.npcs.map((npc) => (
      `<option value="${escapeHtml(npc?.npc_id || '')}">${escapeHtml(npc?.name || 'Unnamed NPC')}</option>`
    )).join('');
    const mapOptions = this.state.availableMaps.map((map) => (
      `<option value="${escapeHtml(map?.mapId || '')}">${escapeHtml(map?.name || 'Unnamed Map')} (${Number(this.state.mapApprovedNpcCounts[String(map?.mapId || '')] || 0)}/${MAX_APPROVED_NPCS_PER_MAP})</option>`
    )).join('');

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">Create a new lesson</h3>
            <p>Pair a topic with a world location, generate draft narrations, then submit everything in one clean pass.</p>
          </div>
          <button type="button" class="dash-button dash-button--secondary" data-action="open-map-editor">Need a map?</button>
        </div>
      </div>

      <form id="contributor-submit-form" class="dash-form">
        <div class="dash-form__grid">
          <div class="dash-field">
            <label for="content-topic">Topic</label>
            <select id="content-topic" class="dash-select">${topicOptions}</select>
          </div>
          <div class="dash-field">
            <label for="content-npc">NPC</label>
            <select id="content-npc" class="dash-select">${npcOptions}</select>
          </div>
          <div class="dash-field">
            <label for="content-map">Map</label>
            <select id="content-map" class="dash-select">${mapOptions}</select>
          </div>
          <div class="dash-field">
            <label for="content-video">Optional video</label>
            <input id="content-video" class="dash-input" type="file" accept="video/mp4,video/webm,video/ogg" />
          </div>
        </div>

        <div class="dash-field">
          <label for="content-title">Title</label>
          <input id="content-title" class="dash-input" type="text" maxlength="120" placeholder="Give the lesson a clear, specific title" />
        </div>

        <div class="dash-field">
          <label for="content-description">Description</label>
          <textarea id="content-description" class="dash-textarea" placeholder="Describe what learners should understand after this lesson."></textarea>
        </div>

        <div class="dash-card">
          <div class="dash-inline" style="margin-bottom:14px;">
            <div>
              <h4 style="margin:0 0 6px;">Narration lines</h4>
              <p>Generate a starting draft with AI, then edit the lines before submitting.</p>
            </div>
            <div class="dash-button-group">
              <button type="button" class="dash-button dash-button--secondary" data-action="generate-narrations">${this.state.isGenerating ? 'Generating...' : 'Generate with AI'}</button>
              <button type="button" class="dash-button dash-button--ghost" data-action="add-narration">Add line</button>
            </div>
          </div>
          <div id="contributor-narrations" class="dash-list"></div>
        </div>

        <div id="contributor-submit-status" class="dash-status" role="status" aria-live="polite" aria-atomic="true"></div>

        <div class="dash-button-group">
          <button id="contributor-submit-button" type="submit" class="dash-button"${this.state.isSubmitting ? ' disabled' : ''}>${this.state.isSubmitting ? 'Submitting...' : 'Submit lesson'}</button>
          <button type="button" class="dash-button dash-button--secondary" data-action="add-narration">Add another narration</button>
        </div>
      </form>
    `;

    const narrationContainer = this.portalRoot.querySelector('#contributor-narrations');
    if (narrationContainer && !narrationContainer.children.length) {
      this.addNarrationRow();
    }
    this.setSubmitUiState();
  }

  addNarrationRow(value = '') {
    const container = this.portalRoot?.querySelector('#contributor-narrations');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'dash-row-card';
    row.innerHTML = `
      <div class="dash-inline">
        <strong>Narration line</strong>
        <button type="button" class="dash-link-button" data-inline-action="remove-narration">Remove</button>
      </div>
      <textarea class="dash-textarea" data-role="narration-line" placeholder="Narrate the lesson in a friendly, learner-facing voice.">${escapeHtml(value)}</textarea>
    `;

    row.querySelector('[data-inline-action="remove-narration"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      row.remove();
      if (!container.querySelector('[data-role="narration-line"]')) {
        this.addNarrationRow();
      }
    });

    container.appendChild(row);
  }

  collectNarrations() {
    return Array.from(this.portalRoot?.querySelectorAll('[data-role="narration-line"]') || [])
      .map((textarea) => textarea.value.trim())
      .filter(Boolean);
  }

  async generateNarrations() {
    if (this.state.isGenerating) return;

    const topicId = this.portalRoot?.querySelector('#content-topic')?.value?.trim();
    const title = this.portalRoot?.querySelector('#content-title')?.value?.trim();
    const description = this.portalRoot?.querySelector('#content-description')?.value?.trim();
    if (!topicId || !title || !description) {
      this.setSubmitStatus('Fill in topic, title, and description before generating narrations.', true);
      return;
    }

    this.state.isGenerating = true;
    this.setSubmitUiState();
    this.setSubmitStatus('Generating narration draft...', false);

    try {
      const result = await apiService.generateNarrations(topicId, title, description);
      const lines = Array.isArray(result?.narrations) ? result.narrations : [];
      const container = this.portalRoot?.querySelector('#contributor-narrations');
      if (container) {
        container.innerHTML = '';
        if (!lines.length) this.addNarrationRow();
        lines.forEach((line) => this.addNarrationRow(line));
      }
      this.setSubmitStatus(`${lines.length || 0} narration lines generated. Review and edit before submitting.`, false);
    } catch (error) {
      this.setSubmitStatus(getErrorMessage(error, 'AI generation failed'), true);
    } finally {
      this.state.isGenerating = false;
      this.setSubmitUiState();
    }
  }

  async submitContent() {
    if (this.state.isSubmitting || !this.state.profile) return;

    const topicId = this.portalRoot?.querySelector('#content-topic')?.value?.trim();
    const npcId = this.portalRoot?.querySelector('#content-npc')?.value?.trim();
    const mapId = this.portalRoot?.querySelector('#content-map')?.value?.trim();
    const title = this.portalRoot?.querySelector('#content-title')?.value?.trim();
    const description = this.portalRoot?.querySelector('#content-description')?.value?.trim();
    const videoFile = this.portalRoot?.querySelector('#content-video')?.files?.[0] || null;
    const narrations = this.collectNarrations();

    if (!topicId || !npcId || !mapId || !title || !description) {
      this.setSubmitStatus('Topic, NPC, map, title, and description are required.', true);
      return;
    }
    if (!this.isMapSelectable(mapId)) {
      this.setSubmitStatus(`Selected map is no longer available. Maps with ${MAX_APPROVED_NPCS_PER_MAP} approved NPCs cannot be used for new content.`, true);
      return;
    }
    if (!narrations.length) {
      this.setSubmitStatus('Add at least one narration line before submitting.', true);
      return;
    }

    this.state.isSubmitting = true;
    this.setSubmitUiState();
    this.setSubmitStatus('Submitting lesson content...', false);

    try {
      let videoUrl = null;
      if (videoFile) {
        videoUrl = await this.uploadContentVideo(videoFile, this.state.profile.contributorId);
      }

      await apiService.submitContent({
        contributorId: this.state.profile.contributorId,
        topicId,
        npcId,
        mapId,
        title,
        description,
        narrations,
        videoUrl
      });

      showToast(this.toastHost, 'Lesson submitted for review.');
      this.setSubmitStatus('Lesson submitted successfully. Your content list is refreshing.', false);
      await this.loadInitialData();
      this.showSection('content');
      this.resetSubmissionForm();
    } catch (error) {
      this.setSubmitStatus(getErrorMessage(error, 'Submission failed'), true);
    } finally {
      this.state.isSubmitting = false;
      this.setSubmitUiState();
    }
  }

  async uploadContentVideo(file, contributorId) {
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error('Video is too large. Max size is 50MB.');
    }

    const bucket = 'lesson-videos';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `contributors/${contributorId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Video upload failed');
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || null;
  }

  resetSubmissionForm() {
    const form = this.portalRoot?.querySelector('#contributor-submit-form');
    if (!form) return;
    form.reset();
    const container = this.portalRoot.querySelector('#contributor-narrations');
    if (container) {
      container.innerHTML = '';
      this.addNarrationRow();
    }
    this.setSubmitUiState();
  }

  setSubmitUiState() {
    const generateButton = this.portalRoot?.querySelector('[data-action="generate-narrations"]');
    const submitButton = this.portalRoot?.querySelector('#contributor-submit-button');
    const addButtons = this.portalRoot?.querySelectorAll('[data-action="add-narration"]');

    if (generateButton) {
      generateButton.disabled = this.state.isGenerating || this.state.isSubmitting;
      generateButton.textContent = this.state.isGenerating ? 'Generating...' : 'Generate with AI';
    }
    if (submitButton) {
      submitButton.disabled = this.state.isSubmitting;
      submitButton.textContent = this.state.isSubmitting ? 'Submitting...' : 'Submit lesson';
    }
    addButtons?.forEach((button) => {
      button.disabled = this.state.isGenerating || this.state.isSubmitting;
    });
  }

  setStatus(message, isError) {
    const statusEl = this.portalRoot?.querySelector('#contributor-status');
    if (!statusEl) return;
    statusEl.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    statusEl.textContent = message ? (isError ? `Error: ${message}` : message) : '';
    statusEl.style.color = isError ? '#ffb8c6' : '';
  }

  renderMapSubmissionsSection(hasError = false) {
    const container = this.portalRoot?.querySelector('#contributor-maps');
    if (!container) return;

    if (hasError) {
      container.innerHTML = renderEmptyState('Map submissions unavailable', 'We could not load your map submission history.');
      return;
    }

    const rows = [...(this.state.mapSubmissions || [])].sort((left, right) => {
      const leftTime = new Date(left?.publishedAt || left?.approvedAt || 0).getTime();
      const rightTime = new Date(right?.publishedAt || right?.approvedAt || 0).getTime();
      return rightTime - leftTime;
    });

    const cards = rows.map((row) => {
      const status = String(row?.status || 'UNKNOWN').toUpperCase();
      const published = Boolean(row?.published);
      const detail = status === 'REJECTED'
        ? (row?.rejectionReason || 'Rejected by admin.')
        : published
          ? 'Approved and published.'
          : status === 'APPROVED'
            ? 'Approved and awaiting publish.'
            : 'Pending admin review.';

      return `
        <article class="dash-row-card">
          <div class="dash-row-card__header">
            <div>
              <div class="dash-row-card__title">${escapeHtml(row?.name || 'Untitled map')}</div>
              <div class="dash-row-card__meta">
                <span>${escapeHtml(row?.mapId || 'No map id')}</span>
                <span>${escapeHtml(row?.asset || 'No asset')}</span>
              </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              ${renderBadge(status)}
              ${published ? renderBadge('PUBLISHED') : ''}
            </div>
          </div>
          <div class="dash-row-card__body">${escapeHtml(detail)}</div>
          <div class="dash-mini-list">
            <div class="dash-mini-list__item"><span>Approved at</span><strong>${escapeHtml(formatDate(row?.approvedAt))}</strong></div>
            <div class="dash-mini-list__item"><span>Published at</span><strong>${escapeHtml(formatDate(row?.publishedAt))}</strong></div>
            <div class="dash-mini-list__item"><span>Topic</span><strong>${escapeHtml(row?.topicName || row?.topicId || 'Not assigned')}</strong></div>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:18px;">
        <div class="dash-inline">
          <div>
            <h3 style="margin:0 0 8px;">My map submissions</h3>
            <p>Track pending, rejected, approved, and published maps from the editor submission flow.</p>
          </div>
          <button type="button" class="dash-button dash-button--secondary" data-action="open-map-editor">Open map editor</button>
        </div>
      </div>
      <div class="dash-list">
        ${cards || renderEmptyState('No map submissions yet', 'Submit a map from the editor and its review status will appear here.')}
      </div>
    `;
  }

  setSubmitStatus(message, isError) {
    const statusEl = this.portalRoot?.querySelector('#contributor-submit-status');
    if (!statusEl) return;
    statusEl.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    statusEl.textContent = message ? (isError ? `Error: ${message}` : message) : '';
    statusEl.style.color = isError ? '#ffb8c6' : '';
  }

  isMapSelectable(mapId) {
    if (!mapId) return false;
    const target = String(mapId);
    return this.state.availableMaps.some((map) => String(map?.mapId || '') === target);
  }

  async resolveMapAvailability(maps) {
    const approvedNpcCountByMapId = {};
    const fullMapIds = new Set();
    if (!Array.isArray(maps) || !maps.length) {
      return { approvedNpcCountByMapId, fullMapIds };
    }

    await Promise.all(maps.map(async (map) => {
      const mapId = String(map?.mapId || '').trim();
      if (!mapId) return;

      try {
        const rows = await apiService.getNPCsByMap(mapId);
        const npcIds = new Set(
          (Array.isArray(rows) ? rows : [])
            .map((row) => String(row?.npcId || '').trim())
            .filter(Boolean)
        );
        const approvedCount = npcIds.size;
        approvedNpcCountByMapId[mapId] = approvedCount;
        if (approvedCount >= MAX_APPROVED_NPCS_PER_MAP) {
          fullMapIds.add(mapId);
        }
      } catch (_error) {
        approvedNpcCountByMapId[mapId] = 0;
      }
    }));

    return { approvedNpcCountByMapId, fullMapIds };
  }

  showSection(section) {
    this.state.activeSection = section;
    const config = {
      overview: ['Overview', 'Track your content pipeline and jump straight into the next submission.'],
      content: ['My Content', 'Everything you have submitted, sorted by freshness and moderation status.'],
      maps: ['My Maps', 'Track map review and publish status from contributor submissions.'],
      submit: ['New Submission', 'Build a new lesson with AI-assisted narrations and media support.']
    };

    this.portalRoot?.querySelectorAll('.dash-nav__button[data-section]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.section === section);
    });
    this.portalRoot?.querySelectorAll('.dash-section').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.sectionPanel === section);
    });

    const [title, subtitle] = config[section] || config.overview;
    const titleEl = this.portalRoot?.querySelector('#contributor-main-title');
    const subtitleEl = this.portalRoot?.querySelector('#contributor-main-subtitle');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  async logout() {
    await supabase.auth.signOut();
    gameState.clearState();
    routeToLogin(this, { hardReload: true });
  }
}
