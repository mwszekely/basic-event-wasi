export type WireTypes = number | bigint | boolean;
export type TypeID = number;
/**
 * `WireType` refers to whether this type is represented as a `number` or a `bigint`.
 *
 * `bigint`s are only used for `i64` types, or if `-sMEMORY64` is ever supported I suppose.
 */
export interface EmboundRegisteredType<WireType extends WireTypes = WireTypes, T = unknown> {
    /** The name, as exported on the `embind` object. */
    name: string;
    /** The RTTI index that uniquely identifies this type */
    typeId: number;
    /**
     * Sends a JS type to WASM.
     * In addition to the WASM representation (usually a number),
     * its cleanup function is also returned.
     */
    toWireType<U extends T>(valueAsJsType: U): WireConversionResult<WireType, T>;
    /**
     * Gets a value from WASM and copies it to JS.
     * On the WASM side, its cleanup function is called automatically, so it only returns a value
     * (but TODO when is the destructor actually called? The next time the WASM stack is pushed to?)
     */
    fromWireType(wireType: WireType): WireConversionResult<WireType, T>;
}
export interface WireConversionResult<WireType extends WireTypes, V> {
    /** The wire representation of the JS object (generally a pointer)  */
    wireValue: WireType;
    jsValue: V;
    /**
     * This is the type's destructor, if it has one.
     *
     * This is called in stack-like contexts; for example, when passing a string
     * as an argument to a function from JS to WASM, we "push" the string to
     * the stack, run the function, then "pop" it off, like a normal function call.
     */
    stackDestructor?: (value: V, wire: WireType) => void;
}
//# sourceMappingURL=types.d.ts.map