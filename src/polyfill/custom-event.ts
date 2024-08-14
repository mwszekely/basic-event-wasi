import type { EventTypesMap } from "../_private/event-types-map.js";

// Worklets don't define `CustomEvent`, even when they do define `Event` itself...
class CustomEvent<T = any> extends Event {

    constructor(type: keyof EventTypesMap, eventInitDict?: CustomEventInit<T>) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail!;
    }

    detail: T;

    initCustomEvent(_type: string, _bubbles?: boolean, _cancelable?: boolean, detail?: T): void {
        // this.type, this.bubbles, and this.cancelable are all readonly...
        this.detail = (detail ?? this.detail)!;
    }
}

(globalThis.CustomEvent as any) ??= (() => {
    console.info(`This environment does not define CustomEvent; using a polyfill`);
    return CustomEvent;
})()