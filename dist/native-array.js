import { getInstanceExports } from "./util.js";
export class InvalidArrayLengthError extends Error {
    constructor(sourceByteCount, targetItemSize) {
        super(`The array could not be assigned because the source array is ${sourceByteCount} byte${sourceByteCount == 1 ? "" : "s"} long, which is not divisible by ${targetItemSize}, the number of bytes per element in the target array.`);
    }
}
/**
 * Represents a `TypedArray` (e.g. `Int8Array`, etc.) that exists in WASM memory instead of JS memory.
 *
 * As this class is Disposable, it should be created with `using` so your program doesn't OOM.
 */
class NativeTypedArray {
    TypedArray;
    _instance;
    _bytesPerWord;
    // This is assigned in a function that's definitely called from the constructor
    _impl;
    _currentCount;
    _ptr = null;
    _malloc;
    _realloc;
    _free;
    _updateTypedArrayImpl(newAddress, newCount) {
        this._impl = new this.TypedArray(this._instance.exports.memory.buffer, newAddress, newCount);
    }
    /**
     * Like `TypedArray.set`, this does not resize the array based on the input. If you're assigning to this array from a source, be sure to call `resize` first.
     * @param other The source array to copy from
     * @param offset Where to start writing to in this array
     */
    set(other, offset = 0) {
        this._impl.set(other, offset);
    }
    /**
     * This is simply `resize`, then `set`, with accommodation made for `TypedArray`s of different sizes
     *
     * @param other The source array that this array will copy into WASM memory. It can be any kind of `TypedArray`.
     */
    assign(other) {
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
    at(index) { return this._impl.at(index); }
    /**
     * Resizes this array in WASM memory, allocating as necessary.
     *
     * It's recommended to just use `assign`, which copies an entire source array in one step, because
     * as usual, reading the newly assigned memory before writing to it is undefined behavior and **will** immediately send you to crime jail.
     *
     * @param newCount The number of items in this array (not the total size in bytes)
     */
    resize(newCount) {
        if (newCount != this._currentCount) {
            const newByteCount = newCount * this._bytesPerWord;
            if (this._ptr)
                this._ptr = this._realloc(this._ptr, newByteCount);
            else
                this._ptr = this._malloc(newByteCount);
            this._updateTypedArrayImpl(this._ptr, newCount);
        }
    }
    /**
     * Returns the address of this array (for use with other WASM functions that expect a pointer that points to an array)
     */
    get address() { return this._ptr; }
    constructor(TypedArray, _instance, _bytesPerWord, initialCount) {
        this.TypedArray = TypedArray;
        this._instance = _instance;
        this._bytesPerWord = _bytesPerWord;
        this._malloc = getInstanceExports(_instance).malloc;
        this._realloc = getInstanceExports(_instance).realloc;
        this._free = getInstanceExports(_instance).free;
        this._currentCount = initialCount || 0;
        if (initialCount) {
            this._ptr = this._malloc(initialCount * this._bytesPerWord);
            this._updateTypedArrayImpl(this._ptr, initialCount);
        }
        else
            this._ptr = null;
        this._updateTypedArrayImpl(this._ptr || 0, initialCount || 0);
    }
    [Symbol.dispose]() {
        if (this._ptr) {
            this._free(this._ptr);
        }
    }
}
export class NativeInt8Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(Int8Array, instance, 1, initialCount); }
}
export class NativeUint8Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(Uint8Array, instance, 1, initialCount); }
}
export class NativeUint8ClampedArray extends NativeTypedArray {
    constructor(instance, initialCount) { super(Uint8ClampedArray, instance, 1, initialCount); }
}
export class NativeInt16Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(Int16Array, instance, 2, initialCount); }
}
export class NativeUint16Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(Uint16Array, instance, 2, initialCount); }
}
export class NativeInt32Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(Int32Array, instance, 4, initialCount); }
}
export class NativeUint32Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(Uint32Array, instance, 4, initialCount); }
}
export class NativeBigInt64Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(BigInt64Array, instance, 8, initialCount); }
}
export class NativeBigUint64Array extends NativeTypedArray {
    constructor(instance, initialCount) { super(BigUint64Array, instance, 8, initialCount); }
}
