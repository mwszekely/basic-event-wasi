import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { EmboundClasses } from "../_private/embind/embound-class.js";
import { readArrayOfTypes } from "../_private/embind/read-array-of-types.js";
import { _embind_register } from "../_private/embind/register.js";
export function _embind_register_class_class_function(rawClassTypeId, methodNamePtr, argCount, rawArgTypesPtr, invokerSignaturePtr, invokerIndex, invokerContext, isAsync) {
    const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
    _embind_register(this, methodNamePtr, async (name) => {
        EmboundClasses[rawClassTypeId][name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, invokerSignaturePtr, invokerIndex, invokerContext);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSWxFLE1BQU0sVUFBVSxxQ0FBcUMsQ0FDakQsY0FBc0IsRUFDdEIsYUFBcUIsRUFDckIsUUFBZ0IsRUFDaEIsY0FBc0IsRUFDdEIsbUJBQTJCLEVBQzNCLFlBQW9CLEVBQ3BCLGNBQXNCLEVBQ3RCLE9BQWU7SUFFZixNQUFNLENBQUMsWUFBWSxFQUFFLEdBQUcsVUFBVSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUN2RixnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUMvQyxjQUFjLENBQUMsY0FBYyxDQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ3hLLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgbWV0aG9kTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBpc0FzeW5jOiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbWV0aG9kTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICAoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpKVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIl19