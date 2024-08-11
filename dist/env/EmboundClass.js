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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRW1ib3VuZENsYXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Vudi9FbWJvdW5kQ2xhc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsbUZBQW1GO0FBQ25GLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7QUFFckUsK0RBQStEO0FBQy9ELDJEQUEyRDtBQUMzRCxNQUFNLHdCQUF3QixHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0FBRS9ELHdGQUF3RjtBQUN4RixNQUFNLENBQUMsTUFBTSxNQUFNLEdBQVcsTUFBTSxFQUFFLENBQUM7QUFDdkMsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFXLE1BQU0sRUFBRSxDQUFDO0FBRWhELHFGQUFxRjtBQUNyRixtRkFBbUY7QUFDbkYsd0VBQXdFO0FBQ3hFLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQW9CLENBQUMsQ0FBQyxLQUFhLEVBQUUsRUFBRTtJQUN4RCxPQUFPLENBQUMsSUFBSSxDQUFDLHlCQUF5QixLQUFLLDZCQUE2QixDQUFDLENBQUM7SUFDMUUsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQztBQUVIOzs7OztHQUtHO0FBRUgsTUFBTSxPQUFPLFlBQVk7SUFFckI7O09BRUc7SUFDSCxNQUFNLENBQUMsWUFBWSxDQUFtQztJQUN0RDs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLFdBQVcsQ0FBMEI7SUFFNUM7O09BRUc7SUFDTyxLQUFLLENBQVU7SUFFekIsWUFBWSxHQUFHLElBQVc7UUFDdEIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBRWpJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNuQjs7Ozs7Ozs7Ozs7O2VBWUc7WUFDSCxPQUFRLElBQUksQ0FBQyxXQUFtQyxDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzNFLENBQUM7YUFDSSxDQUFDO1lBQ0Y7Ozs7OztlQU1HO1lBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRCLDJEQUEyRDtZQUMzRCx1REFBdUQ7WUFDdkQsMEJBQTBCO1lBQzFCLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN6RCxJQUFJLFFBQVE7Z0JBQ1IsT0FBTyxRQUFRLENBQUM7WUFFcEIsMkVBQTJFO1lBQzNFLGlGQUFpRjtZQUNqRixFQUFFO1lBQ0YsMERBQTBEO1lBQzFELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ25CLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUUvQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxVQUFVLEdBQUksSUFBSSxDQUFDLFdBQW1DLENBQUMsV0FBVyxDQUFDO2dCQUV6RSx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtvQkFDckMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNsQixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztRQUVMLENBQUM7SUFDTCxDQUFDO0lBRUQsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ1osaUdBQWlHO1FBQ2pHLE1BQU0sVUFBVSxHQUFHLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNiLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDbkIsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQUVEOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUFJLE9BQWU7SUFDcEQsT0FBTyxJQUFJLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFNLENBQUM7QUFDM0QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRoaXMgaXMgYSBydW5uaW5nIGxpc3Qgb2YgYWxsIHRoZSBpbnN0YW50aWF0ZWQgY2xhc3NlcywgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbmNvbnN0IGluc3RhbnRpYXRlZENsYXNzZXMgPSBuZXcgTWFwPG51bWJlciwgV2Vha1JlZjxFbWJvdW5kQ2xhc3M+PigpO1xyXG5cclxuLy8gVGhpcyBrZWVwcyB0cmFjayBvZiBhbGwgZGVzdHJ1Y3RvcnMgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbi8vIFVzZWQgZm9yIEZpbmFsaXphdGlvblJlZ2lzdHJ5IGFuZCB0aGUgZGVzdHJ1Y3RvciBpdHNlbGYuXHJcbmNvbnN0IGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZCA9IG5ldyBNYXA8bnVtYmVyLCAoKSA9PiB2b2lkPigpO1xyXG5cclxuLy8gVXNlZCB0byBlbnN1cmUgbm8gb25lIGJ1dCB0aGUgdHlwZSBjb252ZXJ0ZXJzIGNhbiB1c2UgdGhlIHNlY3JldCBwb2ludGVyIGNvbnN0cnVjdG9yLlxyXG5leHBvcnQgY29uc3QgU2VjcmV0OiBTeW1ib2wgPSBTeW1ib2woKTtcclxuZXhwb3J0IGNvbnN0IFNlY3JldE5vRGlzcG9zZTogU3ltYm9sID0gU3ltYm9sKCk7XHJcblxyXG4vLyBUT0RPOiBUaGlzIG5lZWRzIHByb3BlciB0ZXN0aW5nLCBvciBwb3NzaWJseSBldmVuIGp1c3RpZmljYXRpb24gZm9yIGl0cyBleGlzdGVuY2UuXHJcbi8vIEknbSBwcmV0dHkgc3VyZSBvbmx5IEpTIGhlYXAgcHJlc3N1cmUgd2lsbCBpbnZva2UgYSBjYWxsYmFjaywgbWFraW5nIGl0IGtpbmQgb2YgXHJcbi8vIHBvaW50bGVzcyBmb3IgQysrIGNsZWFudXAsIHdoaWNoIGhhcyBubyBpbnRlcmFjdGlvbiB3aXRoIHRoZSBKUyBoZWFwLlxyXG5jb25zdCByZWdpc3RyeSA9IG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoX3RoaXM6IG51bWJlcikgPT4ge1xyXG4gICAgY29uc29sZS53YXJuKGBXQVNNIGNsYXNzIGF0IGFkZHJlc3MgJHtfdGhpc30gd2FzIG5vdCBwcm9wZXJseSBkaXNwb3NlZC5gKTtcclxuICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQoX3RoaXMpPy4oKTtcclxufSk7XHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgYWxsIEVtYmluZC1lbmFibGVkIGNsYXNzZXMuXHJcbiAqXHJcbiAqIEluIGdlbmVyYWwsIGlmIHR3byAocXVvdGUtdW5xdW90ZSkgXCJpbnN0YW5jZXNcIiBvZiB0aGlzIGNsYXNzIGhhdmUgdGhlIHNhbWUgYF90aGlzYCBwb2ludGVyLFxyXG4gKiB0aGVuIHRoZXkgd2lsbCBjb21wYXJlIGVxdWFsbHkgd2l0aCBgPT1gLCBhcyBpZiBjb21wYXJpbmcgYWRkcmVzc2VzIGluIEMrKy5cclxuICovXHJcblxyXG5leHBvcnQgY2xhc3MgRW1ib3VuZENsYXNzIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB0cmFuc2Zvcm1lZCBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0aGF0IHRha2VzIEpTIGFyZ3VtZW50cyBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfY29uc3RydWN0b3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gRW1ib3VuZENsYXNzO1xyXG4gICAgLyoqXHJcbiAgICAgKiBBc3NpZ25lZCBieSB0aGUgZGVyaXZlZCBjbGFzcyB3aGVuIHRoYXQgY2xhc3MgaXMgcmVnaXN0ZXJlZC5cclxuICAgICAqXHJcbiAgICAgKiBUaGlzIG9uZSBpcyBub3QgdHJhbnNmb3JtZWQgYmVjYXVzZSBpdCBvbmx5IHRha2VzIGEgcG9pbnRlciBhbmQgcmV0dXJucyBub3RoaW5nLlxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgX2Rlc3RydWN0b3I6IChfdGhpczogbnVtYmVyKSA9PiB2b2lkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHBvaW50ZXIgdG8gdGhlIGNsYXNzIGluIFdBU00gbWVtb3J5OyB0aGUgc2FtZSBhcyB0aGUgQysrIGB0aGlzYCBwb2ludGVyLlxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgX3RoaXMhOiBudW1iZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcclxuICAgICAgICBjb25zdCBDcmVhdGVkRnJvbVdhc20gPSAoYXJncy5sZW5ndGggPT09IDIgJiYgKGFyZ3NbMF0gPT09IFNlY3JldCB8fCBhcmdzWzBdID09IFNlY3JldE5vRGlzcG9zZSkgJiYgdHlwZW9mIGFyZ3NbMV0gPT09ICdudW1iZXInKTtcclxuXHJcbiAgICAgICAgaWYgKCFDcmVhdGVkRnJvbVdhc20pIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gSlMuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFVubGlrZSBhIG5vcm1hbCBjb25zdHJ1Y3Rvciwgd2UgZGVsZWdhdGUgdGhlIGNsYXNzIGNyZWF0aW9uIHRvXHJcbiAgICAgICAgICAgICAqIGEgY29tYmluYXRpb24gb2YgX2NvbnN0cnVjdG9yIGFuZCBgZnJvbVdpcmVUeXBlYC5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogYF9jb25zdHJ1Y3RvcmAgd2lsbCBjYWxsIHRoZSBDKysgY29kZSB0aGF0IGFsbG9jYXRlcyBtZW1vcnksXHJcbiAgICAgICAgICAgICAqIGluaXRpYWxpemVzIHRoZSBjbGFzcywgYW5kIHJldHVybnMgaXRzIGB0aGlzYCBwb2ludGVyLFxyXG4gICAgICAgICAgICAgKiB3aGlsZSBgZnJvbVdpcmVUeXBlYCwgY2FsbGVkIGFzIHBhcnQgb2YgdGhlIGdsdWUtY29kZSBwcm9jZXNzLFxyXG4gICAgICAgICAgICAgKiB3aWxsIGFjdHVhbGx5IGluc3RhbnRpYXRlIHRoaXMgY2xhc3MuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIChJbiBvdGhlciB3b3JkcywgdGhpcyBwYXJ0IHJ1bnMgZmlyc3QsIHRoZW4gdGhlIGBlbHNlYCBiZWxvdyBydW5zKVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBFbWJvdW5kQ2xhc3MpLl9jb25zdHJ1Y3RvciguLi5hcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGEgY2FsbCB0byBjcmVhdGUgdGhpcyBjbGFzcyBmcm9tIEMrKy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogV2UgZ2V0IGhlcmUgdmlhIGBmcm9tV2lyZVR5cGVgLCBtZWFuaW5nIHRoYXQgdGhlXHJcbiAgICAgICAgICAgICAqIGNsYXNzIGhhcyBhbHJlYWR5IGJlZW4gaW5zdGFudGlhdGVkIGluIEMrKywgYW5kIHdlXHJcbiAgICAgICAgICAgICAqIGp1c3QgbmVlZCBvdXIgXCJoYW5kbGVcIiB0byBpdCBpbiBKUy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGNvbnN0IF90aGlzID0gYXJnc1sxXTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpcnN0LCBtYWtlIHN1cmUgd2UgaGF2ZW4ndCBpbnN0YW50aWF0ZWQgdGhpcyBjbGFzcyB5ZXQuXHJcbiAgICAgICAgICAgIC8vIFdlIHdhbnQgYWxsIGNsYXNzZXMgd2l0aCB0aGUgc2FtZSBgdGhpc2AgcG9pbnRlciB0byBcclxuICAgICAgICAgICAgLy8gYWN0dWFsbHkgKmJlKiB0aGUgc2FtZS5cclxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBpbnN0YW50aWF0ZWRDbGFzc2VzLmdldChfdGhpcyk/LmRlcmVmKCk7XHJcbiAgICAgICAgICAgIGlmIChleGlzdGluZylcclxuICAgICAgICAgICAgICAgIHJldHVybiBleGlzdGluZztcclxuXHJcbiAgICAgICAgICAgIC8vIElmIHdlIGdvdCBoZXJlLCB0aGVuIGNvbmdyYXR1bGF0aW9ucywgdGhpcy1pbnN0YW50aWF0aW9uLW9mLXRoaXMtY2xhc3MsIFxyXG4gICAgICAgICAgICAvLyB5b3UncmUgYWN0dWFsbHkgdGhlIG9uZSB0byBiZSBpbnN0YW50aWF0ZWQuIE5vIG1vcmUgaGFja3kgY29uc3RydWN0b3IgcmV0dXJucy5cclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gQ29uc2lkZXIgdGhpcyB0aGUgXCJhY3R1YWxcIiBjb25zdHJ1Y3RvciBjb2RlLCBJIHN1cHBvc2UuXHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSBfdGhpcztcclxuICAgICAgICAgICAgaW5zdGFudGlhdGVkQ2xhc3Nlcy5zZXQoX3RoaXMsIG5ldyBXZWFrUmVmKHRoaXMpKTtcclxuICAgICAgICAgICAgcmVnaXN0cnkucmVnaXN0ZXIodGhpcywgX3RoaXMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFyZ3NbMF0gIT0gU2VjcmV0Tm9EaXNwb3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZXN0cnVjdG9yID0gKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIEVtYm91bmRDbGFzcykuX2Rlc3RydWN0b3I7XHJcblxyXG4gICAgICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLnNldChfdGhpcywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RydWN0b3IoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbnRpYXRlZENsYXNzZXMuZGVsZXRlKF90aGlzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBbU3ltYm9sLmRpc3Bvc2VdKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIE9ubHkgcnVuIHRoZSBkZXN0cnVjdG9yIGlmIHdlIG91cnNlbHZlcyBjb25zdHJ1Y3RlZCB0aGlzIGNsYXNzIChhcyBvcHBvc2VkIHRvIGBpbnNwZWN0YGluZyBpdClcclxuICAgICAgICBjb25zdCBkZXN0cnVjdG9yID0gZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKTtcclxuICAgICAgICBpZiAoZGVzdHJ1Y3Rvcikge1xyXG4gICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpPy4oKTtcclxuICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmRlbGV0ZSh0aGlzLl90aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKiogXHJcbiAqIEluc3RlYWQgb2YgaW5zdGFudGlhdGluZyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzLCBcclxuICogeW91IGNhbiBpbnNwZWN0IGFuIGV4aXN0aW5nIHBvaW50ZXIgaW5zdGVhZC5cclxuICpcclxuICogVGhpcyBpcyBtYWlubHkgaW50ZW5kZWQgZm9yIHNpdHVhdGlvbnMgdGhhdCBFbWJpbmQgZG9lc24ndCBzdXBwb3J0LFxyXG4gKiBsaWtlIGFycmF5LW9mLXN0cnVjdHMtYXMtYS1wb2ludGVyLlxyXG4gKiBcclxuICogQmUgYXdhcmUgdGhhdCB0aGVyZSdzIG5vIGxpZmV0aW1lIHRyYWNraW5nIGludm9sdmVkLCBzb1xyXG4gKiBtYWtlIHN1cmUgeW91IGRvbid0IGtlZXAgdGhpcyB2YWx1ZSBhcm91bmQgYWZ0ZXIgdGhlXHJcbiAqIHBvaW50ZXIncyBiZWVuIGludmFsaWRhdGVkLiBcclxuICogXHJcbiAqICoqRG8gbm90IGNhbGwgW1N5bWJvbC5kaXNwb3NlXSoqIG9uIGFuIGluc3BlY3RlZCBjbGFzcyxcclxuICogc2luY2UgdGhlIGFzc3VtcHRpb24gaXMgdGhhdCB0aGUgQysrIGNvZGUgb3ducyB0aGF0IHBvaW50ZXJcclxuICogYW5kIHdlJ3JlIGp1c3QgbG9va2luZyBhdCBpdCwgc28gZGVzdHJveWluZyBpdCB3b3VsZCBiZSBydWRlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluc3BlY3RDbGFzc0J5UG9pbnRlcjxUPihwb2ludGVyOiBudW1iZXIpOiBUIHtcclxuICAgIHJldHVybiBuZXcgRW1ib3VuZENsYXNzKFNlY3JldE5vRGlzcG9zZSwgcG9pbnRlcikgYXMgVDtcclxufVxyXG4iXX0=