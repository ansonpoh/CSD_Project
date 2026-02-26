import Phaser from 'phaser';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';
import { supabase } from '../config/supabaseClient.js';

const ROLES = ['learner', 'contributor', 'administrator'];
const ROLE_LABELS = { learner: 'Learner', contributor: 'Contributor', administrator: 'Admin' };

const INPUT_STYLE = [
  'width: 100%',
  'padding: 10px',
  'border-radius: 5px',
  'border: 1px solid #4a90e2',
  'background: #16213e',
  'color: white',
  'box-sizing: border-box',
  'font-size: 14px',
  'outline: none',
].join('; ');

const TEXTAREA_STYLE = INPUT_STYLE + '; height: 80px; resize: vertical; font-family: inherit';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
    this.loginForm    = null;
    this.authMode     = 'login';
    this.selectedRole = 'learner';
    this.submitting   = false;
    this.cloudSet = 1;
    this.cloudLayerCount = 4;
  }

  preload() {
    const { cloudSet, cloudLayerCount } = this.getCloudConfigForCurrentTime();
    this.cloudSet = cloudSet;
    this.cloudLayerCount = cloudLayerCount;
    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      this.load.image(`login-cloud-${i}`, `/assets/Clouds/Clouds%20${this.cloudSet}/${i}.png`);
    }
  }

  create() {
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.createTimeBasedBackground(width, height);
    this.add.text(width / 2, 100, 'ADVENTURE GAME', {
      fontSize: '48px', color: '#4a90e2', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.createAuthFormContainer();
    this.renderAuthForm();
  }

  createAuthFormContainer() {
    this.loginForm = document.createElement('div');
    Object.assign(this.loginForm.style, {
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '30px', backgroundColor: 'rgba(26, 26, 46, 0.95)',
      borderRadius: '10px', border: '2px solid #4a90e2',
      width: '400px', boxSizing: 'border-box', fontFamily: 'sans-serif',
    });
    document.body.appendChild(this.loginForm);
  }

  // ── Sky / cloud helpers ───────────────────────────────────────────────────

  getCloudConfigForCurrentTime() {
    const hour = new Date().getHours();
    const cloudSet = Math.floor(hour / 3) + 1;
    const counts = { 1:4, 2:4, 3:4, 4:4, 5:5, 6:6, 7:4, 8:6 };
    return { cloudSet, cloudLayerCount: counts[cloudSet] || 4 };
  }

  getSkyColorForCurrentTime() {
    const hour = new Date().getHours();
    if (hour >= 5  && hour < 8)  return 0xffc48c;
    if (hour >= 8  && hour < 17) return 0x87c8ff;
    if (hour >= 17 && hour < 20) return 0xff8f70;
    return 0x0b1736;
  }

  createTimeBasedBackground(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, this.getSkyColorForCurrentTime()).setDepth(-200);
    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      const drift = 40 + i * 25;
      const cloud = this.add.image(width / 2, height / 2, `login-cloud-${i}`).setDepth(-150 + i);
      const scale = Math.max((width + drift * 2 + 160) / cloud.width, (height + 120) / cloud.height);
      cloud.setScale(scale);
      cloud.setAlpha(Math.min(0.22 + i * 0.07, 0.78));
      this.tweens.add({
        targets: cloud,
        x: { from: width / 2 - drift, to: width / 2 + drift },
        duration: 9000 + i * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ── Form rendering ────────────────────────────────────────────────────────

  /** Extra fields shown only in register mode, varying by role. */
  getRegisterFields() {
    if (this.authMode !== 'register') return '';

    const field = (id, label, required, inputHtml) => `
      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px; font-size: 14px;">
          ${label}${required ? ' *' : ''}
        </label>
        ${inputHtml}
      </div>`;

    if (this.selectedRole === 'learner') {
      return (
        field('username', 'Username', true,
          `<input type="text" id="username" placeholder="Choose a username" style="${INPUT_STYLE}" />`) +
        field('fullname', 'Full Name', false,
          `<input type="text" id="fullname" placeholder="Your full name" style="${INPUT_STYLE}" />`)
      );
    }

    if (this.selectedRole === 'contributor') {
      return (
        field('fullname', 'Full Name', false,
          `<input type="text" id="fullname" placeholder="Your full name" style="${INPUT_STYLE}" />`) +
        field('bio', 'Bio', false,
          `<textarea id="bio" placeholder="Tell us about yourself (max 100 words)" style="${TEXTAREA_STYLE}"></textarea>`)
      );
    }

    if (this.selectedRole === 'administrator') {
      return field('fullname', 'Full Name', false,
        `<input type="text" id="fullname" placeholder="Your full name" style="${INPUT_STYLE}" />`);
    }

    return '';
  }

  renderAuthForm() {
    const isLogin = this.authMode === 'login';

    const tabStyle = (r) => {
      const active = r === this.selectedRole;
      return [
        'flex: 1',
        `background: ${active ? '#4a90e2' : 'transparent'}`,
        `color: ${active ? 'white' : '#9fc7ff'}`,
        `font-weight: ${active ? 'bold' : 'normal'}`,
        'border: 1px solid #4a90e2', 'border-radius: 5px',
        'padding: 8px 4px', 'cursor: pointer', 'font-size: 13px',
        'font-family: inherit', 'box-sizing: border-box',
      ].join('; ');
    };

    const tabs = ROLES.map(r =>
      `<button id="role-${r}" style="${tabStyle(r)}">${ROLE_LABELS[r]}</button>`
    ).join('');

    this.loginForm.innerHTML = `
      <h2 style="color: white; text-align: center; margin: 0 0 18px 0; font-size: 22px;">
        ${isLogin ? 'Login' : 'Register'}
      </h2>

      <div style="display: flex; gap: 8px; margin-bottom: 20px;">${tabs}</div>

      ${this.getRegisterFields()}

      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px; font-size: 14px;">Email *</label>
        <input type="email" id="email" placeholder="your@email.com" style="${INPUT_STYLE}" />
      </div>

      <div style="margin-bottom: 18px;">
        <label style="color: white; display: block; margin-bottom: 5px; font-size: 14px;">Password *</label>
        <input type="password" id="password" placeholder="••••••••" style="${INPUT_STYLE}" />
      </div>

      <button id="submitBtn" style="
        width: 100%; padding: 12px; background: #4a90e2; color: white;
        border: none; border-radius: 5px; font-size: 16px; cursor: pointer;
        margin-bottom: 10px; font-family: inherit; box-sizing: border-box;
      ">${isLogin ? 'Login' : 'Register'}</button>

      <button id="toggleModeBtn" style="
        width: 100%; padding: 10px; background: transparent; color: #9fc7ff;
        border: 1px solid #4a90e2; border-radius: 5px; cursor: pointer;
        font-family: inherit; font-size: 14px; box-sizing: border-box;
      ">${isLogin ? 'No account? Register' : 'Have an account? Login'}</button>

      <div id="message" style="color: #ff6b6b; text-align: center; margin-top: 10px; min-height: 20px; font-size: 13px;"></div>
    `;

    ROLES.forEach(r => {
      document.getElementById(`role-${r}`)?.addEventListener('click', () => {
        this.selectedRole = r;
        this.submitting   = false;
        this.renderAuthForm();
      });
    });

    document.getElementById('submitBtn')?.addEventListener('click',    () => this.handleSubmit());
    document.getElementById('toggleModeBtn')?.addEventListener('click', () => this.toggleMode());
    document.getElementById('password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSubmit();
    });
  }

  toggleMode() {
    this.authMode   = this.authMode === 'login' ? 'register' : 'login';
    this.submitting = false;
    this.renderAuthForm();
  }

  setSubmitting(active) {
    this.submitting = active;
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
    btn.disabled          = active;
    btn.textContent       = active ? 'Please wait…' : (this.authMode === 'login' ? 'Login' : 'Register');
    btn.style.opacity     = active ? '0.6' : '1';
    btn.style.cursor      = active ? 'not-allowed' : 'pointer';
  }

  setMessage(msg) {
    const div = document.getElementById('message');
    if (div) div.textContent = msg;
  }

  // ── Submit routing ────────────────────────────────────────────────────────

  async handleSubmit() {
    if (this.submitting) return;
    if (this.authMode === 'login') await this.handleLogin();
    else                           await this.handleRegister();
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async handleLogin() {
    const email    = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    if (!email || !password) { this.setMessage('Please fill in all fields.'); return; }

    this.setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (!data.session?.access_token) {
        this.setMessage('Check your email to confirm your account, then log in.');
        this.authMode = 'login';
        this.renderAuthForm();
        return;
      }

      const userId = data.user?.id;
      if (!userId) throw new Error('No user ID returned from Supabase.');

      if (this.selectedRole === 'contributor') {
        const contributor = await apiService.getContributorBySupabaseId(userId);
        if (!contributor) {
          await supabase.auth.signOut();
          this.setMessage('No contributor profile found. Please register first.');
          return;
        }
        gameState.setContributor(contributor);
        gameState.setRole('contributor');

      } else if (this.selectedRole === 'administrator') {
        const admin = await apiService.getAdministratorBySupabaseId(userId);
        if (!admin) {
          await supabase.auth.signOut();
          this.setMessage('No administrator profile found. Please register first.');
          return;
        }
        gameState.setAdministrator(admin);
        gameState.setRole('administrator');

      } else {
        const learner = await apiService.getCurrentLearner();
        if (!learner) {
          await supabase.auth.signOut();
          this.setMessage('No learner profile found. Please register first.');
          return;
        }
        gameState.setLearner(learner);
        gameState.setRole('learner');
        try { gameState.setInventory(await apiService.getMyInventory() || []); }
        catch { gameState.setInventory([]); }
      }

      this.startGame();
    } catch (err) {
      this.setMessage(err.message || 'Login failed.');
      this.setSubmitting(false);
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────

  async handleRegister() {
    const email    = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const fullname = document.getElementById('fullname')?.value?.trim() || null;

    if (!email || !password) {
      this.setMessage('Email and password are required.');
      return;
    }

    // Role-specific required field validation
    if (this.selectedRole === 'learner') {
      const username = document.getElementById('username')?.value?.trim();
      if (!username) { this.setMessage('Username is required.'); return; }
    }

    this.setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: fullname || email } },
      });
      if (error) throw error;

      // No session means email confirmation is required — can't call backend yet
      if (!data.session?.access_token) {
        this.setMessage('Check your email to confirm your account, then log in.');
        this.authMode = 'login';
        this.renderAuthForm();
        return;
      }

      const userId = data.user?.id;
      if (!userId) throw new Error('No user ID returned from Supabase.');

      try {
        if (this.selectedRole === 'learner') {
          const username = document.getElementById('username')?.value?.trim();
          // Backend createLearner(supabaseUserId, username, email, fullName)
          const created = await apiService.addLearner({ supabaseUserId: userId, username, email, full_name: fullname });
          gameState.setLearner(created);
          gameState.setRole('learner');
          gameState.setInventory([]);

        } else if (this.selectedRole === 'contributor') {
          const bio = document.getElementById('bio')?.value?.trim() || null;
          // Backend createContributor(supabaseUserId, email, fullName, bio)
          const created = await apiService.createContributor({ supabaseUserId: userId, email, fullName: fullname, bio });
          gameState.setContributor(created);
          gameState.setRole('contributor');

        } else if (this.selectedRole === 'administrator') {
          // Backend saveAdministrator(administrator entity)
          const created = await apiService.createAdministrator({ supabaseUserId: userId, email, fullName: fullname });
          gameState.setAdministrator(created);
          gameState.setRole('administrator');
        }
      } catch (backendErr) {
        // Supabase account was created but our DB failed — sign out so the
        // user can retry or log in if the profile already exists.
        await supabase.auth.signOut();
        throw backendErr;
      }

      this.startGame();
    } catch (err) {
      this.setMessage(err.message || 'Registration failed.');
      this.setSubmitting(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  startGame() {
    this.cleanup();
    if (this.selectedRole === 'contributor') {
      const contributor = gameState.getContributor();
      localStorage.setItem('contributorId', contributor?.contributorId ?? '');
      window.location.href = '/contributor/contents.html';
      return;
    } else if (this.selectedRole === 'administrator') {
      this.scene.start('AdminScene');
    } else {
      this.scene.start('WorldMapScene');
      this.scene.launch('UIScene');
    }
  }

  cleanup() {
    if (this.loginForm?.parentNode) {
      this.loginForm.parentNode.removeChild(this.loginForm);
    }
  }

  shutdown() { this.cleanup(); }
}
