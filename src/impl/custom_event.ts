import "./event.js";

// Did you know that CustomEvent isn't defined in Worklets? Fun!!
globalThis.CustomEvent ??= class CustomEvent<T = any> extends Event {

    constructor(type: string, eventInitDict?: CustomEventInit<T>) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail!;
    }

    /**
     * Returns any custom data event was created with. Typically used for synthetic events.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
     */
    detail: T;

    /**
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/initCustomEvent)
     */
    initCustomEvent(type: string, bubbles?: boolean, cancelable?: boolean, detail?: T): void { 
        this.detail = (detail ?? this.detail)!;
    }
}
