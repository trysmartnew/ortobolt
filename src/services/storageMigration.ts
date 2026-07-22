const LEGACY_PREFIXES = [
  { old: 'ortobolt_', new: 'vanguard-veterinary_' },
  { old: 'ortobolt-', new: 'vanguard-veterinary-' },
] as const;

const migrateStorage = (storage: Storage): void => {
  const keys: string[] = [];

  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key !== null) {
      keys.push(key);
    }
  }

  keys.forEach((key) => {
    const rule = LEGACY_PREFIXES.find((prefix) => key.startsWith(prefix.old));
    if (!rule) return;

    const newKey = `${rule.new}${key.slice(rule.old.length)}`;

    try {
      if (storage.getItem(newKey) === null) {
        const value = storage.getItem(key);
        if (value !== null) {
          storage.setItem(newKey, value);
        }
      }

      storage.removeItem(key);
    } catch {
      // Migração não deve quebrar o app se storage estiver indisponível.
    }
  });
};

export const migrateLegacyStorageKeys = (): void => {
  if (typeof window === 'undefined') return;

  try {
    migrateStorage(window.sessionStorage);
    migrateStorage(window.localStorage);
  } catch {
    // Falha de acesso a storage não deve bloquear a inicialização.
  }
};