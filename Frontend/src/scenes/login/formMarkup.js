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

function buildRoleChips(activeRole, authMode) {
  const roles = [
    { value: 'learner', label: 'Learner' },
    { value: 'contributor', label: 'Contributor' },
    { value: 'admin', label: 'Admin' }
  ];

  return roles.map(({ value, label }) => {
    const isDisabled = authMode === 'register' && value === 'admin';
    const isActive = value === activeRole;

    return `
      <button
        type="button"
        class="login-auth-chip ${isActive ? 'is-active' : ''}"
        data-role-chip="${value}"
        ${isDisabled ? 'disabled' : ''}
      >
        ${label}
      </button>
    `;
  }).join('');
}

function buildModeChips(authMode) {
  return `
    <button
      type="button"
      class="login-auth-chip ${authMode === 'login' ? 'is-active' : ''}"
      data-auth-mode="login"
    >
      Login
    </button>
    <button
      type="button"
      class="login-auth-chip ${authMode === 'register' ? 'is-active' : ''}"
      data-auth-mode="register"
    >
      Register
    </button>
  `;
}

export function buildAuthFormMarkup(authMode, role = 'learner') {
  const isLogin = authMode === 'login';
  const effectiveRole = isLogin ? role : (role === 'admin' ? 'learner' : role);
  const title = isLogin ? buildLoginTitle(effectiveRole) : 'Register';

  return `
    <div class="login-auth-top-controls">
      <div class="login-auth-control-group">
        <p class="login-auth-group-label">Role</p>
        <div class="login-auth-chip-row">
          ${buildRoleChips(effectiveRole, authMode)}
        </div>
      </div>
      <div class="login-auth-control-group login-auth-control-group--mode">
        <p class="login-auth-group-label">Auth Mode</p>
        <div class="login-auth-chip-row">
          ${buildModeChips(authMode)}
        </div>
      </div>
    </div>

    <h2 class="login-auth-title">${title}</h2>
    ${isLogin ? '' : `<input type="hidden" id="role" value="${effectiveRole}" />`}
    ${isLogin ? '' : `<div id="role-fields">${buildRegisterRoleFields(effectiveRole)}</div>`}

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

    <div id="message" class="login-auth-message"></div>
  `;
}
