import { finalizeType } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
export function _embind_register_integer(typePtr, namePtr, byteWidth, minValue, maxValue) {
    _embind_register(this, namePtr, async (name) => {
        const isUnsignedType = (minValue === 0);
        const fromWireType = isUnsignedType ? fromWireTypeU(byteWidth) : fromWireTypeS(byteWidth);
        // TODO: min/maxValue aren't used for bounds checking,
        // but if they are, make sure to adjust maxValue for the same signed/unsigned type issue
        // on 32-bit signed int types:
        // maxValue = fromWireType(maxValue);
        finalizeType(this, name, {
            typeId: typePtr,
            fromWireType,
            toWireType: (jsValue) => ({ wireValue: jsValue, jsValue })
        });
    });
}
// We need a separate function for unsigned conversion because WASM only has signed types, 
// even when languages have unsigned types, and it expects the client to manage the transition.
// So this is us, managing the transition.
function fromWireTypeU(byteWidth) {
    // Shift out all the bits higher than what would fit in this integer type,
    // but in particular make sure the negative bit gets cleared out by the >>> at the end.
    const overflowBitCount = 32 - 8 * byteWidth;
    return function (wireValue) {
        return { wireValue, jsValue: ((wireValue << overflowBitCount) >>> overflowBitCount) };
    };
}
function fromWireTypeS(byteWidth) {
    // Shift out all the bits higher than what would fit in this integer type.
    const overflowBitCount = 32 - 8 * byteWidth;
    return function (wireValue) {
        return { wireValue, jsValue: ((wireValue << overflowBitCount) >> overflowBitCount) };
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUlsRSxNQUFNLFVBQVUsd0JBQXdCLENBQXlCLE9BQWUsRUFBRSxPQUFlLEVBQUUsU0FBaUIsRUFBRSxRQUFnQixFQUFFLFFBQWdCO0lBQ3BKLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBRTNDLE1BQU0sY0FBYyxHQUFHLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFMUYsc0RBQXNEO1FBQ3RELHdGQUF3RjtRQUN4Riw4QkFBOEI7UUFDOUIscUNBQXFDO1FBRXJDLFlBQVksQ0FBaUIsSUFBSSxFQUFFLElBQUksRUFBRTtZQUNyQyxNQUFNLEVBQUUsT0FBTztZQUNmLFlBQVk7WUFDWixVQUFVLEVBQUUsQ0FBQyxPQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDO1NBQ3JFLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUdELDJGQUEyRjtBQUMzRiwrRkFBK0Y7QUFDL0YsMENBQTBDO0FBQzFDLFNBQVMsYUFBYSxDQUFDLFNBQWlCO0lBQ3BDLDBFQUEwRTtJQUMxRSx1RkFBdUY7SUFDdkYsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQztJQUM1QyxPQUFPLFVBQVUsU0FBaUI7UUFDOUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztJQUMxRixDQUFDLENBQUE7QUFDTCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsU0FBaUI7SUFDcEMsMEVBQTBFO0lBQzFFLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUM7SUFDNUMsT0FBTyxVQUFVLFNBQWlCO1FBQzlCLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksZ0JBQWdCLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7SUFDekYsQ0FBQyxDQUFBO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBieXRlV2lkdGg6IG51bWJlciwgbWluVmFsdWU6IG51bWJlciwgbWF4VmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkVHlwZSA9IChtaW5WYWx1ZSA9PT0gMCk7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZFR5cGUgPyBmcm9tV2lyZVR5cGVVKGJ5dGVXaWR0aCkgOiBmcm9tV2lyZVR5cGVTKGJ5dGVXaWR0aCk7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IG1pbi9tYXhWYWx1ZSBhcmVuJ3QgdXNlZCBmb3IgYm91bmRzIGNoZWNraW5nLFxyXG4gICAgICAgIC8vIGJ1dCBpZiB0aGV5IGFyZSwgbWFrZSBzdXJlIHRvIGFkanVzdCBtYXhWYWx1ZSBmb3IgdGhlIHNhbWUgc2lnbmVkL3Vuc2lnbmVkIHR5cGUgaXNzdWVcclxuICAgICAgICAvLyBvbiAzMi1iaXQgc2lnbmVkIGludCB0eXBlczpcclxuICAgICAgICAvLyBtYXhWYWx1ZSA9IGZyb21XaXJlVHlwZShtYXhWYWx1ZSk7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKGpzVmFsdWU6IG51bWJlcikgPT4gKHsgd2lyZVZhbHVlOiBqc1ZhbHVlLCBqc1ZhbHVlIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbi8vIFdlIG5lZWQgYSBzZXBhcmF0ZSBmdW5jdGlvbiBmb3IgdW5zaWduZWQgY29udmVyc2lvbiBiZWNhdXNlIFdBU00gb25seSBoYXMgc2lnbmVkIHR5cGVzLCBcclxuLy8gZXZlbiB3aGVuIGxhbmd1YWdlcyBoYXZlIHVuc2lnbmVkIHR5cGVzLCBhbmQgaXQgZXhwZWN0cyB0aGUgY2xpZW50IHRvIG1hbmFnZSB0aGUgdHJhbnNpdGlvbi5cclxuLy8gU28gdGhpcyBpcyB1cywgbWFuYWdpbmcgdGhlIHRyYW5zaXRpb24uXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVUoYnl0ZVdpZHRoOiBudW1iZXIpOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8bnVtYmVyLCBudW1iZXI+W1wiZnJvbVdpcmVUeXBlXCJdIHtcclxuICAgIC8vIFNoaWZ0IG91dCBhbGwgdGhlIGJpdHMgaGlnaGVyIHRoYW4gd2hhdCB3b3VsZCBmaXQgaW4gdGhpcyBpbnRlZ2VyIHR5cGUsXHJcbiAgICAvLyBidXQgaW4gcGFydGljdWxhciBtYWtlIHN1cmUgdGhlIG5lZ2F0aXZlIGJpdCBnZXRzIGNsZWFyZWQgb3V0IGJ5IHRoZSA+Pj4gYXQgdGhlIGVuZC5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+Pj4gb3ZlcmZsb3dCaXRDb3VudCkgfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlUyhieXRlV2lkdGg6IG51bWJlcik6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxudW1iZXIsIG51bWJlcj5bXCJmcm9tV2lyZVR5cGVcIl0ge1xyXG4gICAgLy8gU2hpZnQgb3V0IGFsbCB0aGUgYml0cyBoaWdoZXIgdGhhbiB3aGF0IHdvdWxkIGZpdCBpbiB0aGlzIGludGVnZXIgdHlwZS5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+PiBvdmVyZmxvd0JpdENvdW50KSB9O1xyXG4gICAgfVxyXG59Il19