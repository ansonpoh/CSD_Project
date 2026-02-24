import Phaser from 'phaser';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';
import { supabase } from '../config/supabaseClient.js';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
    this.loginForm = null;
    this.authMode = 'login';
    this.cloudSet = 1;
    this.cloudLayerCount = 4;
  }

  preload() {
    const { cloudSet, cloudLayerCount } = this.getCloudConfigForCurrentTime();
    this.cloudSet = cloudSet;
    this.cloudLayerCount = cloudLayerCount;

    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      this.load.image(
        `login-cloud-${i}`,
        `/assets/Clouds/Clouds%20${this.cloudSet}/${i}.png`
      );
    }
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.createTimeBasedBackground(width, height);

    // Add title
    this.add.text(width / 2, 100, 'ADVENTURE GAME', {
      fontSize: '48px',
      color: '#4a90e2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create HTML login form
    this.createAuthFormContainer();
    this.renderAuthForm();
  }

  createAuthFormContainer() {
    this.loginForm = document.createElement('div');
    this.loginForm.style.position = 'absolute';
    this.loginForm.style.left = '50%';
    this.loginForm.style.top = '50%';
    this.loginForm.style.transform = 'translate(-50%, -50%)';
    this.loginForm.style.padding = '30px';
    this.loginForm.style.backgroundColor = 'rgba(26, 26, 46, 0.95)';
    this.loginForm.style.borderRadius = '10px';
    this.loginForm.style.border = '2px solid #4a90e2';
    this.loginForm.style.width = '400px';
    document.body.appendChild(this.loginForm);
  }

  getCloudConfigForCurrentTime() {
    const hour = new Date().getHours();

    // 8 cloud packs over 24h, rotating every 3 hours.
    const cloudSet = Math.floor(hour / 3) + 1;
    const layerCountsBySet = {
      1: 4,
      2: 4,
      3: 4,
      4: 4,
      5: 5,
      6: 6,
      7: 4,
      8: 6
    };

    return {
      cloudSet,
      cloudLayerCount: layerCountsBySet[cloudSet] || 4
    };
  }

  getSkyColorForCurrentTime() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 8) return 0xffc48c; // sunrise
    if (hour >= 8 && hour < 17) return 0x87c8ff; // day
    if (hour >= 17 && hour < 20) return 0xff8f70; // sunset
    return 0x0b1736; // night
  }

  createTimeBasedBackground(width, height) {
    this.add
      .rectangle(width / 2, height / 2, width, height, this.getSkyColorForCurrentTime())
      .setDepth(-200);

    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      const drift = 40 + i * 25;
      const cloud = this.add.image(width / 2, height / 2, `login-cloud-${i}`).setDepth(-150 + i);
      const requiredWidth = width + drift * 2 + 160;
      const requiredHeight = height + 120;
      const scale = Math.max(requiredWidth / cloud.width, requiredHeight / cloud.height);
      cloud.setScale(scale);
      cloud.setAlpha(Math.min(0.22 + i * 0.07, 0.78));

      this.tweens.add({
        targets: cloud,
        x: { from: width / 2 - drift, to: width / 2 + drift },
        duration: 9000 + i * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  renderAuthForm() {
    const isLogin = this.authMode == 'login';
    this.loginForm.innerHTML = `
      <h2 style="color: white; text-align: center; margin-bottom: 20px;">
        ${isLogin ? 'Login' : 'Register'}
      </h2>

      ${isLogin ? '' : `
      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px;">Username</label>
        <input type="text" id="username" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;" />
      </div>

      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px;">Full Name</label>
        <input type="text" id="fullname" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;" />
      </div>
      `}

      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px;">Email</label>
        <input type="email" id="email" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;" />
      </div>

      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px;">Password</label>
        <input type="password" id="password" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;" />
      </div>

      <button id="submitBtn" style="width: 100%; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
        ${isLogin ? 'Login' : 'Register'}
      </button>

      <button id="toggleModeBtn" style="width: 100%; padding: 10px; background: transparent; color: #9fc7ff; border: 1px solid #4a90e2; border-radius: 5px; cursor: pointer;">
        ${isLogin ? 'No account? Register' : 'Have an account? Login'}
      </button>

      <div id="message" style="color: #ff6b6b; text-align: center; margin-top: 10px; min-height: 20px;"></div>
    `;

    document.getElementById('submitBtn')?.addEventListener('click', () => this.handleSubmit());
    document.getElementById('toggleModeBtn')?.addEventListener('click', () => this.toggleMode());

    const passwordInput = document.getElementById('password');
    passwordInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSubmit();
    });
  }

  toggleMode() {
    this.authMode = this.authMode === 'login' ? 'register' : 'login';
    this.renderAuthForm();
  }

  async handleSubmit() {
    if (this.authMode === 'login') {
      await this.handleLogin();
    } else {
      await this.handleRegister();
    }
  }

  async handleLogin() {
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();
    const messageDiv = document.getElementById('message');

    if (!email || !password) {
      if (messageDiv) messageDiv.textContent = 'Please fill in all fields';
      return;
    }

    try {
      const { data, error} = await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;

      // Logging to check for tokens.
      // const { data: { session } } = await supabase.auth.getSession();
      // console.log('token exists?', !!session?.access_token);
      // const token = (await supabase.auth.getSession()).data.session?.access_token;
      // console.log(JSON.parse(atob(token.split('.')[0])));

      if (!data.session?.access_token) {
        this.setMessage('Check your email to confirm account, then login.');
        this.authMode = 'login';
        this.renderAuthForm();
        return;
      }

      const userId = data.user?.id || data.session?.user?.id;
      if (!userId) throw new Error('No Supabase user id returned');

      const learner = await apiService.getCurrentLearner();
      if (!learner) {
        this.setMessage('No learner profile found. Please register first.');
        return;
      }
      gameState.setLearner(learner);
      
      // Loads Inventory
      try {
        const inventory = await apiService.getMyInventory();
        gameState.setInventory(inventory || []);
      } catch (e) {
        console.error('Failed to load inventory:', e);
        gameState.setInventory([]);
      }

      this.startGame();
    } catch (error) {
      this.setMessage(error.message || 'Login failed');
    }
  }

  async handleRegister() {
    const username = document.getElementById('username')?.value?.trim();
    const fullname = document.getElementById('fullname')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();

    if (!username || !fullname || !email || !password) {
      this.setMessage('Please fill in all fields');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: fullname } }
      });
      if (error) throw error;

      const userId = data.user?.id || data.session?.user?.id;
      if (!userId) {
        this.setMessage('Check your email to confirm account, then login.');
        this.authMode = 'login';
        this.renderAuthForm();
        return;
      }

      const learnerPayload = {
        supabaseUserId: userId,
        username,
        email,
        full_name: fullname,
        total_xp: 0,
        level: 1,
        updated_at: new Date().toISOString(),
        is_active: true
      };

      const createdLearner = await apiService.addLearner(learnerPayload);
      gameState.setLearner(createdLearner);
      gameState.setInventory([]);

      this.cleanup();
      this.startGame();
    } catch (error) {
      this.setMessage(error.message || 'Registration failed');
    }
  }

  setMessage(message) {
    const messageDiv = document.getElementById('message');
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
  }

  shutdown() {
    this.cleanup();
  }
}
