import { apiService } from '../../services/api.js';
import { createContentListModal } from './dom.js';
import { escapeHtml, formatDate, getErrorMessage, previewText } from './helpers.js';
import { requireContributorProfile } from './submitWorkflow.js';

export async function openMyContentWorkflow(scene) {
  if (scene.contentListModal) {
    scene.showToast('My Content is already open.');
    return;
  }
  if (scene.submitForm) {
    scene.showToast('Please close the submit form first.');
    return;
  }

  let profile;
  let rows;
  try {
    profile = await requireContributorProfile(scene);
    if (!profile) return;
    rows = await apiService.getContentByContributor(profile.contributorId);
  } catch (error) {
    scene.showToast(getErrorMessage(error, 'Unable to load content list'));
    return;
  }

  renderMyContentModal(scene, rows || []);
}

export function destroyContentListModal(scene) {
  if (scene.contentListModal?.parentNode) {
    scene.contentListModal.parentNode.removeChild(scene.contentListModal);
  }
  scene.contentListModal = null;
  updateSceneInputInteractivity(scene);
}

function renderMyContentModal(scene, rows) {
  const { modal, closeBtn } = createContentListModal({
    rows,
    escapeHtml,
    formatDate,
    previewText
  });

  document.body.appendChild(modal);
  scene.contentListModal = modal;
  updateSceneInputInteractivity(scene);

  closeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    destroyContentListModal(scene);
  });
}

function updateSceneInputInteractivity(scene) {
  const hasModalOpen = Boolean(scene.submitForm || scene.contentListModal);
  scene.input.enabled = !hasModalOpen;
}
