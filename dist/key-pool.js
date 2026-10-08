export class ApiKeyPool {
    states;
    cursor = 0;
    stickyIndex = 0;
    options;
    constructor(keys, options = {}) {
        const cleaned = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
        for (const [name, value] of Object.entries({
            rateLimitCooldownMs: options.rateLimitCooldownMs ?? 30_000,
            transientFailureCooldownMs: options.transientFailureCooldownMs ?? 5_000,
        })) {
            if (!Number.isFinite(value) || value < 0)
                throw new RangeError(name + " must be finite and nonnegative");
        }
        if (options.strategy !== undefined && !["round_robin", "sticky"].includes(options.strategy))
            throw new TypeError("Unknown key rotation strategy");
        this.states = cleaned.map((key) => ({ key, disabled: false, cooldownUntil: 0 }));
        this.options = {
            strategy: options.strategy ?? "round_robin",
            rateLimitCooldownMs: options.rateLimitCooldownMs ?? 30_000,
            transientFailureCooldownMs: options.transientFailureCooldownMs ?? 5_000,
            disableKeyOnUnauthorized: options.disableKeyOnUnauthorized ?? true,
        };
    }
    get size() {
        return this.states.length;
    }
    hasKeys() {
        return this.states.length > 0;
    }
    select(excluded = new Set()) {
        if (this.states.length === 0)
            return undefined;
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
            if (!state || state.disabled || state.cooldownUntil > now || excluded.has(index))
                continue;
            this.cursor = (index + 1) % this.states.length;
            if (this.options.strategy === "sticky")
                this.stickyIndex = index;
            return { key: state.key, index };
        }
        return undefined;
    }
    selectIndex(index) {
        const state = this.states[index];
        if (!state || state.disabled || state.cooldownUntil > Date.now())
            return undefined;
        return { key: state.key, index };
    }
    nextAvailableForIndexMs(index) {
        const state = this.states[index];
        if (!state || state.disabled)
            return undefined;
        return Math.max(0, state.cooldownUntil - Date.now());
    }
    hasAvailable(excluded = new Set()) {
        const now = Date.now();
        return this.states.some((state, index) => !state.disabled && state.cooldownUntil <= now && !excluded.has(index));
    }
    nextAvailableInMs(excluded = new Set()) {
        const now = Date.now();
        const candidates = this.states
            .map((state, index) => ({ state, index }))
            .filter(({ state, index }) => !state.disabled && !excluded.has(index));
        if (candidates.length === 0)
            return undefined;
        return Math.max(0, Math.min(...candidates.map(({ state }) => state.cooldownUntil - now)));
    }
    disable(index) {
        const state = this.states[index];
        if (state)
            state.disabled = true;
    }
    cooldown(index, ms) {
        if (!Number.isFinite(ms) || ms < 0)
            throw new RangeError("Key cooldown must be finite and nonnegative");
        const state = this.states[index];
        if (state)
            state.cooldownUntil = Math.max(state.cooldownUntil, Date.now() + ms);
    }
    markHealthy(index) {
        const state = this.states[index];
        if (state)
            state.cooldownUntil = 0;
    }
    snapshot() {
        return this.states.map((state, index) => ({ index, disabled: state.disabled, cooldownUntil: state.cooldownUntil }));
    }
}
//# sourceMappingURL=key-pool.js.map