import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadJsonFromStorage, saveJsonToStorage } from './services/storage';

// In-memory mock for localStorage
const store = new Map();
const localStorageMock = {
  getItem: vi.fn(key => store.get(key) || null),
  setItem: vi.fn((key, value) => store.set(key, value.toString())),
  removeItem: vi.fn(key => store.delete(key)),
  clear: vi.fn(() => store.clear()),
  length: 0,
  key: vi.fn(index => Array.from(store.keys())[index] || null),
};

// Assign mock to global and window
global.localStorage = localStorageMock;
if (typeof window !== 'undefined') {
  window.localStorage = localStorageMock;
}

describe('Storage Service Smoke Test', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should save and load JSON from localStorage', () => {
    const key = 'test-key';
    const data = { foo: 'bar' };

    saveJsonToStorage(key, data);
    const loaded = loadJsonFromStorage(key, {});

    expect(loaded).toEqual(data);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(key, JSON.stringify(data));
  });

  it('should return fallback if key not found', () => {
    const key = 'missing-key';
    const fallback = { status: 'default' };

    const result = loadJsonFromStorage(key, fallback);

    expect(result).toEqual(fallback);
  });
});
