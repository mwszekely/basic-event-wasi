import { InstantiatedWasm } from "../dist/index.js";
import type { EmboundTypes, KnownInstanceExports } from "./stage/instantiate.ts";

declare global {
    const _wasm: InstantiatedWasm<KnownInstanceExports, EmboundTypes>;
    const _memoryGrowth: number;
    const output: HTMLElement;
}

