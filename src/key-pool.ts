import type { KeyRotationOptions } from "./types.js";

interface KeyState {
  key: string;
  disabled: boolean;
  cooldownUntil: number;
}

export interface SelectedKey {
  key: string;
  index: number;
}

export class ApiKeyPool {
  private readonly states: KeyState[];
  private cursor = 0;
  private stickyIndex = 0;
  readonly options: Required<KeyRotationOptions>;

  constructor(keys: readonly string[], options: KeyRotationOptions = {}) {
    const cleaned = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
    this.states = cleaned.map((key) => ({ key, disabled: false, cooldownUntil: 0 }));
    this.options = {
      strategy: options.strategy ?? "round_robin",
      rateLimitCooldownMs: options.rateLimitCooldownMs ?? 30_000,
      transientFailureCooldownMs: options.transientFailureCooldownMs ?? 5_000,
      disableKeyOnUnauthorized: options.disableKeyOnUnauthorized ?? true,
    };
  }

  get size(): number {
    return this.states.length;
  }

  hasKeys(): boolean {
    return this.states.length > 0;
  }

  select(excluded = new Set<number>()): SelectedKey | undefined {
    if (this.states.length === 0) return undefined;
    const now = Date.now();

    if (this.options.strategy === "sticky") {
      const sticky = this.states[this.stickyIndex];
      if (sticky && !sticky.disabled && sticky.cooldownUntil <= now && !excluded.has(this.stickyIndex)) {
        return { key: sticky.key, index: this.stickyIndex };
      }
    }

    for (let offset = 0; offset < this.states.length; offset += 1) {
      const index = (this.cursor + offset) % this.states.length;
      const state = this.states[index];
      if (!state || state.disabled || state.cooldownUntil > now || excluded.has(index)) continue;
      this.cursor = (index + 1) % this.states.length;
      if (this.options.strategy === "sticky") this.stickyIndex = index;
      return { key: state.key, index };
    }

    return undefined;
  }

  selectIndex(index: number): SelectedKey | undefined {
    const state = this.states[index];
    if (!state || state.disabled || state.cooldownUntil > Date.now()) return undefined;
    return { key: state.key, index };
  }

  nextAvailableForIndexMs(index: number): number | undefined {
    const state = this.states[index];
    if (!state || state.disabled) return undefined;
    return Math.max(0, state.cooldownUntil - Date.now());
  }

  hasAvailable(excluded = new Set<number>()): boolean {
    const now = Date.now();
    return this.states.some((state, index) => !state.disabled && state.cooldownUntil <= now && !excluded.has(index));
  }

  nextAvailableInMs(excluded = new Set<number>()): number | undefined {
    const now = Date.now();
    const candidates = this.states
      .map((state, index) => ({ state, index }))
      .filter(({ state, index }) => !state.disabled && !excluded.has(index));
    if (candidates.length === 0) return undefined;
    return Math.max(0, Math.min(...candidates.map(({ state }) => state.cooldownUntil - now)));
  }

  disable(index: number): void {
    const state = this.states[index];
    if (state) state.disabled = true;
  }

  cooldown(index: number, ms: number): void {
    const state = this.states[index];
    if (state) state.cooldownUntil = Math.max(state.cooldownUntil, Date.now() + Math.max(0, ms));
  }

  markHealthy(index: number): void {
    const state = this.states[index];
    if (state) state.cooldownUntil = 0;
  }

  snapshot(): ReadonlyArray<{ index: number; disabled: boolean; cooldownUntil: number }> {
    return this.states.map((state, index) => ({ index, disabled: state.disabled, cooldownUntil: state.cooldownUntil }));
  }
}
