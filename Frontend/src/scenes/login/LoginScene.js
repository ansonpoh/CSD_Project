import Phaser from 'phaser';
import { createTimeBasedBackground, preloadLoginClouds } from './background.js';
import { createAuthFormContainer, wireAuthForm } from './dom.js';
import { buildAuthFormMarkup } from './formMarkup.js';
import {
  readLoginForm,
  readRegisterForm,
  validateLoginForm,
  validateRegisterForm
} from './formState.js';
import {
  loginWithRole,
  continueWithGoogle,
  registerWithRole,
  resumeGoogleOAuthIntent
} from './authFlow.js';
import { transitionToScene } from '../shared/sceneTransition.js';

export class LoginScene extends Phaser.Scene {
  constructor({
    key = 'LoginScene',
    initialAuthMode = 'login',
    initialRole = 'learner',
    formOptions = {}
  } = {}) {
    super({ key });
    this.loginForm = null;
    this.authMode = initialAuthMode;
    this.cloudSet = 1;
    this.cloudLayerCount = 4;
    this.role = initialRole;
    this.isSubmitting = false;
    this.formOptions = {
      roles: ['learner', 'contributor'],
      showRoleSelector: true,
      showModeSelector: true,
      allowRegister: true,
      showGoogleButton: true,
      ...formOptions
    };
  }

  preload() {
    preloadLoginClouds(this);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.cleanup, this);
    this.events.on(Phaser.Scenes.Events.PAUSE, this.cleanup, this);

    createTimeBasedBackground(this, width, height);

    const logo = this.add.image(width / 2, 120, 'logo').setOrigin(0.5);
    const logoSize = Phaser.Math.Clamp(Math.min(width, height) * 0.34, 260, 380);
    logo.setDisplaySize(logoSize, logoSize);
    
    this.startAuthEntryFlow();
  }

  hasPendingOAuthFlow() {
    const query = window.location.search || '';
    const hash = window.location.hash || '';
    const hasOAuthParams = query.includes('code=') || hash.includes('access_token') || hash.includes('error=');
    const hasStoredIntent = Boolean(window.localStorage.getItem('google_oauth_intent'));
    return hasOAuthParams || hasStoredIntent;
  }

  startAuthEntryFlow() {
    if (this.hasPendingOAuthFlow()) {
      this.resumeOAuthFlow({ mountFallbackForm: true });
      return;
    }

    this.mountAuthForm();
  }

  mountAuthForm() {
    this.cleanup();
    this.loginForm = createAuthFormContainer();
    this.renderAuthForm();
  }

  renderAuthForm() {
    if (!this.loginForm) {
      this.loginForm = createAuthFormContainer();
    }
    //user input is a nono to prevent XSS :(
    this.loginForm.innerHTML = buildAuthFormMarkup(this.authMode, this.role, {
      ...this.formOptions,
      isSubmitting: this.isSubmitting
    });
    wireAuthForm(this);
  }

  toggleMode() {
    this.setAuthMode(this.authMode === 'login' ? 'register' : 'login');
  }

  setAuthMode(mode) {
    if (this.isSubmitting) return;
    if (!this.formOptions.allowRegister && mode !== 'login') return;
    if (!mode || mode === this.authMode) return;
    this.authMode = mode;
    if (this.authMode === 'register' && this.role === 'admin') {
      this.role = 'learner';
    }
    this.renderAuthForm();
  }

  setRole(role) {
    if (this.isSubmitting) return;
    if (!role || role === this.role) return;
    if (!this.formOptions.roles.includes(role)) return;
    if (this.authMode === 'register' && role === 'admin') return;
    this.role = role;
    this.renderAuthForm();
  }

  async handleSubmit() {
    if (this.isSubmitting) return;
    this.setSubmitting(true);
    try {
      const result = this.authMode === 'login'
        ? await this.submitLogin()
        : await this.submitRegistration();

      this.applyAuthResult(result);
    } catch (error) {
      this.setMessage(error.message || 'Authentication failed');
    } finally {
      this.setSubmitting(false);
    }
  }

  async handleGoogleAuth() {
    if (this.isSubmitting) return;
    this.setSubmitting(true);
    try {
      if (this.authMode === 'login') {
        await continueWithGoogle({ role: this.role });
        return;
      }

      const form = readRegisterForm(this.loginForm);
      await continueWithGoogle(form);
    } catch (error) {
      this.setMessage(error.message || 'Google authentication failed');
    } finally {
      this.setSubmitting(false);
    }
  }

  async resumeOAuthFlow({ mountFallbackForm = false } = {}) {
    try {
      const result = await resumeGoogleOAuthIntent();
      if (result) {
        this.applyAuthResult(result);
        return;
      }

      if (mountFallbackForm && !this.loginForm) {
        this.mountAuthForm();
      }
    } catch (error) {
      if (mountFallbackForm && !this.loginForm) {
        this.mountAuthForm();
      }
      this.setMessage(error.message || 'Google authentication failed');
    }
  }

  async submitLogin() {
    const form = readLoginForm(this.loginForm);
    form.role = this.role;
    const validationError = validateLoginForm(form);

    if (validationError) {
      return { action: 'message', message: validationError };
    }

    return loginWithRole(form);
  }

  async submitRegistration() {
    const form = readRegisterForm(this.loginForm);
    const validationError = validateRegisterForm(form);

    if (validationError) {
      return { action: 'message', message: validationError };
    }

    return registerWithRole(form);
  }

  applyAuthResult(result) {
    if (!result) return;

    if (result.action === 'rerender') {
      if (!this.loginForm) {
        this.loginForm = createAuthFormContainer();
      }
      this.authMode = result.mode || this.authMode;
      this.renderAuthForm();
      if (result.message) this.setMessage(result.message);
      return;
    }

    if (result.action === 'startGame') {
      this.startGame();
      return;
    }

    if (result.action === 'scene') {
      this.cleanup();
      this.scene.start(result.sceneKey);
      return;
    }

    if (result.message) {
      if (!this.loginForm) {
        this.loginForm = createAuthFormContainer();
        this.renderAuthForm();
      }
      this.setMessage(result.message);
    }
  }

  setMessage(message) {
    const messageDiv = this.loginForm?.querySelector('#message');
    if (messageDiv) messageDiv.textContent = message;
  }

  setSubmitting(nextSubmitting) {
    this.isSubmitting = Boolean(nextSubmitting);
    if (!this.loginForm) return;

    const submitBtn = this.loginForm.querySelector('#submitBtn');
    const googleBtn = this.loginForm.querySelector('#googleAuthBtn');
    const controls = this.loginForm.querySelectorAll('input, select, button, [data-role-chip], [data-auth-mode]');
    controls.forEach((control) => {
      if ('disabled' in control) control.disabled = this.isSubmitting;
    });

    if (submitBtn) {
      submitBtn.textContent = this.isSubmitting
        ? 'Working...'
        : (this.authMode === 'login' ? 'Login' : 'Register');
    }
    if (googleBtn) {
      googleBtn.textContent = this.isSubmitting ? 'Working...' : 'Continue with Google';
    }
    this.loginForm.setAttribute('aria-busy', this.isSubmitting ? 'true' : 'false');
  }

  startGame() {
    this.cleanup();
    transitionToScene(this, 'WorldMapScene', {}, {
      onAfterStart: () => {
        this.scene.launch('UIScene');
      }
    });
  }

  cleanup() {
    if (this.loginForm && this.loginForm.parentNode) {
      this.loginForm.parentNode.removeChild(this.loginForm);
    }
    this.loginForm = null;
  }

  shutdown() {
    this.cleanup();
  }
}
