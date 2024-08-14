import type { EmboundTypes } from "./stage/instantiate.ts";

declare global {
    const _wasm: {
        exports: {
            malloc(size: number): number;
            free(ptr: number): void;

        }
        embind: EmboundTypes
    };
    const _memoryGrowth: number;
    const output: HTMLElement;
}

