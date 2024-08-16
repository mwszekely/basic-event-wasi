import { InstantiatedWasm } from "./wasm.js";

type AllTypedArrays = Uint8Array | Int8Array | Uint8ClampedArray | Uint16Array | Int16Array | Uint32Array | Int32Array | BigInt64Array | BigUint64Array;

export class InvalidArrayLengthError extends Error {
    constructor(sourceByteCount: number, targetItemSize: number) {
        super(`The array could not be assigned because the source array is ${sourceByteCount} byte${sourceByteCount == 1 ? "" : "s"} long, which is not divisible by ${targetItemSize}, the number of bytes per element in the target array.`)
    }
}

/**
 * Represents a `TypedArray` (e.g. `Int8Array`, etc.) that exists in WASM memory instead of JS memory.
 * 
 * As this class is Disposable, it should be created with `using` so your program doesn't OOM.
 */
abstract class NativeTypedArray<T extends AllTypedArrays> {

    // This is assigned in a function that's definitely called from the constructor
    protected _impl!: T;

    private _currentCount: number;
    private _ptr: number | null = null;
    private _malloc: ((size: number) => number) | null;
    private _realloc: ((ptr: number, size: number) => number) | null;
    private _free: ((ptr: number) => void) | null;


    private _updateTypedArrayImpl(newAddress: number, newCount: number) {
        this._impl = new this.TypedArray(this._instance.exports.memory.buffer, newAddress, newCount);
    }

    /**
     * Like `TypedArray.set`, this does not resize the array based on the input. If you're assigning to this array from a source, be sure to call `resize` first.
     * @param other The source array to copy from
     * @param offset Where to start writing to in this array
     */
    set(other: T, offset = 0): void {
        this._impl.set(other as never, offset);
    }

    /**
     * This is simply `resize`, then `set`, with accommodation made for `TypedArray`s of different sizes
     * 
     * @param other The source array that this array will copy into WASM memory. It can be any kind of `TypedArray`.
     */
    assign(other: AllTypedArrays): void {
        const ourNewCount = other.byteLength / this._impl.BYTES_PER_ELEMENT;
        if (Math.floor(ourNewCount) != ourNewCount) {
            throw new InvalidArrayLengthError(other.byteLength, this._impl.BYTES_PER_ELEMENT);
        }
        this.resize(ourNewCount);
        this.set(new this.TypedArray(other));
    }

    /**
     * Identically to `TypedArray.at`, a negative `index` will count backwards from the end of the array.
     */
    at(index: number): number | bigint | undefined { return this._impl.at(index) }

    /**
     * Resizes this array in WASM memory, allocating as necessary.
     * 
     * It's recommended to just use `assign`, which copies an entire source array in one step, because 
     * as usual, reading the newly assigned memory before writing to it is undefined behavior and **will** immediately send you to crime jail.
     * 
     * @param newCount The number of items in this array (not the total size in bytes)
     */
    resize(newCount: number): void {
        if (newCount != this._currentCount) {
            const newByteCount = newCount * this._bytesPerWord;
            if (this._ptr)
                this._ptr = this._realloc!(this._ptr, newByteCount);
            else
                this._ptr = this._malloc!(newByteCount);

            this._updateTypedArrayImpl(this._ptr, newCount)
        }
    }

    /**
     * Returns the address of this array (for use with other WASM functions that expect a pointer that points to an array)
     */
    get address(): number | null { return this._ptr }

    protected constructor(private TypedArray: new (buffer: ArrayBufferLike, byteOffset?: number, length?: number) => T, protected _instance: InstantiatedWasm, protected _bytesPerWord: number, initialCount?: number | null) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const { malloc, realloc, free } = _instance.exports;
        this._malloc = malloc;
        this._realloc = realloc;
        this._free = free;
        this._currentCount = initialCount || 0;

        if (initialCount) {
            this._ptr = this._malloc(initialCount * this._bytesPerWord);
            this._updateTypedArrayImpl(this._ptr, initialCount);
        }
        else
            this._ptr = null;


        this._updateTypedArrayImpl(this._ptr || 0, initialCount || 0);
    }

    [Symbol.dispose](): void {
        if (this._ptr)
            this._free!(this._ptr);
    }
}

export class NativeInt8Array extends NativeTypedArray<Int8Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(Int8Array, instance, 1, initialCount); } }
export class NativeUint8Array extends NativeTypedArray<Uint8Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(Uint8Array, instance, 1, initialCount); } }
export class NativeUint8ClampedArray extends NativeTypedArray<Uint8ClampedArray> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(Uint8ClampedArray, instance, 1, initialCount); } }

export class NativeInt16Array extends NativeTypedArray<Int16Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(Int16Array, instance, 2, initialCount); } }
export class NativeUint16Array extends NativeTypedArray<Uint16Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(Uint16Array, instance, 2, initialCount); } }

export class NativeInt32Array extends NativeTypedArray<Int32Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(Int32Array, instance, 4, initialCount); } }
export class NativeUint32Array extends NativeTypedArray<Uint32Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(Uint32Array, instance, 4, initialCount); } }

export class NativeBigInt64Array extends NativeTypedArray<BigInt64Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(BigInt64Array, instance, 8, initialCount); } }
export class NativeBigUint64Array extends NativeTypedArray<BigUint64Array> { constructor(instance: InstantiatedWasm, initialCount: number | null | undefined) { super(BigUint64Array, instance, 8, initialCount); } }
