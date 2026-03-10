const DEFAULT_ROLE = 'learner';
const DEFAULT_AVATAR_PRESET = 'azure-knight';

function readTrimmedValue(container, id) {
  return container?.querySelector(`#${id}`)?.value?.trim() || '';
}

function readSelectValue(container, id, fallback = '') {
  return container?.querySelector(`#${id}`)?.value || fallback;
}

export function readLoginForm(container) {
  return {
    role: readSelectValue(container, 'role', DEFAULT_ROLE),
    email: readTrimmedValue(container, 'email'),
    password: readTrimmedValue(container, 'password')
  };
}

export function validateLoginForm(form) {
  if (!form.email || !form.password) {
    return 'Please fill in all fields';
  }

  return null;
}

export function readRegisterForm(container) {
  const role = readSelectValue(container, 'role', DEFAULT_ROLE);

  return {
    role,
    username: readTrimmedValue(container, 'username'),
    fullname: readTrimmedValue(container, 'fullname'),
    bio: readTrimmedValue(container, 'bio'),
    avatarPreset: readSelectValue(container, 'avatarPreset', DEFAULT_AVATAR_PRESET),
    email: readTrimmedValue(container, 'email'),
    password: readTrimmedValue(container, 'password')
  };
}

export function validateRegisterForm(form) {
  if (!form.fullname || !form.email || !form.password) {
    return 'Please fill in all required fields';
  }

  if (form.role === 'learner' && !form.username) {
    return 'Please fill in all required fields';
  }

  return null;
}
