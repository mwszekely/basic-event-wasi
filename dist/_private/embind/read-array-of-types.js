import { getPointerSize } from "../../util/pointer.js";
import { readPointer } from "../../util/read-pointer.js";
/**
 * Generally, Embind functions include an array of RTTI TypeIds in the form of
 * [RetType, ThisType?, ...ArgTypes]
 *
 * This returns that array of typeIds for a given function.
 */
export function readArrayOfTypes(impl, count, rawArgTypesPtr) {
    const ret = [];
    const pointerSize = getPointerSize(impl);
    for (let i = 0; i < count; ++i) {
        ret.push(readPointer(impl, rawArgTypesPtr + i * pointerSize));
    }
    return ret;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhZC1hcnJheS1vZi10eXBlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBR3pEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQXNCLEVBQUUsS0FBYSxFQUFFLGNBQXNCO0lBQzFGLE1BQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQztJQUN6QixNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxjQUFjLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uLy4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkUG9pbnRlciB9IGZyb20gXCIuLi8uLi91dGlsL3JlYWQtcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYWxseSwgRW1iaW5kIGZ1bmN0aW9ucyBpbmNsdWRlIGFuIGFycmF5IG9mIFJUVEkgVHlwZUlkcyBpbiB0aGUgZm9ybSBvZlxyXG4gKiBbUmV0VHlwZSwgVGhpc1R5cGU/LCAuLi5BcmdUeXBlc11cclxuICogXHJcbiAqIFRoaXMgcmV0dXJucyB0aGF0IGFycmF5IG9mIHR5cGVJZHMgZm9yIGEgZ2l2ZW4gZnVuY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFycmF5T2ZUeXBlcyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBjb3VudDogbnVtYmVyLCByYXdBcmdUeXBlc1B0cjogbnVtYmVyKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgcmV0OiBudW1iZXJbXSA9IFtdO1xyXG4gICAgY29uc3QgcG9pbnRlclNpemUgPSBnZXRQb2ludGVyU2l6ZShpbXBsKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcclxuICAgICAgICByZXQucHVzaChyZWFkUG9pbnRlcihpbXBsLCByYXdBcmdUeXBlc1B0ciArIGkgKiBwb2ludGVyU2l6ZSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldDtcclxufVxyXG4iXX0=