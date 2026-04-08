function buildLearnerFields() {
  return `
    <div class="login-auth-field">
      <label class="login-auth-label" for="username">Username</label>
      <input type="text" id="username" class="login-auth-control" autocomplete="username" />
    </div>
    <div class="login-auth-field">
      <label class="login-auth-label" for="fullname">Full Name</label>
      <input type="text" id="fullname" class="login-auth-control" autocomplete="name" />
    </div>
  `;
}

function buildContributorFields() {
  return `
    <div class="login-auth-field">
      <label class="login-auth-label" for="fullname">Full Name</label>
      <input type="text" id="fullname" class="login-auth-control" autocomplete="name" />
    </div>
    <div class="login-auth-field">
      <label class="login-auth-label" for="bio">Bio <span class="login-auth-optional">(optional)</span></label>
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

function buildRoleChips(activeRole, authMode, roles) {
  const roleDefs = {
    learner: 'Learner',
    contributor: 'Contributor',
    admin: 'Admin'
  };

  return roles.map((value) => {
    const label = roleDefs[value] || value;
    const isDisabled = authMode === 'register' && value === 'admin';
    const isActive = value === activeRole;

    return `
      <button
        type="button"
        class="login-auth-chip ${isActive ? 'is-active' : ''}"
        data-role-chip="${value}"
        aria-pressed="${isActive ? 'true' : 'false'}"
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
      aria-pressed="${authMode === 'login' ? 'true' : 'false'}"
    >
      Login
    </button>
    <button
      type="button"
      class="login-auth-chip ${authMode === 'register' ? 'is-active' : ''}"
      data-auth-mode="register"
      aria-pressed="${authMode === 'register' ? 'true' : 'false'}"
    >
      Register
    </button>
  `;
}

export function buildAuthFormMarkup(authMode, role = 'learner', options = {}) {
  const {
    roles = ['learner', 'contributor'],
    showRoleSelector = true,
    showModeSelector = true,
    allowRegister = true,
    showGoogleButton = true,
    isSubmitting = false
  } = options;

  const allowedRoles = Array.isArray(roles) && roles.length ? roles : ['learner', 'contributor'];
  const selectedRole = allowedRoles.includes(role) ? role : allowedRoles[0];
  const effectiveAuthMode = allowRegister ? authMode : 'login';
  const isLogin = effectiveAuthMode === 'login';
  const effectiveRole = isLogin ? selectedRole : (selectedRole === 'admin' ? 'learner' : selectedRole);
  const title = isLogin ? buildLoginTitle(effectiveRole) : 'Register';
  const showTopControls = showRoleSelector || (showModeSelector && allowRegister);

  return `
    <div class="login-auth-main" role="form" aria-busy="${isSubmitting ? 'true' : 'false'}">
    ${showTopControls ? `
      <div class="login-auth-top-controls">
        ${showRoleSelector ? `
          <div class="login-auth-control-group">
            <p class="login-auth-group-label">Role</p>
            <div class="login-auth-chip-row">
              ${buildRoleChips(effectiveRole, effectiveAuthMode, allowedRoles)}
            </div>
          </div>
        ` : ''}
        ${showModeSelector && allowRegister ? `
          <div class="login-auth-control-group login-auth-control-group--mode">
            <div class="login-auth-chip-row">
              ${buildModeChips(effectiveAuthMode)}
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <h2 class="login-auth-title">${title}</h2>
    ${isLogin ? '' : `<input type="hidden" id="role" value="${effectiveRole}" />`}
    ${isLogin ? '' : `<div id="role-fields">${buildRegisterRoleFields(effectiveRole)}</div>`}

    <div class="login-auth-field">
      <label class="login-auth-label" for="email">Email</label>
      <input type="email" id="email" class="login-auth-control" autocomplete="email" />
    </div>

    <div class="login-auth-field">
      <label class="login-auth-label" for="password">Password</label>
      <input type="password" id="password" class="login-auth-control" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
    </div>

    <button id="submitBtn" class="login-auth-button login-auth-button--primary" ${isSubmitting ? 'disabled' : ''}>
      ${isSubmitting ? 'Working...' : (isLogin ? 'Login' : 'Register')}
    </button>

    ${showGoogleButton ? `
      <button id="googleAuthBtn" class="login-auth-button login-auth-button--google" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? 'Working...' : 'Continue with Google'}
      </button>
    ` : ''}

    <div id="message" class="login-auth-message" role="status" aria-live="polite"></div>
    </div>
  `;
}
