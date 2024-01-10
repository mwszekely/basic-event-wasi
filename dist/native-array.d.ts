type AllTypedArrays = Uint8Array | Int8Array | Uint8ClampedArray | Uint16Array | Int16Array | Uint32Array | Int32Array;
declare abstract class NativeTypedArray<T extends AllTypedArrays> {
    private TypedArray;
    protected _instance: WebAssembly.Instance;
    protected _bytesPerWord: number;
    _impl: T | null;
    private _ptr;
    private _malloc;
    private _realloc;
    private _free;
    private _updateTypedArrayImpl;
    set(other: T): void;
    resize(newSize: number): void;
    get address(): number | null;
    constructor(TypedArray: {
        new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
    }, _instance: WebAssembly.Instance, _bytesPerWord: number, initialCount?: number | null);
    [Symbol.dispose](): void;
}
export declare class NativeInt8Array extends NativeTypedArray<Int8Array> {
    constructor(instance: WebAssembly.Instance);
}
export declare class NativeUint8Array extends NativeTypedArray<Uint8Array> {
    constructor(instance: WebAssembly.Instance);
}
export declare class NativeUint8ClampedArray extends NativeTypedArray<Uint8ClampedArray> {
    constructor(instance: WebAssembly.Instance);
}
export declare class NativeInt16Array extends NativeTypedArray<Int16Array> {
    constructor(instance: WebAssembly.Instance);
}
export declare class NativeUint16Array extends NativeTypedArray<Uint16Array> {
    constructor(instance: WebAssembly.Instance);
}
export declare class NativeInt32Array extends NativeTypedArray<Int32Array> {
    constructor(instance: WebAssembly.Instance);
}
export declare class NativeUint32Array extends NativeTypedArray<Uint32Array> {
    constructor(instance: WebAssembly.Instance);
}
export {};
