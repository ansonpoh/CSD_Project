function resolveFallback(fallbackValue) {
  return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
}

export function loadJsonFromStorage(key, fallbackValue, label = key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return resolveFallback(fallbackValue);

    const parsed = JSON.parse(raw);
    return parsed ?? resolveFallback(fallbackValue);
  } catch (error) {
    console.error(`Failed to load ${label}:`, error);
    return resolveFallback(fallbackValue);
  }
}

export function saveJsonToStorage(key, value, label = key) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${label}:`, error);
  }
  return value;
}

export function removeStorageKey(key, label = key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${label}:`, error);
  }
}
