import { getPointerSize } from "../util/pointer.js";
import { readPointer } from "../util/read-pointer.js";
import { readUint32 } from "../util/read-uint32.js";
export function parse(info, ptr) {
    return {
        bufferStart: readPointer(info, ptr),
        bufferLength: readUint32(info, ptr + getPointerSize(info))
    };
}
export function* parseArray(info, ptr, count) {
    const sizeofStruct = getPointerSize(info) + 4;
    for (let i = 0; i < count; ++i) {
        yield parse(info, ptr + (i * sizeofStruct));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW92ZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvX3ByaXZhdGUvaW92ZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFPcEQsTUFBTSxVQUFVLEtBQUssQ0FBQyxJQUEwQixFQUFFLEdBQVc7SUFDekQsT0FBTztRQUNILFdBQVcsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztRQUNuQyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxHQUFHLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQzdELENBQUE7QUFDTCxDQUFDO0FBRUQsTUFBTSxTQUFTLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBMEIsRUFBRSxHQUFXLEVBQUUsS0FBYTtJQUM5RSxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM3QixNQUFNLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgZ2V0UG9pbnRlclNpemUgfSBmcm9tIFwiLi4vdXRpbC9wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRQb2ludGVyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQzMi5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJb3ZlYyB7XHJcbiAgICBidWZmZXJTdGFydDogbnVtYmVyO1xyXG4gICAgYnVmZmVyTGVuZ3RoOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShpbmZvOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBJb3ZlYyB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJ1ZmZlclN0YXJ0OiByZWFkUG9pbnRlcihpbmZvLCBwdHIpLFxyXG4gICAgICAgIGJ1ZmZlckxlbmd0aDogcmVhZFVpbnQzMihpbmZvLCBwdHIgKyBnZXRQb2ludGVyU2l6ZShpbmZvKSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uKiBwYXJzZUFycmF5KGluZm86IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IG51bWJlciwgY291bnQ6IG51bWJlcik6IEdlbmVyYXRvcjxJb3ZlYywgdm9pZCwgdm9pZD4ge1xyXG4gICAgY29uc3Qgc2l6ZW9mU3RydWN0ID0gZ2V0UG9pbnRlclNpemUoaW5mbykgKyA0O1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XHJcbiAgICAgICAgeWllbGQgcGFyc2UoaW5mbywgcHRyICsgKGkgKiBzaXplb2ZTdHJ1Y3QpKVxyXG4gICAgfVxyXG59XHJcbiJdfQ==