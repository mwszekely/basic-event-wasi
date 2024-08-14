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
                const destructor = new.target._destructor;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1ib3VuZC1jbGFzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxRkFBcUY7QUFDckYsK0NBQStDO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBd0MsRUFBRSxDQUFDO0FBR3RFLG1GQUFtRjtBQUNuRixNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO0FBRXJFLCtEQUErRDtBQUMvRCwyREFBMkQ7QUFDM0QsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztBQUUvRCx3RkFBd0Y7QUFDeEYsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFXLE1BQU0sRUFBRSxDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBVyxNQUFNLEVBQUUsQ0FBQztBQUVoRCxxRkFBcUY7QUFDckYsbUZBQW1GO0FBQ25GLHdFQUF3RTtBQUN4RSxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFvQixDQUFDLENBQUMsS0FBYSxFQUFFLEVBQUU7SUFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsS0FBSyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzFFLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUM7QUFFSDs7Ozs7R0FLRztBQUVILE1BQU0sT0FBTyxZQUFZO0lBRXJCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFlBQVksQ0FBbUM7SUFFdEQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxXQUFXLENBQTBCO0lBRTVDOztPQUVHO0lBQ08sS0FBSyxDQUFVO0lBRXpCLFlBQVksR0FBRyxJQUFXO1FBQ3RCLE1BQU0sZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUVqSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkI7Ozs7Ozs7Ozs7OztlQVlHO1lBQ0gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUM7YUFDSSxDQUFDO1lBQ0Y7Ozs7OztlQU1HO1lBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRCLDJEQUEyRDtZQUMzRCx1REFBdUQ7WUFDdkQsMEJBQTBCO1lBQzFCLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN6RCxJQUFJLFFBQVE7Z0JBQ1IsT0FBTyxRQUFRLENBQUM7WUFFcEIsMkVBQTJFO1lBQzNFLGlGQUFpRjtZQUNqRixFQUFFO1lBQ0YsMERBQTBEO1lBQzFELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ25CLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUUvQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBRTFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO29CQUNyQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2xCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1FBRUwsQ0FBQztJQUNMLENBQUM7SUFFRCxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDWixpR0FBaUc7UUFDakcsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2Isd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0Msd0JBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNuQixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUksT0FBZTtJQUNwRCxPQUFPLElBQUksWUFBWSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQU0sQ0FBQztBQUMzRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhlc2UgYXJlIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGhhdmUgYmVlbiByZWdpc3RlcmVkLCBhY2Nlc3NlZCBieSB0aGVpciBSVFRJIFR5cGVJZFxyXG4vLyBJdCdzIG9mZiBpbiBpdHMgb3duIGZpbGUgdG8ga2VlcCBpdCBwcml2YXRlLlxyXG5leHBvcnQgY29uc3QgRW1ib3VuZENsYXNzZXM6IFJlY29yZDxudW1iZXIsIHR5cGVvZiBFbWJvdW5kQ2xhc3M+ID0ge307XHJcblxyXG5cclxuLy8gVGhpcyBpcyBhIHJ1bm5pbmcgbGlzdCBvZiBhbGwgdGhlIGluc3RhbnRpYXRlZCBjbGFzc2VzLCBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuY29uc3QgaW5zdGFudGlhdGVkQ2xhc3NlcyA9IG5ldyBNYXA8bnVtYmVyLCBXZWFrUmVmPEVtYm91bmRDbGFzcz4+KCk7XHJcblxyXG4vLyBUaGlzIGtlZXBzIHRyYWNrIG9mIGFsbCBkZXN0cnVjdG9ycyBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuLy8gVXNlZCBmb3IgRmluYWxpemF0aW9uUmVnaXN0cnkgYW5kIHRoZSBkZXN0cnVjdG9yIGl0c2VsZi5cclxuY29uc3QgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkID0gbmV3IE1hcDxudW1iZXIsICgpID0+IHZvaWQ+KCk7XHJcblxyXG4vLyBVc2VkIHRvIGVuc3VyZSBubyBvbmUgYnV0IHRoZSB0eXBlIGNvbnZlcnRlcnMgY2FuIHVzZSB0aGUgc2VjcmV0IHBvaW50ZXIgY29uc3RydWN0b3IuXHJcbmV4cG9ydCBjb25zdCBTZWNyZXQ6IFN5bWJvbCA9IFN5bWJvbCgpO1xyXG5leHBvcnQgY29uc3QgU2VjcmV0Tm9EaXNwb3NlOiBTeW1ib2wgPSBTeW1ib2woKTtcclxuXHJcbi8vIFRPRE86IFRoaXMgbmVlZHMgcHJvcGVyIHRlc3RpbmcsIG9yIHBvc3NpYmx5IGV2ZW4ganVzdGlmaWNhdGlvbiBmb3IgaXRzIGV4aXN0ZW5jZS5cclxuLy8gSSdtIHByZXR0eSBzdXJlIG9ubHkgSlMgaGVhcCBwcmVzc3VyZSB3aWxsIGludm9rZSBhIGNhbGxiYWNrLCBtYWtpbmcgaXQga2luZCBvZiBcclxuLy8gcG9pbnRsZXNzIGZvciBDKysgY2xlYW51cCwgd2hpY2ggaGFzIG5vIGludGVyYWN0aW9uIHdpdGggdGhlIEpTIGhlYXAuXHJcbmNvbnN0IHJlZ2lzdHJ5ID0gbmV3IEZpbmFsaXphdGlvblJlZ2lzdHJ5KChfdGhpczogbnVtYmVyKSA9PiB7XHJcbiAgICBjb25zb2xlLndhcm4oYFdBU00gY2xhc3MgYXQgYWRkcmVzcyAke190aGlzfSB3YXMgbm90IHByb3Blcmx5IGRpc3Bvc2VkLmApO1xyXG4gICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldChfdGhpcyk/LigpO1xyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBCYXNlIGNsYXNzIGZvciBhbGwgRW1iaW5kLWVuYWJsZWQgY2xhc3Nlcy5cclxuICpcclxuICogSW4gZ2VuZXJhbCwgaWYgdHdvIChxdW90ZS11bnF1b3RlKSBcImluc3RhbmNlc1wiIG9mIHRoaXMgY2xhc3MgaGF2ZSB0aGUgc2FtZSBgX3RoaXNgIHBvaW50ZXIsXHJcbiAqIHRoZW4gdGhleSB3aWxsIGNvbXBhcmUgZXF1YWxseSB3aXRoIGA9PWAsIGFzIGlmIGNvbXBhcmluZyBhZGRyZXNzZXMgaW4gQysrLlxyXG4gKi9cclxuXHJcbmV4cG9ydCBjbGFzcyBFbWJvdW5kQ2xhc3Mge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHRyYW5zZm9ybWVkIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgdGFrZXMgSlMgYXJndW1lbnRzIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3NcclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9jb25zdHJ1Y3RvcjogKC4uLmFyZ3M6IGFueVtdKSA9PiBFbWJvdW5kQ2xhc3M7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBc3NpZ25lZCBieSB0aGUgZGVyaXZlZCBjbGFzcyB3aGVuIHRoYXQgY2xhc3MgaXMgcmVnaXN0ZXJlZC5cclxuICAgICAqXHJcbiAgICAgKiBUaGlzIG9uZSBpcyBub3QgdHJhbnNmb3JtZWQgYmVjYXVzZSBpdCBvbmx5IHRha2VzIGEgcG9pbnRlciBhbmQgcmV0dXJucyBub3RoaW5nLlxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgX2Rlc3RydWN0b3I6IChfdGhpczogbnVtYmVyKSA9PiB2b2lkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHBvaW50ZXIgdG8gdGhlIGNsYXNzIGluIFdBU00gbWVtb3J5OyB0aGUgc2FtZSBhcyB0aGUgQysrIGB0aGlzYCBwb2ludGVyLlxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgX3RoaXMhOiBudW1iZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcclxuICAgICAgICBjb25zdCBDcmVhdGVkRnJvbVdhc20gPSAoYXJncy5sZW5ndGggPT09IDIgJiYgKGFyZ3NbMF0gPT09IFNlY3JldCB8fCBhcmdzWzBdID09IFNlY3JldE5vRGlzcG9zZSkgJiYgdHlwZW9mIGFyZ3NbMV0gPT09ICdudW1iZXInKTtcclxuXHJcbiAgICAgICAgaWYgKCFDcmVhdGVkRnJvbVdhc20pIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gSlMuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFVubGlrZSBhIG5vcm1hbCBjb25zdHJ1Y3Rvciwgd2UgZGVsZWdhdGUgdGhlIGNsYXNzIGNyZWF0aW9uIHRvXHJcbiAgICAgICAgICAgICAqIGEgY29tYmluYXRpb24gb2YgX2NvbnN0cnVjdG9yIGFuZCBgZnJvbVdpcmVUeXBlYC5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogYF9jb25zdHJ1Y3RvcmAgd2lsbCBjYWxsIHRoZSBDKysgY29kZSB0aGF0IGFsbG9jYXRlcyBtZW1vcnksXHJcbiAgICAgICAgICAgICAqIGluaXRpYWxpemVzIHRoZSBjbGFzcywgYW5kIHJldHVybnMgaXRzIGB0aGlzYCBwb2ludGVyLFxyXG4gICAgICAgICAgICAgKiB3aGlsZSBgZnJvbVdpcmVUeXBlYCwgY2FsbGVkIGFzIHBhcnQgb2YgdGhlIGdsdWUtY29kZSBwcm9jZXNzLFxyXG4gICAgICAgICAgICAgKiB3aWxsIGFjdHVhbGx5IGluc3RhbnRpYXRlIHRoaXMgY2xhc3MuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIChJbiBvdGhlciB3b3JkcywgdGhpcyBwYXJ0IHJ1bnMgZmlyc3QsIHRoZW4gdGhlIGBlbHNlYCBiZWxvdyBydW5zKVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmV0dXJuIG5ldy50YXJnZXQuX2NvbnN0cnVjdG9yKC4uLmFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gQysrLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBXZSBnZXQgaGVyZSB2aWEgYGZyb21XaXJlVHlwZWAsIG1lYW5pbmcgdGhhdCB0aGVcclxuICAgICAgICAgICAgICogY2xhc3MgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWQgaW4gQysrLCBhbmQgd2VcclxuICAgICAgICAgICAgICoganVzdCBuZWVkIG91ciBcImhhbmRsZVwiIHRvIGl0IGluIEpTLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgY29uc3QgX3RoaXMgPSBhcmdzWzFdO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCBfdGhpcyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBTZWNyZXROb0Rpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSBuZXcudGFyZ2V0Ll9kZXN0cnVjdG9yO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5zZXQoX3RoaXMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0cnVjdG9yKF90aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLmRlbGV0ZShfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgW1N5bWJvbC5kaXNwb3NlXSgpOiB2b2lkIHtcclxuICAgICAgICAvLyBPbmx5IHJ1biB0aGUgZGVzdHJ1Y3RvciBpZiB3ZSBvdXJzZWx2ZXMgY29uc3RydWN0ZWQgdGhpcyBjbGFzcyAoYXMgb3Bwb3NlZCB0byBgaW5zcGVjdGBpbmcgaXQpXHJcbiAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9IGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgaWYgKGRlc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKT8uKCk7XHJcbiAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5kZWxldGUodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIFxyXG4gKiBJbnN0ZWFkIG9mIGluc3RhbnRpYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgXHJcbiAqIHlvdSBjYW4gaW5zcGVjdCBhbiBleGlzdGluZyBwb2ludGVyIGluc3RlYWQuXHJcbiAqXHJcbiAqIFRoaXMgaXMgbWFpbmx5IGludGVuZGVkIGZvciBzaXR1YXRpb25zIHRoYXQgRW1iaW5kIGRvZXNuJ3Qgc3VwcG9ydCxcclxuICogbGlrZSBhcnJheS1vZi1zdHJ1Y3RzLWFzLWEtcG9pbnRlci5cclxuICogXHJcbiAqIEJlIGF3YXJlIHRoYXQgdGhlcmUncyBubyBsaWZldGltZSB0cmFja2luZyBpbnZvbHZlZCwgc29cclxuICogbWFrZSBzdXJlIHlvdSBkb24ndCBrZWVwIHRoaXMgdmFsdWUgYXJvdW5kIGFmdGVyIHRoZVxyXG4gKiBwb2ludGVyJ3MgYmVlbiBpbnZhbGlkYXRlZC4gXHJcbiAqIFxyXG4gKiAqKkRvIG5vdCBjYWxsIFtTeW1ib2wuZGlzcG9zZV0qKiBvbiBhbiBpbnNwZWN0ZWQgY2xhc3MsXHJcbiAqIHNpbmNlIHRoZSBhc3N1bXB0aW9uIGlzIHRoYXQgdGhlIEMrKyBjb2RlIG93bnMgdGhhdCBwb2ludGVyXHJcbiAqIGFuZCB3ZSdyZSBqdXN0IGxvb2tpbmcgYXQgaXQsIHNvIGRlc3Ryb3lpbmcgaXQgd291bGQgYmUgcnVkZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNwZWN0Q2xhc3NCeVBvaW50ZXI8VD4ocG9pbnRlcjogbnVtYmVyKTogVCB7XHJcbiAgICByZXR1cm4gbmV3IEVtYm91bmRDbGFzcyhTZWNyZXROb0Rpc3Bvc2UsIHBvaW50ZXIpIGFzIFQ7XHJcbn1cclxuIl19