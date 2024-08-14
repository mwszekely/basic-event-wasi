import { createGlueFunction } from "../_private/embind/create-glue-function.js";
import { EmboundClasses } from "../_private/embind/embound-class.js";
import { readArrayOfTypes } from "../_private/embind/read-array-of-types.js";
import { _embind_register } from "../_private/embind/register.js";
import { InstantiatedWasm } from "../wasm.js";
export function _embind_register_class_class_function(rawClassTypeId, methodNamePtr, argCount, rawArgTypesPtr, invokerSignaturePtr, invokerIndex, invokerContext, isAsync) {
    const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
    _embind_register(this, methodNamePtr, async (name) => {
        EmboundClasses[rawClassTypeId][name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, invokerSignaturePtr, invokerIndex, invokerContext);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUc5QyxNQUFNLFVBQVUscUNBQXFDLENBQ2pELGNBQXNCLEVBQ3RCLGFBQXFCLEVBQ3JCLFFBQWdCLEVBQ2hCLGNBQXNCLEVBQ3RCLG1CQUEyQixFQUMzQixZQUFvQixFQUNwQixjQUFzQixFQUN0QixPQUFlO0lBRWYsTUFBTSxDQUFDLFlBQVksRUFBRSxHQUFHLFVBQVUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDdkYsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDL0MsY0FBYyxDQUFDLGNBQWMsQ0FBVSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztJQUN4SyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBtZXRob2ROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJJbmRleDogbnVtYmVyLFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlcixcclxuICAgIGlzQXN5bmM6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBtZXRob2ROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgICgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIG5hbWUsIHJldHVyblR5cGVJZCwgYXJnVHlwZUlkcywgaW52b2tlclNpZ25hdHVyZVB0ciwgaW52b2tlckluZGV4LCBpbnZva2VyQ29udGV4dCk7XHJcbiAgICB9KTtcclxufVxyXG4iXX0=