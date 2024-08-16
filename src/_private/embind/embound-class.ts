// These are all the classes that have been registered, accessed by their RTTI TypeId
// It's off in its own file to keep it private.
export const EmboundClasses: Record<number, typeof EmboundClass> = {};


// This is a running list of all the instantiated classes, by their `this` pointer.
const InstantiatedClasses = new Map<number, WeakRef<EmboundClass>>();

// This keeps track of all destructors by their `this` pointer.
// Used for FinalizationRegistry and the destructor itself.
const DestructorsYetToBeCalled = new Map<number, () => void>();

// Used to ensure no one but the type converters can use the secret pointer constructor.
export const Secret: symbol = Symbol();
export const SecretNoDispose: symbol = Symbol();

// TODO: I'm not convinced this is a good idea, 
// though I suppose the warning is useful in deterministic environments
// where you can break on a class having a certain `this` pointer.
// That said I'm pretty sure only JS heap pressure will invoke a callback, 
// making it kind of pointless for C++ cleanup, which has no interaction with the JS heap.
const registry = new FinalizationRegistry((_this: number) => {
    const destructor = DestructorsYetToBeCalled.get(_this);
    if (destructor) {
        console.warn(`WASM class at address ${_this} was not properly disposed.`);
        destructor();
        DestructorsYetToBeCalled.delete(_this);
    }
});

/**
 * Base class for all Embind-enabled classes.
 *
 * In general, if two (quote-unquote) "instances" of this class have the same `_this` pointer,
 * then they will compare equally with `==`, as if comparing addresses in C++.
 */
export class EmboundClass {

    /**
     * The transformed constructor function that takes JS arguments and returns a new instance of this class
     */
    static _constructor: (...args: unknown[]) => EmboundClass;

    /**
     * Assigned by the derived class when that class is registered.
     *
     * This one is not transformed because it only takes a pointer and returns nothing.
     */
    static _destructor: (_this: number) => void;

    /**
     * The pointer to the class in WASM memory; the same as the C++ `this` pointer.
     */
    protected _this!: number;

    constructor(...args: unknown[]) {
        const CreatedFromWasm = (args.length === 2 && (args[0] === Secret || args[0] == SecretNoDispose) && typeof args[1] === 'number');

        if (!CreatedFromWasm) {
            /**
             * This is a call to create this class from JS.
             *
             * Unlike a normal constructor, we delegate the class creation to
             * a combination of _constructor and `fromWireType`.
             *
             * `_constructor` will call the C++ code that allocates memory,
             * initializes the class, and returns its `this` pointer,
             * while `fromWireType`, called as part of the glue-code process,
             * will actually instantiate this class.
             *
             * (In other words, this part runs first, then the `else` below runs)
             */
            return new.target._constructor(...args);
        }
        else {
            /**
             * This is a call to create this class from C++.
             *
             * We get here via `fromWireType`, meaning that the
             * class has already been instantiated in C++, and we
             * just need our "handle" to it in JS.
             */
            const _this = args[1] as number;

            // First, make sure we haven't instantiated this class yet.
            // We want all classes with the same `this` pointer to 
            // actually *be* the same.
            const existing = InstantiatedClasses.get(_this)?.deref();
            if (existing)
                return existing;

            // If we got here, then congratulations, this-instantiation-of-this-class, 
            // you're actually the one to be instantiated. No more hacky constructor returns.
            //
            // Consider this the "actual" constructor code, I suppose.
            this._this = _this;
            InstantiatedClasses.set(_this, new WeakRef(this));
            registry.register(this, _this);

            if (args[0] != SecretNoDispose) {
                const destructor = new.target._destructor;
                DestructorsYetToBeCalled.set(_this, () => {
                    destructor(_this);
                    InstantiatedClasses.delete(_this);
                });
            }

        }
    }

    [Symbol.dispose](): void {
        // Only run the destructor if we ourselves constructed this class (as opposed to `inspect`ing it)
        const destructor = DestructorsYetToBeCalled.get(this._this);
        if (destructor) {
            DestructorsYetToBeCalled.get(this._this)?.();
            DestructorsYetToBeCalled.delete(this._this);
            this._this = 0;
        }
    }
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
export function inspectClassByPointer<T>(pointer: number): T {
    return new EmboundClass(SecretNoDispose, pointer) as T;
}
