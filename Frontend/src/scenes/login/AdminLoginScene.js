import { LoginScene } from './LoginScene.js';

export class AdminLoginScene extends LoginScene {
  constructor() {
    super({
      key: 'AdminLoginScene',
      initialAuthMode: 'login',
      initialRole: 'admin',
      formOptions: {
        roles: ['admin'],
        showRoleSelector: false,
        showModeSelector: false,
        allowRegister: false,
        showGoogleButton: false
      }
    });
  }

  hasPendingOAuthFlow() {
    return false;
  }
}
