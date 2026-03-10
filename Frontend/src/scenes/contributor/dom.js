const FIELD_STYLE = 'width: 100%; margin-bottom: 12px; padding: 10px; border-radius: 6px; border: 1px solid #5b7ba7; background: #122647; color: #edf3ff; box-sizing: border-box;';
const LABEL_STYLE = 'display: block; color: #d5e7ff; margin-bottom: 6px;';

export function createSubmitForm({ profile, topics, npcs, maps, escapeHtml }) {
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
    .map((topic) => `<option value="${escapeHtml(String(topic.topicId || ''))}">${escapeHtml(topic.topicName || 'Untitled Topic')}</option>`)
    .join('');
  const npcOptions = npcs
    .map((npc) => `<option value="${escapeHtml(String(npc.npc_id || ''))}">${escapeHtml(npc.name || 'Unnamed NPC')}</option>`)
    .join('');
  const mapOptions = maps
    .map((map) => `<option value="${escapeHtml(String(map.mapId || ''))}">${escapeHtml(map.name || 'Unnamed Map')}</option>`)
    .join('');
  const contributorLabel = escapeHtml(profile.fullName || profile.email || profile.contributorId);

  form.innerHTML = `
    <h2 style="margin: 0 0 14px; color: #e6f0ff;">Submit New Content</h2>
    <p style="margin: 0 0 14px; color: #a6c3ec;">Contributor: ${contributorLabel}</p>

    <label style="${LABEL_STYLE}">Topic</label>
    <select id="content-topic" style="${FIELD_STYLE}">${topicOptions}</select>

    <label style="${LABEL_STYLE}">NPC</label>
    <select id="content-npc" style="${FIELD_STYLE}">${npcOptions}</select>

    <label style="${LABEL_STYLE}">Map</label>
    <select id="content-map" style="${FIELD_STYLE}">${mapOptions}</select>

    <label style="${LABEL_STYLE}">Title</label>
    <input id="content-title" type="text" maxlength="120" placeholder="e.g. What Is Rizz?" style="${FIELD_STYLE}" />

    <label style="${LABEL_STYLE}">Description</label>
    <textarea id="content-description" rows="3" placeholder="Describe what this lesson should teach." style="${FIELD_STYLE} resize: vertical;"></textarea>

    <label style="${LABEL_STYLE}">Optional Video</label>
    <input
      id="content-video"
      type="file"
      accept="video/mp4,video/webm,video/ogg"
      style="${FIELD_STYLE}"
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

  const narrationsSection = createNarrationsSection();
  form.querySelector('#narrations-section-placeholder').replaceWith(narrationsSection.section);

  return {
    form,
    submitMessageEl: form.querySelector('#submit-message'),
    submitButtonEl: form.querySelector('#submit-content-btn'),
    cancelButtonEl: form.querySelector('#cancel-content-btn'),
    titleEl: form.querySelector('#content-title'),
    topicEl: form.querySelector('#content-topic'),
    npcEl: form.querySelector('#content-npc'),
    mapEl: form.querySelector('#content-map'),
    descriptionEl: form.querySelector('#content-description'),
    videoEl: form.querySelector('#content-video'),
    ...narrationsSection
  };
}

function createNarrationsSection() {
  const section = document.createElement('div');
  section.style.marginBottom = '14px';

  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

  const label = document.createElement('label');
  label.textContent = 'Narration Lines';
  label.style.cssText = 'color: #d5e7ff; flex: 1; margin: 0;';

  const aiGenerateBtn = document.createElement('button');
  aiGenerateBtn.type = 'button';
  aiGenerateBtn.textContent = '* Generate with AI';
  aiGenerateBtn.style.cssText = 'padding: 6px 12px; background: #1a2f5a; color: #afd4ff; border: 1px solid #4a7ab0; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;';

  const addLineBtn = document.createElement('button');
  addLineBtn.type = 'button';
  addLineBtn.textContent = '+ Add Line';
  addLineBtn.style.cssText = 'padding: 6px 12px; background: #183528; color: #90dbb0; border: 1px solid #3a7a5a; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;';

  const narrationsContainer = document.createElement('div');

  header.appendChild(label);
  header.appendChild(aiGenerateBtn);
  header.appendChild(addLineBtn);

  section.appendChild(header);
  section.appendChild(narrationsContainer);

  return {
    section,
    narrationsContainer,
    aiGenerateBtn,
    addLineBtn
  };
}

export function addNarrationRow(narrationsContainer, text = '') {
  if (!narrationsContainer) return null;

  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start;';

  const textarea = document.createElement('textarea');
  textarea.rows = 2;
  textarea.value = text;
  textarea.placeholder = 'Enter narration line...';
  textarea.style.cssText = 'flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid #5b7ba7; background: #122647; color: #edf3ff; resize: vertical; font-size: 13px; font-family: inherit; box-sizing: border-box;';
  textarea.addEventListener('keydown', (event) => event.stopPropagation());

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = 'x';
  removeBtn.title = 'Remove this line';
  removeBtn.style.cssText = 'width: 30px; height: 30px; padding: 0; background: #4a1111; color: #ffe9e9; border: 1px solid #ab6666; border-radius: 6px; cursor: pointer; font-size: 18px; line-height: 1; flex-shrink: 0; margin-top: 2px;';
  removeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    narrationsContainer.removeChild(row);
  });

  row.appendChild(textarea);
  row.appendChild(removeBtn);
  narrationsContainer.appendChild(row);

  return textarea;
}

export function collectNarrations(narrationsContainer) {
  if (!narrationsContainer) return [];
  return Array.from(narrationsContainer.querySelectorAll('textarea'))
    .map((textarea) => textarea.value.trim())
    .filter((value) => value.length > 0);
}

export function createContentListModal({ rows, escapeHtml, formatDate, previewText }) {
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

  const sortedRows = [...rows].sort((left, right) => {
    const leftTime = new Date(left?.submittedAt || 0).getTime();
    const rightTime = new Date(right?.submittedAt || 0).getTime();
    return rightTime - leftTime;
  });

  const rowHtml = sortedRows.map((row) => {
    const status = escapeHtml(row?.status || 'UNKNOWN');
    const title = escapeHtml(row?.title || 'Untitled');
    const topicName = escapeHtml(row?.topic?.topicName || 'Unknown Topic');
    const contentId = escapeHtml(row?.contentId || '');
    const submittedAt = formatDate(row?.submittedAt);
    const preview = escapeHtml(previewText(row?.body, 220));

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

  return {
    modal,
    closeBtn: modal.querySelector('#close-content-list-btn')
  };
}
