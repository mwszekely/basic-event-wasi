// Polyfill for extremely limited environments, like Worklets.
// This seems to exist in Chrome but not, e.g., Firefox, possibly Safari
// TODO: This is tiny, but a way to optimize it out for environments that *do* have `Event` would be nice...
class Event {
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
}
;
globalThis.Event ?? (() => {
    console.info(`This environment does not define Event; using a polyfill.`);
    return Event;
})();
export {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9seWZpbGwtZXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcG9seWZpbGwtZXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsOERBQThEO0FBQzlELHdFQUF3RTtBQUN4RSw0R0FBNEc7QUFDM0csTUFBTSxLQUFLO0lBRVIsWUFBWSxLQUFhLEVBQUUsYUFBeUI7UUFDaEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxhQUFhLEVBQUUsT0FBTyxJQUFJLEtBQUssQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLGFBQWEsRUFBRSxVQUFVLElBQUksS0FBSyxDQUFDO1FBQ3JELElBQUksQ0FBQyxRQUFRLEdBQUcsYUFBYSxFQUFFLFFBQVEsSUFBSSxLQUFLLENBQUM7UUFDakQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUM5QixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVGLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLE1BQU0sQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBQzNCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLE9BQU8sQ0FBVTtJQUNqQixZQUFZLENBQVU7SUFDdEIsVUFBVSxDQUFVO0lBQ1gsUUFBUSxDQUFVO0lBQ2xCLGFBQWEsQ0FBcUI7SUFDM0MsZ0JBQWdCLENBQVU7SUFDakIsVUFBVSxDQUFTO0lBQ25CLFNBQVMsQ0FBVTtJQUM1QixXQUFXLENBQVU7SUFDWixVQUFVLENBQXFCO0lBQy9CLE1BQU0sQ0FBcUI7SUFDM0IsU0FBUyxDQUFzQjtJQUN4QyxJQUFJLENBQVM7SUFDYixZQUFZLEtBQW9CLE9BQU8sRUFBRSxDQUFBLENBQUEsQ0FBQztJQUMxQyxTQUFTLENBQUMsS0FBYSxFQUFFLE9BQWlCLEVBQUUsVUFBb0IsSUFBVSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN2TCxjQUFjLEtBQVcsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEQsd0JBQXdCLEtBQVcsQ0FBQztJQUNwQyxlQUFlLEtBQVcsQ0FBQzs7QUFFOUIsQ0FBQztBQUVELFVBQVUsQ0FBQyxLQUFhLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQywyREFBMkQsQ0FBQyxDQUFBO0lBQ3pFLE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxFQUFFLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuLy8gUG9seWZpbGwgZm9yIGV4dHJlbWVseSBsaW1pdGVkIGVudmlyb25tZW50cywgbGlrZSBXb3JrbGV0cy5cclxuLy8gVGhpcyBzZWVtcyB0byBleGlzdCBpbiBDaHJvbWUgYnV0IG5vdCwgZS5nLiwgRmlyZWZveCwgcG9zc2libHkgU2FmYXJpXHJcbi8vIFRPRE86IFRoaXMgaXMgdGlueSwgYnV0IGEgd2F5IHRvIG9wdGltaXplIGl0IG91dCBmb3IgZW52aXJvbm1lbnRzIHRoYXQgKmRvKiBoYXZlIGBFdmVudGAgd291bGQgYmUgbmljZS4uLlxyXG4gY2xhc3MgRXZlbnQge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHR5cGVfOiBzdHJpbmcsIGV2ZW50SW5pdERpY3Q/OiBFdmVudEluaXQpIHsgICBcclxuICAgICAgICB0aGlzLmJ1YmJsZXMgPSBldmVudEluaXREaWN0Py5idWJibGVzIHx8IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY2FuY2VsQnViYmxlID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5jYW5jZWxhYmxlID0gZXZlbnRJbml0RGljdD8uY2FuY2VsYWJsZSB8fCBmYWxzZTtcclxuICAgICAgICB0aGlzLmNvbXBvc2VkID0gZXZlbnRJbml0RGljdD8uY29tcG9zZWQgfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50VGFyZ2V0ID0gbnVsbDtcclxuICAgICAgICB0aGlzLmRlZmF1bHRQcmV2ZW50ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmV2ZW50UGhhc2UgPSBFdmVudC5OT05FO1xyXG4gICAgICAgIHRoaXMuaXNUcnVzdGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnJldHVyblZhbHVlID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5zcmNFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnRhcmdldCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy50aW1lU3RhbXAgPSAwO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGVfO1xyXG4gICAgIH1cclxuXHJcbiAgICBzdGF0aWMgTk9ORSA9IDA7XHJcbiAgICBzdGF0aWMgQ0FQVFVSSU5HX1BIQVNFID0gMTtcclxuICAgIHN0YXRpYyBBVF9UQVJHRVQgPSAyO1xyXG4gICAgc3RhdGljIEJVQkJMSU5HX1BIQVNFID0gMztcclxuXHJcbiAgICBidWJibGVzOiBib29sZWFuO1xyXG4gICAgY2FuY2VsQnViYmxlOiBib29sZWFuO1xyXG4gICAgY2FuY2VsYWJsZTogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IGNvbXBvc2VkOiBib29sZWFuO1xyXG4gICAgcmVhZG9ubHkgY3VycmVudFRhcmdldDogRXZlbnRUYXJnZXQgfCBudWxsO1xyXG4gICAgZGVmYXVsdFByZXZlbnRlZDogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IGV2ZW50UGhhc2U6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IGlzVHJ1c3RlZDogYm9vbGVhbjtcclxuICAgIHJldHVyblZhbHVlOiBib29sZWFuO1xyXG4gICAgcmVhZG9ubHkgc3JjRWxlbWVudDogRXZlbnRUYXJnZXQgfCBudWxsO1xyXG4gICAgcmVhZG9ubHkgdGFyZ2V0OiBFdmVudFRhcmdldCB8IG51bGw7XHJcbiAgICByZWFkb25seSB0aW1lU3RhbXA6IERPTUhpZ2hSZXNUaW1lU3RhbXA7XHJcbiAgICB0eXBlOiBzdHJpbmc7XHJcbiAgICBjb21wb3NlZFBhdGgoKTogRXZlbnRUYXJnZXRbXSB7IHJldHVybiBbXX1cclxuICAgIGluaXRFdmVudCh0eXBlXzogc3RyaW5nLCBidWJibGVzPzogYm9vbGVhbiwgY2FuY2VsYWJsZT86IGJvb2xlYW4pOiB2b2lkIHsgdGhpcy50eXBlID0gdHlwZV87IHRoaXMuYnViYmxlcyA9IGJ1YmJsZXMgfHwgdGhpcy5idWJibGVzOyB0aGlzLmNhbmNlbGFibGUgPSBjYW5jZWxhYmxlIHx8IHRoaXMuY2FuY2VsYWJsZTsgfVxyXG4gICAgcHJldmVudERlZmF1bHQoKTogdm9pZCB7IHRoaXMuZGVmYXVsdFByZXZlbnRlZCA9IHRydWU7IH1cclxuICAgIHN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpOiB2b2lkIHsgfVxyXG4gICAgc3RvcFByb3BhZ2F0aW9uKCk6IHZvaWQgeyB9XHJcbiAgICBcclxufTtcclxuXHJcbihnbG9iYWxUaGlzLkV2ZW50IGFzIGFueSkgPz8gKCgpID0+IHtcclxuICAgIGNvbnNvbGUuaW5mbyhgVGhpcyBlbnZpcm9ubWVudCBkb2VzIG5vdCBkZWZpbmUgRXZlbnQ7IHVzaW5nIGEgcG9seWZpbGwuYClcclxuICAgIHJldHVybiBFdmVudDtcclxufSkoKVxyXG4iXX0=