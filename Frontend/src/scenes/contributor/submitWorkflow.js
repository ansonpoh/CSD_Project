import { supabase } from '../../config/supabaseClient.js';
import { apiService } from '../../services/api.js';
import {
  addNarrationRow,
  collectNarrations,
  createSubmitForm
} from './dom.js';
import { escapeHtml, getErrorMessage } from './helpers.js';

export async function requireContributorProfile(scene) {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) {
    scene.showToast('No active session');
    return null;
  }
  return apiService.getContributorBySupabaseId(uid);
}

export async function openSubmitWorkflow(scene) {
  if (scene.submitForm) {
    scene.showToast('Submit form is already open.');
    return;
  }
  if (scene.contentListModal) {
    scene.showToast('Please close My Content before opening the submit form.');
    return;
  }

  let profile;
  let topics;
  let npcs;
  let maps;
  try {
    [profile, topics, npcs, maps] = await Promise.all([
      requireContributorProfile(scene),
      apiService.getAllTopics(),
      apiService.getAllNPCs(),
      apiService.getAllMaps()
    ]);
  } catch (error) {
    scene.showToast(getErrorMessage(error, 'Unable to open submit form'));
    return;
  }

  if (!profile) return;
  if (!Array.isArray(topics) || topics.length === 0) {
    scene.showToast('No topics available. Ask admin to create one first.');
    return;
  }
  if (!Array.isArray(npcs) || npcs.length === 0) {
    scene.showToast('No NPCs available. Ask admin to create one first.');
    return;
  }
  if (!Array.isArray(maps) || maps.length === 0) {
    scene.showToast('No maps available. Ask admin to create one first.');
    return;
  }

  renderSubmitForm(scene, profile, topics, npcs, maps);
}

export function destroySubmitForm(scene) {
  if (scene.submitForm?.parentNode) {
    scene.submitForm.parentNode.removeChild(scene.submitForm);
  }
  scene.submitForm = null;
  scene.submitMessageEl = null;
  scene.submitButtonEl = null;
  scene.cancelButtonEl = null;
  scene.narrationsContainer = null;
  scene.aiGenerateBtn = null;
  scene.addLineBtn = null;
  updateSceneInputInteractivity(scene);
}

function renderSubmitForm(scene, profile, topics, npcs, maps) {
  const submitUi = createSubmitForm({
    profile,
    topics,
    npcs,
    maps,
    escapeHtml
  });

  document.body.appendChild(submitUi.form);
  scene.submitForm = submitUi.form;
  scene.submitMessageEl = submitUi.submitMessageEl;
  scene.submitButtonEl = submitUi.submitButtonEl;
  scene.cancelButtonEl = submitUi.cancelButtonEl;
  scene.narrationsContainer = submitUi.narrationsContainer;
  scene.aiGenerateBtn = submitUi.aiGenerateBtn;
  scene.addLineBtn = submitUi.addLineBtn;
  updateSceneInputInteractivity(scene);

  bindSubmitFormEvents(scene, submitUi, profile);
  appendNarrationRow(scene);
}

function bindSubmitFormEvents(scene, submitUi, profile) {
  const { titleEl, topicEl, npcEl, mapEl, descriptionEl, videoEl } = submitUi;

  [titleEl, descriptionEl].forEach((element) => {
    element?.addEventListener('keydown', (event) => event.stopPropagation());
  });

  scene.aiGenerateBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await handleAiGenerate(scene, { topicEl, titleEl, descriptionEl });
  });

  scene.addLineBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    appendNarrationRow(scene);
  });

  const submitHandler = () => handleSubmit(scene, profile, {
    topicEl,
    npcEl,
    mapEl,
    titleEl,
    descriptionEl,
    videoEl
  });

  scene.submitButtonEl.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    submitHandler();
  });
  scene.cancelButtonEl.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    destroySubmitForm(scene);
  });
  descriptionEl?.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submitHandler();
  });
}

async function handleAiGenerate(scene, { topicEl, titleEl, descriptionEl }) {
  const topicId = topicEl?.value?.trim();
  const title = titleEl?.value?.trim();
  const description = descriptionEl?.value?.trim();

  if (!topicId || !title || !description) {
    setSubmitMessage(scene, 'Please fill in Topic, Title, and Description before generating with AI.', '#ffc7c7');
    return;
  }

  setAiGeneratingState(scene, true);
  setSubmitMessage(scene, 'Generating AI narrations...', '#ffd4a6');

  try {
    const result = await apiService.generateNarrations(topicId, title, description);
    const narrations = result?.narrations || [];
    if (narrations.length === 0) throw new Error('AI returned no narrations');

    scene.narrationsContainer.innerHTML = '';
    narrations.forEach((line) => appendNarrationRow(scene, line));
    setSubmitMessage(scene, `${narrations.length} lines generated - review and edit as needed.`, '#a8e6c1');
  } catch (error) {
    setSubmitMessage(scene, getErrorMessage(error, 'AI generation failed'), '#ffc7c7');
  } finally {
    setAiGeneratingState(scene, false);
  }
}

