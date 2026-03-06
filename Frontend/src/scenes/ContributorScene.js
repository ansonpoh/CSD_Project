import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';

export class ContributorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ContributorScene' });
    this.submitForm = null;
    this.submitMessageEl = null;
    this.submitButtonEl = null;
    this.cancelButtonEl = null;
    this.contentListModal = null;
    this.narrationsContainer = null;
    this.aiGenerateBtn = null;
    this.addLineBtn = null;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x0b1730);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1730);
    this.add.circle(width * 0.2, height * 0.25, 220, 0x1c3f7a, 0.14);
    this.add.circle(width * 0.8, height * 0.75, 260, 0x17345f, 0.16);

    this.add.text(width / 2, 88, 'CONTRIBUTOR PORTAL', {
      fontSize: '42px',
      color: '#e6f0ff',
      fontStyle: 'bold',
      stroke: '#071224',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'Create and manage learning content', {
      fontSize: '18px',
      color: '#a6c3ec',
      stroke: '#071224',
      strokeThickness: 3
    }).setOrigin(0.5);

    const panelW = 860;
    const panelH = 460;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2 + 40;

    const panel = this.add.graphics();
    panel.fillStyle(0x101f3d, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xc8870a, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const cardW = 250;
    const cardH = 150;
    const gap = 28;
    const totalCards = 2;
    const startX = width / 2 - ((cardW * totalCards + gap * (totalCards - 1)) / 2) + cardW / 2;
    const y = panelY + 140;

    this.createActionCard(startX, y, cardW, cardH, 'My Content', 'View content you submitted', async () => {
      await this.openMyContentWorkflow();
    });

    this.createActionCard(startX + cardW + gap, y, cardW, cardH, 'Submit Content', 'Open submit workflow', async () => {
      await this.openSubmitWorkflow();
    });

    this.createButton(width / 2 - 90, panelY + panelH - 64, 180, 42, 'Logout', async () => {
      this.destroySubmitForm();
      this.destroyContentListModal();
      await supabase.auth.signOut();
      gameState.clearState();
      this.scene.start('LoginScene');
    }, 0x4a1111, 0x7a1b1b);

    this.events.once('shutdown', () => {
      this.destroySubmitForm();
      this.destroyContentListModal();
    });
    this.events.once('destroy', () => {
      this.destroySubmitForm();
      this.destroyContentListModal();
    });
  }

  createActionCard(x, y, w, h, title, subtitle, onClick) {
    const c = this.add.container(x - w / 2, y - h / 2);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, w, h, 6);
      bg.fillStyle(0xffffff, 0.05);
      bg.fillRoundedRect(2, 2, w - 4, h * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(0x1a2f58, 0x76a8e8);
    c.add(bg);
    c.add(this.add.text(w / 2, 42, title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#eef5ff',
      stroke: '#071224',
      strokeThickness: 4
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, 92, subtitle, {
      fontSize: '14px',
      color: '#bad2f2',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(0x244273, 0xaed2ff));
    hit.on('pointerout', () => draw(0x1a2f58, 0x76a8e8));
    hit.on('pointerdown', () => draw(0x132747, 0x5d8ccc));
    hit.on('pointerup', async (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      draw(0x244273, 0xaed2ff);
      try {
        await onClick();
      } catch (e) {
        this.showToast(e?.message || 'Action failed');
      }
    });
  }

  createButton(x, y, w, h, label, onClick, normal, hover) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };

    draw(normal, 0xc8870a);
    c.add(bg);
    c.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f3f6ff',
      stroke: '#06101f',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(hover, 0xf0b030));
    hit.on('pointerout', () => draw(normal, 0xc8870a));
    hit.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
    hit.on('pointerup', (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      onClick();
    });
  }

  async requireContributorProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      this.showToast('No active session');
      return null;
    }
    return apiService.getContributorBySupabaseId(uid);
  }

  async openSubmitWorkflow() {
    if (this.submitForm) {
      this.showToast('Submit form is already open.');
      return;
    }
    if (this.contentListModal) {
      this.showToast('Please close My Content before opening the submit form.');
      return;
    }

    let profile;
    let topics;
    let npcs;
    let maps;
    try {
      [profile, topics, npcs, maps] = await Promise.all([
        this.requireContributorProfile(),
        apiService.getAllTopics(),
        apiService.getAllNPCs(),
        apiService.getAllMaps()
      ]);
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to open submit form';
      this.showToast(message);
      return;
    }

    if (!profile) return;
    if (!Array.isArray(topics) || topics.length === 0) {
      this.showToast('No topics available. Ask admin to create one first.');
      return;
    }
    if (!Array.isArray(npcs) || npcs.length === 0) {
      this.showToast('No NPCs available. Ask admin to create one first.');
      return;
    }
    if (!Array.isArray(maps) || maps.length === 0) {
      this.showToast('No maps available. Ask admin to create one first.');
      return;
    }

    this.renderSubmitForm(profile, topics, npcs, maps);
  }

  async openMyContentWorkflow() {
    if (this.contentListModal) {
      this.showToast('My Content is already open.');
      return;
    }
    if (this.submitForm) {
      this.showToast('Please close the submit form first.');
      return;
    }

    let profile;
    let rows;
    try {
      profile = await this.requireContributorProfile();
      if (!profile) return;
      rows = await apiService.getContentByContributor(profile.contributorId);
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Unable to load content list';
      this.showToast(message);
      return;
    }

    this.renderMyContentModal(rows || []);
  }

  renderSubmitForm(profile, topics, npcs, maps) {
    const form = document.createElement('div');
    form.style.position = 'absolute';
    form.style.left = '50%';
    form.style.top = '50%';
    form.style.transform = 'translate(-50%, -50%)';
    form.style.width = 'min(720px, calc(100vw - 40px))';
    form.style.maxHeight = '80vh';
    form.style.overflowY = 'auto';
    form.style.padding = '24px';
    form.style.background = 'rgba(16, 31, 61, 0.98)';
    form.style.border = '2px solid #c8870a';
    form.style.borderRadius = '10px';
    form.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    form.style.zIndex = '1000';

    const topicOptions = topics
      .map((t) => `<option value="${this.escapeHtml(String(t.topicId || ''))}">${this.escapeHtml(t.topicName || 'Untitled Topic')}</option>`)
      .join('');
    const npcOptions = npcs
      .map((n) => `<option value="${this.escapeHtml(String(n.npc_id || ''))}">${this.escapeHtml(n.name || 'Unnamed NPC')}</option>`)
      .join('');
    const mapOptions = maps
      .map((m) => `<option value="${this.escapeHtml(String(m.mapId || ''))}">${this.escapeHtml(m.name || 'Unnamed Map')}</option>`)
      .join('');
    const contributorLabel = this.escapeHtml(profile.fullName || profile.email || profile.contributorId);
    const fieldStyle = 'width: 100%; margin-bottom: 12px; padding: 10px; border-radius: 6px; border: 1px solid #5b7ba7; background: #122647; color: #edf3ff; box-sizing: border-box;';
    const labelStyle = 'display: block; color: #d5e7ff; margin-bottom: 6px;';

    form.innerHTML = `
      <h2 style="margin: 0 0 14px; color: #e6f0ff;">Submit New Content</h2>
      <p style="margin: 0 0 14px; color: #a6c3ec;">Contributor: ${contributorLabel}</p>

      <label style="${labelStyle}">Topic</label>
      <select id="content-topic" style="${fieldStyle}">${topicOptions}</select>

      <label style="${labelStyle}">NPC</label>
      <select id="content-npc" style="${fieldStyle}">${npcOptions}</select>

      <label style="${labelStyle}">Map</label>
      <select id="content-map" style="${fieldStyle}">${mapOptions}</select>

      <label style="${labelStyle}">Title</label>
      <input id="content-title" type="text" maxlength="120" placeholder="e.g. What Is Rizz?" style="${fieldStyle}" />

      <label style="${labelStyle}">Description</label>
      <textarea id="content-description" rows="3" placeholder="Describe what this lesson should teach." style="${fieldStyle} resize: vertical;"></textarea>

      <label style="${labelStyle}">Optional Video</label>
      <input
        id="content-video"
        type="file"
        accept="video/mp4,video/webm,video/ogg"
        style="${fieldStyle}"
      />

      <div id="narrations-section-placeholder"></div>

      <div style="display: flex; gap: 10px; margin-top: 4px;">
        <button type="button" id="submit-content-btn" style="flex: 1; padding: 12px; background: #1f6d34; color: #f5fff8; border: 1px solid #5ec38a; border-radius: 6px; cursor: pointer; font-weight: bold;">
          Submit Content
        </button>
        <button type="button" id="cancel-content-btn" style="width: 140px; padding: 12px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Cancel
        </button>
      </div>

      <div id="submit-message" style="margin-top: 12px; min-height: 20px; color: #ffd4a6;"></div>
    `;

    document.body.appendChild(form);
    this.submitForm = form;
    this.updateSceneInputInteractivity();
    this.submitMessageEl = form.querySelector('#submit-message');
    this.submitButtonEl = form.querySelector('#submit-content-btn');
    this.cancelButtonEl = form.querySelector('#cancel-content-btn');

    const titleEl = form.querySelector('#content-title');
    const topicEl = form.querySelector('#content-topic');
    const npcEl = form.querySelector('#content-npc');
    const mapEl = form.querySelector('#content-map');
    const descriptionEl = form.querySelector('#content-description');
    const videoEl = form.querySelector('#content-video');

    // Stop Phaser consuming keystrokes in text inputs
    [titleEl, descriptionEl].forEach(el => {
      el?.addEventListener('keydown', e => e.stopPropagation());
    });

    // Build and inject narrations section
    const narrationsSection = this._buildNarrationsSection();
    form.querySelector('#narrations-section-placeholder').replaceWith(narrationsSection);
    this.addNarrationRow(); // start with one empty row

    // AI generate button
    this.aiGenerateBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const topicId = topicEl?.value?.trim();
      const title = titleEl?.value?.trim();
      const description = descriptionEl?.value?.trim();

      if (!topicId || !title || !description) {
        this.setSubmitMessage('Please fill in Topic, Title, and Description before generating with AI.', '#ffc7c7');
        return;
      }

      this.setAiGeneratingState(true);
      this.setSubmitMessage('Generating AI narrations...', '#ffd4a6');

      try {
        const result = await apiService.generateNarrations(topicId, title, description);
        const narrations = result?.narrations || [];
        if (narrations.length === 0) throw new Error('AI returned no narrations');

        this.narrationsContainer.innerHTML = '';
        narrations.forEach(line => this.addNarrationRow(line));
        this.setSubmitMessage(`${narrations.length} lines generated — review and edit as needed.`, '#a8e6c1');
      } catch (e) {
        const message = e?.response?.data?.message || e?.message || 'AI generation failed';
        this.setSubmitMessage(message, '#ffc7c7');
      } finally {
        this.setAiGeneratingState(false);
      }
    });

    // Add line button
    this.addLineBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.addNarrationRow();
    });

    const submitHandler = async () => {
      const topicId = topicEl?.value?.trim();
      const npcId = npcEl?.value?.trim();
      const mapId = mapEl?.value?.trim();
      const title = titleEl?.value?.trim();
      const description = descriptionEl?.value?.trim();
      const narrations = this._collectNarrations();
      const videoFile = videoEl?.files?.[0] || null;

      if (!topicId || !npcId || !mapId || !title || !description) {
        this.setSubmitMessage('Please fill in Topic, NPC, Map, Title, and Description.', '#ffc7c7');
        return;
      }
      if (narrations.length === 0) {
        this.setSubmitMessage('Please add at least one narration line.', '#ffc7c7');
        return;
      }

      this.setSubmittingState(true);
      this.setSubmitMessage('Submitting content and running AI checks...', '#ffd4a6');

      try {
        let videoUrl = null;

        if (videoFile) {
          const maxBytes = 50 * 1024 * 1024;
          if (videoFile.size > maxBytes) {
            throw new Error('Video is too large. Max size is 50MB.');
          }

          this.setSubmitMessage('Uploading video...', '#ffd4a6');
          videoUrl = await this.uploadContentVideo(videoFile, profile.contributorId);
        }

        this.setSubmitMessage('Submitting content and running AI checks...', '#ffd4a6');

        const result = await apiService.submitContent({
          contributorId: profile.contributorId,
          topicId,
          npcId,
          mapId,
          title,
          description,
          narrations,
          videoUrl
        });

        const status = result?.status || 'UNKNOWN';
        const contentId = result?.contentId || '(missing id)';
        this.showToast(`Submitted. Status: ${status}`);
        this.destroySubmitForm();
        this.showToast(`Content ID: ${contentId}`);
      } catch (e) {
        const message =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          'Submit failed';
        this.setSubmitMessage(message, '#ffc7c7');
        this.setSubmittingState(false);
      }
    };

    this.submitButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      submitHandler();
    });
    this.cancelButtonEl.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroySubmitForm();
    });
    descriptionEl?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submitHandler();
    });
  }

  _buildNarrationsSection() {
    const section = document.createElement('div');
    section.style.marginBottom = '14px';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

    const label = document.createElement('label');
    label.textContent = 'Narration Lines';
    label.style.cssText = 'color: #d5e7ff; flex: 1; margin: 0;';

    this.aiGenerateBtn = document.createElement('button');
    this.aiGenerateBtn.type = 'button';
    this.aiGenerateBtn.textContent = '✦ Generate with AI';
    this.aiGenerateBtn.style.cssText = 'padding: 6px 12px; background: #1a2f5a; color: #afd4ff; border: 1px solid #4a7ab0; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;';

    this.addLineBtn = document.createElement('button');
    this.addLineBtn.type = 'button';
    this.addLineBtn.textContent = '+ Add Line';
    this.addLineBtn.style.cssText = 'padding: 6px 12px; background: #183528; color: #90dbb0; border: 1px solid #3a7a5a; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;';

    header.appendChild(label);
    header.appendChild(this.aiGenerateBtn);
    header.appendChild(this.addLineBtn);

    this.narrationsContainer = document.createElement('div');

    section.appendChild(header);
    section.appendChild(this.narrationsContainer);
    return section;
  }

  addNarrationRow(text = '') {
    if (!this.narrationsContainer) return;

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start;';

    const textarea = document.createElement('textarea');
    textarea.rows = 2;
    textarea.value = text;
    textarea.placeholder = 'Enter narration line...';
    textarea.style.cssText = 'flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid #5b7ba7; background: #122647; color: #edf3ff; resize: vertical; font-size: 13px; font-family: inherit; box-sizing: border-box;';
    textarea.addEventListener('keydown', e => e.stopPropagation());

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove this line';
    removeBtn.style.cssText = 'width: 30px; height: 30px; padding: 0; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer; font-size: 18px; line-height: 1; flex-shrink: 0; margin-top: 2px;';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.narrationsContainer.removeChild(row);
    });

    row.appendChild(textarea);
    row.appendChild(removeBtn);
    this.narrationsContainer.appendChild(row);
    textarea.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  _collectNarrations() {
    if (!this.narrationsContainer) return [];
    return Array.from(this.narrationsContainer.querySelectorAll('textarea'))
      .map(t => t.value.trim())
      .filter(v => v.length > 0);
  }

  async uploadContentVideo(file, contributorId) {
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
      console.error('Supabase upload error:', uploadError);
      throw new Error(uploadError.message || 'Video upload failed');    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || null;
  }

  setSubmittingState(isSubmitting) {
    if (this.submitButtonEl) {
      this.submitButtonEl.disabled = isSubmitting;
      this.submitButtonEl.style.opacity = isSubmitting ? '0.6' : '1';
      this.submitButtonEl.textContent = isSubmitting ? 'Submitting...' : 'Submit Content';
    }
    if (this.cancelButtonEl) {
      this.cancelButtonEl.disabled = isSubmitting;
      this.cancelButtonEl.style.opacity = isSubmitting ? '0.6' : '1';
    }
    if (this.aiGenerateBtn) {
      this.aiGenerateBtn.disabled = isSubmitting;
      this.aiGenerateBtn.style.opacity = isSubmitting ? '0.6' : '1';
    }
    if (this.addLineBtn) {
      this.addLineBtn.disabled = isSubmitting;
      this.addLineBtn.style.opacity = isSubmitting ? '0.6' : '1';
    }
  }

  setAiGeneratingState(isGenerating) {
    if (this.aiGenerateBtn) {
      this.aiGenerateBtn.disabled = isGenerating;
      this.aiGenerateBtn.style.opacity = isGenerating ? '0.6' : '1';
      this.aiGenerateBtn.textContent = isGenerating ? '✦ Generating...' : '✦ Generate with AI';
    }
    if (this.addLineBtn) {
      this.addLineBtn.disabled = isGenerating;
      this.addLineBtn.style.opacity = isGenerating ? '0.6' : '1';
    }
  }

  setSubmitMessage(message, color = '#ffd4a6') {
    if (!this.submitMessageEl) return;
    this.submitMessageEl.textContent = message;
    this.submitMessageEl.style.color = color;
  }

  destroySubmitForm() {
    if (this.submitForm && this.submitForm.parentNode) {
      this.submitForm.parentNode.removeChild(this.submitForm);
    }
    this.submitForm = null;
    this.updateSceneInputInteractivity();
    this.submitMessageEl = null;
    this.submitButtonEl = null;
    this.cancelButtonEl = null;
    this.narrationsContainer = null;
    this.aiGenerateBtn = null;
    this.addLineBtn = null;
  }

  renderMyContentModal(rows) {
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = 'min(900px, calc(100vw - 40px))';
    modal.style.maxHeight = '82vh';
    modal.style.overflowY = 'auto';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(16, 31, 61, 0.98)';
    modal.style.border = '2px solid #76a8e8';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 16px 38px rgba(0,0,0,0.5)';
    modal.style.zIndex = '1000';

    const sortedRows = [...rows].sort((a, b) => {
      const at = new Date(a?.submittedAt || 0).getTime();
      const bt = new Date(b?.submittedAt || 0).getTime();
      return bt - at;
    });

    const rowHtml = sortedRows.map((row) => {
      const status = this.escapeHtml(row?.status || 'UNKNOWN');
      const title = this.escapeHtml(row?.title || 'Untitled');
      const topicName = this.escapeHtml(row?.topic?.topicName || 'Unknown Topic');
      const contentId = this.escapeHtml(row?.contentId || '');
      const submittedAt = this.formatDate(row?.submittedAt);
      const preview = this.escapeHtml(this.previewText(row?.body, 220));

      return `
        <div style="padding: 12px; border: 1px solid #345b8a; border-radius: 8px; margin-bottom: 10px; background: rgba(10, 23, 49, 0.7);">
          <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="color: #eef5ff; font-size: 16px; font-weight: bold;">${title}</div>
            <div style="color: #ffd4a6; font-size: 13px;">${status}</div>
          </div>
          <div style="margin-top: 4px; color: #bad2f2; font-size: 13px;">Topic: ${topicName}</div>
          <div style="margin-top: 4px; color: #9ebfe7; font-size: 12px;">Submitted: ${submittedAt}</div>
          <div style="margin-top: 4px; color: #9ebfe7; font-size: 12px;">ID: ${contentId}</div>
          <div style="margin-top: 8px; color: #dce8ff; font-size: 13px; line-height: 1.4;">${preview}</div>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; color: #e6f0ff;">My Submitted Content</h2>
        <button type="button" id="close-content-list-btn" style="padding: 10px 14px; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
      <div style="margin-bottom: 12px; color: #a6c3ec;">Total: ${sortedRows.length}</div>
      <div>
        ${sortedRows.length ? rowHtml : '<div style="color: #dce8ff;">No submitted content yet.</div>'}
      </div>
    `;

    document.body.appendChild(modal);
    this.contentListModal = modal;
    this.updateSceneInputInteractivity();

    const closeBtn = modal.querySelector('#close-content-list-btn');
    closeBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.destroyContentListModal();
    });
  }

  destroyContentListModal() {
    if (this.contentListModal && this.contentListModal.parentNode) {
      this.contentListModal.parentNode.removeChild(this.contentListModal);
    }
    this.contentListModal = null;
    this.updateSceneInputInteractivity();
  }

  updateSceneInputInteractivity() {
    const hasModalOpen = Boolean(this.submitForm || this.contentListModal);
    this.input.enabled = !hasModalOpen;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  previewText(value, maxLength) {
    if (!value) return '';
    const normalized = String(value).replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
  }

  formatDate(value) {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.escapeHtml(String(value));
    return date.toLocaleString();
  }

  showToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, message, {
      fontSize: '14px',
      color: '#f1f6ff',
      backgroundColor: '#122647',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 10,
      duration: 1400,
      onComplete: () => text.destroy()
    });
  }

}
