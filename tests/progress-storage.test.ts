import { describe, expect, it, vi } from "vitest";
import { createProgressStorage } from "../lib/village/minigames/progressStorage";

describe("automatic adventure progress storage", () => {
  it("writes only changed progress, skipping repeated timer publications", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const progress = createProgressStorage(() => storage as unknown as Storage);
    for (let tick = 0; tick < 100; tick++)
      progress.setItem("progress", '{"best":42}');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    progress.setItem("progress", '{"best":40}');
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });
  it("does not rewrite the value just hydrated", () => {
    const storage = { getItem: () => "existing", setItem: vi.fn() };
    const progress = createProgressStorage(() => storage as unknown as Storage);
    expect(progress.getItem("progress")).toBe("existing");
    progress.setItem("progress", "existing");
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("keeps gameplay available if storage is blocked and retries failed writes", () => {
    const setItem = vi.fn(() => {
      throw new Error("quota");
    });
    const progress = createProgressStorage(
      () => ({ setItem }) as unknown as Storage,
    );
    expect(progress.getItem("progress")).toBeNull();
    expect(() => progress.setItem("progress", "new")).not.toThrow();
    progress.setItem("progress", "new");
    expect(setItem).toHaveBeenCalledTimes(2);
    expect(() => progress.removeItem("progress")).not.toThrow();
  });
});
