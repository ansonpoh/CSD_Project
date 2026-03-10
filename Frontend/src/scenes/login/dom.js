import { getPresetById } from '../../services/playerProfile.js';

const CONTAINER_STYLES = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  padding: '30px',
  backgroundColor: 'rgba(26, 26, 46, 0.95)',
  borderRadius: '10px',
  border: '2px solid #4a90e2',
  width: '400px'
};

function applyStyles(element, styles) {
  Object.entries(styles).forEach(([property, value]) => {
    element.style[property] = value;
  });
}

function query(container, selector) {
  return container?.querySelector(selector) || null;
}

export function createAuthFormContainer() {
  const loginForm = document.createElement('div');
  applyStyles(loginForm, CONTAINER_STYLES);
  document.body.appendChild(loginForm);
  return loginForm;
}

function preventInputPropagation(container) {
  container.querySelectorAll('input').forEach((input) => {
    input.addEventListener('keydown', (event) => event.stopPropagation());
  });
}

function bindAvatarPresetHint(container) {
  const avatarPresetSelect = query(container, '#avatarPreset');

  if (!avatarPresetSelect) return;

  avatarPresetSelect.addEventListener('change', () => {
    const preset = getPresetById(avatarPresetSelect.value);
    const hint = query(container, '#avatarPresetHint');

    if (hint) hint.textContent = preset.summary;
  });
}

export function wireRoleFieldEvents(container) {
  preventInputPropagation(container);
  bindAvatarPresetHint(container);
}

export function wireAuthForm(scene) {
  const { loginForm } = scene;

  query(loginForm, '#submitBtn')?.addEventListener('click', () => scene.handleSubmit());
  query(loginForm, '#toggleModeBtn')?.addEventListener('click', () => scene.toggleMode());

  preventInputPropagation(loginForm);

  const passwordInput = query(loginForm, '#password');
  passwordInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') scene.handleSubmit();
  });

  const roleSelect = query(loginForm, '#role');
  if (roleSelect && scene.authMode === 'register') {
    roleSelect.addEventListener('change', () => scene.updateRegisterFields(roleSelect.value));
  }

  bindAvatarPresetHint(loginForm);
}
