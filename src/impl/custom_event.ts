import "./event.js";

// Worklets don't define `CustomEvent`, even when they do define `Event` itself...
globalThis.CustomEvent ??= class CustomEvent<T = any> extends Event {

    constructor(type: string, eventInitDict?: CustomEventInit<T>) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail!;
    }

    detail: T;

    initCustomEvent(_type: string, _bubbles?: boolean, _cancelable?: boolean, detail?: T): void { 
        // this.type, this.bubbles, and this.cancelable are all readonly...
        this.detail = (detail ?? this.detail)!;
    }
}
