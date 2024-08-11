export declare const Secret: Symbol;
export declare const SecretNoDispose: Symbol;
/**
 * Base class for all Embind-enabled classes.
 *
 * In general, if two (quote-unquote) "instances" of this class have the same `_this` pointer,
 * then they will compare equally with `==`, as if comparing addresses in C++.
 */
export declare class EmboundClass {
    /**
     * The transformed constructor function that takes JS arguments and returns a new instance of this class
     */
    static _constructor: (...args: any[]) => EmboundClass;
    /**
     * Assigned by the derived class when that class is registered.
     *
     * This one is not transformed because it only takes a pointer and returns nothing.
     */
    static _destructor: (_this: number) => void;
    /**
     * The pointer to the class in WASM memory; the same as the C++ `this` pointer.
     */
    protected _this: number;
    constructor(...args: any[]);
    [Symbol.dispose](): void;
}
/**
 * Instead of instantiating a new instance of this class,
 * you can inspect an existing pointer instead.
 *
 * This is mainly intended for situations that Embind doesn't support,
 * like array-of-structs-as-a-pointer.
 *
 * Be aware that there's no lifetime tracking involved, so
 * make sure you don't keep this value around after the
 * pointer's been invalidated.
 *
 * **Do not call [Symbol.dispose]** on an inspected class,
 * since the assumption is that the C++ code owns that pointer
 * and we're just looking at it, so destroying it would be rude.
 */
export declare function inspectClassByPointer<T>(pointer: number): T;
//# sourceMappingURL=EmboundClass.d.ts.map