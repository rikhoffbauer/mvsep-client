import type { KeyRotationOptions } from "./types.js";
export interface SelectedKey {
    key: string;
    index: number;
}
export declare class ApiKeyPool {
    private readonly states;
    private cursor;
    private stickyIndex;
    readonly options: Required<KeyRotationOptions>;
    constructor(keys: readonly string[], options?: KeyRotationOptions);
    get size(): number;
    hasKeys(): boolean;
    select(excluded?: Set<number>): SelectedKey | undefined;
    selectIndex(index: number): SelectedKey | undefined;
    nextAvailableForIndexMs(index: number): number | undefined;
    hasAvailable(excluded?: Set<number>): boolean;
    nextAvailableInMs(excluded?: Set<number>): number | undefined;
    disable(index: number): void;
    cooldown(index: number, ms: number): void;
    markHealthy(index: number): void;
    snapshot(): ReadonlyArray<{
        index: number;
        disabled: boolean;
        cooldownUntil: number;
    }>;
}
//# sourceMappingURL=key-pool.d.ts.map