// These are all the classes that have been registered, accessed by their RTTI TypeId
// It's off in its own file to keep it private.
export const EmboundClasses = {};
// This is a running list of all the instantiated classes, by their `this` pointer.
const instantiatedClasses = new Map();
// This keeps track of all destructors by their `this` pointer.
// Used for FinalizationRegistry and the destructor itself.
const destructorsYetToBeCalled = new Map();
// Used to ensure no one but the type converters can use the secret pointer constructor.
export const Secret = Symbol();
export const SecretNoDispose = Symbol();
// TODO: This needs proper testing, or possibly even justification for its existence.
// I'm pretty sure only JS heap pressure will invoke a callback, making it kind of 
// pointless for C++ cleanup, which has no interaction with the JS heap.
const registry = new FinalizationRegistry((_this) => {
    console.warn(`WASM class at address ${_this} was not properly disposed.`);
    destructorsYetToBeCalled.get(_this)?.();
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
            return this.constructor._constructor(...args);
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
            const existing = instantiatedClasses.get(_this)?.deref();
            if (existing)
                return existing;
            // If we got here, then congratulations, this-instantiation-of-this-class, 
            // you're actually the one to be instantiated. No more hacky constructor returns.
            //
            // Consider this the "actual" constructor code, I suppose.
            this._this = _this;
            instantiatedClasses.set(_this, new WeakRef(this));
            registry.register(this, _this);
            if (args[0] != SecretNoDispose) {
                const destructor = this.constructor._destructor;
                destructorsYetToBeCalled.set(_this, () => {
                    destructor(_this);
                    instantiatedClasses.delete(_this);
                });
            }
        }
    }
    [Symbol.dispose]() {
        // Only run the destructor if we ourselves constructed this class (as opposed to `inspect`ing it)
        const destructor = destructorsYetToBeCalled.get(this._this);
        if (destructor) {
            destructorsYetToBeCalled.get(this._this)?.();
            destructorsYetToBeCalled.delete(this._this);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1ib3VuZC1jbGFzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxRkFBcUY7QUFDckYsK0NBQStDO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBd0MsRUFBRSxDQUFDO0FBR3RFLG1GQUFtRjtBQUNuRixNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO0FBRXJFLCtEQUErRDtBQUMvRCwyREFBMkQ7QUFDM0QsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztBQUUvRCx3RkFBd0Y7QUFDeEYsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFXLE1BQU0sRUFBRSxDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBVyxNQUFNLEVBQUUsQ0FBQztBQUVoRCxxRkFBcUY7QUFDckYsbUZBQW1GO0FBQ25GLHdFQUF3RTtBQUN4RSxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFvQixDQUFDLENBQUMsS0FBYSxFQUFFLEVBQUU7SUFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsS0FBSyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzFFLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUM7QUFFSDs7Ozs7R0FLRztBQUVILE1BQU0sT0FBTyxZQUFZO0lBRXJCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFlBQVksQ0FBbUM7SUFFdEQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxXQUFXLENBQTBCO0lBRTVDOztPQUVHO0lBQ08sS0FBSyxDQUFVO0lBRXpCLFlBQVksR0FBRyxJQUFXO1FBQ3RCLE1BQU0sZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUVqSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkI7Ozs7Ozs7Ozs7OztlQVlHO1lBQ0gsT0FBUSxJQUFJLENBQUMsV0FBbUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMzRSxDQUFDO2FBQ0ksQ0FBQztZQUNGOzs7Ozs7ZUFNRztZQUNILE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV0QiwyREFBMkQ7WUFDM0QsdURBQXVEO1lBQ3ZELDBCQUEwQjtZQUMxQixNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDekQsSUFBSSxRQUFRO2dCQUNSLE9BQU8sUUFBUSxDQUFDO1lBRXBCLDJFQUEyRTtZQUMzRSxpRkFBaUY7WUFDakYsRUFBRTtZQUNGLDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNuQixtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFL0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sVUFBVSxHQUFJLElBQUksQ0FBQyxXQUFtQyxDQUFDLFdBQVcsQ0FBQztnQkFFekUsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7b0JBQ3JDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDbEIsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN0QyxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7UUFFTCxDQUFDO0lBQ0wsQ0FBQztJQUVELENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUNaLGlHQUFpRztRQUNqRyxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVELElBQUksVUFBVSxFQUFFLENBQUM7WUFDYix3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3Qyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFFRDs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILE1BQU0sVUFBVSxxQkFBcUIsQ0FBSSxPQUFlO0lBQ3BELE9BQU8sSUFBSSxZQUFZLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBTSxDQUFDO0FBQzNELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUaGVzZSBhcmUgYWxsIHRoZSBjbGFzc2VzIHRoYXQgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQsIGFjY2Vzc2VkIGJ5IHRoZWlyIFJUVEkgVHlwZUlkXHJcbi8vIEl0J3Mgb2ZmIGluIGl0cyBvd24gZmlsZSB0byBrZWVwIGl0IHByaXZhdGUuXHJcbmV4cG9ydCBjb25zdCBFbWJvdW5kQ2xhc3NlczogUmVjb3JkPG51bWJlciwgdHlwZW9mIEVtYm91bmRDbGFzcz4gPSB7fTtcclxuXHJcblxyXG4vLyBUaGlzIGlzIGEgcnVubmluZyBsaXN0IG9mIGFsbCB0aGUgaW5zdGFudGlhdGVkIGNsYXNzZXMsIGJ5IHRoZWlyIGB0aGlzYCBwb2ludGVyLlxyXG5jb25zdCBpbnN0YW50aWF0ZWRDbGFzc2VzID0gbmV3IE1hcDxudW1iZXIsIFdlYWtSZWY8RW1ib3VuZENsYXNzPj4oKTtcclxuXHJcbi8vIFRoaXMga2VlcHMgdHJhY2sgb2YgYWxsIGRlc3RydWN0b3JzIGJ5IHRoZWlyIGB0aGlzYCBwb2ludGVyLlxyXG4vLyBVc2VkIGZvciBGaW5hbGl6YXRpb25SZWdpc3RyeSBhbmQgdGhlIGRlc3RydWN0b3IgaXRzZWxmLlxyXG5jb25zdCBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQgPSBuZXcgTWFwPG51bWJlciwgKCkgPT4gdm9pZD4oKTtcclxuXHJcbi8vIFVzZWQgdG8gZW5zdXJlIG5vIG9uZSBidXQgdGhlIHR5cGUgY29udmVydGVycyBjYW4gdXNlIHRoZSBzZWNyZXQgcG9pbnRlciBjb25zdHJ1Y3Rvci5cclxuZXhwb3J0IGNvbnN0IFNlY3JldDogU3ltYm9sID0gU3ltYm9sKCk7XHJcbmV4cG9ydCBjb25zdCBTZWNyZXROb0Rpc3Bvc2U6IFN5bWJvbCA9IFN5bWJvbCgpO1xyXG5cclxuLy8gVE9ETzogVGhpcyBuZWVkcyBwcm9wZXIgdGVzdGluZywgb3IgcG9zc2libHkgZXZlbiBqdXN0aWZpY2F0aW9uIGZvciBpdHMgZXhpc3RlbmNlLlxyXG4vLyBJJ20gcHJldHR5IHN1cmUgb25seSBKUyBoZWFwIHByZXNzdXJlIHdpbGwgaW52b2tlIGEgY2FsbGJhY2ssIG1ha2luZyBpdCBraW5kIG9mIFxyXG4vLyBwb2ludGxlc3MgZm9yIEMrKyBjbGVhbnVwLCB3aGljaCBoYXMgbm8gaW50ZXJhY3Rpb24gd2l0aCB0aGUgSlMgaGVhcC5cclxuY29uc3QgcmVnaXN0cnkgPSBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKF90aGlzOiBudW1iZXIpID0+IHtcclxuICAgIGNvbnNvbGUud2FybihgV0FTTSBjbGFzcyBhdCBhZGRyZXNzICR7X3RoaXN9IHdhcyBub3QgcHJvcGVybHkgZGlzcG9zZWQuYCk7XHJcbiAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KF90aGlzKT8uKCk7XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIGFsbCBFbWJpbmQtZW5hYmxlZCBjbGFzc2VzLlxyXG4gKlxyXG4gKiBJbiBnZW5lcmFsLCBpZiB0d28gKHF1b3RlLXVucXVvdGUpIFwiaW5zdGFuY2VzXCIgb2YgdGhpcyBjbGFzcyBoYXZlIHRoZSBzYW1lIGBfdGhpc2AgcG9pbnRlcixcclxuICogdGhlbiB0aGV5IHdpbGwgY29tcGFyZSBlcXVhbGx5IHdpdGggYD09YCwgYXMgaWYgY29tcGFyaW5nIGFkZHJlc3NlcyBpbiBDKysuXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNsYXNzIEVtYm91bmRDbGFzcyB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgdHJhbnNmb3JtZWQgY29uc3RydWN0b3IgZnVuY3Rpb24gdGhhdCB0YWtlcyBKUyBhcmd1bWVudHMgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzc1xyXG4gICAgICovXHJcbiAgICBzdGF0aWMgX2NvbnN0cnVjdG9yOiAoLi4uYXJnczogYW55W10pID0+IEVtYm91bmRDbGFzcztcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFzc2lnbmVkIGJ5IHRoZSBkZXJpdmVkIGNsYXNzIHdoZW4gdGhhdCBjbGFzcyBpcyByZWdpc3RlcmVkLlxyXG4gICAgICpcclxuICAgICAqIFRoaXMgb25lIGlzIG5vdCB0cmFuc2Zvcm1lZCBiZWNhdXNlIGl0IG9ubHkgdGFrZXMgYSBwb2ludGVyIGFuZCByZXR1cm5zIG5vdGhpbmcuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfZGVzdHJ1Y3RvcjogKF90aGlzOiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcG9pbnRlciB0byB0aGUgY2xhc3MgaW4gV0FTTSBtZW1vcnk7IHRoZSBzYW1lIGFzIHRoZSBDKysgYHRoaXNgIHBvaW50ZXIuXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBfdGhpcyE6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiBhbnlbXSkge1xyXG4gICAgICAgIGNvbnN0IENyZWF0ZWRGcm9tV2FzbSA9IChhcmdzLmxlbmd0aCA9PT0gMiAmJiAoYXJnc1swXSA9PT0gU2VjcmV0IHx8IGFyZ3NbMF0gPT0gU2VjcmV0Tm9EaXNwb3NlKSAmJiB0eXBlb2YgYXJnc1sxXSA9PT0gJ251bWJlcicpO1xyXG5cclxuICAgICAgICBpZiAoIUNyZWF0ZWRGcm9tV2FzbSkge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBKUy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogVW5saWtlIGEgbm9ybWFsIGNvbnN0cnVjdG9yLCB3ZSBkZWxlZ2F0ZSB0aGUgY2xhc3MgY3JlYXRpb24gdG9cclxuICAgICAgICAgICAgICogYSBjb21iaW5hdGlvbiBvZiBfY29uc3RydWN0b3IgYW5kIGBmcm9tV2lyZVR5cGVgLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBgX2NvbnN0cnVjdG9yYCB3aWxsIGNhbGwgdGhlIEMrKyBjb2RlIHRoYXQgYWxsb2NhdGVzIG1lbW9yeSxcclxuICAgICAgICAgICAgICogaW5pdGlhbGl6ZXMgdGhlIGNsYXNzLCBhbmQgcmV0dXJucyBpdHMgYHRoaXNgIHBvaW50ZXIsXHJcbiAgICAgICAgICAgICAqIHdoaWxlIGBmcm9tV2lyZVR5cGVgLCBjYWxsZWQgYXMgcGFydCBvZiB0aGUgZ2x1ZS1jb2RlIHByb2Nlc3MsXHJcbiAgICAgICAgICAgICAqIHdpbGwgYWN0dWFsbHkgaW5zdGFudGlhdGUgdGhpcyBjbGFzcy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogKEluIG90aGVyIHdvcmRzLCB0aGlzIHBhcnQgcnVucyBmaXJzdCwgdGhlbiB0aGUgYGVsc2VgIGJlbG93IHJ1bnMpXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIEVtYm91bmRDbGFzcykuX2NvbnN0cnVjdG9yKC4uLmFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gQysrLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBXZSBnZXQgaGVyZSB2aWEgYGZyb21XaXJlVHlwZWAsIG1lYW5pbmcgdGhhdCB0aGVcclxuICAgICAgICAgICAgICogY2xhc3MgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWQgaW4gQysrLCBhbmQgd2VcclxuICAgICAgICAgICAgICoganVzdCBuZWVkIG91ciBcImhhbmRsZVwiIHRvIGl0IGluIEpTLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgY29uc3QgX3RoaXMgPSBhcmdzWzFdO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCBfdGhpcyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBTZWNyZXROb0Rpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgRW1ib3VuZENsYXNzKS5fZGVzdHJ1Y3RvcjtcclxuXHJcbiAgICAgICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuc2V0KF90aGlzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzdHJ1Y3RvcihfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFudGlhdGVkQ2xhc3Nlcy5kZWxldGUoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFtTeW1ib2wuZGlzcG9zZV0oKTogdm9pZCB7XHJcbiAgICAgICAgLy8gT25seSBydW4gdGhlIGRlc3RydWN0b3IgaWYgd2Ugb3Vyc2VsdmVzIGNvbnN0cnVjdGVkIHRoaXMgY2xhc3MgKGFzIG9wcG9zZWQgdG8gYGluc3BlY3RgaW5nIGl0KVxyXG4gICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpO1xyXG4gICAgICAgIGlmIChkZXN0cnVjdG9yKSB7XHJcbiAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk/LigpO1xyXG4gICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZGVsZXRlKHRoaXMuX3RoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLl90aGlzID0gMDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBcclxuICogSW5zdGVhZCBvZiBpbnN0YW50aWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3MsIFxyXG4gKiB5b3UgY2FuIGluc3BlY3QgYW4gZXhpc3RpbmcgcG9pbnRlciBpbnN0ZWFkLlxyXG4gKlxyXG4gKiBUaGlzIGlzIG1haW5seSBpbnRlbmRlZCBmb3Igc2l0dWF0aW9ucyB0aGF0IEVtYmluZCBkb2Vzbid0IHN1cHBvcnQsXHJcbiAqIGxpa2UgYXJyYXktb2Ytc3RydWN0cy1hcy1hLXBvaW50ZXIuXHJcbiAqIFxyXG4gKiBCZSBhd2FyZSB0aGF0IHRoZXJlJ3Mgbm8gbGlmZXRpbWUgdHJhY2tpbmcgaW52b2x2ZWQsIHNvXHJcbiAqIG1ha2Ugc3VyZSB5b3UgZG9uJ3Qga2VlcCB0aGlzIHZhbHVlIGFyb3VuZCBhZnRlciB0aGVcclxuICogcG9pbnRlcidzIGJlZW4gaW52YWxpZGF0ZWQuIFxyXG4gKiBcclxuICogKipEbyBub3QgY2FsbCBbU3ltYm9sLmRpc3Bvc2VdKiogb24gYW4gaW5zcGVjdGVkIGNsYXNzLFxyXG4gKiBzaW5jZSB0aGUgYXNzdW1wdGlvbiBpcyB0aGF0IHRoZSBDKysgY29kZSBvd25zIHRoYXQgcG9pbnRlclxyXG4gKiBhbmQgd2UncmUganVzdCBsb29raW5nIGF0IGl0LCBzbyBkZXN0cm95aW5nIGl0IHdvdWxkIGJlIHJ1ZGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5zcGVjdENsYXNzQnlQb2ludGVyPFQ+KHBvaW50ZXI6IG51bWJlcik6IFQge1xyXG4gICAgcmV0dXJuIG5ldyBFbWJvdW5kQ2xhc3MoU2VjcmV0Tm9EaXNwb3NlLCBwb2ludGVyKSBhcyBUO1xyXG59XHJcbiJdfQ==