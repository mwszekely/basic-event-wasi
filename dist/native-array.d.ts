import { InstantiatedWasm } from "./wasm.js";
type AllTypedArrays = Uint8Array | Int8Array | Uint8ClampedArray | Uint16Array | Int16Array | Uint32Array | Int32Array | BigInt64Array | BigUint64Array;
export declare class InvalidArrayLengthError extends Error {
    constructor(sourceByteCount: number, targetItemSize: number);
}
/**
 * Represents a `TypedArray` (e.g. `Int8Array`, etc.) that exists in WASM memory instead of JS memory.
 *
 * As this class is Disposable, it should be created with `using` so your program doesn't OOM.
 */
declare abstract class NativeTypedArray<T extends AllTypedArrays> {
    private TypedArray;
    protected _instance: InstantiatedWasm;
    protected _bytesPerWord: number;
    protected _impl: T;
    private _currentCount;
    private _ptr;
    private _malloc;
    private _realloc;
    private _free;
    private _updateTypedArrayImpl;
    /**
     * Like `TypedArray.set`, this does not resize the array based on the input. If you're assigning to this array from a source, be sure to call `resize` first.
     * @param other The source array to copy from
     * @param offset Where to start writing to in this array
     */
    set(other: T, offset?: number): void;
    /**
     * This is simply `resize`, then `set`, with accommodation made for `TypedArray`s of different sizes
     *
     * @param other The source array that this array will copy into WASM memory. It can be any kind of `TypedArray`.
     */
    assign(other: AllTypedArrays): void;
    /**
     * Identically to `TypedArray.at`, a negative `index` will count backwards from the end of the array.
     */
    at(index: number): number | bigint | undefined;
    /**
     * Resizes this array in WASM memory, allocating as necessary.
     *
     * It's recommended to just use `assign`, which copies an entire source array in one step, because
     * as usual, reading the newly assigned memory before writing to it is undefined behavior and **will** immediately send you to crime jail.
     *
     * @param newCount The number of items in this array (not the total size in bytes)
     */
    resize(newCount: number): void;
    /**
     * Returns the address of this array (for use with other WASM functions that expect a pointer that points to an array)
     */
    get address(): number | null;
    protected constructor(TypedArray: {
        new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
    }, _instance: InstantiatedWasm, _bytesPerWord: number, initialCount?: number | null);
    [Symbol.dispose](): void;
}
export declare class NativeInt8Array extends NativeTypedArray<Int8Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeUint8Array extends NativeTypedArray<Uint8Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeUint8ClampedArray extends NativeTypedArray<Uint8ClampedArray> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeInt16Array extends NativeTypedArray<Int16Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeUint16Array extends NativeTypedArray<Uint16Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeInt32Array extends NativeTypedArray<Int32Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeUint32Array extends NativeTypedArray<Uint32Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeBigInt64Array extends NativeTypedArray<BigInt64Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export declare class NativeBigUint64Array extends NativeTypedArray<BigUint64Array> {
    constructor(instance: InstantiatedWasm, initialCount: number | null | undefined);
}
export {};
//# sourceMappingURL=native-array.d.ts.map