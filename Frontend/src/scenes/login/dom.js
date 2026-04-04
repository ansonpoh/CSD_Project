import { getPresetById } from '../../services/playerProfile.js';

const AUTH_FORM_STYLE_ID = 'login-auth-form-styles';

function ensureAuthFormStyles() {
  if (document.getElementById(AUTH_FORM_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = AUTH_FORM_STYLE_ID;
  style.textContent = `
    .login-auth-form {
      --login-auth-bg: rgba(26, 26, 46, 0.95);
      --login-auth-border: #4a90e2;
      --login-auth-text: #ffffff;
      --login-auth-muted: #9fc7ff;
      --login-auth-danger: #ff6b6b;
      --login-auth-google-bg: #ffffff;
      --login-auth-google-text: #1a1a1a;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      padding: 30px;
      background: var(--login-auth-bg);
      border-radius: 10px;
      border: 2px solid var(--login-auth-border);
      width: min(400px, calc(100vw - 32px));
      max-height: calc(100dvh - 32px);
      overflow-y: auto;
      box-sizing: border-box;
    }

    .login-auth-form *,
    .login-auth-form *::before,
    .login-auth-form *::after {
      box-sizing: border-box;
    }

    .login-auth-title {
      margin: 0 0 20px;
      color: var(--login-auth-text);
      text-align: center;
    }

    .login-auth-top-controls {
      margin-bottom: 18px;
    }

    .login-auth-control-group {
      margin-bottom: 10px;
    }

    .login-auth-control-group--mode {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(159, 199, 255, 0.35);
    }

    .login-auth-group-label {
      margin: 0 0 8px;
      color: var(--login-auth-muted);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .login-auth-chip-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      gap: 8px;
    }

    .login-auth-chip {
      border: 1px solid rgba(159, 199, 255, 0.4);
      background: rgba(22, 33, 62, 0.9);
      color: var(--login-auth-text);
      border-radius: 999px;
      padding: 8px 10px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
    }

    .login-auth-chip:hover:not(:disabled) {
      border-color: var(--login-auth-border);
      transform: translateY(-1px);
    }

    .login-auth-chip.is-active {
      background: rgba(74, 144, 226, 0.24);
      border-color: var(--login-auth-border);
      font-weight: 700;
    }

    .login-auth-chip:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    .login-auth-field {
      margin-bottom: 15px;
    }

    .login-auth-label {
      color: var(--login-auth-text);
      display: block;
      margin-bottom: 5px;
    }

    .login-auth-optional {
      color: var(--login-auth-muted);
      font-size: 12px;
    }

    .login-auth-control {
      width: 100%;
      padding: 10px;
      border-radius: 5px;
      border: 1px solid var(--login-auth-border);
      background: #16213e;
      color: var(--login-auth-text);
    }

    .login-auth-hint {
      margin-top: 8px;
      color: var(--login-auth-muted);
      font-size: 12px;
    }

    .login-auth-button {
      width: 100%;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      margin-bottom: 10px;
    }

    .login-auth-button--primary {
      padding: 12px;
      background: var(--login-auth-border);
      color: var(--login-auth-text);
      border: none;
    }

    .login-auth-button--google {
      padding: 12px;
      background: var(--login-auth-google-bg);
      color: var(--login-auth-google-text);
      border: none;
    }

    .login-auth-button--ghost {
      padding: 10px;
      background: transparent;
      color: var(--login-auth-muted);
      border: 1px solid var(--login-auth-border);
    }

    .login-auth-message {
      color: var(--login-auth-danger);
      text-align: center;
      margin-top: 10px;
      min-height: 20px;
    }

    @media (max-width: 480px) {
      .login-auth-form {
        padding: 20px;
        border-radius: 8px;
      }

      .login-auth-title {
        margin-bottom: 16px;
      }
    }
  `;
  document.head.appendChild(style);
}

function query(container, selector) {
  return container?.querySelector(selector) || null;
}

export function createAuthFormContainer() {
  ensureAuthFormStyles();
  const loginForm = document.createElement('div');
  loginForm.className = 'login-auth-form';
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
  query(loginForm, '#googleAuthBtn')?.addEventListener('click', () => scene.handleGoogleAuth());
  loginForm.querySelectorAll('[data-role-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const role = chip.getAttribute('data-role-chip');
      if (role) scene.setRole(role);
    });
  });
  loginForm.querySelectorAll('[data-auth-mode]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const mode = chip.getAttribute('data-auth-mode');
      if (mode) scene.setAuthMode(mode);
    });
  });

  preventInputPropagation(loginForm);

  const passwordInput = query(loginForm, '#password');
  passwordInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') scene.handleSubmit();
  });

  bindAvatarPresetHint(loginForm);
}
