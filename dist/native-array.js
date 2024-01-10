import { getInstanceExports } from "./util.js";
class NativeTypedArray {
    TypedArray;
    _instance;
    _bytesPerWord;
    _impl = null;
    _ptr = null;
    _malloc;
    _realloc;
    _free;
    _updateTypedArrayImpl(newAddress, newCount) { this._impl = new this.TypedArray(this._instance.exports.memory.buffer, newAddress, newCount); }
    set(other) {
        this._impl?.set(other, 0);
    }
    resize(newSize) {
        const newByteCount = newSize * this._bytesPerWord;
        if (this._ptr)
            this._ptr = this._realloc(this._ptr, newByteCount);
        else
            this._ptr = this._malloc(newByteCount);
        this._updateTypedArrayImpl(this._ptr, newSize);
    }
    get address() { return this._ptr; }
    constructor(TypedArray, _instance, _bytesPerWord, initialCount) {
        this.TypedArray = TypedArray;
        this._instance = _instance;
        this._bytesPerWord = _bytesPerWord;
        this._malloc = getInstanceExports(_instance).malloc;
        this._realloc = getInstanceExports(_instance).realloc;
        this._free = getInstanceExports(_instance).free;
        if (initialCount)
            this._ptr = this._malloc(initialCount * this._bytesPerWord);
        else
            this._ptr = null;
    }
    [Symbol.dispose]() {
        if (this._ptr) {
            this._free(this._ptr);
        }
    }
}
export class NativeInt8Array extends NativeTypedArray {
    constructor(instance) { super(Int8Array, instance, 1); }
}
export class NativeUint8Array extends NativeTypedArray {
    constructor(instance) { super(Uint8Array, instance, 1); }
}
export class NativeUint8ClampedArray extends NativeTypedArray {
    constructor(instance) { super(Uint8ClampedArray, instance, 1); }
}
export class NativeInt16Array extends NativeTypedArray {
    constructor(instance) { super(Int16Array, instance, 2); }
}
export class NativeUint16Array extends NativeTypedArray {
    constructor(instance) { super(Uint16Array, instance, 2); }
}
export class NativeInt32Array extends NativeTypedArray {
    constructor(instance) { super(Int32Array, instance, 4); }
}
export class NativeUint32Array extends NativeTypedArray {
    constructor(instance) { super(Uint32Array, instance, 4); }
}
