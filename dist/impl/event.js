// Did you know that Event isn't defined in Worklets in Firefox and possibly other environments? Even more fun!!
globalThis.Event ??= class Event {
    constructor(type_, eventInitDict) {
        this.bubbles = eventInitDict?.bubbles || false;
        this.cancelBubble = false;
        this.cancelable = eventInitDict?.cancelable || false;
        this.composed = eventInitDict?.composed || false;
        this.currentTarget = null;
        this.defaultPrevented = false;
        this.eventPhase = Event.NONE;
        this.isTrusted = true;
        this.returnValue = false;
        this.srcElement = null;
        this.target = null;
        this.timeStamp = 0;
        this.type = type_;
    }
    static NONE = 0;
    static CAPTURING_PHASE = 1;
    static AT_TARGET = 2;
    static BUBBLING_PHASE = 3;
    /**
     * Returns true or false depending on how event was initialized. True if event goes through its target's ancestors in reverse tree order, and false otherwise.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/bubbles)
     */
    bubbles;
    /**
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelBubble)
     */
    cancelBubble;
    /**
     * Returns true or false depending on how event was initialized. Its return value does not always carry meaning, but true can indicate that part of the operation during which event was dispatched, can be canceled by invoking the preventDefault() method.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelable)
     */
    cancelable;
    /**
     * Returns true or false depending on how event was initialized. True if event invokes listeners past a ShadowRoot node that is the root of its target, and false otherwise.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composed)
     */
    composed;
    /**
     * Returns the object whose event listener's callback is currently being invoked.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/currentTarget)
     */
    currentTarget;
    /**
     * Returns true if preventDefault() was invoked successfully to indicate cancelation, and false otherwise.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/defaultPrevented)
     */
    defaultPrevented;
    /**
     * Returns the event's phase, which is one of NONE, CAPTURING_PHASE, AT_TARGET, and BUBBLING_PHASE.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/eventPhase)
     */
    eventPhase;
    /**
     * Returns true if event was dispatched by the user agent, and false otherwise.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/isTrusted)
     */
    isTrusted;
    /**
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/returnValue)
     */
    returnValue;
    /**
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/srcElement)
     */
    srcElement;
    /**
     * Returns the object to which event is dispatched (its target).
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/target)
     */
    target;
    /**
     * Returns the event's timestamp as the number of milliseconds measured relative to the time origin.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/timeStamp)
     */
    timeStamp;
    /**
     * Returns the type of event, e.g. "click", "hashchange", or "submit".
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/type)
     */
    type;
    /**
     * Returns the invocation target objects of event's path (objects on which listeners will be invoked), except for any nodes in shadow trees of which the shadow root's mode is "closed" that are not reachable from event's currentTarget.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composedPath)
     */
    composedPath() { return []; }
    /**
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/initEvent)
     */
    initEvent(type_, bubbles, cancelable) { this.type = type_; this.bubbles = bubbles || this.bubbles; this.cancelable = cancelable || this.cancelable; }
    /**
     * If invoked when the cancelable attribute value is true, and while executing a listener for the event with passive set to false, signals to the operation that caused event to be dispatched that it needs to be canceled.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/preventDefault)
     */
    preventDefault() { this.defaultPrevented = true; }
    /**
     * Invoking this method prevents event from reaching any registered event listeners after the current one finishes running and, when dispatched in a tree, also prevents event from reaching any other objects.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopImmediatePropagation)
     */
    stopImmediatePropagation() { }
    /**
     * When dispatched in a tree, invoking this method prevents event from reaching any objects other than the current object.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopPropagation)
     */
    stopPropagation() { }
};
export {};
