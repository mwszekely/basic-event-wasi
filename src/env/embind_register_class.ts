import { renameFunction } from "../_private/embind/create-named-function.js";
import { EmboundClass, EmboundClasses, Secret } from "../_private/embind/embound-class.js";
import { finalizeType } from "../_private/embind/finalize.js";
import { getTableFunction } from "../_private/embind/get-table-function.js";
import { _embind_register } from "../_private/embind/register.js";
import { WireConversionResult } from "../_private/embind/types.js";
import { InstantiatedWasi } from "../instantiated-wasi.js";
export { inspectClassByPointer } from "../_private/embind/embound-class.js";


export function _embind_register_class(
    this: InstantiatedWasi<{}>,
    rawType: number,
    rawPointerType: number,
    rawConstPointerType: number,
    baseClassRawType: number,
    getActualTypeSignature: number,
    getActualTypePtr: number,
    upcastSignature: number,
    upcastPtr: number,
    downcastSignature: number,
    downcastPtr: number,
    namePtr: number,
    destructorSignature: number,
    rawDestructorPtr: number): void {

    /**
     * Note: _embind_register_class doesn't have a corresponding `finalize` version,
     * like value_array and value_object have, which is fine I guess?
     * 
     * But it means that we can't just create a class pre-installed with everything it needs--
     * we need to add member functions and properties and such as we get them, and we
     * never really know when we're done.
     */

    _embind_register(this, namePtr, async (name) => {
        const rawDestructorInvoker = getTableFunction<(_this: number) => void>(this, destructorSignature, rawDestructorPtr);

        // TODO(?) It's probably not necessary to have EmboundClasses and this.embind basically be the same exact thing.
        EmboundClasses[rawType] = (this.embind as any)[name] = renameFunction(name,
            // Unlike the constructor, the destructor is known early enough to assign now.
            // Probably because destructors can't be overloaded by anything so there's only ever one.
            // Anyway, assign it to this new class.
            class extends EmboundClass {
                static _destructor = rawDestructorInvoker;
            } as any);

        function fromWireType(_this: number): WireConversionResult<number, EmboundClass> { const jsValue = new EmboundClasses[rawType](Secret, _this); return { wireValue: _this, jsValue, stackDestructor: () => jsValue[Symbol.dispose]() } }
        function toWireType(jsObject: EmboundClass): WireConversionResult<number, EmboundClass> {
            return {
                wireValue: (jsObject as any)._this,
                jsValue: jsObject,
                // Note: no destructors for any of these,
                // because they're just for value-types-as-object-types.
                // Adding it here wouldn't work properly, because it assumes
                // we own the object (when converting from a JS string to std::string, we effectively do, but not here)
            };
        }

        // Wish other types included pointer TypeIDs with them too...
        finalizeType<number, EmboundClass>(this, name, { typeId: rawType, fromWireType, toWireType });
        finalizeType<number, EmboundClass>(this, `${name}*`, { typeId: rawPointerType, fromWireType, toWireType });
        finalizeType<number, EmboundClass>(this, `${name} const*`, { typeId: rawConstPointerType, fromWireType, toWireType });
    });
}
