import { PLAYER_PRESETS } from '../../services/playerProfile.js';

const FIELD_STYLE = 'width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;';
const LABEL_STYLE = 'color: white; display: block; margin-bottom: 5px;';
const FIELD_WRAPPER_STYLE = 'margin-bottom: 15px;';

function buildPresetOptions() {
  return PLAYER_PRESETS.map((preset) => `<option value="${preset.id}">${preset.label}</option>`).join('');
}

function buildLearnerFields() {
  return `
    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Username</label>
      <input type="text" id="username" style="${FIELD_STYLE}" />
    </div>
    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Full Name</label>
      <input type="text" id="fullname" style="${FIELD_STYLE}" />
    </div>
    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Character Style</label>
      <select id="avatarPreset" style="${FIELD_STYLE}">
        ${buildPresetOptions()}
      </select>
      <div id="avatarPresetHint" style="margin-top: 8px; color: #9fc7ff; font-size: 12px;">
        ${PLAYER_PRESETS[0].summary}
      </div>
    </div>
  `;
}

function buildContributorFields() {
  return `
    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Full Name</label>
      <input type="text" id="fullname" style="${FIELD_STYLE}" />
    </div>
    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Bio <span style="color: #9fc7ff; font-size: 12px;">(optional)</span></label>
      <input type="text" id="bio" style="${FIELD_STYLE}" />
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
    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Register as</label>
      <select id="role" style="${FIELD_STYLE}">
        <option value="learner">Learner</option>
        <option value="contributor">Contributor</option>
      </select>
    </div>
  `;

  return `
    <h2 style="color: white; text-align: center; margin-bottom: 20px; position: relative;">
      ${isLogin && role !== 'learner' ? `
      <a href="#" id="switch-learner" style="position: absolute; left: 0; top: 35%; transform: translateY(-50%); color: white; text-decoration: none; font-size: 40px;">&#8592;</a>      ` : ''}
      ${title}
    </h2>
    ${isLogin ? '' : registerRoleSelect}
    ${isLogin ? '' : `<div id="role-fields">${buildRegisterRoleFields('learner')}</div>`}

    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Email</label>
      <input type="email" id="email" style="${FIELD_STYLE}" />
    </div>

    <div style="${FIELD_WRAPPER_STYLE}">
      <label style="${LABEL_STYLE}">Password</label>
      <input type="password" id="password" style="${FIELD_STYLE}" />
    </div>

    <button id="submitBtn" style="width: 100%; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
      ${isLogin ? 'Login' : 'Register'}
    </button>

    <button id="googleAuthBtn" style="width: 100%; padding: 12px; background: #ffffff; color: #1a1a1a; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
      ${isLogin ? 'Continue with Google' : 'Register with Google'}
    </button>

    <button id="toggleModeBtn" style="width: 100%; padding: 10px; background: transparent; color: #9fc7ff; border: 1px solid #4a90e2; border-radius: 5px; cursor: pointer;">
      ${isLogin ? 'No account? Register' : 'Have an account? Login'}
    </button>

    <div id="message" style="color: #ff6b6b; text-align: center; margin-top: 10px; min-height: 20px;"></div>

    ${isLogin ? `
    <p style="color: white; font-size: 12px; text-align: center; margin-top: 14px; margin-bottom: 0;">
      Login as
      <a href="#" id="switch-contributor" style="color: white; text-decoration: underline; cursor: pointer;">contributor</a>
      or
      <a href="#" id="switch-admin" style="color: white; text-decoration: underline; cursor: pointer;">admin</a>
      instead
    </p>
    ` : ''}
  `;
}
