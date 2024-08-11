import { EmboundTypes } from "./_private/embind/types.js";
import type { EventTypesMap } from "./_private/event-types-map.js";
import { KnownInstanceExports2 } from "./types.js";

interface InstantiatedWasiEventTarget extends EventTarget {
    addEventListener<K extends keyof EventTypesMap>(type: K, listener: (this: FileReader, ev: EventTypesMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
}


//  This reassignment is a Typescript hack to add custom types to addEventListener...
const InstantiatedWasiEventTarget = EventTarget as {new(): InstantiatedWasiEventTarget; prototype: InstantiatedWasiEventTarget};

/**
 * Extension of `WebAssembly.WebAssemblyInstantiatedSource` that is also an `EventTarget` for all WASI "event"s.
 */
export class InstantiatedWasi<E extends {}> extends InstantiatedWasiEventTarget implements WebAssembly.WebAssemblyInstantiatedSource {
    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    public module: WebAssembly.Module;
    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    public instance: WebAssembly.Instance;

    /**
     * Contains everything exported using embind.
     * 
     * These are separate from regular exports on `instance.export`.
     */
    public embind: EmboundTypes;

    /** 
     * The "raw" WASM exports. None are prefixed with "_".
     * 
     * No conversion is performed on the types here; everything takes or returns a number.
     * 
     */
    public exports: E & KnownInstanceExports2;
    public cachedMemoryView: DataView;

    /** Not intended to be called directly. Use the `instantiate` function instead, which returns one of these. */
    constructor() {
        super();
        this.module = this.instance = this.exports = this.cachedMemoryView = null!
        this.embind = {};
    }

    private _init(module: WebAssembly.Module, instance: WebAssembly.Instance): void {
        this.module = module;
        this.instance = instance;
        this.exports = instance.exports as E as E & KnownInstanceExports2;
        this.cachedMemoryView = new DataView(this.exports.memory.buffer);
    }
}

