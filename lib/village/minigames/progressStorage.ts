/** Automatic progress must not write on every timer tick or break gameplay if
 * browser storage is full/blocked. Explicit record saves report their own errors. */
export function createProgressStorage(
  getStorage: () => Storage = () => localStorage,
) {
  const written = new Map<string, string>();
  return {
    getItem: (key: string) => {
      try {
        const value = getStorage().getItem(key);
        if (value !== null) written.set(key, value);
        return value;
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      if (written.get(key) === value) return;
      try {
        getStorage().setItem(key, value);
        written.set(key, value);
      } catch {
        // Keep progress in memory; leave this value uncached so a later change
        // can retry. The successful-run form remains available to the player.
      }
    },
    removeItem: (key: string) => {
      written.delete(key);
      try {
        getStorage().removeItem(key);
      } catch {
        /* Keep gameplay available. */
      }
    },
  };
}
