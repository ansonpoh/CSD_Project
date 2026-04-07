export const ADMIN_LOGIN_PATH = '/admin.html';

export function isAdminEntry() {
  if (typeof window === 'undefined') return false;
  return window.__AUTH_ENTRY__ === 'admin' || window.location.pathname.endsWith(ADMIN_LOGIN_PATH);
}

export function getLoginSceneKey() {
  return isAdminEntry() ? 'AdminLoginScene' : 'LoginScene';
}

export function getLoginPageUrl() {
  if (typeof window === 'undefined') return '/';
  return isAdminEntry() ? `${window.location.origin}${ADMIN_LOGIN_PATH}` : window.location.origin;
}
