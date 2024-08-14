// Worklets don't define `CustomEvent`, even when they do define `Event` itself...
class CustomEvent extends Event {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail;
    }
    detail;
    initCustomEvent(_type, _bubbles, _cancelable, detail) {
        // this.type, this.bubbles, and this.cancelable are all readonly...
        this.detail = (detail ?? this.detail);
    }
}
(globalThis.CustomEvent) ??= (() => {
    // console.info(`This environment does not define CustomEvent; using a polyfill`);
    return CustomEvent;
})();
export {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tLWV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3BvbHlmaWxsL2N1c3RvbS1ldmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxrRkFBa0Y7QUFDbEYsTUFBTSxXQUF5QixTQUFRLEtBQUs7SUFFeEMsWUFBWSxJQUF5QixFQUFFLGFBQWtDO1FBQ3JFLEtBQUssQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxhQUFhLEVBQUUsTUFBZSxDQUFDO0lBQ2pELENBQUM7SUFFRCxNQUFNLENBQUk7SUFFVixlQUFlLENBQUMsS0FBYSxFQUFFLFFBQWtCLEVBQUUsV0FBcUIsRUFBRSxNQUFVO1FBQ2hGLG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUUsQ0FBQztJQUMzQyxDQUFDO0NBQ0o7QUFFRCxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtJQUMvQixrRkFBa0Y7SUFDbEYsT0FBTyxXQUFXLENBQUM7QUFDdkIsQ0FBQyxDQUFDLEVBQVcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgRXZlbnRUeXBlc01hcCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9ldmVudC10eXBlcy1tYXAuanNcIjtcclxuXHJcbi8vIFdvcmtsZXRzIGRvbid0IGRlZmluZSBgQ3VzdG9tRXZlbnRgLCBldmVuIHdoZW4gdGhleSBkbyBkZWZpbmUgYEV2ZW50YCBpdHNlbGYuLi5cclxuY2xhc3MgQ3VzdG9tRXZlbnQ8VCA9IHVua25vd24+IGV4dGVuZHMgRXZlbnQge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHR5cGU6IGtleW9mIEV2ZW50VHlwZXNNYXAsIGV2ZW50SW5pdERpY3Q/OiBDdXN0b21FdmVudEluaXQ8VD4pIHtcclxuICAgICAgICBzdXBlcih0eXBlLCBldmVudEluaXREaWN0KTtcclxuICAgICAgICB0aGlzLmRldGFpbCA9IGV2ZW50SW5pdERpY3Q/LmRldGFpbCBhcyBuZXZlcjtcclxuICAgIH1cclxuXHJcbiAgICBkZXRhaWw6IFQ7XHJcblxyXG4gICAgaW5pdEN1c3RvbUV2ZW50KF90eXBlOiBzdHJpbmcsIF9idWJibGVzPzogYm9vbGVhbiwgX2NhbmNlbGFibGU/OiBib29sZWFuLCBkZXRhaWw/OiBUKTogdm9pZCB7XHJcbiAgICAgICAgLy8gdGhpcy50eXBlLCB0aGlzLmJ1YmJsZXMsIGFuZCB0aGlzLmNhbmNlbGFibGUgYXJlIGFsbCByZWFkb25seS4uLlxyXG4gICAgICAgIHRoaXMuZGV0YWlsID0gKGRldGFpbCA/PyB0aGlzLmRldGFpbCkhO1xyXG4gICAgfVxyXG59XHJcblxyXG4oZ2xvYmFsVGhpcy5DdXN0b21FdmVudCkgPz89ICgoKSA9PiB7XHJcbiAgICAvLyBjb25zb2xlLmluZm8oYFRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3QgZGVmaW5lIEN1c3RvbUV2ZW50OyB1c2luZyBhIHBvbHlmaWxsYCk7XHJcbiAgICByZXR1cm4gQ3VzdG9tRXZlbnQ7XHJcbn0pKCkgYXMgbmV2ZXI7XHJcbiJdfQ==