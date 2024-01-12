import "./event.js";
// Worklets don't define `CustomEvent`, even when they do define `Event` itself...
globalThis.CustomEvent ??= class CustomEvent extends Event {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail;
    }
    detail;
    initCustomEvent(_type, _bubbles, _cancelable, detail) {
        // this.type, this.bubbles, and this.cancelable are all readonly...
        this.detail = (detail ?? this.detail);
    }
};
