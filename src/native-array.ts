import { Pointer } from "./types.js";
import { getInstanceExports } from "./util.js";

type AllTypedArrays = Uint8Array | Int8Array | Uint8ClampedArray | Uint16Array | Int16Array | Uint32Array | Int32Array;

abstract class NativeTypedArray<T extends AllTypedArrays> {
    _impl: T | null = null;

    private _ptr: Pointer<unknown> | null = null;
    private _malloc: ((size: number) => number) | null;
    private _realloc: ((ptr: number, size: number) => number) | null;
    private _free: ((ptr: number) => void) | null;

    private _updateTypedArrayImpl(newAddress: number, newCount: number) { this._impl = new this.TypedArray((this._instance.exports.memory as WebAssembly.Memory).buffer, newAddress, newCount) as T }

    set(other: T) {
        this._impl?.set(other, 0);
    }

    resize(newSize: number) {
        const newByteCount = newSize * this._bytesPerWord;
        if (this._ptr)
            this._ptr = this._realloc!(this._ptr, newByteCount);
        else
            this._ptr = this._malloc!(newByteCount);

        this._updateTypedArrayImpl(this._ptr, newSize)
    }

    get address() { return this._ptr }

    constructor(private TypedArray: { new(buffer: ArrayBufferLike, byteOffset?: number, length?: number): T }, protected _instance: WebAssembly.Instance, protected _bytesPerWord: number, initialCount?: number | null) {
        this._malloc = getInstanceExports(_instance).malloc;
        this._realloc = getInstanceExports(_instance).realloc;
        this._free = getInstanceExports(_instance).free;

        if (initialCount)
            this._ptr = this._malloc!(initialCount * this._bytesPerWord);
        else
            this._ptr = null;
    }

    [Symbol.dispose]() {
        if (this._ptr) {
            this._free!(this._ptr);
        }
    }
}

export class NativeInt8Array extends NativeTypedArray<Int8Array> { constructor(instance: WebAssembly.Instance) { super(Int8Array, instance, 1); } }
export class NativeUint8Array extends NativeTypedArray<Uint8Array> { constructor(instance: WebAssembly.Instance) { super(Uint8Array, instance, 1); } }
export class NativeUint8ClampedArray extends NativeTypedArray<Uint8ClampedArray> { constructor(instance: WebAssembly.Instance) { super(Uint8ClampedArray, instance, 1); } }

export class NativeInt16Array extends NativeTypedArray<Int16Array> { constructor(instance: WebAssembly.Instance) { super(Int16Array, instance, 2); } }
export class NativeUint16Array extends NativeTypedArray<Uint16Array> { constructor(instance: WebAssembly.Instance) { super(Uint16Array, instance, 2); } }

export class NativeInt32Array extends NativeTypedArray<Int32Array> { constructor(instance: WebAssembly.Instance) { super(Int32Array, instance, 4); } }
export class NativeUint32Array extends NativeTypedArray<Uint32Array> { constructor(instance: WebAssembly.Instance) { super(Uint32Array, instance, 4); } }
