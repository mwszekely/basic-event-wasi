// These are all the classes that have been registered, accessed by their RTTI TypeId
// It's off in its own file to keep it private.
export const EmboundClasses = {};
// This is a running list of all the instantiated classes, by their `this` pointer.
const InstantiatedClasses = new Map();
// This keeps track of all destructors by their `this` pointer.
// Used for FinalizationRegistry and the destructor itself.
const DestructorsYetToBeCalled = new Map();
// Used to ensure no one but the type converters can use the secret pointer constructor.
export const Secret = Symbol();
export const SecretNoDispose = Symbol();
// TODO: I'm not convinced this is a good idea, 
// though I suppose the warning is useful in deterministic environments
// where you can break on a class having a certain `this` pointer.
// That said I'm pretty sure only JS heap pressure will invoke a callback, 
// making it kind of pointless for C++ cleanup, which has no interaction with the JS heap.
const registry = new FinalizationRegistry((_this) => {
    const destructor = DestructorsYetToBeCalled.get(_this);
    if (destructor) {
        console.warn(`WASM class at address ${_this} was not properly disposed.`);
        destructor.destructor();
        DestructorsYetToBeCalled.delete(_this);
    }
});
// Internal use only, for testing
export function _pendingDestructorsCount() {
    return [...DestructorsYetToBeCalled].filter(([v, a]) => a.owner == 'j').length;
}
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
    static _constructor;
    /**
     * Assigned by the derived class when that class is registered.
     *
     * This one is not transformed because it only takes a pointer and returns nothing.
     */
    static _destructor;
    /**
     * The pointer to the class in WASM memory; the same as the C++ `this` pointer.
     */
    _this;
    constructor(...args) {
        const CreatedFromWasm = (args.length === 2 && (args[0] === Secret || args[0] == SecretNoDispose) && typeof args[1] === 'number');
        const destructor = new.target._destructor;
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
            const ret = new.target._constructor(...args);
            // Ensure that we don't recreate this class from this pointer.
            // This can happen if we pass a JS-owned pointer to C++, 
            // and then C++ returns the same pointer.
            InstantiatedClasses.set(ret._this, new WeakRef(ret));
            // This instance was created by JS, so if/when we ever lose the reference to it
            // we'd like to make sure it was, in fact, cleaned up.
            // (the registry checks to prevent double-frees)
            registry.register(this, this._this);
            DestructorsYetToBeCalled.set(ret._this, {
                owner: 'j',
                destructor: () => {
                    destructor(ret._this);
                    InstantiatedClasses.delete(ret._this);
                }
            });
            return ret;
        }
        else {
            /**
             * This is a call to create this class from C++.
             *
             * We get here via `fromWireType`, meaning that the
             * class has already been instantiated in C++, and we
             * just need our "handle" to it in JS.
             */
            const _this = args[1];
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
            // Add the destructor to the list of available destructors.
            // Since is a pointer to an object made by C++,
            // we assume by default that C++ will be the one to delete it,
            // but we opt into letting JS do so too.
            DestructorsYetToBeCalled.set(_this, {
                owner: 'c',
                destructor: () => {
                    destructor(_this);
                    InstantiatedClasses.delete(_this);
                }
            });
        }
    }
    [Symbol.dispose]() {
        // Only run the destructor if we ourselves constructed this class (as opposed to `inspect`ing it)
        const destructor = DestructorsYetToBeCalled.get(this._this);
        if (destructor) {
            DestructorsYetToBeCalled.get(this._this)?.destructor();
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
export function inspectClassByPointer(pointer) {
    return new EmboundClass(SecretNoDispose, pointer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1ib3VuZC1jbGFzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxRkFBcUY7QUFDckYsK0NBQStDO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBd0MsRUFBRSxDQUFDO0FBR3RFLG1GQUFtRjtBQUNuRixNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO0FBRXJFLCtEQUErRDtBQUMvRCwyREFBMkQ7QUFDM0QsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBd0QsQ0FBQztBQUVqRyx3RkFBd0Y7QUFDeEYsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFXLE1BQU0sRUFBRSxDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBVyxNQUFNLEVBQUUsQ0FBQztBQUVoRCxnREFBZ0Q7QUFDaEQsdUVBQXVFO0FBQ3ZFLGtFQUFrRTtBQUNsRSwyRUFBMkU7QUFDM0UsMEZBQTBGO0FBQzFGLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQW9CLENBQUMsQ0FBQyxLQUFhLEVBQUUsRUFBRTtJQUN4RCxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkQsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEtBQUssNkJBQTZCLENBQUMsQ0FBQztRQUMxRSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDeEIsd0JBQXdCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILGlDQUFpQztBQUNqQyxNQUFNLFVBQVUsd0JBQXdCO0lBQ3BDLE9BQU8sQ0FBQyxHQUFHLHdCQUF3QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ25GLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBRXJCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFlBQVksQ0FBdUM7SUFFMUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxXQUFXLENBQTBCO0lBRTVDOztPQUVHO0lBQ08sS0FBSyxDQUFVO0lBRXpCLFlBQVksR0FBRyxJQUFlO1FBQzFCLE1BQU0sZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUVqSSxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUUxQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkI7Ozs7Ozs7Ozs7OztlQVlHO1lBQ0gsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUM3Qyw4REFBOEQ7WUFDOUQseURBQXlEO1lBQ3pELHlDQUF5QztZQUN6QyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRXJELCtFQUErRTtZQUMvRSxzREFBc0Q7WUFDdEQsZ0RBQWdEO1lBQ2hELFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVwQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtnQkFDcEMsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsVUFBVSxFQUFFLEdBQUcsRUFBRTtvQkFDYixVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN0QixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxQyxDQUFDO2FBQ0osQ0FBQyxDQUFDO1lBQ0gsT0FBTyxHQUFHLENBQUM7UUFDZixDQUFDO2FBQ0ksQ0FBQztZQUNGOzs7Ozs7ZUFNRztZQUNILE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQVcsQ0FBQztZQUVoQywyREFBMkQ7WUFDM0QsdURBQXVEO1lBQ3ZELDBCQUEwQjtZQUMxQixNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDekQsSUFBSSxRQUFRO2dCQUNSLE9BQU8sUUFBUSxDQUFDO1lBRXBCLDJFQUEyRTtZQUMzRSxpRkFBaUY7WUFDakYsRUFBRTtZQUNGLDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNuQixtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFbEQsMkRBQTJEO1lBQzNELCtDQUErQztZQUMvQyw4REFBOEQ7WUFDOUQsd0NBQXdDO1lBQ3hDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7Z0JBQ2hDLEtBQUssRUFBRSxHQUFHO2dCQUNWLFVBQVUsRUFBRSxHQUFHLEVBQUU7b0JBQ2IsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNsQixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3RDLENBQUM7YUFDSixDQUFDLENBQUM7UUFFUCxDQUFDO0lBQ0wsQ0FBQztJQUVELENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUNaLGlHQUFpRztRQUNqRyxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVELElBQUksVUFBVSxFQUFFLENBQUM7WUFDYix3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQ3ZELHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDbkIsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQUVEOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUFJLE9BQWU7SUFDcEQsT0FBTyxJQUFJLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFNLENBQUM7QUFDM0QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZXNlIGFyZSBhbGwgdGhlIGNsYXNzZXMgdGhhdCBoYXZlIGJlZW4gcmVnaXN0ZXJlZCwgYWNjZXNzZWQgYnkgdGhlaXIgUlRUSSBUeXBlSWRcclxuLy8gSXQncyBvZmYgaW4gaXRzIG93biBmaWxlIHRvIGtlZXAgaXQgcHJpdmF0ZS5cclxuZXhwb3J0IGNvbnN0IEVtYm91bmRDbGFzc2VzOiBSZWNvcmQ8bnVtYmVyLCB0eXBlb2YgRW1ib3VuZENsYXNzPiA9IHt9O1xyXG5cclxuXHJcbi8vIFRoaXMgaXMgYSBydW5uaW5nIGxpc3Qgb2YgYWxsIHRoZSBpbnN0YW50aWF0ZWQgY2xhc3NlcywgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbmNvbnN0IEluc3RhbnRpYXRlZENsYXNzZXMgPSBuZXcgTWFwPG51bWJlciwgV2Vha1JlZjxFbWJvdW5kQ2xhc3M+PigpO1xyXG5cclxuLy8gVGhpcyBrZWVwcyB0cmFjayBvZiBhbGwgZGVzdHJ1Y3RvcnMgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbi8vIFVzZWQgZm9yIEZpbmFsaXphdGlvblJlZ2lzdHJ5IGFuZCB0aGUgZGVzdHJ1Y3RvciBpdHNlbGYuXHJcbmNvbnN0IERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZCA9IG5ldyBNYXA8bnVtYmVyLCB7IG93bmVyOiAnaicgfCAnYycsIGRlc3RydWN0b3I6ICgpID0+IHZvaWQgfT4oKTtcclxuXHJcbi8vIFVzZWQgdG8gZW5zdXJlIG5vIG9uZSBidXQgdGhlIHR5cGUgY29udmVydGVycyBjYW4gdXNlIHRoZSBzZWNyZXQgcG9pbnRlciBjb25zdHJ1Y3Rvci5cclxuZXhwb3J0IGNvbnN0IFNlY3JldDogc3ltYm9sID0gU3ltYm9sKCk7XHJcbmV4cG9ydCBjb25zdCBTZWNyZXROb0Rpc3Bvc2U6IHN5bWJvbCA9IFN5bWJvbCgpO1xyXG5cclxuLy8gVE9ETzogSSdtIG5vdCBjb252aW5jZWQgdGhpcyBpcyBhIGdvb2QgaWRlYSwgXHJcbi8vIHRob3VnaCBJIHN1cHBvc2UgdGhlIHdhcm5pbmcgaXMgdXNlZnVsIGluIGRldGVybWluaXN0aWMgZW52aXJvbm1lbnRzXHJcbi8vIHdoZXJlIHlvdSBjYW4gYnJlYWsgb24gYSBjbGFzcyBoYXZpbmcgYSBjZXJ0YWluIGB0aGlzYCBwb2ludGVyLlxyXG4vLyBUaGF0IHNhaWQgSSdtIHByZXR0eSBzdXJlIG9ubHkgSlMgaGVhcCBwcmVzc3VyZSB3aWxsIGludm9rZSBhIGNhbGxiYWNrLCBcclxuLy8gbWFraW5nIGl0IGtpbmQgb2YgcG9pbnRsZXNzIGZvciBDKysgY2xlYW51cCwgd2hpY2ggaGFzIG5vIGludGVyYWN0aW9uIHdpdGggdGhlIEpTIGhlYXAuXHJcbmNvbnN0IHJlZ2lzdHJ5ID0gbmV3IEZpbmFsaXphdGlvblJlZ2lzdHJ5KChfdGhpczogbnVtYmVyKSA9PiB7XHJcbiAgICBjb25zdCBkZXN0cnVjdG9yID0gRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldChfdGhpcyk7XHJcbiAgICBpZiAoZGVzdHJ1Y3Rvcikge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgV0FTTSBjbGFzcyBhdCBhZGRyZXNzICR7X3RoaXN9IHdhcyBub3QgcHJvcGVybHkgZGlzcG9zZWQuYCk7XHJcbiAgICAgICAgZGVzdHJ1Y3Rvci5kZXN0cnVjdG9yKCk7XHJcbiAgICAgICAgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmRlbGV0ZShfdGhpcyk7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuLy8gSW50ZXJuYWwgdXNlIG9ubHksIGZvciB0ZXN0aW5nXHJcbmV4cG9ydCBmdW5jdGlvbiBfcGVuZGluZ0Rlc3RydWN0b3JzQ291bnQoKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBbLi4uRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkXS5maWx0ZXIoKFt2LCBhXSkgPT4gYS5vd25lciA9PSAnaicpLmxlbmd0aDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIGFsbCBFbWJpbmQtZW5hYmxlZCBjbGFzc2VzLlxyXG4gKlxyXG4gKiBJbiBnZW5lcmFsLCBpZiB0d28gKHF1b3RlLXVucXVvdGUpIFwiaW5zdGFuY2VzXCIgb2YgdGhpcyBjbGFzcyBoYXZlIHRoZSBzYW1lIGBfdGhpc2AgcG9pbnRlcixcclxuICogdGhlbiB0aGV5IHdpbGwgY29tcGFyZSBlcXVhbGx5IHdpdGggYD09YCwgYXMgaWYgY29tcGFyaW5nIGFkZHJlc3NlcyBpbiBDKysuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRW1ib3VuZENsYXNzIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB0cmFuc2Zvcm1lZCBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0aGF0IHRha2VzIEpTIGFyZ3VtZW50cyBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfY29uc3RydWN0b3I6ICguLi5hcmdzOiB1bmtub3duW10pID0+IEVtYm91bmRDbGFzcztcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFzc2lnbmVkIGJ5IHRoZSBkZXJpdmVkIGNsYXNzIHdoZW4gdGhhdCBjbGFzcyBpcyByZWdpc3RlcmVkLlxyXG4gICAgICpcclxuICAgICAqIFRoaXMgb25lIGlzIG5vdCB0cmFuc2Zvcm1lZCBiZWNhdXNlIGl0IG9ubHkgdGFrZXMgYSBwb2ludGVyIGFuZCByZXR1cm5zIG5vdGhpbmcuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfZGVzdHJ1Y3RvcjogKF90aGlzOiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcG9pbnRlciB0byB0aGUgY2xhc3MgaW4gV0FTTSBtZW1vcnk7IHRoZSBzYW1lIGFzIHRoZSBDKysgYHRoaXNgIHBvaW50ZXIuXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBfdGhpcyE6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiB1bmtub3duW10pIHtcclxuICAgICAgICBjb25zdCBDcmVhdGVkRnJvbVdhc20gPSAoYXJncy5sZW5ndGggPT09IDIgJiYgKGFyZ3NbMF0gPT09IFNlY3JldCB8fCBhcmdzWzBdID09IFNlY3JldE5vRGlzcG9zZSkgJiYgdHlwZW9mIGFyZ3NbMV0gPT09ICdudW1iZXInKTtcclxuXHJcbiAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9IG5ldy50YXJnZXQuX2Rlc3RydWN0b3I7XHJcblxyXG4gICAgICAgIGlmICghQ3JlYXRlZEZyb21XYXNtKSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGEgY2FsbCB0byBjcmVhdGUgdGhpcyBjbGFzcyBmcm9tIEpTLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBVbmxpa2UgYSBub3JtYWwgY29uc3RydWN0b3IsIHdlIGRlbGVnYXRlIHRoZSBjbGFzcyBjcmVhdGlvbiB0b1xyXG4gICAgICAgICAgICAgKiBhIGNvbWJpbmF0aW9uIG9mIF9jb25zdHJ1Y3RvciBhbmQgYGZyb21XaXJlVHlwZWAuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIGBfY29uc3RydWN0b3JgIHdpbGwgY2FsbCB0aGUgQysrIGNvZGUgdGhhdCBhbGxvY2F0ZXMgbWVtb3J5LFxyXG4gICAgICAgICAgICAgKiBpbml0aWFsaXplcyB0aGUgY2xhc3MsIGFuZCByZXR1cm5zIGl0cyBgdGhpc2AgcG9pbnRlcixcclxuICAgICAgICAgICAgICogd2hpbGUgYGZyb21XaXJlVHlwZWAsIGNhbGxlZCBhcyBwYXJ0IG9mIHRoZSBnbHVlLWNvZGUgcHJvY2VzcyxcclxuICAgICAgICAgICAgICogd2lsbCBhY3R1YWxseSBpbnN0YW50aWF0ZSB0aGlzIGNsYXNzLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiAoSW4gb3RoZXIgd29yZHMsIHRoaXMgcGFydCBydW5zIGZpcnN0LCB0aGVuIHRoZSBgZWxzZWAgYmVsb3cgcnVucylcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IG5ldy50YXJnZXQuX2NvbnN0cnVjdG9yKC4uLmFyZ3MpO1xyXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhhdCB3ZSBkb24ndCByZWNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gdGhpcyBwb2ludGVyLlxyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbiBoYXBwZW4gaWYgd2UgcGFzcyBhIEpTLW93bmVkIHBvaW50ZXIgdG8gQysrLCBcclxuICAgICAgICAgICAgLy8gYW5kIHRoZW4gQysrIHJldHVybnMgdGhlIHNhbWUgcG9pbnRlci5cclxuICAgICAgICAgICAgSW5zdGFudGlhdGVkQ2xhc3Nlcy5zZXQocmV0Ll90aGlzLCBuZXcgV2Vha1JlZihyZXQpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFRoaXMgaW5zdGFuY2Ugd2FzIGNyZWF0ZWQgYnkgSlMsIHNvIGlmL3doZW4gd2UgZXZlciBsb3NlIHRoZSByZWZlcmVuY2UgdG8gaXRcclxuICAgICAgICAgICAgLy8gd2UnZCBsaWtlIHRvIG1ha2Ugc3VyZSBpdCB3YXMsIGluIGZhY3QsIGNsZWFuZWQgdXAuXHJcbiAgICAgICAgICAgIC8vICh0aGUgcmVnaXN0cnkgY2hlY2tzIHRvIHByZXZlbnQgZG91YmxlLWZyZWVzKVxyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCB0aGlzLl90aGlzKTtcclxuXHJcbiAgICAgICAgICAgIERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5zZXQocmV0Ll90aGlzLCB7XHJcbiAgICAgICAgICAgICAgICBvd25lcjogJ2onLFxyXG4gICAgICAgICAgICAgICAgZGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RydWN0b3IocmV0Ll90aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBJbnN0YW50aWF0ZWRDbGFzc2VzLmRlbGV0ZShyZXQuX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTsgICAgICAgXHJcbiAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBDKysuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFdlIGdldCBoZXJlIHZpYSBgZnJvbVdpcmVUeXBlYCwgbWVhbmluZyB0aGF0IHRoZVxyXG4gICAgICAgICAgICAgKiBjbGFzcyBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZCBpbiBDKyssIGFuZCB3ZVxyXG4gICAgICAgICAgICAgKiBqdXN0IG5lZWQgb3VyIFwiaGFuZGxlXCIgdG8gaXQgaW4gSlMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IGFyZ3NbMV0gYXMgbnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IEluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBJbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgLy8gQWRkIHRoZSBkZXN0cnVjdG9yIHRvIHRoZSBsaXN0IG9mIGF2YWlsYWJsZSBkZXN0cnVjdG9ycy5cclxuICAgICAgICAgICAgLy8gU2luY2UgaXMgYSBwb2ludGVyIHRvIGFuIG9iamVjdCBtYWRlIGJ5IEMrKyxcclxuICAgICAgICAgICAgLy8gd2UgYXNzdW1lIGJ5IGRlZmF1bHQgdGhhdCBDKysgd2lsbCBiZSB0aGUgb25lIHRvIGRlbGV0ZSBpdCxcclxuICAgICAgICAgICAgLy8gYnV0IHdlIG9wdCBpbnRvIGxldHRpbmcgSlMgZG8gc28gdG9vLlxyXG4gICAgICAgICAgICBEZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuc2V0KF90aGlzLCB7XHJcbiAgICAgICAgICAgICAgICBvd25lcjogJ2MnLFxyXG4gICAgICAgICAgICAgICAgZGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RydWN0b3IoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIEluc3RhbnRpYXRlZENsYXNzZXMuZGVsZXRlKF90aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBbU3ltYm9sLmRpc3Bvc2VdKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIE9ubHkgcnVuIHRoZSBkZXN0cnVjdG9yIGlmIHdlIG91cnNlbHZlcyBjb25zdHJ1Y3RlZCB0aGlzIGNsYXNzIChhcyBvcHBvc2VkIHRvIGBpbnNwZWN0YGluZyBpdClcclxuICAgICAgICBjb25zdCBkZXN0cnVjdG9yID0gRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKTtcclxuICAgICAgICBpZiAoZGVzdHJ1Y3Rvcikge1xyXG4gICAgICAgICAgICBEZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpPy5kZXN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgIERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5kZWxldGUodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIFxyXG4gKiBJbnN0ZWFkIG9mIGluc3RhbnRpYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgXHJcbiAqIHlvdSBjYW4gaW5zcGVjdCBhbiBleGlzdGluZyBwb2ludGVyIGluc3RlYWQuXHJcbiAqXHJcbiAqIFRoaXMgaXMgbWFpbmx5IGludGVuZGVkIGZvciBzaXR1YXRpb25zIHRoYXQgRW1iaW5kIGRvZXNuJ3Qgc3VwcG9ydCxcclxuICogbGlrZSBhcnJheS1vZi1zdHJ1Y3RzLWFzLWEtcG9pbnRlci5cclxuICogXHJcbiAqIEJlIGF3YXJlIHRoYXQgdGhlcmUncyBubyBsaWZldGltZSB0cmFja2luZyBpbnZvbHZlZCwgc29cclxuICogbWFrZSBzdXJlIHlvdSBkb24ndCBrZWVwIHRoaXMgdmFsdWUgYXJvdW5kIGFmdGVyIHRoZVxyXG4gKiBwb2ludGVyJ3MgYmVlbiBpbnZhbGlkYXRlZC4gXHJcbiAqIFxyXG4gKiAqKkRvIG5vdCBjYWxsIFtTeW1ib2wuZGlzcG9zZV0qKiBvbiBhbiBpbnNwZWN0ZWQgY2xhc3MsXHJcbiAqIHNpbmNlIHRoZSBhc3N1bXB0aW9uIGlzIHRoYXQgdGhlIEMrKyBjb2RlIG93bnMgdGhhdCBwb2ludGVyXHJcbiAqIGFuZCB3ZSdyZSBqdXN0IGxvb2tpbmcgYXQgaXQsIHNvIGRlc3Ryb3lpbmcgaXQgd291bGQgYmUgcnVkZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNwZWN0Q2xhc3NCeVBvaW50ZXI8VD4ocG9pbnRlcjogbnVtYmVyKTogVCB7XHJcbiAgICByZXR1cm4gbmV3IEVtYm91bmRDbGFzcyhTZWNyZXROb0Rpc3Bvc2UsIHBvaW50ZXIpIGFzIFQ7XHJcbn1cclxuIl19