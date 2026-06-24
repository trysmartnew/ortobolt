import { vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

const storage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
    get length() {
      return storage.size;
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    _data: new Map<string, string>(),
    getItem(key: string) {
      return this._data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      this._data.set(key, value);
    },
    removeItem(key: string) {
      this._data.delete(key);
    },
    clear() {
      this._data.clear();
    },
  },
  writable: true,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));
