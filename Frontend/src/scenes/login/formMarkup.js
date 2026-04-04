import { PLAYER_PRESETS } from '../../services/playerProfile.js';

function buildPresetOptions() {
  return PLAYER_PRESETS.map((preset) => `<option value="${preset.id}">${preset.label}</option>`).join('');
}

function buildLearnerFields() {
  return `
    <div class="login-auth-field">
      <label class="login-auth-label">Username</label>
      <input type="text" id="username" class="login-auth-control" />
    </div>
    <div class="login-auth-field">
      <label class="login-auth-label">Full Name</label>
      <input type="text" id="fullname" class="login-auth-control" />
    </div>
    <div class="login-auth-field">
      <label class="login-auth-label">Character Style</label>
      <select id="avatarPreset" class="login-auth-control">
        ${buildPresetOptions()}
      </select>
      <div id="avatarPresetHint" class="login-auth-hint">
        ${PLAYER_PRESETS[0].summary}
      </div>
    </div>
  `;
}

function buildContributorFields() {
  return `
    <div class="login-auth-field">
      <label class="login-auth-label">Full Name</label>
      <input type="text" id="fullname" class="login-auth-control" />
    </div>
    <div class="login-auth-field">
      <label class="login-auth-label">Bio <span class="login-auth-optional">(optional)</span></label>
      <input type="text" id="bio" class="login-auth-control" />
    </div>
  `;
}

export function buildRegisterRoleFields(role) {
  return role === 'contributor' ? buildContributorFields() : buildLearnerFields();
}

function buildLoginTitle(role) {
  if (role === 'admin') return 'Admin Login';
  if (role === 'contributor') return 'Contributor Login';
  return 'Login';
}

export function buildAuthFormMarkup(authMode, role = 'learner') {
  const isLogin = authMode === 'login';
  const title = isLogin ? buildLoginTitle(role) : 'Register';

  const registerRoleSelect = `
    <div class="login-auth-field">
      <label class="login-auth-label">Register as</label>
      <select id="role" class="login-auth-control">
        <option value="learner">Learner</option>
        <option value="contributor">Contributor</option>
      </select>
    </div>
  `;

  return `
    <h2 class="login-auth-title">
      ${isLogin && role !== 'learner' ? `
      <a href="#" id="switch-learner" class="login-auth-back-link">&#8592;</a>      ` : ''}
      ${title}
    </h2>
    ${isLogin ? '' : registerRoleSelect}
    ${isLogin ? '' : `<div id="role-fields">${buildRegisterRoleFields('learner')}</div>`}

    <div class="login-auth-field">
      <label class="login-auth-label">Email</label>
      <input type="email" id="email" class="login-auth-control" />
    </div>

    <div class="login-auth-field">
      <label class="login-auth-label">Password</label>
      <input type="password" id="password" class="login-auth-control" />
    </div>

    <button id="submitBtn" class="login-auth-button login-auth-button--primary">
      ${isLogin ? 'Login' : 'Register'}
    </button>

    <button id="googleAuthBtn" class="login-auth-button login-auth-button--google">
      Continue with Google
    </button>

    <button id="toggleModeBtn" class="login-auth-button login-auth-button--ghost">
      ${isLogin ? 'No account? Register' : 'Have an account? Login'}
    </button>

    <div id="message" class="login-auth-message"></div>

    ${isLogin ? `
    <p class="login-auth-role-switch">
      Login as
      <a href="#" id="switch-contributor" class="login-auth-inline-link">contributor</a>
      or
      <a href="#" id="switch-admin" class="login-auth-inline-link">admin</a>
      instead
    </p>
    ` : ''}
  `;
}
