import { runDestructors } from "../_private/embind/destructors.js";
import { finalizeType } from "../_private/embind/finalize.js";
import { getTableFunction } from "../_private/embind/get-table-function.js";
import { _embind_finalize_composite_elements, compositeRegistrations } from "../_private/embind/register-composite.js";
import { _embind_register } from "../_private/embind/register.js";
import { readLatin1String } from "../_private/string.js";
import { InstantiatedWasm } from "../wasm.js";
/**
 * This function is called first, to start the registration of a struct and all its fields.
 */
export function _embind_register_value_object(rawType, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
    compositeRegistrations[rawType] = {
        namePtr,
        _constructor: getTableFunction(this, constructorSignature, rawConstructor),
        _destructor: getTableFunction(this, destructorSignature, rawDestructor),
        elements: [],
    };
}
/**
 * This function is called once per field, after `_embind_register_value_object` and before `_embind_finalize_value_object`.
 */
export function _embind_register_value_object_field(rawTypePtr, fieldName, getterReturnTypeId, getterSignature, getter, getterContext, setterArgumentTypeId, setterSignature, setter, setterContext) {
    compositeRegistrations[rawTypePtr].elements.push({
        name: readLatin1String(this, fieldName),
        getterContext,
        setterContext,
        getterReturnTypeId,
        setterArgumentTypeId,
        wasmGetter: getTableFunction(this, getterSignature, getter),
        wasmSetter: getTableFunction(this, setterSignature, setter),
    });
}
/**
 * Called after all other object registration functions are called; this contains the actual registration code.
 */
