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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1ib3VuZC1jbGFzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lbnYvZW1ib3VuZC1jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxtRkFBbUY7QUFDbkYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQztBQUVyRSwrREFBK0Q7QUFDL0QsMkRBQTJEO0FBQzNELE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7QUFFL0Qsd0ZBQXdGO0FBQ3hGLE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBVyxNQUFNLEVBQUUsQ0FBQztBQUN2QyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQVcsTUFBTSxFQUFFLENBQUM7QUFFaEQscUZBQXFGO0FBQ3JGLG1GQUFtRjtBQUNuRix3RUFBd0U7QUFDeEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxDQUFDLEtBQWEsRUFBRSxFQUFFO0lBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEtBQUssNkJBQTZCLENBQUMsQ0FBQztJQUMxRSx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDO0FBRUg7Ozs7O0dBS0c7QUFFSCxNQUFNLE9BQU8sWUFBWTtJQUVyQjs7T0FFRztJQUNILE1BQU0sQ0FBQyxZQUFZLENBQW1DO0lBQ3REOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsV0FBVyxDQUEwQjtJQUU1Qzs7T0FFRztJQUNPLEtBQUssQ0FBVTtJQUV6QixZQUFZLEdBQUcsSUFBVztRQUN0QixNQUFNLGVBQWUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUM7UUFFakksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ25COzs7Ozs7Ozs7Ozs7ZUFZRztZQUNILE9BQVEsSUFBSSxDQUFDLFdBQW1DLENBQUMsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDM0UsQ0FBQzthQUNJLENBQUM7WUFDRjs7Ozs7O2VBTUc7WUFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEIsMkRBQTJEO1lBQzNELHVEQUF1RDtZQUN2RCwwQkFBMEI7WUFDMUIsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ3pELElBQUksUUFBUTtnQkFDUixPQUFPLFFBQVEsQ0FBQztZQUVwQiwyRUFBMkU7WUFDM0UsaUZBQWlGO1lBQ2pGLEVBQUU7WUFDRiwwREFBMEQ7WUFDMUQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDbkIsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2xELFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRS9CLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUM3QixNQUFNLFVBQVUsR0FBSSxJQUFJLENBQUMsV0FBbUMsQ0FBQyxXQUFXLENBQUM7Z0JBRXpFLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO29CQUNyQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2xCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1FBRUwsQ0FBQztJQUNMLENBQUM7SUFFRCxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDWixpR0FBaUc7UUFDakcsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2Isd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0Msd0JBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNuQixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUksT0FBZTtJQUNwRCxPQUFPLElBQUksWUFBWSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQU0sQ0FBQztBQUMzRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhpcyBpcyBhIHJ1bm5pbmcgbGlzdCBvZiBhbGwgdGhlIGluc3RhbnRpYXRlZCBjbGFzc2VzLCBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuY29uc3QgaW5zdGFudGlhdGVkQ2xhc3NlcyA9IG5ldyBNYXA8bnVtYmVyLCBXZWFrUmVmPEVtYm91bmRDbGFzcz4+KCk7XHJcblxyXG4vLyBUaGlzIGtlZXBzIHRyYWNrIG9mIGFsbCBkZXN0cnVjdG9ycyBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuLy8gVXNlZCBmb3IgRmluYWxpemF0aW9uUmVnaXN0cnkgYW5kIHRoZSBkZXN0cnVjdG9yIGl0c2VsZi5cclxuY29uc3QgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkID0gbmV3IE1hcDxudW1iZXIsICgpID0+IHZvaWQ+KCk7XHJcblxyXG4vLyBVc2VkIHRvIGVuc3VyZSBubyBvbmUgYnV0IHRoZSB0eXBlIGNvbnZlcnRlcnMgY2FuIHVzZSB0aGUgc2VjcmV0IHBvaW50ZXIgY29uc3RydWN0b3IuXHJcbmV4cG9ydCBjb25zdCBTZWNyZXQ6IFN5bWJvbCA9IFN5bWJvbCgpO1xyXG5leHBvcnQgY29uc3QgU2VjcmV0Tm9EaXNwb3NlOiBTeW1ib2wgPSBTeW1ib2woKTtcclxuXHJcbi8vIFRPRE86IFRoaXMgbmVlZHMgcHJvcGVyIHRlc3RpbmcsIG9yIHBvc3NpYmx5IGV2ZW4ganVzdGlmaWNhdGlvbiBmb3IgaXRzIGV4aXN0ZW5jZS5cclxuLy8gSSdtIHByZXR0eSBzdXJlIG9ubHkgSlMgaGVhcCBwcmVzc3VyZSB3aWxsIGludm9rZSBhIGNhbGxiYWNrLCBtYWtpbmcgaXQga2luZCBvZiBcclxuLy8gcG9pbnRsZXNzIGZvciBDKysgY2xlYW51cCwgd2hpY2ggaGFzIG5vIGludGVyYWN0aW9uIHdpdGggdGhlIEpTIGhlYXAuXHJcbmNvbnN0IHJlZ2lzdHJ5ID0gbmV3IEZpbmFsaXphdGlvblJlZ2lzdHJ5KChfdGhpczogbnVtYmVyKSA9PiB7XHJcbiAgICBjb25zb2xlLndhcm4oYFdBU00gY2xhc3MgYXQgYWRkcmVzcyAke190aGlzfSB3YXMgbm90IHByb3Blcmx5IGRpc3Bvc2VkLmApO1xyXG4gICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldChfdGhpcyk/LigpO1xyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBCYXNlIGNsYXNzIGZvciBhbGwgRW1iaW5kLWVuYWJsZWQgY2xhc3Nlcy5cclxuICpcclxuICogSW4gZ2VuZXJhbCwgaWYgdHdvIChxdW90ZS11bnF1b3RlKSBcImluc3RhbmNlc1wiIG9mIHRoaXMgY2xhc3MgaGF2ZSB0aGUgc2FtZSBgX3RoaXNgIHBvaW50ZXIsXHJcbiAqIHRoZW4gdGhleSB3aWxsIGNvbXBhcmUgZXF1YWxseSB3aXRoIGA9PWAsIGFzIGlmIGNvbXBhcmluZyBhZGRyZXNzZXMgaW4gQysrLlxyXG4gKi9cclxuXHJcbmV4cG9ydCBjbGFzcyBFbWJvdW5kQ2xhc3Mge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHRyYW5zZm9ybWVkIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgdGFrZXMgSlMgYXJndW1lbnRzIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3NcclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9jb25zdHJ1Y3RvcjogKC4uLmFyZ3M6IGFueVtdKSA9PiBFbWJvdW5kQ2xhc3M7XHJcbiAgICAvKipcclxuICAgICAqIEFzc2lnbmVkIGJ5IHRoZSBkZXJpdmVkIGNsYXNzIHdoZW4gdGhhdCBjbGFzcyBpcyByZWdpc3RlcmVkLlxyXG4gICAgICpcclxuICAgICAqIFRoaXMgb25lIGlzIG5vdCB0cmFuc2Zvcm1lZCBiZWNhdXNlIGl0IG9ubHkgdGFrZXMgYSBwb2ludGVyIGFuZCByZXR1cm5zIG5vdGhpbmcuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfZGVzdHJ1Y3RvcjogKF90aGlzOiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcG9pbnRlciB0byB0aGUgY2xhc3MgaW4gV0FTTSBtZW1vcnk7IHRoZSBzYW1lIGFzIHRoZSBDKysgYHRoaXNgIHBvaW50ZXIuXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBfdGhpcyE6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiBhbnlbXSkge1xyXG4gICAgICAgIGNvbnN0IENyZWF0ZWRGcm9tV2FzbSA9IChhcmdzLmxlbmd0aCA9PT0gMiAmJiAoYXJnc1swXSA9PT0gU2VjcmV0IHx8IGFyZ3NbMF0gPT0gU2VjcmV0Tm9EaXNwb3NlKSAmJiB0eXBlb2YgYXJnc1sxXSA9PT0gJ251bWJlcicpO1xyXG5cclxuICAgICAgICBpZiAoIUNyZWF0ZWRGcm9tV2FzbSkge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBKUy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogVW5saWtlIGEgbm9ybWFsIGNvbnN0cnVjdG9yLCB3ZSBkZWxlZ2F0ZSB0aGUgY2xhc3MgY3JlYXRpb24gdG9cclxuICAgICAgICAgICAgICogYSBjb21iaW5hdGlvbiBvZiBfY29uc3RydWN0b3IgYW5kIGBmcm9tV2lyZVR5cGVgLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBgX2NvbnN0cnVjdG9yYCB3aWxsIGNhbGwgdGhlIEMrKyBjb2RlIHRoYXQgYWxsb2NhdGVzIG1lbW9yeSxcclxuICAgICAgICAgICAgICogaW5pdGlhbGl6ZXMgdGhlIGNsYXNzLCBhbmQgcmV0dXJucyBpdHMgYHRoaXNgIHBvaW50ZXIsXHJcbiAgICAgICAgICAgICAqIHdoaWxlIGBmcm9tV2lyZVR5cGVgLCBjYWxsZWQgYXMgcGFydCBvZiB0aGUgZ2x1ZS1jb2RlIHByb2Nlc3MsXHJcbiAgICAgICAgICAgICAqIHdpbGwgYWN0dWFsbHkgaW5zdGFudGlhdGUgdGhpcyBjbGFzcy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogKEluIG90aGVyIHdvcmRzLCB0aGlzIHBhcnQgcnVucyBmaXJzdCwgdGhlbiB0aGUgYGVsc2VgIGJlbG93IHJ1bnMpXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIEVtYm91bmRDbGFzcykuX2NvbnN0cnVjdG9yKC4uLmFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gQysrLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBXZSBnZXQgaGVyZSB2aWEgYGZyb21XaXJlVHlwZWAsIG1lYW5pbmcgdGhhdCB0aGVcclxuICAgICAgICAgICAgICogY2xhc3MgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWQgaW4gQysrLCBhbmQgd2VcclxuICAgICAgICAgICAgICoganVzdCBuZWVkIG91ciBcImhhbmRsZVwiIHRvIGl0IGluIEpTLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgY29uc3QgX3RoaXMgPSBhcmdzWzFdO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCBfdGhpcyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBTZWNyZXROb0Rpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgRW1ib3VuZENsYXNzKS5fZGVzdHJ1Y3RvcjtcclxuXHJcbiAgICAgICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuc2V0KF90aGlzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzdHJ1Y3RvcihfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFudGlhdGVkQ2xhc3Nlcy5kZWxldGUoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFtTeW1ib2wuZGlzcG9zZV0oKTogdm9pZCB7XHJcbiAgICAgICAgLy8gT25seSBydW4gdGhlIGRlc3RydWN0b3IgaWYgd2Ugb3Vyc2VsdmVzIGNvbnN0cnVjdGVkIHRoaXMgY2xhc3MgKGFzIG9wcG9zZWQgdG8gYGluc3BlY3RgaW5nIGl0KVxyXG4gICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpO1xyXG4gICAgICAgIGlmIChkZXN0cnVjdG9yKSB7XHJcbiAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk/LigpO1xyXG4gICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZGVsZXRlKHRoaXMuX3RoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLl90aGlzID0gMDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBcclxuICogSW5zdGVhZCBvZiBpbnN0YW50aWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3MsIFxyXG4gKiB5b3UgY2FuIGluc3BlY3QgYW4gZXhpc3RpbmcgcG9pbnRlciBpbnN0ZWFkLlxyXG4gKlxyXG4gKiBUaGlzIGlzIG1haW5seSBpbnRlbmRlZCBmb3Igc2l0dWF0aW9ucyB0aGF0IEVtYmluZCBkb2Vzbid0IHN1cHBvcnQsXHJcbiAqIGxpa2UgYXJyYXktb2Ytc3RydWN0cy1hcy1hLXBvaW50ZXIuXHJcbiAqIFxyXG4gKiBCZSBhd2FyZSB0aGF0IHRoZXJlJ3Mgbm8gbGlmZXRpbWUgdHJhY2tpbmcgaW52b2x2ZWQsIHNvXHJcbiAqIG1ha2Ugc3VyZSB5b3UgZG9uJ3Qga2VlcCB0aGlzIHZhbHVlIGFyb3VuZCBhZnRlciB0aGVcclxuICogcG9pbnRlcidzIGJlZW4gaW52YWxpZGF0ZWQuIFxyXG4gKiBcclxuICogKipEbyBub3QgY2FsbCBbU3ltYm9sLmRpc3Bvc2VdKiogb24gYW4gaW5zcGVjdGVkIGNsYXNzLFxyXG4gKiBzaW5jZSB0aGUgYXNzdW1wdGlvbiBpcyB0aGF0IHRoZSBDKysgY29kZSBvd25zIHRoYXQgcG9pbnRlclxyXG4gKiBhbmQgd2UncmUganVzdCBsb29raW5nIGF0IGl0LCBzbyBkZXN0cm95aW5nIGl0IHdvdWxkIGJlIHJ1ZGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5zcGVjdENsYXNzQnlQb2ludGVyPFQ+KHBvaW50ZXI6IG51bWJlcik6IFQge1xyXG4gICAgcmV0dXJuIG5ldyBFbWJvdW5kQ2xhc3MoU2VjcmV0Tm9EaXNwb3NlLCBwb2ludGVyKSBhcyBUO1xyXG59XHJcbiJdfQ==