async function handleSubmit(scene, profile, elements) {
  const topicId = elements.topicEl?.value?.trim();
  const npcId = elements.npcEl?.value?.trim();
  const mapId = elements.mapEl?.value?.trim();
  const title = elements.titleEl?.value?.trim();
  const description = elements.descriptionEl?.value?.trim();
  const narrations = collectNarrations(scene.narrationsContainer);
  const videoFile = elements.videoEl?.files?.[0] || null;

  if (!topicId || !npcId || !mapId || !title || !description) {
    setSubmitMessage(scene, 'Please fill in Topic, NPC, Map, Title, and Description.', '#ffc7c7');
    return;
  }
  if (narrations.length === 0) {
    setSubmitMessage(scene, 'Please add at least one narration line.', '#ffc7c7');
    return;
  }

  setSubmittingState(scene, true);
  setSubmitMessage(scene, 'Submitting content and running AI checks...', '#ffd4a6');

  try {
    let videoUrl = null;

    if (videoFile) {
      const maxBytes = 50 * 1024 * 1024;
      if (videoFile.size > maxBytes) {
        throw new Error('Video is too large. Max size is 50MB.');
      }

      setSubmitMessage(scene, 'Uploading video...', '#ffd4a6');
      videoUrl = await uploadContentVideo(videoFile, profile.contributorId);
    }

    setSubmitMessage(scene, 'Submitting content and running AI checks...', '#ffd4a6');

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
    scene.showToast(`Submitted. Status: ${status}`);
    destroySubmitForm(scene);
    scene.showToast(`Content ID: ${contentId}`);
  } catch (error) {
    setSubmitMessage(scene, getErrorMessage(error, 'Submit failed'), '#ffc7c7');
    setSubmittingState(scene, false);
  }
}

function appendNarrationRow(scene, text = '') {
  const textarea = addNarrationRow(scene.narrationsContainer, text);
  textarea?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function uploadContentVideo(file, contributorId) {
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
    throw new Error(uploadError.message || 'Video upload failed');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data?.publicUrl || null;
}

function setSubmittingState(scene, isSubmitting) {
  if (scene.submitButtonEl) {
    scene.submitButtonEl.disabled = isSubmitting;
    scene.submitButtonEl.style.opacity = isSubmitting ? '0.6' : '1';
    scene.submitButtonEl.textContent = isSubmitting ? 'Submitting...' : 'Submit Content';
  }
  if (scene.cancelButtonEl) {
    scene.cancelButtonEl.disabled = isSubmitting;
    scene.cancelButtonEl.style.opacity = isSubmitting ? '0.6' : '1';
  }
  if (scene.aiGenerateBtn) {
    scene.aiGenerateBtn.disabled = isSubmitting;
    scene.aiGenerateBtn.style.opacity = isSubmitting ? '0.6' : '1';
  }
  if (scene.addLineBtn) {
    scene.addLineBtn.disabled = isSubmitting;
    scene.addLineBtn.style.opacity = isSubmitting ? '0.6' : '1';
  }
}

function setAiGeneratingState(scene, isGenerating) {
  if (scene.aiGenerateBtn) {
    scene.aiGenerateBtn.disabled = isGenerating;
    scene.aiGenerateBtn.style.opacity = isGenerating ? '0.6' : '1';
    scene.aiGenerateBtn.textContent = isGenerating ? '* Generating...' : '* Generate with AI';
  }
  if (scene.addLineBtn) {
    scene.addLineBtn.disabled = isGenerating;
    scene.addLineBtn.style.opacity = isGenerating ? '0.6' : '1';
  }
}

function setSubmitMessage(scene, message, color = '#ffd4a6') {
  if (!scene.submitMessageEl) return;
  scene.submitMessageEl.textContent = message;
  scene.submitMessageEl.style.color = color;
}

function updateSceneInputInteractivity(scene) {
  const hasModalOpen = Boolean(scene.submitForm || scene.contentListModal);
  scene.input.enabled = !hasModalOpen;
}