export function _embind_finalize_value_object(rawTypePtr) {
    const reg = compositeRegistrations[rawTypePtr];
    delete compositeRegistrations[rawTypePtr];
    _embind_register(this, reg.namePtr, async (name) => {
        const fieldRecords = await _embind_finalize_composite_elements(reg.elements);
        finalizeType(this, name, {
            typeId: rawTypePtr,
            fromWireType: (ptr) => {
                let elementDestructors = [];
                const ret = {};
                /*Object.defineProperty(ret, Symbol.dispose, {
                    value: () => {
                        runDestructors(elementDestructors);
                        reg._destructor(ptr);
                    },
                    enumerable: false,
                    writable: false
                });*/
                for (let i = 0; i < reg.elements.length; ++i) {
                    const field = fieldRecords[i];
                    const { jsValue, wireValue, stackDestructor } = fieldRecords[i].read(ptr);
                    elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
                    Object.defineProperty(ret, field.name, {
                        value: jsValue,
                        writable: false,
                        configurable: false,
                        enumerable: true,
                    });
                }
                Object.freeze(ret);
                return {
                    jsValue: ret,
                    wireValue: ptr,
                    stackDestructor: () => {
                        runDestructors(elementDestructors);
                        reg._destructor(ptr);
                    }
                };
            },
            toWireType: (o) => {
                const ptr = reg._constructor();
                let elementDestructors = [];
                for (let field of fieldRecords) {
                    const { jsValue, wireValue, stackDestructor } = field.write(ptr, o[field.name]);
                    elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
                }
                return {
                    wireValue: ptr,
                    jsValue: o,
                    stackDestructor: () => {
                        runDestructors(elementDestructors);
                        reg._destructor(ptr);
                    }
                };
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxzQkFBc0IsRUFBbU0sTUFBTSwwQ0FBMEMsQ0FBQztBQUN4VCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFhOUM7O0dBRUc7QUFDSCxNQUFNLFVBQVUsNkJBQTZCLENBQXlCLE9BQWUsRUFBRSxPQUFlLEVBQUUsb0JBQTRCLEVBQUUsY0FBc0IsRUFBRSxtQkFBMkIsRUFBRSxhQUFxQjtJQUM1TSxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsR0FBRztRQUM5QixPQUFPO1FBQ1AsWUFBWSxFQUFFLGdCQUFnQixDQUFlLElBQUksRUFBRSxvQkFBb0IsRUFBRSxjQUFjLENBQUM7UUFDeEYsV0FBVyxFQUFFLGdCQUFnQixDQUFhLElBQUksRUFBRSxtQkFBbUIsRUFBRSxhQUFhLENBQUM7UUFDbkYsUUFBUSxFQUFFLEVBQUU7S0FDZixDQUFDO0FBQ04sQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLG1DQUFtQyxDQUE0QixVQUFrQixFQUFFLFNBQWlCLEVBQUUsa0JBQTBCLEVBQUUsZUFBdUIsRUFBRSxNQUFjLEVBQUUsYUFBcUIsRUFBRSxvQkFBNEIsRUFBRSxlQUF1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LENBQUMsR0FBRyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pFLENBQUM7Z0JBQ0QsT0FBTztvQkFDSCxTQUFTLEVBQUUsR0FBRztvQkFDZCxPQUFPLEVBQUUsQ0FBQztvQkFDVixlQUFlLEVBQUUsR0FBRyxFQUFFO3dCQUNsQixjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQzt3QkFDbkMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDeEIsQ0FBQztpQkFDSixDQUFDO1lBQ04sQ0FBQztTQUNKLENBQUMsQ0FBQztJQUVQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50cywgY29tcG9zaXRlUmVnaXN0cmF0aW9ucywgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRSwgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyLCB0eXBlIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFdpcmVUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgcmVhZExhdGluMVN0cmluZyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0UmVnaXN0cmF0aW9uSW5mbyBleHRlbmRzIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8ge1xyXG4gICAgZWxlbWVudHM6IFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxhbnksIGFueT5bXTtcclxufVxyXG5cclxuaW50ZXJmYWNlIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4ge1xyXG4gICAgLyoqIFRoZSBuYW1lIG9mIHRoaXMgZmllbGQgKi9cclxuICAgIG5hbWU6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdULCBUPiB7IH1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmaXJzdCwgdG8gc3RhcnQgdGhlIHJlZ2lzdHJhdGlvbiBvZiBhIHN0cnVjdCBhbmQgYWxsIGl0cyBmaWVsZHMuIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGU6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlXSA9IHtcclxuICAgICAgICBuYW1lUHRyLFxyXG4gICAgICAgIF9jb25zdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbjwoKSA9PiBudW1iZXI+KHRoaXMsIGNvbnN0cnVjdG9yU2lnbmF0dXJlLCByYXdDb25zdHJ1Y3RvciksXHJcbiAgICAgICAgX2Rlc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb248KCkgPT4gdm9pZD4odGhpcywgZGVzdHJ1Y3RvclNpZ25hdHVyZSwgcmF3RGVzdHJ1Y3RvciksXHJcbiAgICAgICAgZWxlbWVudHM6IFtdLFxyXG4gICAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uY2UgcGVyIGZpZWxkLCBhZnRlciBgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RgIGFuZCBiZWZvcmUgYF9lbWJpbmRfZmluYWxpemVfdmFsdWVfb2JqZWN0YC5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdF9maWVsZDxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIGZpZWxkTmFtZTogbnVtYmVyLCBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlciwgZ2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIGdldHRlcjogbnVtYmVyLCBnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsIHNldHRlclNpZ25hdHVyZTogbnVtYmVyLCBzZXR0ZXI6IG51bWJlciwgc2V0dGVyQ29udGV4dDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAoY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXSBhcyBTdHJ1Y3RSZWdpc3RyYXRpb25JbmZvKS5lbGVtZW50cy5wdXNoKHtcclxuICAgICAgICBuYW1lOiByZWFkTGF0aW4xU3RyaW5nKHRoaXMsIGZpZWxkTmFtZSksXHJcbiAgICAgICAgZ2V0dGVyQ29udGV4dCxcclxuICAgICAgICBzZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIGdldHRlclJldHVyblR5cGVJZCxcclxuICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZCxcclxuICAgICAgICB3YXNtR2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8VD4+KHRoaXMsIGdldHRlclNpZ25hdHVyZSwgZ2V0dGVyKSxcclxuICAgICAgICB3YXNtU2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8VD4+KHRoaXMsIHNldHRlclNpZ25hdHVyZSwgc2V0dGVyKSxcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsbGVkIGFmdGVyIGFsbCBvdGhlciBvYmplY3QgcmVnaXN0cmF0aW9uIGZ1bmN0aW9ucyBhcmUgY2FsbGVkOyB0aGlzIGNvbnRhaW5zIHRoZSBhY3R1YWwgcmVnaXN0cmF0aW9uIGNvZGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3Q8VD4odGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb25zdCByZWcgPSBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdO1xyXG4gICAgZGVsZXRlIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCByZWcubmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZmllbGRSZWNvcmRzID0gYXdhaXQgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHM8U3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvRTxhbnksIFQ+PihyZWcuZWxlbWVudHMpO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGUodGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHB0cikgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmV0ID0ge30gYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgLypPYmplY3QuZGVmaW5lUHJvcGVydHkocmV0LCBTeW1ib2wuZGlzcG9zZSwge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkRlc3RydWN0b3JzKGVsZW1lbnREZXN0cnVjdG9ycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9KTsqL1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnLmVsZW1lbnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmllbGQgPSBmaWVsZFJlY29yZHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGRSZWNvcmRzW2ldLnJlYWQocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocmV0LCBmaWVsZC5uYW1lLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBqc1ZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBPYmplY3QuZnJlZXplKHJldCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiByZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkRlc3RydWN0b3JzKGVsZW1lbnREZXN0cnVjdG9ycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdHIgPSByZWcuX2NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmaWVsZCBvZiBmaWVsZFJlY29yZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZC53cml0ZShwdHIsIG9bZmllbGQubmFtZSBhcyBuZXZlcl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiBvLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxufVxyXG5cclxuIl19