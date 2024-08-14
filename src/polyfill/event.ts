
// Polyfill for extremely limited environments, like Worklets.
// This seems to exist in Chrome but not, e.g., Firefox, possibly Safari
// TODO: This is tiny, but a way to optimize it out for environments that *do* have `Event` would be nice...
class Event {

    constructor(type_: string, eventInitDict?: EventInit) {
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

    bubbles: boolean;
    cancelBubble: boolean;
    cancelable: boolean;
    readonly composed: boolean;
    readonly currentTarget: EventTarget | null;
    defaultPrevented: boolean;
    readonly eventPhase: number;
    readonly isTrusted: boolean;
    returnValue: boolean;
    readonly srcElement: EventTarget | null;
    readonly target: EventTarget | null;
    readonly timeStamp: DOMHighResTimeStamp;
    type: string;
    composedPath(): EventTarget[] { return [] }
    initEvent(type_: string, bubbles?: boolean, cancelable?: boolean): void { this.type = type_; this.bubbles = bubbles || this.bubbles; this.cancelable = cancelable || this.cancelable; }
    preventDefault(): void { this.defaultPrevented = true; }
    stopImmediatePropagation(): void { }
    stopPropagation(): void { }

};

(globalThis.Event as any) ?? (() => {
    console.info(`This environment does not define Event; using a polyfill.`)
    return Event;
})()
