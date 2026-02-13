import Phaser from 'phaser';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
    this.loginForm = null;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Add title
    this.add.text(width / 2, 100, 'ADVENTURE GAME', {
      fontSize: '48px',
      color: '#4a90e2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create HTML login form
    this.createLoginForm();
  }

  createLoginForm() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create form container
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

    this.loginForm.innerHTML = `
      <h2 style="color: white; text-align: center; margin-bottom: 20px;">Login / Register</h2>
      
      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px;">Username</label>
        <input type="text" id="username" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;" />
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px;">Email</label>
        <input type="email" id="email" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;" />
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="color: white; display: block; margin-bottom: 5px;">Full Name</label>
        <input type="text" id="fullname" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a90e2; background: #16213e; color: white;" />
      </div>
      
      <button id="loginBtn" style="width: 100%; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
        Start Adventure
      </button>
      
      <div id="message" style="color: #ff6b6b; text-align: center; margin-top: 10px;"></div>
    `;

    document.body.appendChild(this.loginForm);

    // Handle login
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.addEventListener('click', () => this.handleLogin());
  }

  async handleLogin() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const fullname = document.getElementById('fullname').value;
    const messageDiv = document.getElementById('message');

    if (!username || !email || !fullname) {
      if (messageDiv) messageDiv.textContent = 'Please fill in all fields';
      return;
    }

    try {
      // Create new learner
      const learner = {
        supabase_user_id: crypto.randomUUID(),
        username,
        email,
        full_name: fullname,
        total_xp: 0,
        level: 1,
        updated_at: new Date().toISOString(),
        is_active: true
      };

      const createdLearner = await apiService.addLearner(learner);
      gameState.setLearner(createdLearner);

      // Clean up and transition
      this.cleanup();
      this.scene.start('WorldMapScene');
      this.scene.launch('UIScene');
      
    } catch (error) {
      console.error('Login error:', error);
      if (messageDiv) {
        messageDiv.textContent = 'Failed to login. Please try again.';
      }
    }
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