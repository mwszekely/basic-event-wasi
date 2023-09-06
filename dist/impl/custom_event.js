import "./event.js";
// Did you know that CustomEvent isn't defined in Worklets? Fun!!
globalThis.CustomEvent ??= class CustomEvent extends Event {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail;
    }
    /**
     * Returns any custom data event was created with. Typically used for synthetic events.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
     */
    detail;
    /**
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/initCustomEvent)
     */
    initCustomEvent(type, bubbles, cancelable, detail) {
        this.detail = (detail ?? this.detail);
    }
};
