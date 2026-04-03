import Phaser from 'phaser';
import { createTimeBasedBackground, preloadLoginClouds } from './background.js';
import { createAuthFormContainer, wireAuthForm, wireRoleFieldEvents } from './dom.js';
import { buildAuthFormMarkup, buildRegisterRoleFields } from './formMarkup.js';
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

export class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
    this.loginForm = null;
    this.authMode = 'login';
    this.cloudSet = 1;
    this.cloudLayerCount = 4;
    this.role = 'learner'
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

    this.add.text(width / 2, 100, 'ADVENTURE GAME', {
      fontSize: '48px',
      color: '#4a90e2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

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
    this.loginForm.innerHTML = buildAuthFormMarkup(this.authMode, this.role);
    wireAuthForm(this);

    this.loginForm.querySelector('#switch-contributor')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.role = 'contributor';
      this.renderAuthForm();
    });

    this.loginForm.querySelector('#switch-admin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.role = 'admin';
      this.renderAuthForm();
    });

    this.loginForm.querySelector('#switch-learner')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.role = 'learner';
      this.renderAuthForm();
    });
  }

  updateRegisterFields(role) {
    const roleFieldsDiv = this.loginForm?.querySelector('#role-fields');
    if (!roleFieldsDiv) return;

    roleFieldsDiv.innerHTML = buildRegisterRoleFields(role);
    wireRoleFieldEvents(roleFieldsDiv);
  }

  toggleMode() {
    this.authMode = this.authMode === 'login' ? 'register' : 'login';
    this.renderAuthForm();
  }

  async handleSubmit() {
    try {
      const result = this.authMode === 'login'
        ? await this.submitLogin()
        : await this.submitRegistration();

      this.applyAuthResult(result);
    } catch (error) {
      this.setMessage(error.message || 'Authentication failed');
    }
  }

  async handleGoogleAuth() {
    try {
      if (this.authMode === 'login') {
        await continueWithGoogle({ role: this.role });
        return;
      }

      const form = readRegisterForm(this.loginForm);
      await continueWithGoogle(form);
    } catch (error) {
      this.setMessage(error.message || 'Google authentication failed');
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

  startGame() {
    this.cleanup();
    this.scene.start('WorldMapScene');
    this.scene.launch('UIScene');
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
