import { finalizeType, registerEmbound } from "../_private/embind/finalize.js";
import { _embind_register } from "../_private/embind/register.js";
const AllEnums = {};
export function _embind_register_enum(typePtr, namePtr, _size, _isSigned) {
    _embind_register(this, namePtr, (name) => {
        // Create the enum object that the user will inspect to look for enum values
        AllEnums[typePtr] = {};
        // Mark this type as ready to be used by other types 
        // (even if we don't have the enum values yet, enum values
        // themselves aren't used by any registration functions.)
        finalizeType(this, name, {
            typeId: typePtr,
            fromWireType: (wireValue) => { return { wireValue, jsValue: wireValue }; },
            toWireType: (jsValue) => { return { wireValue: jsValue, jsValue }; }
        });
        // Make this type available for the user
        registerEmbound(this, name, AllEnums[typePtr]);
    });
}
export function _embind_register_enum_value(rawEnumType, namePtr, enumValue) {
    _embind_register(this, namePtr, (name) => {
        // Just add this name's value to the existing enum type.
        AllEnums[rawEnumType][name] = enumValue;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iaW5kX3JlZ2lzdGVyX2VudW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9lbnVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHbEUsTUFBTSxRQUFRLEdBQTJDLEVBQUUsQ0FBQztBQUU1RCxNQUFNLFVBQVUscUJBQXFCLENBQXlCLE9BQWUsRUFBRSxPQUFlLEVBQUUsS0FBYSxFQUFFLFNBQWtCO0lBQzdILGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUVyQyw0RUFBNEU7UUFDNUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUV2QixxREFBcUQ7UUFDckQsMERBQTBEO1FBQzFELHlEQUF5RDtRQUN6RCxZQUFZLENBQWlCLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDckMsTUFBTSxFQUFFLE9BQU87WUFDZixZQUFZLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQztZQUN4RSxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFBLENBQUMsQ0FBQztTQUN0RSxDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBR0QsTUFBTSxVQUFVLDJCQUEyQixDQUF5QixXQUFtQixFQUFFLE9BQWUsRUFBRSxTQUFpQjtJQUN2SCxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDckMsd0RBQXdEO1FBQ3hELFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZmluYWxpemVUeXBlLCByZWdpc3RlckVtYm91bmQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5jb25zdCBBbGxFbnVtczogUmVjb3JkPG51bWJlciwgUmVjb3JkPHN0cmluZywgbnVtYmVyPj4gPSB7fTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2VudW0odGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIF9zaXplOiBudW1iZXIsIF9pc1NpZ25lZDogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgdGhlIGVudW0gb2JqZWN0IHRoYXQgdGhlIHVzZXIgd2lsbCBpbnNwZWN0IHRvIGxvb2sgZm9yIGVudW0gdmFsdWVzXHJcbiAgICAgICAgQWxsRW51bXNbdHlwZVB0cl0gPSB7fTtcclxuXHJcbiAgICAgICAgLy8gTWFyayB0aGlzIHR5cGUgYXMgcmVhZHkgdG8gYmUgdXNlZCBieSBvdGhlciB0eXBlcyBcclxuICAgICAgICAvLyAoZXZlbiBpZiB3ZSBkb24ndCBoYXZlIHRoZSBlbnVtIHZhbHVlcyB5ZXQsIGVudW0gdmFsdWVzXHJcbiAgICAgICAgLy8gdGhlbXNlbHZlcyBhcmVuJ3QgdXNlZCBieSBhbnkgcmVnaXN0cmF0aW9uIGZ1bmN0aW9ucy4pXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgbnVtYmVyPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAod2lyZVZhbHVlKSA9PiB7IHJldHVybiB7d2lyZVZhbHVlLCBqc1ZhbHVlOiB3aXJlVmFsdWV9OyB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoanNWYWx1ZSkgPT4geyByZXR1cm4geyB3aXJlVmFsdWU6IGpzVmFsdWUsIGpzVmFsdWUgfSB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIE1ha2UgdGhpcyB0eXBlIGF2YWlsYWJsZSBmb3IgdGhlIHVzZXJcclxuICAgICAgICByZWdpc3RlckVtYm91bmQodGhpcywgbmFtZSBhcyBuZXZlciwgQWxsRW51bXNbdHlwZVB0cl0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd0VudW1UeXBlOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgZW51bVZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgKG5hbWUpID0+IHtcclxuICAgICAgICAvLyBKdXN0IGFkZCB0aGlzIG5hbWUncyB2YWx1ZSB0byB0aGUgZXhpc3RpbmcgZW51bSB0eXBlLlxyXG4gICAgICAgIEFsbEVudW1zW3Jhd0VudW1UeXBlXVtuYW1lXSA9IGVudW1WYWx1ZTtcclxuICAgIH0pXHJcbn0iXX0=