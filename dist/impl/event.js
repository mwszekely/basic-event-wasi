// Needed for extremely limited environments, like Worklets.
// This seems to exist in Chrome but not, e.g., Firefox, possibly Safari
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
    bubbles;
    cancelBubble;
    cancelable;
    composed;
    currentTarget;
    defaultPrevented;
    eventPhase;
    isTrusted;
    returnValue;
    srcElement;
    target;
    timeStamp;
    type;
    composedPath() { return []; }
    initEvent(type_, bubbles, cancelable) { this.type = type_; this.bubbles = bubbles || this.bubbles; this.cancelable = cancelable || this.cancelable; }
    preventDefault() { this.defaultPrevented = true; }
    stopImmediatePropagation() { }
    stopPropagation() { }
};
export {};
