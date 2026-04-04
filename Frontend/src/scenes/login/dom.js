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
      position: relative;
    }

    .login-auth-back-link {
      position: absolute;
      left: 0;
      top: 35%;
      transform: translateY(-50%);
      color: var(--login-auth-text);
      text-decoration: none;
      font-size: 40px;
      line-height: 1;
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

    .login-auth-role-switch {
      color: var(--login-auth-text);
      font-size: 12px;
      text-align: center;
      margin-top: 14px;
      margin-bottom: 0;
    }

    .login-auth-inline-link {
      color: var(--login-auth-text);
      text-decoration: underline;
      cursor: pointer;
    }

    @media (max-width: 480px) {
      .login-auth-form {
        padding: 20px;
        border-radius: 8px;
      }

      .login-auth-title {
        margin-bottom: 16px;
      }

      .login-auth-back-link {
        font-size: 34px;
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
