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
    [Symbol.dispose]() {
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
export function inspectClassByPointer(pointer) {
    return new EmboundClass(SecretNoDispose, pointer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1ib3VuZC1jbGFzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxRkFBcUY7QUFDckYsK0NBQStDO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBd0MsRUFBRSxDQUFDO0FBR3RFLG1GQUFtRjtBQUNuRixNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO0FBRXJFLCtEQUErRDtBQUMvRCwyREFBMkQ7QUFDM0QsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztBQUUvRCx3RkFBd0Y7QUFDeEYsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFXLE1BQU0sRUFBRSxDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBVyxNQUFNLEVBQUUsQ0FBQztBQUVoRCxnREFBZ0Q7QUFDaEQsdUVBQXVFO0FBQ3ZFLGtFQUFrRTtBQUNsRSwyRUFBMkU7QUFDM0UsMEZBQTBGO0FBQzFGLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQW9CLENBQUMsQ0FBQyxLQUFhLEVBQUUsRUFBRTtJQUN4RCxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkQsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEtBQUssNkJBQTZCLENBQUMsQ0FBQztRQUMxRSxVQUFVLEVBQUUsQ0FBQztRQUNiLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSDs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBRXJCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFlBQVksQ0FBdUM7SUFFMUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxXQUFXLENBQTBCO0lBRTVDOztPQUVHO0lBQ08sS0FBSyxDQUFVO0lBRXpCLFlBQVksR0FBRyxJQUFlO1FBQzFCLE1BQU0sZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUVqSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkI7Ozs7Ozs7Ozs7OztlQVlHO1lBQ0gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUM7YUFDSSxDQUFDO1lBQ0Y7Ozs7OztlQU1HO1lBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBVyxDQUFDO1lBRWhDLDJEQUEyRDtZQUMzRCx1REFBdUQ7WUFDdkQsMEJBQTBCO1lBQzFCLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN6RCxJQUFJLFFBQVE7Z0JBQ1IsT0FBTyxRQUFRLENBQUM7WUFFcEIsMkVBQTJFO1lBQzNFLGlGQUFpRjtZQUNqRixFQUFFO1lBQ0YsMERBQTBEO1lBQzFELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ25CLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUUvQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQzFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO29CQUNyQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2xCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1FBRUwsQ0FBQztJQUNMLENBQUM7SUFFRCxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDWixpR0FBaUc7UUFDakcsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2Isd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0Msd0JBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNuQixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUksT0FBZTtJQUNwRCxPQUFPLElBQUksWUFBWSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQU0sQ0FBQztBQUMzRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhlc2UgYXJlIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGhhdmUgYmVlbiByZWdpc3RlcmVkLCBhY2Nlc3NlZCBieSB0aGVpciBSVFRJIFR5cGVJZFxyXG4vLyBJdCdzIG9mZiBpbiBpdHMgb3duIGZpbGUgdG8ga2VlcCBpdCBwcml2YXRlLlxyXG5leHBvcnQgY29uc3QgRW1ib3VuZENsYXNzZXM6IFJlY29yZDxudW1iZXIsIHR5cGVvZiBFbWJvdW5kQ2xhc3M+ID0ge307XHJcblxyXG5cclxuLy8gVGhpcyBpcyBhIHJ1bm5pbmcgbGlzdCBvZiBhbGwgdGhlIGluc3RhbnRpYXRlZCBjbGFzc2VzLCBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuY29uc3QgSW5zdGFudGlhdGVkQ2xhc3NlcyA9IG5ldyBNYXA8bnVtYmVyLCBXZWFrUmVmPEVtYm91bmRDbGFzcz4+KCk7XHJcblxyXG4vLyBUaGlzIGtlZXBzIHRyYWNrIG9mIGFsbCBkZXN0cnVjdG9ycyBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuLy8gVXNlZCBmb3IgRmluYWxpemF0aW9uUmVnaXN0cnkgYW5kIHRoZSBkZXN0cnVjdG9yIGl0c2VsZi5cclxuY29uc3QgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkID0gbmV3IE1hcDxudW1iZXIsICgpID0+IHZvaWQ+KCk7XHJcblxyXG4vLyBVc2VkIHRvIGVuc3VyZSBubyBvbmUgYnV0IHRoZSB0eXBlIGNvbnZlcnRlcnMgY2FuIHVzZSB0aGUgc2VjcmV0IHBvaW50ZXIgY29uc3RydWN0b3IuXHJcbmV4cG9ydCBjb25zdCBTZWNyZXQ6IHN5bWJvbCA9IFN5bWJvbCgpO1xyXG5leHBvcnQgY29uc3QgU2VjcmV0Tm9EaXNwb3NlOiBzeW1ib2wgPSBTeW1ib2woKTtcclxuXHJcbi8vIFRPRE86IEknbSBub3QgY29udmluY2VkIHRoaXMgaXMgYSBnb29kIGlkZWEsIFxyXG4vLyB0aG91Z2ggSSBzdXBwb3NlIHRoZSB3YXJuaW5nIGlzIHVzZWZ1bCBpbiBkZXRlcm1pbmlzdGljIGVudmlyb25tZW50c1xyXG4vLyB3aGVyZSB5b3UgY2FuIGJyZWFrIG9uIGEgY2xhc3MgaGF2aW5nIGEgY2VydGFpbiBgdGhpc2AgcG9pbnRlci5cclxuLy8gVGhhdCBzYWlkIEknbSBwcmV0dHkgc3VyZSBvbmx5IEpTIGhlYXAgcHJlc3N1cmUgd2lsbCBpbnZva2UgYSBjYWxsYmFjaywgXHJcbi8vIG1ha2luZyBpdCBraW5kIG9mIHBvaW50bGVzcyBmb3IgQysrIGNsZWFudXAsIHdoaWNoIGhhcyBubyBpbnRlcmFjdGlvbiB3aXRoIHRoZSBKUyBoZWFwLlxyXG5jb25zdCByZWdpc3RyeSA9IG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoX3RoaXM6IG51bWJlcikgPT4ge1xyXG4gICAgY29uc3QgZGVzdHJ1Y3RvciA9IERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQoX3RoaXMpO1xyXG4gICAgaWYgKGRlc3RydWN0b3IpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oYFdBU00gY2xhc3MgYXQgYWRkcmVzcyAke190aGlzfSB3YXMgbm90IHByb3Blcmx5IGRpc3Bvc2VkLmApO1xyXG4gICAgICAgIGRlc3RydWN0b3IoKTtcclxuICAgICAgICBEZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZGVsZXRlKF90aGlzKTtcclxuICAgIH1cclxufSk7XHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgYWxsIEVtYmluZC1lbmFibGVkIGNsYXNzZXMuXHJcbiAqXHJcbiAqIEluIGdlbmVyYWwsIGlmIHR3byAocXVvdGUtdW5xdW90ZSkgXCJpbnN0YW5jZXNcIiBvZiB0aGlzIGNsYXNzIGhhdmUgdGhlIHNhbWUgYF90aGlzYCBwb2ludGVyLFxyXG4gKiB0aGVuIHRoZXkgd2lsbCBjb21wYXJlIGVxdWFsbHkgd2l0aCBgPT1gLCBhcyBpZiBjb21wYXJpbmcgYWRkcmVzc2VzIGluIEMrKy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBFbWJvdW5kQ2xhc3Mge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHRyYW5zZm9ybWVkIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgdGFrZXMgSlMgYXJndW1lbnRzIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3NcclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9jb25zdHJ1Y3RvcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gRW1ib3VuZENsYXNzO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXNzaWduZWQgYnkgdGhlIGRlcml2ZWQgY2xhc3Mgd2hlbiB0aGF0IGNsYXNzIGlzIHJlZ2lzdGVyZWQuXHJcbiAgICAgKlxyXG4gICAgICogVGhpcyBvbmUgaXMgbm90IHRyYW5zZm9ybWVkIGJlY2F1c2UgaXQgb25seSB0YWtlcyBhIHBvaW50ZXIgYW5kIHJldHVybnMgbm90aGluZy5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9kZXN0cnVjdG9yOiAoX3RoaXM6IG51bWJlcikgPT4gdm9pZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwb2ludGVyIHRvIHRoZSBjbGFzcyBpbiBXQVNNIG1lbW9yeTsgdGhlIHNhbWUgYXMgdGhlIEMrKyBgdGhpc2AgcG9pbnRlci5cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIF90aGlzITogbnVtYmVyO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IHVua25vd25bXSkge1xyXG4gICAgICAgIGNvbnN0IENyZWF0ZWRGcm9tV2FzbSA9IChhcmdzLmxlbmd0aCA9PT0gMiAmJiAoYXJnc1swXSA9PT0gU2VjcmV0IHx8IGFyZ3NbMF0gPT0gU2VjcmV0Tm9EaXNwb3NlKSAmJiB0eXBlb2YgYXJnc1sxXSA9PT0gJ251bWJlcicpO1xyXG5cclxuICAgICAgICBpZiAoIUNyZWF0ZWRGcm9tV2FzbSkge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBKUy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogVW5saWtlIGEgbm9ybWFsIGNvbnN0cnVjdG9yLCB3ZSBkZWxlZ2F0ZSB0aGUgY2xhc3MgY3JlYXRpb24gdG9cclxuICAgICAgICAgICAgICogYSBjb21iaW5hdGlvbiBvZiBfY29uc3RydWN0b3IgYW5kIGBmcm9tV2lyZVR5cGVgLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBgX2NvbnN0cnVjdG9yYCB3aWxsIGNhbGwgdGhlIEMrKyBjb2RlIHRoYXQgYWxsb2NhdGVzIG1lbW9yeSxcclxuICAgICAgICAgICAgICogaW5pdGlhbGl6ZXMgdGhlIGNsYXNzLCBhbmQgcmV0dXJucyBpdHMgYHRoaXNgIHBvaW50ZXIsXHJcbiAgICAgICAgICAgICAqIHdoaWxlIGBmcm9tV2lyZVR5cGVgLCBjYWxsZWQgYXMgcGFydCBvZiB0aGUgZ2x1ZS1jb2RlIHByb2Nlc3MsXHJcbiAgICAgICAgICAgICAqIHdpbGwgYWN0dWFsbHkgaW5zdGFudGlhdGUgdGhpcyBjbGFzcy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogKEluIG90aGVyIHdvcmRzLCB0aGlzIHBhcnQgcnVucyBmaXJzdCwgdGhlbiB0aGUgYGVsc2VgIGJlbG93IHJ1bnMpXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3LnRhcmdldC5fY29uc3RydWN0b3IoLi4uYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBDKysuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFdlIGdldCBoZXJlIHZpYSBgZnJvbVdpcmVUeXBlYCwgbWVhbmluZyB0aGF0IHRoZVxyXG4gICAgICAgICAgICAgKiBjbGFzcyBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZCBpbiBDKyssIGFuZCB3ZVxyXG4gICAgICAgICAgICAgKiBqdXN0IG5lZWQgb3VyIFwiaGFuZGxlXCIgdG8gaXQgaW4gSlMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IGFyZ3NbMV0gYXMgbnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IEluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBJbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCBfdGhpcyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBTZWNyZXROb0Rpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSBuZXcudGFyZ2V0Ll9kZXN0cnVjdG9yO1xyXG4gICAgICAgICAgICAgICAgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLnNldChfdGhpcywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RydWN0b3IoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIEluc3RhbnRpYXRlZENsYXNzZXMuZGVsZXRlKF90aGlzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBbU3ltYm9sLmRpc3Bvc2VdKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIE9ubHkgcnVuIHRoZSBkZXN0cnVjdG9yIGlmIHdlIG91cnNlbHZlcyBjb25zdHJ1Y3RlZCB0aGlzIGNsYXNzIChhcyBvcHBvc2VkIHRvIGBpbnNwZWN0YGluZyBpdClcclxuICAgICAgICBjb25zdCBkZXN0cnVjdG9yID0gRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKTtcclxuICAgICAgICBpZiAoZGVzdHJ1Y3Rvcikge1xyXG4gICAgICAgICAgICBEZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpPy4oKTtcclxuICAgICAgICAgICAgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmRlbGV0ZSh0aGlzLl90aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKiogXHJcbiAqIEluc3RlYWQgb2YgaW5zdGFudGlhdGluZyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzLCBcclxuICogeW91IGNhbiBpbnNwZWN0IGFuIGV4aXN0aW5nIHBvaW50ZXIgaW5zdGVhZC5cclxuICpcclxuICogVGhpcyBpcyBtYWlubHkgaW50ZW5kZWQgZm9yIHNpdHVhdGlvbnMgdGhhdCBFbWJpbmQgZG9lc24ndCBzdXBwb3J0LFxyXG4gKiBsaWtlIGFycmF5LW9mLXN0cnVjdHMtYXMtYS1wb2ludGVyLlxyXG4gKiBcclxuICogQmUgYXdhcmUgdGhhdCB0aGVyZSdzIG5vIGxpZmV0aW1lIHRyYWNraW5nIGludm9sdmVkLCBzb1xyXG4gKiBtYWtlIHN1cmUgeW91IGRvbid0IGtlZXAgdGhpcyB2YWx1ZSBhcm91bmQgYWZ0ZXIgdGhlXHJcbiAqIHBvaW50ZXIncyBiZWVuIGludmFsaWRhdGVkLiBcclxuICogXHJcbiAqICoqRG8gbm90IGNhbGwgW1N5bWJvbC5kaXNwb3NlXSoqIG9uIGFuIGluc3BlY3RlZCBjbGFzcyxcclxuICogc2luY2UgdGhlIGFzc3VtcHRpb24gaXMgdGhhdCB0aGUgQysrIGNvZGUgb3ducyB0aGF0IHBvaW50ZXJcclxuICogYW5kIHdlJ3JlIGp1c3QgbG9va2luZyBhdCBpdCwgc28gZGVzdHJveWluZyBpdCB3b3VsZCBiZSBydWRlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluc3BlY3RDbGFzc0J5UG9pbnRlcjxUPihwb2ludGVyOiBudW1iZXIpOiBUIHtcclxuICAgIHJldHVybiBuZXcgRW1ib3VuZENsYXNzKFNlY3JldE5vRGlzcG9zZSwgcG9pbnRlcikgYXMgVDtcclxufVxyXG4iXX0=