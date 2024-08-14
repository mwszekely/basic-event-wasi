// ../dist/util/read-uint32.js
function readUint32(instance, ptr) {
  return instance.cachedMemoryView.getUint32(ptr, true);
}

// ../dist/util/read-uint8.js
function readUint8(instance, ptr) {
  return instance.cachedMemoryView.getUint8(ptr);
}

// ../dist/_private/string.js
function readLatin1String(impl, ptr) {
  let ret = "";
  let nextByte;
  while (nextByte = readUint8(impl, ptr++)) {
    ret += String.fromCharCode(nextByte);
  }
  return ret;
}
var utf8Decoder = new TextDecoder("utf-8");
var utf16Decoder = new TextDecoder("utf-16le");
var utf8Encoder = new TextEncoder();
function utf8ToStringZ(impl, ptr) {
  const start = ptr;
  let end = start;
  while (readUint8(impl, end++) != 0)
    ;
  return utf8ToStringL(impl, start, end - start - 1);
}
function utf8ToStringL(impl, ptr, byteCount) {
  return utf8Decoder.decode(new Uint8Array(impl.exports.memory.buffer, ptr, byteCount));
}
function utf16ToStringL(impl, ptr, wcharCount) {
  return utf16Decoder.decode(new Uint8Array(impl.exports.memory.buffer, ptr, wcharCount * 2));
}
function utf32ToStringL(impl, ptr, wcharCount) {
  const chars = new Uint32Array(impl.exports.memory.buffer, ptr, wcharCount);
  let ret = "";
  for (let ch of chars) {
    ret += String.fromCharCode(ch);
  }
  return ret;
}
function stringToUtf8(string) {
  return utf8Encoder.encode(string).buffer;
}
function stringToUtf16(string) {
  let ret = new Uint16Array(new ArrayBuffer(string.length));
  for (let i = 0; i < ret.length; ++i) {
    ret[i] = string.charCodeAt(i);
  }
  return ret.buffer;
}
function stringToUtf32(string) {
  let trueLength = 0;
  let temp = new Uint32Array(new ArrayBuffer(string.length * 4 * 2));
  for (const ch of string) {
    temp[trueLength] = ch.codePointAt(0);
    ++trueLength;
  }
  return temp.buffer.slice(0, trueLength * 4);
}

// ../dist/_private/embind/register.js
function _embind_register(impl, namePtr, func) {
  _embind_register_known_name(impl, readLatin1String(impl, namePtr), func);
}
function _embind_register_known_name(impl, name, func) {
  const promise = (async () => {
    let handle = 0;
    if (typeof setTimeout === "function")
      handle = setTimeout(() => {
        console.warn(`The function "${name}" uses an unsupported argument or return type, as its dependencies are not resolving. It's unlikely the embind promise will resolve.`);
      }, 1e3);
    await func(name);
    if (handle)
      clearTimeout(handle);
  })();
  AllEmbindPromises.push(promise);
}
async function awaitAllEmbind() {
  await Promise.all(AllEmbindPromises);
}
var AllEmbindPromises = new Array();

// ../dist/wasm.js
var EventTargetW = EventTarget;
var InstantiatedWasm = class _InstantiatedWasm extends EventTargetW {
  /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
  module;
  /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
  instance;
  /**
   * Contains everything exported using embind.
   *
   * These are separate from regular exports on `instance.export`.
   */
  embind;
  /**
   * The "raw" WASM exports. None are prefixed with "_".
   *
   * No conversion is performed on the types here; everything takes or returns a number.
   *
   */
  exports;
  /**
   * `exports.memory`, but updated when/if more memory is allocated.
   *
   * Generally speaking, it's more convenient to use the general-purpose `readUint32` functions,
   * since they account for `DataView` being big-endian by default.
   */
  cachedMemoryView;
  /**
   * Not intended to be called directly. Use the static `instantiate` function instead, which returns one of these.
   *
   * I want to instead just return a promise here sooooooo badly...
   */
  constructor() {
    super();
    this.module = this.instance = this.exports = this.cachedMemoryView = null;
    this.embind = {};
  }
  static async instantiate(wasmDataOrFetcher, { wasi_snapshot_preview1, env, ...unboundImports }) {
    let wasm;
    let module;
    let instance;
    wasm = new _InstantiatedWasm();
    const imports = {
      wasi_snapshot_preview1: bindAllFuncs(wasm, wasi_snapshot_preview1),
      env: bindAllFuncs(wasm, env),
      ...unboundImports
    };
    if (wasmDataOrFetcher instanceof WebAssembly.Module) {
      instance = await WebAssembly.instantiate(wasmDataOrFetcher, imports);
      module = wasmDataOrFetcher;
    } else if (wasmDataOrFetcher instanceof ArrayBuffer || ArrayBuffer.isView(wasmDataOrFetcher))
      ({ instance, module } = await WebAssembly.instantiate(wasmDataOrFetcher, imports));
    else if (isResponse(wasmDataOrFetcher))
      ({ instance, module } = await WebAssembly.instantiateStreaming(wasmDataOrFetcher, imports));
    else
      ({ instance, module } = await wasmDataOrFetcher(imports));
    wasm.instance = instance;
    wasm.module = module;
    wasm.exports = wasm.instance.exports;
    wasm.cachedMemoryView = new DataView(wasm.exports.memory.buffer);
    console.assert("_initialize" in wasm.instance.exports != "_start" in wasm.instance.exports, `Expected either _initialize XOR _start to be exported from this WASM.`);
    if ("_initialize" in wasm.instance.exports)
      wasm.instance.exports._initialize();
    else if ("_start" in wasm.instance.exports)
      wasm.instance.exports._start();
    await awaitAllEmbind();
    return wasm;
  }
};
function bindAllFuncs(p2, r) {
  return Object.fromEntries(Object.entries(r).map(([key, func]) => {
    return [key, typeof func == "function" ? func.bind(p2) : func];
  }));
}
function isResponse(arg) {
  return "then" in arg || "Response" in globalThis && arg instanceof Response;
}

// ../dist/env/alignfault.js
var AlignfaultError = class extends Error {
  constructor() {
    super("Alignment fault");
  }
};
function alignfault() {
  throw new AlignfaultError();
}

// ../dist/_private/embind/get-type-info.js
var DependenciesToWaitFor = /* @__PURE__ */ new Map();
async function getTypeInfo(...typeIds) {
  return await Promise.all(typeIds.map(async (typeId) => {
    if (!typeId)
      return Promise.resolve(null);
    let withResolvers = getDependencyResolvers(typeId);
    return await withResolvers.promise;
  }));
}
function getDependencyResolvers(typeId) {
  let withResolvers = DependenciesToWaitFor.get(typeId);
  if (withResolvers === void 0)
    DependenciesToWaitFor.set(typeId, withResolvers = { resolvedValue: void 0, ...Promise.withResolvers() });
  return withResolvers;
}

// ../dist/_private/embind/finalize.js
function registerEmbound(impl, name, value) {
  impl.embind[name] = value;
}
function finalizeType(impl, name, parsedTypeInfo) {
  const info = { name, ...parsedTypeInfo };
  let withResolvers = getDependencyResolvers(info.typeId);
  withResolvers.resolve(withResolvers.resolvedValue = info);
}

// ../dist/env/embind_register_bigint.js
function _embind_register_bigint(rawTypePtr, namePtr, size, minRange, maxRange) {
  _embind_register(this, namePtr, async (name) => {
    const isUnsigned = minRange === 0n;
    const fromWireType = isUnsigned ? fromWireTypeUnsigned : fromWireTypeSigned;
    finalizeType(this, name, {
      typeId: rawTypePtr,
      fromWireType,
      toWireType: (value) => ({ wireValue: value, jsValue: value })
    });
  });
}
function fromWireTypeSigned(wireValue) {
  return { wireValue, jsValue: BigInt(wireValue) };
}
function fromWireTypeUnsigned(wireValue) {
  return { wireValue, jsValue: BigInt(wireValue) & 0xffffffffffffffffn };
}

// ../dist/env/embind_register_bool.js
function _embind_register_bool(rawTypePtr, namePtr, trueValue, falseValue) {
  _embind_register(this, namePtr, (name) => {
    finalizeType(this, name, {
      typeId: rawTypePtr,
      fromWireType: (wireValue) => {
        return { jsValue: !!wireValue, wireValue };
      },
      toWireType: (o) => {
        return { wireValue: o ? trueValue : falseValue, jsValue: o };
      }
    });
  });
}

// ../dist/_private/embind/create-named-function.js
function renameFunction(name, body) {
  return Object.defineProperty(body, "name", { value: name });
}

// ../dist/_private/embind/embound-class.js
var EmboundClasses = {};
var instantiatedClasses = /* @__PURE__ */ new Map();
var destructorsYetToBeCalled = /* @__PURE__ */ new Map();
var Secret = Symbol();
var SecretNoDispose = Symbol();
var registry = new FinalizationRegistry((_this) => {
  console.warn(`WASM class at address ${_this} was not properly disposed.`);
  destructorsYetToBeCalled.get(_this)?.();
});
var EmboundClass = class {
  /**
   * The transformed constructor function that takes JS arguments and returns a new instance of this class
   */
  static _constructor;
  /**
   * Assigned by the derived class when that class is registered.
   *
   * This one is not transformed because it only takes a pointer and returns nothing.
   */
  static _destructor;
  /**
   * The pointer to the class in WASM memory; the same as the C++ `this` pointer.
   */
  _this;
  constructor(...args) {
    const CreatedFromWasm = args.length === 2 && (args[0] === Secret || args[0] == SecretNoDispose) && typeof args[1] === "number";
    if (!CreatedFromWasm) {
      return new.target._constructor(...args);
    } else {
      const _this = args[1];
      const existing = instantiatedClasses.get(_this)?.deref();
      if (existing)
        return existing;
      this._this = _this;
      instantiatedClasses.set(_this, new WeakRef(this));
      registry.register(this, _this);
      if (args[0] != SecretNoDispose) {
        const destructor = new.target._destructor;
        destructorsYetToBeCalled.set(_this, () => {
          destructor(_this);
          instantiatedClasses.delete(_this);
        });
      }
    }
  }
  [Symbol.dispose]() {
    const destructor = destructorsYetToBeCalled.get(this._this);
    if (destructor) {
      destructorsYetToBeCalled.get(this._this)?.();
      destructorsYetToBeCalled.delete(this._this);
      this._this = 0;
    }
  }
};

// ../dist/_private/embind/get-table-function.js
function getTableFunction(impl, signaturePtr, functionIndex) {
  const fp = impl.exports.__indirect_function_table.get(functionIndex);
  console.assert(typeof fp == "function");
  return fp;
}

// ../dist/env/embind_register_class.js
function _embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualTypePtr, upcastSignature, upcastPtr, downcastSignature, downcastPtr, namePtr, destructorSignature, rawDestructorPtr) {
  _embind_register(this, namePtr, async (name) => {
    const rawDestructorInvoker = getTableFunction(this, destructorSignature, rawDestructorPtr);
    EmboundClasses[rawType] = this.embind[name] = renameFunction(
      name,
      // Unlike the constructor, the destructor is known early enough to assign now.
      // Probably because destructors can't be overloaded by anything so there's only ever one.
      // Anyway, assign it to this new class.
      class extends EmboundClass {
        static _destructor = rawDestructorInvoker;
      }
    );
    function fromWireType(_this) {
      const jsValue = new EmboundClasses[rawType](Secret, _this);
      return { wireValue: _this, jsValue, stackDestructor: () => jsValue[Symbol.dispose]() };
    }
    function toWireType(jsObject) {
      return {
        wireValue: jsObject._this,
        jsValue: jsObject
        // Note: no destructors for any of these,
        // because they're just for value-types-as-object-types.
        // Adding it here wouldn't work properly, because it assumes
        // we own the object (when converting from a JS string to std::string, we effectively do, but not here)
      };
    }
    finalizeType(this, name, { typeId: rawType, fromWireType, toWireType });
    finalizeType(this, `${name}*`, { typeId: rawPointerType, fromWireType, toWireType });
    finalizeType(this, `${name} const*`, { typeId: rawConstPointerType, fromWireType, toWireType });
  });
}

// ../dist/_private/embind/destructors.js
function runDestructors(destructors) {
  while (destructors.length) {
    destructors.pop()();
  }
}

// ../dist/_private/embind/create-glue-function.js
async function createGlueFunction(impl, name, returnTypeId, argTypeIds, invokerSignature, invokerIndex, invokerContext) {
  const [returnType, ...argTypes] = await getTypeInfo(returnTypeId, ...argTypeIds);
  const rawInvoker = getTableFunction(impl, invokerSignature, invokerIndex);
  return renameFunction(name, function(...jsArgs) {
    const wiredThis = this ? this._this : void 0;
    const wiredArgs = [];
    const stackBasedDestructors = [];
    if (invokerContext)
      wiredArgs.push(invokerContext);
    if (wiredThis)
      wiredArgs.push(wiredThis);
    for (let i = 0; i < argTypes.length; ++i) {
      const type = argTypes[i];
      const arg = jsArgs[i];
      const { jsValue: jsValue2, wireValue: wireValue2, stackDestructor: stackDestructor2 } = type.toWireType(arg);
      wiredArgs.push(wireValue2);
      if (stackDestructor2)
        stackBasedDestructors.push(() => stackDestructor2(jsValue2, wireValue2));
    }
    let wiredReturn = rawInvoker(...wiredArgs);
    runDestructors(stackBasedDestructors);
    if (returnType == null)
      return void 0;
    const { jsValue, wireValue, stackDestructor } = returnType?.fromWireType(wiredReturn);
    if (stackDestructor && !(jsValue && typeof jsValue == "object" && Symbol.dispose in jsValue))
      stackDestructor(jsValue, wireValue);
    return jsValue;
  });
}

// ../dist/util/is-64.js
var Is64 = false;

// ../dist/util/pointer.js
var PointerSize = Is64 ? 8 : 4;
var getPointer = Is64 ? "getBigUint64" : "getUint32";
function getPointerSize(_instance) {
  return PointerSize;
}

// ../dist/util/read-pointer.js
function readPointer(instance, ptr) {
  return instance.cachedMemoryView[getPointer](ptr, true);
}

// ../dist/_private/embind/read-array-of-types.js
function readArrayOfTypes(impl, count, rawArgTypesPtr) {
  const ret = [];
  const pointerSize = getPointerSize(impl);
  for (let i = 0; i < count; ++i) {
    ret.push(readPointer(impl, rawArgTypesPtr + i * pointerSize));
  }
  return ret;
}

// ../dist/env/embind_register_class_class_function.js
function _embind_register_class_class_function(rawClassTypeId, methodNamePtr, argCount, rawArgTypesPtr, invokerSignaturePtr, invokerIndex, invokerContext, isAsync) {
  const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
  _embind_register(this, methodNamePtr, async (name) => {
    EmboundClasses[rawClassTypeId][name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, invokerSignaturePtr, invokerIndex, invokerContext);
  });
}

// ../dist/env/embind_register_class_constructor.js
function _embind_register_class_constructor(rawClassTypeId, argCount, rawArgTypesPtr, invokerSignaturePtr, invokerIndex, invokerContext) {
  const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
  _embind_register_known_name(this, "<constructor>", async () => {
    EmboundClasses[rawClassTypeId]._constructor = await createGlueFunction(this, "<constructor>", returnTypeId, argTypeIds, invokerSignaturePtr, invokerIndex, invokerContext);
  });
}

// ../dist/env/embind_register_class_function.js
function _embind_register_class_function(rawClassTypeId, methodNamePtr, argCount, rawArgTypesPtr, invokerSignaturePtr, invokerIndex, invokerContext, isPureVirtual, isAsync) {
  const [returnTypeId, thisTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
  _embind_register(this, methodNamePtr, async (name) => {
    EmboundClasses[rawClassTypeId].prototype[name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, invokerSignaturePtr, invokerIndex, invokerContext);
  });
}

// ../dist/env/embind_register_class_property.js
function _embind_register_class_property(rawClassTypeId, fieldNamePtr, getterReturnTypeId, getterSignaturePtr, getterIndex, getterContext, setterArgumentTypeId, setterSignaturePtr, setterIndex, setterContext) {
  _embind_register(this, fieldNamePtr, async (name) => {
    const get = await createGlueFunction(this, `${name}_getter`, getterReturnTypeId, [], getterSignaturePtr, getterIndex, getterContext);
    const set = setterIndex ? await createGlueFunction(this, `${name}_setter`, 0, [setterArgumentTypeId], setterSignaturePtr, setterIndex, setterContext) : void 0;
    Object.defineProperty(EmboundClasses[rawClassTypeId].prototype, name, {
      get,
      set
    });
  });
}

// ../dist/env/embind_register_constant.js
function _embind_register_constant(namePtr, typePtr, valueAsWireType) {
  _embind_register(this, namePtr, async (constName) => {
    const [type] = await getTypeInfo(typePtr);
    const value = type.fromWireType(valueAsWireType);
    registerEmbound(this, constName, value.jsValue);
  });
}

// ../dist/env/embind_register_emval.js
function _embind_register_emval(typePtr) {
}
function _emval_take_value(rawTypePtr, ptr) {
  return 0;
}
function _emval_decref(handle) {
  return 0;
}

// ../dist/env/embind_register_enum.js
var AllEnums = {};
function _embind_register_enum(typePtr, namePtr, size, isSigned) {
  _embind_register(this, namePtr, async (name) => {
    AllEnums[typePtr] = {};
    finalizeType(this, name, {
      typeId: typePtr,
      fromWireType: (wireValue) => {
        return { wireValue, jsValue: wireValue };
      },
      toWireType: (jsValue) => {
        return { wireValue: jsValue, jsValue };
      }
    });
    registerEmbound(this, name, AllEnums[typePtr]);
  });
}
function _embind_register_enum_value(rawEnumType, namePtr, enumValue) {
  _embind_register(this, namePtr, async (name) => {
    AllEnums[rawEnumType][name] = enumValue;
  });
}

// ../dist/env/embind_register_float.js
function _embind_register_float(typePtr, namePtr, byteWidth) {
  _embind_register(this, namePtr, async (name) => {
    finalizeType(this, name, {
      typeId: typePtr,
      fromWireType: (value) => ({ wireValue: value, jsValue: value }),
      toWireType: (value) => ({ wireValue: value, jsValue: value })
    });
  });
}

// ../dist/env/embind_register_function.js
function _embind_register_function(namePtr, argCount, rawArgTypesPtr, signature, rawInvokerPtr, functionIndex, isAsync) {
  const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
  _embind_register(this, namePtr, async (name) => {
    this.embind[name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, signature, rawInvokerPtr, functionIndex);
  });
}

// ../dist/env/embind_register_integer.js
function _embind_register_integer(typePtr, namePtr, byteWidth, minValue, maxValue) {
  _embind_register(this, namePtr, async (name) => {
    const isUnsignedType = minValue === 0;
    const fromWireType = isUnsignedType ? fromWireTypeU(byteWidth) : fromWireTypeS(byteWidth);
    finalizeType(this, name, {
      typeId: typePtr,
      fromWireType,
      toWireType: (jsValue) => ({ wireValue: jsValue, jsValue })
    });
  });
}
function fromWireTypeU(byteWidth) {
  const overflowBitCount = 32 - 8 * byteWidth;
  return function(wireValue) {
    return { wireValue, jsValue: wireValue << overflowBitCount >>> overflowBitCount };
  };
}
function fromWireTypeS(byteWidth) {
  const overflowBitCount = 32 - 8 * byteWidth;
  return function(wireValue) {
    return { wireValue, jsValue: wireValue << overflowBitCount >> overflowBitCount };
  };
}

// ../dist/env/embind_register_memory_view.js
function _embind_register_memory_view(ex) {
}

// ../dist/util/sizet.js
var SizeTSize = PointerSize;
var setSizeT = Is64 ? "setBigUint64" : "setUint32";
var getSizeT = Is64 ? "getBigUint64" : "getUint32";
function getSizeTSize(_instance) {
  return SizeTSize;
}

// ../dist/util/read-sizet.js
function readSizeT(instance, ptr) {
  return instance.cachedMemoryView[getSizeT](ptr, true);
}

// ../dist/util/write-sizet.js
function writeSizeT(instance, ptr, value) {
  instance.cachedMemoryView[setSizeT](ptr, value, true);
}

// ../dist/util/write-uint16.js
function writeUint16(instance, ptr, value) {
  return instance.cachedMemoryView.setUint16(ptr, value, true);
}

// ../dist/util/write-uint32.js
function writeUint32(instance, ptr, value) {
  return instance.cachedMemoryView.setUint32(ptr, value, true);
}

// ../dist/util/write-uint8.js
function writeUint8(instance, ptr, value) {
  return instance.cachedMemoryView.setUint8(ptr, value);
}

// ../dist/_private/embind/register-std-string.js
function _embind_register_std_string_any(impl, typePtr, charWidth, namePtr) {
  const utfToStringL = charWidth == 1 ? utf8ToStringL : charWidth == 2 ? utf16ToStringL : utf32ToStringL;
  const stringToUtf = charWidth == 1 ? stringToUtf8 : charWidth == 2 ? stringToUtf16 : stringToUtf32;
  const UintArray = charWidth == 1 ? Uint8Array : charWidth == 2 ? Uint16Array : Uint32Array;
  const writeUint = charWidth == 1 ? writeUint8 : charWidth == 2 ? writeUint16 : writeUint32;
  _embind_register(impl, namePtr, async (name) => {
    const fromWireType = (ptr) => {
      let length = readSizeT(impl, ptr);
      let payload = ptr + getSizeTSize(impl);
      let str = "";
      let decodeStartPtr = payload;
      str = utfToStringL(impl, decodeStartPtr, length);
      return {
        jsValue: str,
        wireValue: ptr,
        stackDestructor: () => {
          impl.exports.free(ptr);
        }
      };
    };
    const toWireType = (str) => {
      const valueAsArrayBufferInJS = new UintArray(stringToUtf(str));
      const charCountWithoutNull = valueAsArrayBufferInJS.length;
      const charCountWithNull = charCountWithoutNull + 1;
      const byteCountWithoutNull = charCountWithoutNull * charWidth;
      const byteCountWithNull = charCountWithNull * charWidth;
      const wasmStringStruct = impl.exports.malloc(getSizeTSize(impl) + byteCountWithNull);
      const stringStart = wasmStringStruct + getSizeTSize(impl);
      writeSizeT(impl, wasmStringStruct, charCountWithoutNull);
      const destination = new UintArray(impl.exports.memory.buffer, stringStart, byteCountWithoutNull);
      destination.set(valueAsArrayBufferInJS);
      writeUint(impl, stringStart + byteCountWithoutNull, 0);
      return {
        stackDestructor: () => impl.exports.free(wasmStringStruct),
        wireValue: wasmStringStruct,
        jsValue: str
      };
    };
    finalizeType(impl, name, {
      typeId: typePtr,
      fromWireType,
      toWireType
    });
  });
}

// ../dist/env/embind_register_std_string.js
function _embind_register_std_string(typePtr, namePtr) {
  return _embind_register_std_string_any(this, typePtr, 1, namePtr);
}

// ../dist/env/embind_register_std_wstring.js
function _embind_register_std_wstring(typePtr, charWidth, namePtr) {
  return _embind_register_std_string_any(this, typePtr, charWidth, namePtr);
}

// ../dist/env/embind_register_user_type.js
function _embind_register_user_type(...args) {
  debugger;
}

// ../dist/_private/embind/register-composite.js
var compositeRegistrations = {};
function _embind_register_value_composite(impl, rawTypePtr, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
  compositeRegistrations[rawTypePtr] = {
    namePtr,
    _constructor: getTableFunction(impl, constructorSignature, rawConstructor),
    _destructor: getTableFunction(impl, destructorSignature, rawDestructor),
    elements: []
  };
}
async function _embind_finalize_composite_elements(elements) {
  const dependencyIds = [...elements.map((elt) => elt.getterReturnTypeId), ...elements.map((elt) => elt.setterArgumentTypeId)];
  const dependencies = await getTypeInfo(...dependencyIds);
  console.assert(dependencies.length == elements.length * 2);
  const fieldRecords = elements.map((field, i) => {
    const getterReturnType = dependencies[i];
    const setterArgumentType = dependencies[i + elements.length];
    function read(ptr) {
      return getterReturnType.fromWireType(field.wasmGetter(field.getterContext, ptr));
    }
    function write(ptr, o) {
      const ret = setterArgumentType.toWireType(o);
      field.wasmSetter(field.setterContext, ptr, ret.wireValue);
      return ret;
    }
    return {
      getterReturnType,
      setterArgumentType,
      read,
      write,
      ...field
    };
  });
  return fieldRecords;
}

// ../dist/env/embind_register_value_array.js
function _embind_register_value_array(rawTypePtr, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
  _embind_register_value_composite(this, rawTypePtr, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor);
}
function _embind_register_value_array_element(rawTupleType, getterReturnTypeId, getterSignature, getter, getterContext, setterArgumentTypeId, setterSignature, setter, setterContext) {
  compositeRegistrations[rawTupleType].elements.push({
    getterContext,
    setterContext,
    getterReturnTypeId,
    setterArgumentTypeId,
    wasmGetter: getTableFunction(this, getterSignature, getter),
    wasmSetter: getTableFunction(this, setterSignature, setter)
  });
}
function _embind_finalize_value_array(rawTypePtr) {
  const reg = compositeRegistrations[rawTypePtr];
  delete compositeRegistrations[rawTypePtr];
  _embind_register(this, reg.namePtr, async (name) => {
    const fieldRecords = await _embind_finalize_composite_elements(reg.elements);
    finalizeType(this, name, {
      typeId: rawTypePtr,
      fromWireType: (ptr) => {
        let elementDestructors = [];
        const ret = [];
        for (let i = 0; i < reg.elements.length; ++i) {
          const field = fieldRecords[i];
          const { jsValue, wireValue, stackDestructor } = fieldRecords[i].read(ptr);
          elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
          ret[i] = jsValue;
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
        let elementDestructors = [];
        const ptr = reg._constructor();
        let i = 0;
        for (let field of fieldRecords) {
          const { jsValue, wireValue, stackDestructor } = field.write(ptr, o[i]);
          elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
          ++i;
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

// ../dist/env/embind_register_value_object.js
function _embind_register_value_object(rawType, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
  compositeRegistrations[rawType] = {
    namePtr,
    _constructor: getTableFunction(this, constructorSignature, rawConstructor),
    _destructor: getTableFunction(this, destructorSignature, rawDestructor),
    elements: []
  };
}
function _embind_register_value_object_field(rawTypePtr, fieldName, getterReturnTypeId, getterSignature, getter, getterContext, setterArgumentTypeId, setterSignature, setter, setterContext) {
  compositeRegistrations[rawTypePtr].elements.push({
    name: readLatin1String(this, fieldName),
    getterContext,
    setterContext,
    getterReturnTypeId,
    setterArgumentTypeId,
    wasmGetter: getTableFunction(this, getterSignature, getter),
    wasmSetter: getTableFunction(this, setterSignature, setter)
  });
}
function _embind_finalize_value_object(rawTypePtr) {
  const reg = compositeRegistrations[rawTypePtr];
  delete compositeRegistrations[rawTypePtr];
  _embind_register(this, reg.namePtr, async (name) => {
    const fieldRecords = await _embind_finalize_composite_elements(reg.elements);
    finalizeType(this, name, {
      typeId: rawTypePtr,
      fromWireType: (ptr) => {
        let elementDestructors = [];
        const ret = {};
        for (let i = 0; i < reg.elements.length; ++i) {
          const field = fieldRecords[i];
          const { jsValue, wireValue, stackDestructor } = fieldRecords[i].read(ptr);
          elementDestructors.push(() => stackDestructor?.(jsValue, wireValue));
          Object.defineProperty(ret, field.name, {
            value: jsValue,
            writable: false,
            configurable: false,
            enumerable: true
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

// ../dist/env/embind_register_void.js
function _embind_register_void(rawTypePtr, namePtr) {
  _embind_register(this, namePtr, (name) => {
    finalizeType(this, name, {
      typeId: rawTypePtr,
      fromWireType: () => ({ jsValue: void 0, wireValue: void 0 }),
      toWireType: () => ({ jsValue: void 0, wireValue: void 0 })
    });
  });
}

// ../dist/env/emscripten_notify_memory_growth.js
var MemoryGrowthEvent = class extends CustomEvent {
  constructor(impl, index) {
    super("MemoryGrowthEvent", { cancelable: false, detail: { index } });
  }
};
function emscripten_notify_memory_growth(index) {
  this.cachedMemoryView = new DataView(this.exports.memory.buffer);
  this.dispatchEvent(new MemoryGrowthEvent(this, index));
}

// ../dist/env/segfault.js
var SegfaultError = class extends Error {
  constructor() {
    super("Segmentation fault");
  }
};
function segfault() {
  throw new SegfaultError();
}

// ../dist/_private/exception.js
function getExceptionMessage(impl, ex) {
  var ptr = getCppExceptionThrownObjectFromWebAssemblyException(impl, ex);
  return getExceptionMessageCommon(impl, ptr);
}
function getCppExceptionThrownObjectFromWebAssemblyException(impl, ex) {
  const unwind_header = ex.getArg(impl.exports.__cpp_exception, 0);
  return impl.exports.__thrown_object_from_unwind_exception(unwind_header);
}
function stackSave(impl) {
  return impl.exports.emscripten_stack_get_current();
}
function stackAlloc(impl, size) {
  return impl.exports._emscripten_stack_alloc(size);
}
function stackRestore(impl, stackPointer) {
  return impl.exports._emscripten_stack_restore(stackPointer);
}
function getExceptionMessageCommon(impl, ptr) {
  const sp = stackSave(impl);
  const type_addr_addr = stackAlloc(impl, getPointerSize(impl));
  const message_addr_addr = stackAlloc(impl, getPointerSize(impl));
  impl.exports.__get_exception_message(ptr, type_addr_addr, message_addr_addr);
  const type_addr = readPointer(impl, type_addr_addr);
  const message_addr = readPointer(impl, message_addr_addr);
  const type = utf8ToStringZ(impl, type_addr);
  impl.exports.free(type_addr);
  let message = "";
  if (message_addr) {
    message = utf8ToStringZ(impl, message_addr);
    impl.exports.free(message_addr);
  }
  stackRestore(impl, sp);
  return [type, message];
}

// ../dist/env/throw_exception_with_stack_trace.js
function __throw_exception_with_stack_trace(ex) {
  const t = new WebAssembly.Exception(this.exports.__cpp_exception, [ex], { traceStack: true });
  t.message = getExceptionMessage(this, t);
  throw t;
}

// ../dist/env/tzset_js.js
function _tzset_js(timezone, daylight, std_name, dst_name) {
  debugger;
}

// ../dist/errno.js
var ESUCCESS = 0;
var EBADF = 8;
var EINVAL = 28;
var ENOSYS = 52;

// ../dist/util/write-uint64.js
function writeUint64(instance, ptr, value) {
  return instance.cachedMemoryView.setBigUint64(ptr, value, true);
}

// ../dist/wasi_snapshot_preview1/clock_time_get.js
var ClockId;
(function(ClockId2) {
  ClockId2[ClockId2["REALTIME"] = 0] = "REALTIME";
  ClockId2[ClockId2["MONOTONIC"] = 1] = "MONOTONIC";
  ClockId2[ClockId2["PROCESS_CPUTIME_ID"] = 2] = "PROCESS_CPUTIME_ID";
  ClockId2[ClockId2["THREAD_CPUTIME_ID"] = 3] = "THREAD_CPUTIME_ID";
})(ClockId || (ClockId = {}));
var p = globalThis.performance;
function clock_time_get(clk_id, _precision, outPtr) {
  let nowMs;
  switch (clk_id) {
    case ClockId.REALTIME:
      nowMs = Date.now();
      break;
    case ClockId.MONOTONIC:
      if (p == null)
        return ENOSYS;
      nowMs = p.now();
      break;
    case ClockId.PROCESS_CPUTIME_ID:
    case ClockId.THREAD_CPUTIME_ID:
      return ENOSYS;
    default:
      return EINVAL;
  }
  const nowNs = BigInt(Math.round(nowMs * 1e3 * 1e3));
  writeUint64(this, outPtr, nowNs);
  return ESUCCESS;
}

// ../dist/wasi_snapshot_preview1/environ_get.js
function environ_get(environCountOutput, environSizeOutput) {
  writeUint32(this, environCountOutput, 0);
  writeUint32(this, environSizeOutput, 0);
  return 0;
}

// ../dist/wasi_snapshot_preview1/environ_sizes_get.js
function environ_sizes_get(environCountOutput, environSizeOutput) {
  writeUint32(this, environCountOutput, 0);
  writeUint32(this, environSizeOutput, 0);
  return 0;
}

// ../dist/wasi_snapshot_preview1/fd_close.js
var FileDescriptorCloseEvent = class extends CustomEvent {
  constructor(fileDescriptor) {
    super("fd_close", { cancelable: true, detail: { fileDescriptor } });
  }
};
function fd_close(fd) {
  const event = new FileDescriptorCloseEvent(fd);
  if (this.dispatchEvent(event)) {
  }
}

// ../dist/_private/iovec.js
function parse(info, ptr) {
  return {
    bufferStart: readPointer(info, ptr),
    bufferLength: readUint32(info, ptr + getPointerSize(info))
  };
}
function* parseArray(info, ptr, count) {
  const sizeofStruct = getPointerSize(info) + 4;
  for (let i = 0; i < count; ++i) {
    yield parse(info, ptr + i * sizeofStruct);
  }
}

// ../dist/wasi_snapshot_preview1/fd_read.js
var FileDescriptorReadEvent = class extends CustomEvent {
  _bytesWritten = 0;
  constructor(impl, fileDescriptor, requestedBufferInfo) {
    super("fd_read", {
      bubbles: false,
      cancelable: true,
      detail: {
        fileDescriptor,
        requestedBuffers: requestedBufferInfo,
        readIntoMemory: (inputBuffers) => {
          for (let i = 0; i < requestedBufferInfo.length; ++i) {
            if (i >= inputBuffers.length)
              break;
            const buffer = inputBuffers[i];
            for (let j = 0; j < Math.min(buffer.byteLength, inputBuffers[j].byteLength); ++j) {
              writeUint8(impl, requestedBufferInfo[i].bufferStart + j, buffer[j]);
              ++this._bytesWritten;
            }
          }
        }
      }
    });
  }
  bytesWritten() {
    return this._bytesWritten;
  }
};
function fd_read(fd, iov, iovcnt, pnum) {
  let nWritten = 0;
  const gen = parseArray(this, iov, iovcnt);
  const event = new FileDescriptorReadEvent(this, fd, [...gen]);
  if (this.dispatchEvent(event)) {
    nWritten = 0;
  } else {
    nWritten = event.bytesWritten();
  }
  writeUint32(this, pnum, nWritten);
  return 0;
}

// ../dist/wasi_snapshot_preview1/fd_seek.js
var FileDescriptorSeekEvent = class extends CustomEvent {
  constructor(fileDescriptor) {
    super("fd_seek", { cancelable: true, detail: { fileDescriptor } });
  }
};
function fd_seek(fd, offset, whence, offsetOut) {
  if (this.dispatchEvent(new FileDescriptorSeekEvent(fd))) {
    switch (fd) {
      case 0:
        break;
      case 1:
        break;
      case 2:
        break;
      default:
        return EBADF;
    }
  }
  return ESUCCESS;
}

// ../dist/wasi_snapshot_preview1/fd_write.js
var FileDescriptorWriteEvent = class extends CustomEvent {
  constructor(fileDescriptor, data) {
    super("fd_write", { bubbles: false, cancelable: true, detail: { data, fileDescriptor } });
  }
  asString(label) {
    return this.detail.data.map((d, index) => {
      let decoded = getTextDecoder(label).decode(d);
      if (decoded == "\0" && index == this.detail.data.length - 1)
        return "";
      return decoded;
    }).join("");
  }
};
function fd_write(fd, iov, iovcnt, pnum) {
  let nWritten = 0;
  const gen = parseArray(this, iov, iovcnt);
  const asTypedArrays = [...gen].map(({ bufferStart, bufferLength }) => {
    nWritten += bufferLength;
    return new Uint8Array(this.cachedMemoryView.buffer, bufferStart, bufferLength);
  });
  const event = new FileDescriptorWriteEvent(fd, asTypedArrays);
  if (this.dispatchEvent(event)) {
    const str = event.asString("utf-8");
    if (fd == 1)
      console.log(str);
    else if (fd == 2)
      console.error(str);
    else
      return EBADF;
  }
  writeUint32(this, pnum, nWritten);
  return ESUCCESS;
}
var textDecoders = /* @__PURE__ */ new Map();
function getTextDecoder(label) {
  let ret = textDecoders.get(label);
  if (!ret) {
    ret = new TextDecoder(label);
    textDecoders.set(label, ret);
  }
  return ret;
}

// ../dist/wasi_snapshot_preview1/proc_exit.js
var AbortEvent = class extends CustomEvent {
  code;
  constructor(code) {
    super("proc_exit", { bubbles: false, cancelable: false, detail: { code } });
    this.code = code;
  }
};
var AbortError = class extends Error {
  constructor(code) {
    super(`abort(${code}) was called`);
  }
};
function proc_exit(code) {
  this.dispatchEvent(new AbortEvent(code));
  throw new AbortError(code);
}

// stage/instantiate.ts
async function instantiate(where, uninstantiated) {
  let wasm = await InstantiatedWasm.instantiate(uninstantiated ?? fetch(new URL("wasm.wasm", import.meta.url)), {
    env: {
      __throw_exception_with_stack_trace,
      emscripten_notify_memory_growth,
      _embind_register_void,
      _embind_register_bool,
      _embind_register_integer,
      _embind_register_bigint,
      _embind_register_float,
      _embind_register_std_string,
      _embind_register_std_wstring,
      _embind_register_emval,
      _embind_register_memory_view,
      _embind_register_function,
      _embind_register_constant,
      _embind_register_value_array,
      _embind_register_value_array_element,
      _embind_finalize_value_array,
      _embind_register_value_object_field,
      _embind_register_value_object,
      _embind_finalize_value_object,
      _embind_register_class,
      _embind_register_class_property,
      _embind_register_class_class_function,
      _embind_register_class_constructor,
      _embind_register_class_function,
      _embind_register_enum,
      _embind_register_enum_value,
      _emval_take_value,
      _emval_decref,
      _embind_register_user_type,
      _tzset_js,
      segfault,
      alignfault
    },
    wasi_snapshot_preview1: {
      fd_close,
      fd_read,
      fd_seek,
      fd_write,
      environ_get,
      environ_sizes_get,
      proc_exit,
      clock_time_get
    }
  });
  wasm.addEventListener("fd_write", (e) => {
    if (e.detail.fileDescriptor == 1) {
      e.preventDefault();
      const value = e.asString("utf-8");
      console.log(`${where}: ${value}`);
    }
  });
  return wasm;
}
export {
  instantiate
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC11aW50MzIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC11aW50OC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc20udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9hbGlnbmZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXR5cGUtaW5mby50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvaXMtNjQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcG9pbnRlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXBvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldy50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQxNi50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50MzIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92b2lkLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3NlZ2ZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9leGNlcHRpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3R6c2V0X2pzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lcnJuby50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50NjQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvY2xvY2tfdGltZV9nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9zaXplc19nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfY2xvc2UudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2lvdmVjLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3JlYWQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfc2Vlay50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF93cml0ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9wcm9jX2V4aXQudHMiLCAiLi4vLi4vaW5zdGFudGlhdGUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkVWludDMyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IFBvaW50ZXI8bnVtYmVyPik6IG51bWJlciB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LmdldFVpbnQzMihwdHIsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFVpbnQ4KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IFBvaW50ZXI8bnVtYmVyPik6IG51bWJlciB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LmdldFVpbnQ4KHB0cik7IH1cclxuIiwgImltcG9ydCB7IHJlYWRVaW50MTYgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQxNi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQ4IH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50OC5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbi8qKlxyXG4gKiBUT0RPOiBDYW4ndCBDKysgaWRlbnRpZmllcnMgaW5jbHVkZSBub24tQVNDSUkgY2hhcmFjdGVycz8gXHJcbiAqIFdoeSBkbyBhbGwgdGhlIHR5cGUgZGVjb2RpbmcgZnVuY3Rpb25zIHVzZSB0aGlzP1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRMYXRpbjFTdHJpbmcoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICBsZXQgbmV4dEJ5dGU6IG51bWJlclxyXG4gICAgd2hpbGUgKG5leHRCeXRlID0gcmVhZFVpbnQ4KGltcGwsIHB0cisrKSkge1xyXG4gICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHRCeXRlKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbi8vIE5vdGU6IEluIFdvcmtsZXRzLCBgVGV4dERlY29kZXJgIGFuZCBgVGV4dEVuY29kZXJgIG5lZWQgYSBwb2x5ZmlsbC5cclxubGV0IHV0ZjhEZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLThcIik7XHJcbmxldCB1dGYxNkRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtMTZsZVwiKTtcclxubGV0IHV0ZjhFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG51bGwtdGVybWluYXRlZCBVVEYtOCBzdHJpbmcuIElmIHlvdSBrbm93IHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgeW91IGNhbiBzYXZlIHRpbWUgYnkgdXNpbmcgYHV0ZjhUb1N0cmluZ0xgIGluc3RlYWQuXHJcbiAqIFxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIHB0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdXRmOFRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzdGFydCA9IHB0cjtcclxuICAgIGxldCBlbmQgPSBzdGFydDtcclxuXHJcbiAgICB3aGlsZSAocmVhZFVpbnQ4KGltcGwsIGVuZCsrKSAhPSAwKTtcclxuXHJcbiAgICByZXR1cm4gdXRmOFRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjE2VG9TdHJpbmdaKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gcHRyO1xyXG4gICAgbGV0IGVuZCA9IHN0YXJ0O1xyXG5cclxuICAgIHdoaWxlIChyZWFkVWludDE2KGltcGwsIGVuZCkgIT0gMCkgeyBlbmQgKz0gMjsgfVxyXG5cclxuICAgIHJldHVybiB1dGYxNlRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMzJUb1N0cmluZ1ooaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50MzIoaW1wbCwgZW5kKSAhPSAwKSB7IGVuZCArPSA0OyB9XHJcblxyXG4gICAgcmV0dXJuIHV0ZjMyVG9TdHJpbmdMKGltcGwsIHN0YXJ0LCBlbmQgLSBzdGFydCAtIDEpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdXRmOFRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgYnl0ZUNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHV0ZjhEZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCBieXRlQ291bnQpKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMTZUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdXRmMTZEZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCB3Y2hhckNvdW50ICogMikpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYzMlRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgd2NoYXJDb3VudDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGNoYXJzID0gKG5ldyBVaW50MzJBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCB3Y2hhckNvdW50KSk7XHJcbiAgICBsZXQgcmV0ID0gXCJcIjtcclxuICAgIGZvciAobGV0IGNoIG9mIGNoYXJzKSB7XHJcbiAgICAgICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2gpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmOChzdHJpbmc6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcclxuICAgIHJldHVybiB1dGY4RW5jb2Rlci5lbmNvZGUoc3RyaW5nKS5idWZmZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1V0ZjE2KHN0cmluZzogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xyXG4gICAgbGV0IHJldCA9IG5ldyBVaW50MTZBcnJheShuZXcgQXJyYXlCdWZmZXIoc3RyaW5nLmxlbmd0aCkpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZXQubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICByZXRbaV0gPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQuYnVmZmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nVG9VdGYzMihzdHJpbmc6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcclxuICAgIGxldCB0cnVlTGVuZ3RoID0gMDtcclxuICAgIC8vIFRoZSB3b3JzdC1jYXNlIHNjZW5hcmlvIGlzIGEgc3RyaW5nIG9mIGFsbCBzdXJyb2dhdGUtcGFpcnMsIHNvIGFsbG9jYXRlIHRoYXQuXHJcbiAgICAvLyBXZSdsbCBzaHJpbmsgaXQgdG8gdGhlIGFjdHVhbCBzaXplIGFmdGVyd2FyZHMuXHJcbiAgICBsZXQgdGVtcCA9IG5ldyBVaW50MzJBcnJheShuZXcgQXJyYXlCdWZmZXIoc3RyaW5nLmxlbmd0aCAqIDQgKiAyKSk7XHJcbiAgICBmb3IgKGNvbnN0IGNoIG9mIHN0cmluZykge1xyXG4gICAgICAgIHRlbXBbdHJ1ZUxlbmd0aF0gPSBjaC5jb2RlUG9pbnRBdCgwKSE7XHJcbiAgICAgICAgKyt0cnVlTGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0ZW1wLmJ1ZmZlci5zbGljZSgwLCB0cnVlTGVuZ3RoICogNCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVc2VkIHdoZW4gc2VuZGluZyBzdHJpbmdzIGZyb20gSlMgdG8gV0FTTS5cclxuICogXHJcbiAqIFxyXG4gKiBAcGFyYW0gc3RyIFxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsZW5ndGhCeXRlc1VURjgoc3RyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgbGV0IGxlbiA9IDA7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGxldCBjID0gc3RyLmNvZGVQb2ludEF0KGkpITtcclxuICAgICAgICBpZiAoYyA8PSAweDdGKVxyXG4gICAgICAgICAgICBsZW4rKztcclxuICAgICAgICBlbHNlIGlmIChjIDw9IDB4N0ZGKVxyXG4gICAgICAgICAgICBsZW4gKz0gMjtcclxuICAgICAgICBlbHNlIGlmIChjIDw9IDB4N0ZGRilcclxuICAgICAgICAgICAgbGVuICs9IDM7XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGxlbiArPSA0O1xyXG4gICAgICAgICAgICArK2k7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlbjtcclxufSIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgcmVhZExhdGluMVN0cmluZyB9IGZyb20gXCIuLi9zdHJpbmcuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlcmluZyBhIHR5cGUgaXMgYW4gYXN5bmMgZnVuY3Rpb24gY2FsbGVkIGJ5IGEgc3luYyBmdW5jdGlvbi4gVGhpcyBoYW5kbGVzIHRoZSBjb252ZXJzaW9uLCBhZGRpbmcgdGhlIHByb21pc2UgdG8gYEFsbEVtYmluZFByb21pc2VzYC5cclxuICogXHJcbiAqIEFsc28sIGJlY2F1c2UgZXZlcnkgc2luZ2xlIHJlZ2lzdHJhdGlvbiBjb21lcyB3aXRoIGEgbmFtZSB0aGF0IG5lZWRzIHRvIGJlIHBhcnNlZCwgdGhpcyBhbHNvIHBhcnNlcyB0aGF0IG5hbWUgZm9yIHlvdS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIG5hbWVQdHI6IG51bWJlciwgZnVuYzogKG5hbWU6IHN0cmluZykgPT4gKHZvaWQgfCBQcm9taXNlPHZvaWQ+KSk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKGltcGwsIHJlYWRMYXRpbjFTdHJpbmcoaW1wbCwgbmFtZVB0ciksIGZ1bmMpO1xyXG59XHJcblxyXG4vKiogXHJcbiAqIFNhbWUgYXMgYF9lbWJpbmRfcmVnaXN0ZXJgLCBidXQgZm9yIGtub3duIChvciBzeW50aGV0aWMpIG5hbWVzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBuYW1lOiBzdHJpbmcsIGZ1bmM6IChuYW1lOiBzdHJpbmcpID0+ICh2b2lkIHwgUHJvbWlzZTx2b2lkPikpOiB2b2lkIHtcclxuXHJcbiAgICBjb25zdCBwcm9taXNlOiBQcm9taXNlPHZvaWQ+ID0gKGFzeW5jICgpID0+IHtcclxuICAgICAgICBsZXQgaGFuZGxlID0gMDtcclxuICAgICAgICAvLyBGdW4gZmFjdDogc2V0VGltZW91dCBkb2Vzbid0IGV4aXN0IGluIFdvcmtsZXRzISBcclxuICAgICAgICAvLyBJIGd1ZXNzIGl0IHZhZ3VlbHkgbWFrZXMgc2Vuc2UgaW4gYSBcImRldGVybWluaXNtIGlzIGdvb2RcIiB3YXksIFxyXG4gICAgICAgIC8vIGJ1dCBpdCBhbHNvIHNlZW1zIGdlbmVyYWxseSB1c2VmdWwgdGhlcmU/XHJcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKVxyXG4gICAgICAgICAgICBoYW5kbGUgPSBzZXRUaW1lb3V0KCgpID0+IHsgY29uc29sZS53YXJuKGBUaGUgZnVuY3Rpb24gXCIke25hbWV9XCIgdXNlcyBhbiB1bnN1cHBvcnRlZCBhcmd1bWVudCBvciByZXR1cm4gdHlwZSwgYXMgaXRzIGRlcGVuZGVuY2llcyBhcmUgbm90IHJlc29sdmluZy4gSXQncyB1bmxpa2VseSB0aGUgZW1iaW5kIHByb21pc2Ugd2lsbCByZXNvbHZlLmApOyB9LCAxMDAwKSBhcyBhbnk7XHJcbiAgICAgICAgYXdhaXQgZnVuYyhuYW1lKTtcclxuICAgICAgICBpZiAoaGFuZGxlKVxyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcclxuICAgIH0pKCk7XHJcblxyXG4gICAgQWxsRW1iaW5kUHJvbWlzZXMucHVzaChwcm9taXNlKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGF3YWl0QWxsRW1iaW5kKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoQWxsRW1iaW5kUHJvbWlzZXMpO1xyXG59XHJcblxyXG5jb25zdCBBbGxFbWJpbmRQcm9taXNlcyA9IG5ldyBBcnJheTxQcm9taXNlPHZvaWQ+PigpO1xyXG5cclxuIiwgImltcG9ydCB7IGF3YWl0QWxsRW1iaW5kIH0gZnJvbSBcIi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRXZlbnRUeXBlc01hcCB9IGZyb20gXCIuL19wcml2YXRlL2V2ZW50LXR5cGVzLW1hcC5qc1wiO1xyXG5pbXBvcnQgeyB0eXBlIEtub3duRXhwb3J0cywgdHlwZSBLbm93bkltcG9ydHMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCB0eXBlIFJvbGx1cFdhc21Qcm9taXNlPEkgZXh0ZW5kcyBLbm93bkltcG9ydHMgPSBLbm93bkltcG9ydHM+ID0gKGltcG9ydHM/OiBJKSA9PiBQcm9taXNlPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPjtcclxuXHJcblxyXG5cclxuaW50ZXJmYWNlIEluc3RhbnRpYXRlZFdhc21FdmVudFRhcmdldCBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXI8SyBleHRlbmRzIGtleW9mIEV2ZW50VHlwZXNNYXA+KHR5cGU6IEssIGxpc3RlbmVyOiAodGhpczogRmlsZVJlYWRlciwgZXY6IEV2ZW50VHlwZXNNYXBbS10pID0+IGFueSwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHZvaWQ7XHJcbiAgICBhZGRFdmVudExpc3RlbmVyKHR5cGU6IHN0cmluZywgY2FsbGJhY2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgfCBudWxsLCBvcHRpb25zPzogRXZlbnRMaXN0ZW5lck9wdGlvbnMgfCBib29sZWFuKTogdm9pZDtcclxufVxyXG5cclxuXHJcbi8vICBUaGlzIHJlYXNzaWdubWVudCBpcyBhIFR5cGVzY3JpcHQgaGFjayB0byBhZGQgY3VzdG9tIHR5cGVzIHRvIGFkZEV2ZW50TGlzdGVuZXIuLi5cclxuY29uc3QgRXZlbnRUYXJnZXRXID0gRXZlbnRUYXJnZXQgYXMgeyBuZXcoKTogSW5zdGFudGlhdGVkV2FzbUV2ZW50VGFyZ2V0OyBwcm90b3R5cGU6IEluc3RhbnRpYXRlZFdhc21FdmVudFRhcmdldCB9O1xyXG5cclxuLyoqXHJcbiAqIEV4dGVuc2lvbiBvZiBgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2VgIHRoYXQgaXMgYWxzbyBhbiBgRXZlbnRUYXJnZXRgIGZvciBhbGwgV0FTSSBcImV2ZW50XCJzICh3aGljaCwgeWVzLCBpcyB3aHkgdGhpcyBpcyBhbiBlbnRpcmUgYGNsYXNzYCkuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzIGV4dGVuZHMge30gPSB7fSwgRW1iaW5kIGV4dGVuZHMge30gPSB7fT4gZXh0ZW5kcyBFdmVudFRhcmdldFcgaW1wbGVtZW50cyBXZWJBc3NlbWJseS5XZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZSB7XHJcbiAgICAvKiogVGhlIGBXZWJBc3NlbWJseS5Nb2R1bGVgIHRoaXMgaW5zdGFuY2Ugd2FzIGJ1aWx0IGZyb20uIFJhcmVseSB1c2VmdWwgYnkgaXRzZWxmLiAqL1xyXG4gICAgcHVibGljIG1vZHVsZTogV2ViQXNzZW1ibHkuTW9kdWxlO1xyXG5cclxuICAgIC8qKiBUaGUgYFdlYkFzc2VtYmx5Lk1vZHVsZWAgdGhpcyBpbnN0YW5jZSB3YXMgYnVpbHQgZnJvbS4gUmFyZWx5IHVzZWZ1bCBieSBpdHNlbGYuICovXHJcbiAgICBwdWJsaWMgaW5zdGFuY2U6IFdlYkFzc2VtYmx5Lkluc3RhbmNlO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29udGFpbnMgZXZlcnl0aGluZyBleHBvcnRlZCB1c2luZyBlbWJpbmQuXHJcbiAgICAgKiBcclxuICAgICAqIFRoZXNlIGFyZSBzZXBhcmF0ZSBmcm9tIHJlZ3VsYXIgZXhwb3J0cyBvbiBgaW5zdGFuY2UuZXhwb3J0YC5cclxuICAgICAqL1xyXG4gICAgcHVibGljIGVtYmluZDogRW1iaW5kO1xyXG5cclxuICAgIC8qKiBcclxuICAgICAqIFRoZSBcInJhd1wiIFdBU00gZXhwb3J0cy4gTm9uZSBhcmUgcHJlZml4ZWQgd2l0aCBcIl9cIi5cclxuICAgICAqIFxyXG4gICAgICogTm8gY29udmVyc2lvbiBpcyBwZXJmb3JtZWQgb24gdGhlIHR5cGVzIGhlcmU7IGV2ZXJ5dGhpbmcgdGFrZXMgb3IgcmV0dXJucyBhIG51bWJlci5cclxuICAgICAqIFxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgZXhwb3J0czogRXhwb3J0cyAmIEtub3duRXhwb3J0cztcclxuXHJcbiAgICAvKipcclxuICAgICAqIGBleHBvcnRzLm1lbW9yeWAsIGJ1dCB1cGRhdGVkIHdoZW4vaWYgbW9yZSBtZW1vcnkgaXMgYWxsb2NhdGVkLlxyXG4gICAgICogXHJcbiAgICAgKiBHZW5lcmFsbHkgc3BlYWtpbmcsIGl0J3MgbW9yZSBjb252ZW5pZW50IHRvIHVzZSB0aGUgZ2VuZXJhbC1wdXJwb3NlIGByZWFkVWludDMyYCBmdW5jdGlvbnMsXHJcbiAgICAgKiBzaW5jZSB0aGV5IGFjY291bnQgZm9yIGBEYXRhVmlld2AgYmVpbmcgYmlnLWVuZGlhbiBieSBkZWZhdWx0LlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgY2FjaGVkTWVtb3J5VmlldzogRGF0YVZpZXc7XHJcblxyXG4gICAgLyoqIFxyXG4gICAgICogTm90IGludGVuZGVkIHRvIGJlIGNhbGxlZCBkaXJlY3RseS4gVXNlIHRoZSBzdGF0aWMgYGluc3RhbnRpYXRlYCBmdW5jdGlvbiBpbnN0ZWFkLCB3aGljaCByZXR1cm5zIG9uZSBvZiB0aGVzZS5cclxuICAgICAqIFxyXG4gICAgICogSSB3YW50IHRvIGluc3RlYWQganVzdCByZXR1cm4gYSBwcm9taXNlIGhlcmUgc29vb29vb28gYmFkbHkuLi5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMubW9kdWxlID0gdGhpcy5pbnN0YW5jZSA9IHRoaXMuZXhwb3J0cyA9IHRoaXMuY2FjaGVkTWVtb3J5VmlldyA9IG51bGwhXHJcbiAgICAgICAgdGhpcy5lbWJpbmQgPSB7fSBhcyBuZXZlcjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbnN0YW50aWF0ZXMgYSBXQVNNIG1vZHVsZSB3aXRoIHRoZSBzcGVjaWZpZWQgV0FTSSBpbXBvcnRzLlxyXG4gICAgICogXHJcbiAgICAgKiBgaW5wdXRgIGNhbiBiZSBhbnkgb25lIG9mOlxyXG4gICAgICogXHJcbiAgICAgKiAqIGBSZXNwb25zZWAgb3IgYFByb21pc2U8UmVzcG9uc2U+YCAoZnJvbSBlLmcuIGBmZXRjaGApLiBVc2VzIGBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZ2AuXHJcbiAgICAgKiAqIGBBcnJheUJ1ZmZlcmAgcmVwcmVzZW50aW5nIHRoZSBXQVNNIGluIGJpbmFyeSBmb3JtLCBvciBhIGBXZWJBc3NlbWJseS5Nb2R1bGVgLiBcclxuICAgICAqICogQSBmdW5jdGlvbiB0aGF0IHRha2VzIDEgYXJndW1lbnQgb2YgdHlwZSBgV2ViQXNzZW1ibHkuSW1wb3J0c2AgYW5kIHJldHVybnMgYSBgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2VgLiBUaGlzIGlzIHRoZSB0eXBlIHRoYXQgYEByb2xsdXAvcGx1Z2luLXdhc21gIHJldHVybnMgd2hlbiBidW5kbGluZyBhIHByZS1idWlsdCBXQVNNIGJpbmFyeS5cclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHdhc21GZXRjaFByb21pc2UgXHJcbiAgICAgKiBAcGFyYW0gdW5ib3VuZEltcG9ydHMgXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBhc3luYyBpbnN0YW50aWF0ZTxFeHBvcnRzIGV4dGVuZHMge30sIEVtYmluZCBleHRlbmRzIHt9Pih3YXNtRmV0Y2hQcm9taXNlOiBSZXNwb25zZSB8IFByb21pc2VMaWtlPFJlc3BvbnNlPiwgdW5ib3VuZEltcG9ydHM6IEtub3duSW1wb3J0cyk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzLCBFbWJpbmQ+PjtcclxuICAgIHN0YXRpYyBhc3luYyBpbnN0YW50aWF0ZTxFeHBvcnRzIGV4dGVuZHMge30sIEVtYmluZCBleHRlbmRzIHt9Pihtb2R1bGVCeXRlczogV2ViQXNzZW1ibHkuTW9kdWxlIHwgQnVmZmVyU291cmNlLCB1bmJvdW5kSW1wb3J0czogS25vd25JbXBvcnRzKTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNtPEV4cG9ydHMsIEVtYmluZD4+O1xyXG4gICAgc3RhdGljIGFzeW5jIGluc3RhbnRpYXRlPEV4cG9ydHMgZXh0ZW5kcyB7fSwgRW1iaW5kIGV4dGVuZHMge30+KHdhc21JbnN0YW50aWF0b3I6IFJvbGx1cFdhc21Qcm9taXNlLCB1bmJvdW5kSW1wb3J0czogS25vd25JbXBvcnRzKTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNtPEV4cG9ydHMsIEVtYmluZD4+O1xyXG4gICAgc3RhdGljIGFzeW5jIGluc3RhbnRpYXRlPEV4cG9ydHMgZXh0ZW5kcyB7fSwgRW1iaW5kIGV4dGVuZHMge30+KHdhc21EYXRhT3JGZXRjaGVyOiBSb2xsdXBXYXNtUHJvbWlzZSB8IFdlYkFzc2VtYmx5Lk1vZHVsZSB8IEJ1ZmZlclNvdXJjZSB8IFJlc3BvbnNlIHwgUHJvbWlzZUxpa2U8UmVzcG9uc2U+LCB7IHdhc2lfc25hcHNob3RfcHJldmlldzEsIGVudiwgLi4udW5ib3VuZEltcG9ydHMgfTogS25vd25JbXBvcnRzKTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNtPEV4cG9ydHMsIEVtYmluZD4+IHtcclxuICAgICAgICAvLyAoVGhlc2UgYXJlIGp1c3QgdXAgaGVyZSB0byBub3QgZ2V0IGluIHRoZSB3YXkgb2YgdGhlIGNvbW1lbnRzKVxyXG4gICAgICAgIGxldCB3YXNtOiBJbnN0YW50aWF0ZWRXYXNtPEV4cG9ydHMsIEVtYmluZD47XHJcbiAgICAgICAgbGV0IG1vZHVsZTogV2ViQXNzZW1ibHkuTW9kdWxlO1xyXG4gICAgICAgIGxldCBpbnN0YW5jZTogV2ViQXNzZW1ibHkuSW5zdGFuY2U7XHJcblxyXG5cclxuICAgICAgICAvLyBUaGVyZSdzIGEgYml0IG9mIHNvbmcgYW5kIGRhbmNlIHRvIGdldCBhcm91bmQgdGhlIGZhY3QgdGhhdDpcclxuICAgICAgICAvLyAxLiBXQVNNIG5lZWRzIGl0cyBXQVNJIGltcG9ydHMgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLlxyXG4gICAgICAgIC8vIDIuIFdBU0kgbmVlZHMgaXRzIFdBU00gYEluc3RhbmNlYCBpbiBvcmRlciB0byBmdW5jdGlvbi5cclxuXHJcbiAgICAgICAgLy8gRmlyc3QsIGJpbmQgYWxsIG9mIG91ciBpbXBvcnRzIHRvIHRoZSBzYW1lIG9iamVjdCwgXHJcbiAgICAgICAgLy8gd2hpY2ggYWxzbyBoYXBwZW5zIHRvIGJlIHRoZSBJbnN0YW50aWF0ZWRXYXNtIHdlJ3JlIHJldHVybmluZyAoYnV0IGNvdWxkIHRoZW9yZXRpY2FsbHkgYmUgc29tZXRoaW5nIGVsc2UpLlxyXG4gICAgICAgIC8vIFRoaXMgaXMgaG93IHRoZXknbGwgYmUgYWJsZSB0byBhY2Nlc3MgbWVtb3J5IGFuZCBjb21tdW5pY2F0ZSB3aXRoIGVhY2ggb3RoZXIuXHJcbiAgICAgICAgd2FzbSA9IG5ldyBJbnN0YW50aWF0ZWRXYXNtPEV4cG9ydHMsIEVtYmluZD4oKTtcclxuICAgICAgICBjb25zdCBpbXBvcnRzID0ge1xyXG4gICAgICAgICAgICB3YXNpX3NuYXBzaG90X3ByZXZpZXcxOiBiaW5kQWxsRnVuY3Mod2FzbSwgd2FzaV9zbmFwc2hvdF9wcmV2aWV3MSksXHJcbiAgICAgICAgICAgIGVudjogYmluZEFsbEZ1bmNzKHdhc20sIGVudiksXHJcbiAgICAgICAgICAgIC4uLnVuYm91bmRJbXBvcnRzXHJcbiAgICAgICAgfSBhcyBLbm93bkltcG9ydHMgJiBXZWJBc3NlbWJseS5JbXBvcnRzO1xyXG5cclxuICAgICAgICAvLyBXZSBoYXZlIHRob3NlIGltcG9ydHMsIGFuZCB0aGV5J3ZlIGJlZW4gYm91bmQgdG8gdGhlIHRvLWJlLWluc3RhbnRpYXRlZCBXQVNNLlxyXG4gICAgICAgIC8vIE5vdyBwYXNzIHRob3NlIGJvdW5kIGltcG9ydHMgdG8gV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUgKG9yIHdoYXRldmVyIHRoZSB1c2VyIHNwZWNpZmllZClcclxuICAgICAgICBpZiAod2FzbURhdGFPckZldGNoZXIgaW5zdGFuY2VvZiBXZWJBc3NlbWJseS5Nb2R1bGUpIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UgPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSh3YXNtRGF0YU9yRmV0Y2hlciwgaW1wb3J0cylcclxuICAgICAgICAgICAgbW9kdWxlID0gd2FzbURhdGFPckZldGNoZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHdhc21EYXRhT3JGZXRjaGVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHwgQXJyYXlCdWZmZXIuaXNWaWV3KHdhc21EYXRhT3JGZXRjaGVyKSlcclxuICAgICAgICAgICAgKHsgaW5zdGFuY2UsIG1vZHVsZSB9ID0gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUod2FzbURhdGFPckZldGNoZXIsIGltcG9ydHMpKTtcclxuICAgICAgICBlbHNlIGlmIChpc1Jlc3BvbnNlKHdhc21EYXRhT3JGZXRjaGVyKSlcclxuICAgICAgICAgICAgKHsgaW5zdGFuY2UsIG1vZHVsZSB9ID0gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmcod2FzbURhdGFPckZldGNoZXIsIGltcG9ydHMpKTtcclxuXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAoeyBpbnN0YW5jZSwgbW9kdWxlIH0gPSBhd2FpdCB3YXNtRGF0YU9yRmV0Y2hlcihpbXBvcnRzKSk7XHJcblxyXG5cclxuICAgICAgICAvLyBEbyB0aGUgc3R1ZmYgd2UgY291bGRuJ3QgZG8gaW4gdGhlIGBJbnN0YW50aWF0ZWRXYXNtYCBjb25zdHJ1Y3RvciBiZWNhdXNlIHdlIGRpZG4ndCBoYXZlIHRoZXNlIHRoZW46XHJcbiAgICAgICAgd2FzbS5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgICAgIHdhc20ubW9kdWxlID0gbW9kdWxlO1xyXG4gICAgICAgIHdhc20uZXhwb3J0cyA9IHdhc20uaW5zdGFuY2UuZXhwb3J0cyBhcyBFeHBvcnRzIGFzIEV4cG9ydHMgJiBLbm93bkV4cG9ydHM7XHJcbiAgICAgICAgd2FzbS5jYWNoZWRNZW1vcnlWaWV3ID0gbmV3IERhdGFWaWV3KHdhc20uZXhwb3J0cy5tZW1vcnkuYnVmZmVyKTtcclxuXHJcbiAgICAgICAgLy8gQWxtb3N0IGRvbmUgLS0gbm93IHJ1biBXQVNJJ3MgYF9zdGFydGAgb3IgYF9pbml0aWFsaXplYCBmdW5jdGlvbi5cclxuICAgICAgICBjb25zb2xlLmFzc2VydCgoXCJfaW5pdGlhbGl6ZVwiIGluIHdhc20uaW5zdGFuY2UuZXhwb3J0cykgIT0gXCJfc3RhcnRcIiBpbiB3YXNtLmluc3RhbmNlLmV4cG9ydHMsIGBFeHBlY3RlZCBlaXRoZXIgX2luaXRpYWxpemUgWE9SIF9zdGFydCB0byBiZSBleHBvcnRlZCBmcm9tIHRoaXMgV0FTTS5gKTtcclxuICAgICAgICBpZiAoXCJfaW5pdGlhbGl6ZVwiIGluIHdhc20uaW5zdGFuY2UuZXhwb3J0cylcclxuICAgICAgICAgICAgKHdhc20uaW5zdGFuY2UuZXhwb3J0cyBhcyBhbnkpLl9pbml0aWFsaXplKCk7XHJcbiAgICAgICAgZWxzZSBpZiAoXCJfc3RhcnRcIiBpbiB3YXNtLmluc3RhbmNlLmV4cG9ydHMpXHJcbiAgICAgICAgICAgICh3YXNtLmluc3RhbmNlLmV4cG9ydHMgYXMgYW55KS5fc3RhcnQoKTtcclxuXHJcbiAgICAgICAgLy8gV2FpdCBmb3IgYWxsIEVtYmluZCBjYWxscyB0byByZXNvbHZlICh0aGV5IGBhd2FpdGAgZWFjaCBvdGhlciBiYXNlZCBvbiB0aGUgZGVwZW5kZW5jaWVzIHRoZXkgbmVlZCwgYW5kIHRoaXMgcmVzb2x2ZXMgd2hlbiBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgdG9vKVxyXG4gICAgICAgIGF3YWl0IGF3YWl0QWxsRW1iaW5kKCk7XHJcblxyXG4gICAgICAgIC8vIEFuZCB3ZSdyZSBmaW5hbGx5IGZpbmlzaGVkLlxyXG4gICAgICAgIHJldHVybiB3YXNtO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBHaXZlbiBhbiBvYmplY3QsIGJpbmRzIGVhY2ggZnVuY3Rpb24gaW4gdGhhdCBvYmplY3QgdG8gcCAoc2hhbGxvd2x5KS5cclxuZnVuY3Rpb24gYmluZEFsbEZ1bmNzPFIgZXh0ZW5kcyB7fT4ocDogSW5zdGFudGlhdGVkV2FzbSwgcjogUik6IFIge1xyXG4gICAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhPYmplY3QuZW50cmllcyhyKS5tYXAoKFtrZXksIGZ1bmNdKSA9PiB7IHJldHVybiBba2V5LCAodHlwZW9mIGZ1bmMgPT0gXCJmdW5jdGlvblwiID8gZnVuYy5iaW5kKHApIDogZnVuYyldIGFzIGNvbnN0OyB9KSkgYXMgUjtcclxufVxyXG5cclxuLy8gU2VwYXJhdGVkIG91dCBmb3IgdHlwZSByZWFzb25zIGR1ZSB0byBcIlJlc3BvbnNlXCIgbm90IGV4aXN0aW5nIGluIGxpbWl0ZWQgV29ya2xldC1saWtlIGVudmlyb25tZW50cy5cclxuZnVuY3Rpb24gaXNSZXNwb25zZShhcmc6IGFueSk6IGFyZyBpcyBSZXNwb25zZSB8IFByb21pc2VMaWtlPFJlc3BvbnNlPiB7IHJldHVybiBcInRoZW5cIiBpbiBhcmcgfHwgKFwiUmVzcG9uc2VcIiBpbiBnbG9iYWxUaGlzICYmIGFyZyBpbnN0YW5jZW9mIFJlc3BvbnNlKTsgfVxyXG5cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFsaWduZmF1bHRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKFwiQWxpZ25tZW50IGZhdWx0XCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBVc2VkIGJ5IFNBRkVfSEVBUFxyXG5leHBvcnQgZnVuY3Rpb24gYWxpZ25mYXVsdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtKTogbmV2ZXIge1xyXG4gICAgdGhyb3cgbmV3IEFsaWduZmF1bHRFcnJvcigpO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgVHlwZUlEIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxUPiBleHRlbmRzIFByb21pc2VXaXRoUmVzb2x2ZXJzPFQ+IHtcclxuICAgIHJlc29sdmVkVmFsdWU6IFQ7XHJcbn1cclxuY29uc3QgRGVwZW5kZW5jaWVzVG9XYWl0Rm9yOiBNYXA8VHlwZUlELCBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4+PiA9IG5ldyBNYXA8VHlwZUlELCBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4+PigpO1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIHBhcnNlZCB0eXBlIGluZm8sIGNvbnZlcnRlcnMsIGV0Yy4gZm9yIHRoZSBnaXZlbiBDKysgUlRUSSBUeXBlSUQgcG9pbnRlci5cclxuICpcclxuICogUGFzc2luZyBhIG51bGwgdHlwZSBJRCBpcyBmaW5lIGFuZCB3aWxsIGp1c3QgcmVzdWx0IGluIGEgYG51bGxgIGF0IHRoYXQgc3BvdCBpbiB0aGUgcmV0dXJuZWQgYXJyYXkuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VHlwZUluZm88RSBleHRlbmRzIChFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+IHwgbnVsbCB8IHVuZGVmaW5lZClbXT4oLi4udHlwZUlkczogbnVtYmVyW10pOiBQcm9taXNlPEU+IHtcclxuXHJcbiAgICByZXR1cm4gYXdhaXQgUHJvbWlzZS5hbGw8Tm9uTnVsbGFibGU8RVtudW1iZXJdPj4odHlwZUlkcy5tYXAoYXN5bmMgKHR5cGVJZCk6IFByb21pc2U8Tm9uTnVsbGFibGU8RVtudW1iZXJdPj4gPT4ge1xyXG4gICAgICAgIGlmICghdHlwZUlkKVxyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwhKTtcclxuXHJcbiAgICAgICAgbGV0IHdpdGhSZXNvbHZlcnMgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXJzKHR5cGVJZCk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0ICh3aXRoUmVzb2x2ZXJzLnByb21pc2UgYXMgUHJvbWlzZTxOb25OdWxsYWJsZTxFW251bWJlcl0+Pik7XHJcbiAgICB9KSkgYXMgYW55O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVwZW5kZW5jeVJlc29sdmVycyh0eXBlSWQ6IG51bWJlcik6IFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4ge1xyXG4gICAgbGV0IHdpdGhSZXNvbHZlcnMgPSBEZXBlbmRlbmNpZXNUb1dhaXRGb3IuZ2V0KHR5cGVJZCk7XHJcbiAgICBpZiAod2l0aFJlc29sdmVycyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgIERlcGVuZGVuY2llc1RvV2FpdEZvci5zZXQodHlwZUlkLCB3aXRoUmVzb2x2ZXJzID0geyByZXNvbHZlZFZhbHVlOiB1bmRlZmluZWQhLCAuLi5Qcm9taXNlLndpdGhSZXNvbHZlcnM8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4oKSB9KTtcclxuICAgIHJldHVybiB3aXRoUmVzb2x2ZXJzO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgZ2V0RGVwZW5kZW5jeVJlc29sdmVycyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vKipcclxuICogQ29udmVuaWVuY2UgZnVuY3Rpb24gdG8gc2V0IGEgdmFsdWUgb24gdGhlIGBlbWJpbmRgIG9iamVjdC4gIE5vdCBzdHJpY3RseSBuZWNlc3NhcnkgdG8gY2FsbC5cclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBuYW1lIFxyXG4gKiBAcGFyYW0gdmFsdWUgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJFbWJvdW5kPFQ+KGltcGw6IEluc3RhbnRpYXRlZFdhc20sIG5hbWU6IHN0cmluZywgdmFsdWU6IFQpOiB2b2lkIHtcclxuICAgIChpbXBsLmVtYmluZCBhcyBhbnkpW25hbWVdID0gdmFsdWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsIHdoZW4gYSB0eXBlIGlzIHJlYWR5IHRvIGJlIHVzZWQgYnkgb3RoZXIgdHlwZXMuXHJcbiAqIFxyXG4gKiBGb3IgdGhpbmdzIGxpa2UgYGludGAgb3IgYGJvb2xgLCB0aGlzIGNhbiBqdXN0IGJlIGNhbGxlZCBpbW1lZGlhdGVseSB1cG9uIHJlZ2lzdHJhdGlvbi5cclxuICogQHBhcmFtIGluZm8gXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluYWxpemVUeXBlPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBuYW1lOiBzdHJpbmcsIHBhcnNlZFR5cGVJbmZvOiBPbWl0PEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD4sIFwibmFtZVwiPik6IHZvaWQge1xyXG4gICAgY29uc3QgaW5mbyA9IHsgbmFtZSwgLi4ucGFyc2VkVHlwZUluZm8gfTtcclxuICAgIGxldCB3aXRoUmVzb2x2ZXJzID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVycyhpbmZvLnR5cGVJZCk7XHJcbiAgICB3aXRoUmVzb2x2ZXJzLnJlc29sdmUod2l0aFJlc29sdmVycy5yZXNvbHZlZFZhbHVlID0gaW5mbyk7XHJcbn1cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIHNpemU6IG51bWJlciwgbWluUmFuZ2U6IGJpZ2ludCwgbWF4UmFuZ2U6IGJpZ2ludCk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkID0gKG1pblJhbmdlID09PSAwbik7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZCA/IGZyb21XaXJlVHlwZVVuc2lnbmVkIDogZnJvbVdpcmVUeXBlU2lnbmVkO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8YmlnaW50LCBiaWdpbnQ+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IHZhbHVlID0+ICh7IHdpcmVWYWx1ZTogdmFsdWUsIGpzVmFsdWU6IHZhbHVlIH0pLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVNpZ25lZCh3aXJlVmFsdWU6IGJpZ2ludCkgeyByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6IEJpZ0ludCh3aXJlVmFsdWUpIH07IH1cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlVW5zaWduZWQod2lyZVZhbHVlOiBiaWdpbnQpIHsgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiBCaWdJbnQod2lyZVZhbHVlKSAmIDB4RkZGRl9GRkZGX0ZGRkZfRkZGRm4gfSB9IiwgIlxyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgdHJ1ZVZhbHVlOiAxLCBmYWxzZVZhbHVlOiAwKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIG5hbWUgPT4ge1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyIHwgYm9vbGVhbiwgYm9vbGVhbj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHdpcmVWYWx1ZSkgPT4geyByZXR1cm4geyBqc1ZhbHVlOiAhIXdpcmVWYWx1ZSwgd2lyZVZhbHVlIH07IH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZTogbyA/IHRydWVWYWx1ZSA6IGZhbHNlVmFsdWUsIGpzVmFsdWU6IG8gfTsgfSxcclxuICAgICAgICB9KVxyXG4gICAgfSlcclxufVxyXG4iLCAiXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5hbWVGdW5jdGlvbjxUIGV4dGVuZHMgKCguLi5hcmdzOiBhbnlbXSkgPT4gYW55KSB8IEZ1bmN0aW9uPihuYW1lOiBzdHJpbmcsIGJvZHk6IFQpOiBUIHtcclxuICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoYm9keSwgJ25hbWUnLCB7IHZhbHVlOiBuYW1lIH0pO1xyXG59XHJcbiIsICIvLyBUaGVzZSBhcmUgYWxsIHRoZSBjbGFzc2VzIHRoYXQgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQsIGFjY2Vzc2VkIGJ5IHRoZWlyIFJUVEkgVHlwZUlkXHJcbi8vIEl0J3Mgb2ZmIGluIGl0cyBvd24gZmlsZSB0byBrZWVwIGl0IHByaXZhdGUuXHJcbmV4cG9ydCBjb25zdCBFbWJvdW5kQ2xhc3NlczogUmVjb3JkPG51bWJlciwgdHlwZW9mIEVtYm91bmRDbGFzcz4gPSB7fTtcclxuXHJcblxyXG4vLyBUaGlzIGlzIGEgcnVubmluZyBsaXN0IG9mIGFsbCB0aGUgaW5zdGFudGlhdGVkIGNsYXNzZXMsIGJ5IHRoZWlyIGB0aGlzYCBwb2ludGVyLlxyXG5jb25zdCBpbnN0YW50aWF0ZWRDbGFzc2VzID0gbmV3IE1hcDxudW1iZXIsIFdlYWtSZWY8RW1ib3VuZENsYXNzPj4oKTtcclxuXHJcbi8vIFRoaXMga2VlcHMgdHJhY2sgb2YgYWxsIGRlc3RydWN0b3JzIGJ5IHRoZWlyIGB0aGlzYCBwb2ludGVyLlxyXG4vLyBVc2VkIGZvciBGaW5hbGl6YXRpb25SZWdpc3RyeSBhbmQgdGhlIGRlc3RydWN0b3IgaXRzZWxmLlxyXG5jb25zdCBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQgPSBuZXcgTWFwPG51bWJlciwgKCkgPT4gdm9pZD4oKTtcclxuXHJcbi8vIFVzZWQgdG8gZW5zdXJlIG5vIG9uZSBidXQgdGhlIHR5cGUgY29udmVydGVycyBjYW4gdXNlIHRoZSBzZWNyZXQgcG9pbnRlciBjb25zdHJ1Y3Rvci5cclxuZXhwb3J0IGNvbnN0IFNlY3JldDogU3ltYm9sID0gU3ltYm9sKCk7XHJcbmV4cG9ydCBjb25zdCBTZWNyZXROb0Rpc3Bvc2U6IFN5bWJvbCA9IFN5bWJvbCgpO1xyXG5cclxuLy8gVE9ETzogVGhpcyBuZWVkcyBwcm9wZXIgdGVzdGluZywgb3IgcG9zc2libHkgZXZlbiBqdXN0aWZpY2F0aW9uIGZvciBpdHMgZXhpc3RlbmNlLlxyXG4vLyBJJ20gcHJldHR5IHN1cmUgb25seSBKUyBoZWFwIHByZXNzdXJlIHdpbGwgaW52b2tlIGEgY2FsbGJhY2ssIG1ha2luZyBpdCBraW5kIG9mIFxyXG4vLyBwb2ludGxlc3MgZm9yIEMrKyBjbGVhbnVwLCB3aGljaCBoYXMgbm8gaW50ZXJhY3Rpb24gd2l0aCB0aGUgSlMgaGVhcC5cclxuY29uc3QgcmVnaXN0cnkgPSBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKF90aGlzOiBudW1iZXIpID0+IHtcclxuICAgIGNvbnNvbGUud2FybihgV0FTTSBjbGFzcyBhdCBhZGRyZXNzICR7X3RoaXN9IHdhcyBub3QgcHJvcGVybHkgZGlzcG9zZWQuYCk7XHJcbiAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KF90aGlzKT8uKCk7XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIGFsbCBFbWJpbmQtZW5hYmxlZCBjbGFzc2VzLlxyXG4gKlxyXG4gKiBJbiBnZW5lcmFsLCBpZiB0d28gKHF1b3RlLXVucXVvdGUpIFwiaW5zdGFuY2VzXCIgb2YgdGhpcyBjbGFzcyBoYXZlIHRoZSBzYW1lIGBfdGhpc2AgcG9pbnRlcixcclxuICogdGhlbiB0aGV5IHdpbGwgY29tcGFyZSBlcXVhbGx5IHdpdGggYD09YCwgYXMgaWYgY29tcGFyaW5nIGFkZHJlc3NlcyBpbiBDKysuXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNsYXNzIEVtYm91bmRDbGFzcyB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgdHJhbnNmb3JtZWQgY29uc3RydWN0b3IgZnVuY3Rpb24gdGhhdCB0YWtlcyBKUyBhcmd1bWVudHMgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzc1xyXG4gICAgICovXHJcbiAgICBzdGF0aWMgX2NvbnN0cnVjdG9yOiAoLi4uYXJnczogYW55W10pID0+IEVtYm91bmRDbGFzcztcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFzc2lnbmVkIGJ5IHRoZSBkZXJpdmVkIGNsYXNzIHdoZW4gdGhhdCBjbGFzcyBpcyByZWdpc3RlcmVkLlxyXG4gICAgICpcclxuICAgICAqIFRoaXMgb25lIGlzIG5vdCB0cmFuc2Zvcm1lZCBiZWNhdXNlIGl0IG9ubHkgdGFrZXMgYSBwb2ludGVyIGFuZCByZXR1cm5zIG5vdGhpbmcuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfZGVzdHJ1Y3RvcjogKF90aGlzOiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcG9pbnRlciB0byB0aGUgY2xhc3MgaW4gV0FTTSBtZW1vcnk7IHRoZSBzYW1lIGFzIHRoZSBDKysgYHRoaXNgIHBvaW50ZXIuXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBfdGhpcyE6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiBhbnlbXSkge1xyXG4gICAgICAgIGNvbnN0IENyZWF0ZWRGcm9tV2FzbSA9IChhcmdzLmxlbmd0aCA9PT0gMiAmJiAoYXJnc1swXSA9PT0gU2VjcmV0IHx8IGFyZ3NbMF0gPT0gU2VjcmV0Tm9EaXNwb3NlKSAmJiB0eXBlb2YgYXJnc1sxXSA9PT0gJ251bWJlcicpO1xyXG5cclxuICAgICAgICBpZiAoIUNyZWF0ZWRGcm9tV2FzbSkge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBKUy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogVW5saWtlIGEgbm9ybWFsIGNvbnN0cnVjdG9yLCB3ZSBkZWxlZ2F0ZSB0aGUgY2xhc3MgY3JlYXRpb24gdG9cclxuICAgICAgICAgICAgICogYSBjb21iaW5hdGlvbiBvZiBfY29uc3RydWN0b3IgYW5kIGBmcm9tV2lyZVR5cGVgLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBgX2NvbnN0cnVjdG9yYCB3aWxsIGNhbGwgdGhlIEMrKyBjb2RlIHRoYXQgYWxsb2NhdGVzIG1lbW9yeSxcclxuICAgICAgICAgICAgICogaW5pdGlhbGl6ZXMgdGhlIGNsYXNzLCBhbmQgcmV0dXJucyBpdHMgYHRoaXNgIHBvaW50ZXIsXHJcbiAgICAgICAgICAgICAqIHdoaWxlIGBmcm9tV2lyZVR5cGVgLCBjYWxsZWQgYXMgcGFydCBvZiB0aGUgZ2x1ZS1jb2RlIHByb2Nlc3MsXHJcbiAgICAgICAgICAgICAqIHdpbGwgYWN0dWFsbHkgaW5zdGFudGlhdGUgdGhpcyBjbGFzcy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogKEluIG90aGVyIHdvcmRzLCB0aGlzIHBhcnQgcnVucyBmaXJzdCwgdGhlbiB0aGUgYGVsc2VgIGJlbG93IHJ1bnMpXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3LnRhcmdldC5fY29uc3RydWN0b3IoLi4uYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBDKysuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFdlIGdldCBoZXJlIHZpYSBgZnJvbVdpcmVUeXBlYCwgbWVhbmluZyB0aGF0IHRoZVxyXG4gICAgICAgICAgICAgKiBjbGFzcyBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZCBpbiBDKyssIGFuZCB3ZVxyXG4gICAgICAgICAgICAgKiBqdXN0IG5lZWQgb3VyIFwiaGFuZGxlXCIgdG8gaXQgaW4gSlMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IGFyZ3NbMV07XHJcblxyXG4gICAgICAgICAgICAvLyBGaXJzdCwgbWFrZSBzdXJlIHdlIGhhdmVuJ3QgaW5zdGFudGlhdGVkIHRoaXMgY2xhc3MgeWV0LlxyXG4gICAgICAgICAgICAvLyBXZSB3YW50IGFsbCBjbGFzc2VzIHdpdGggdGhlIHNhbWUgYHRoaXNgIHBvaW50ZXIgdG8gXHJcbiAgICAgICAgICAgIC8vIGFjdHVhbGx5ICpiZSogdGhlIHNhbWUuXHJcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gaW5zdGFudGlhdGVkQ2xhc3Nlcy5nZXQoX3RoaXMpPy5kZXJlZigpO1xyXG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpc3Rpbmc7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB3ZSBnb3QgaGVyZSwgdGhlbiBjb25ncmF0dWxhdGlvbnMsIHRoaXMtaW5zdGFudGlhdGlvbi1vZi10aGlzLWNsYXNzLCBcclxuICAgICAgICAgICAgLy8geW91J3JlIGFjdHVhbGx5IHRoZSBvbmUgdG8gYmUgaW5zdGFudGlhdGVkLiBObyBtb3JlIGhhY2t5IGNvbnN0cnVjdG9yIHJldHVybnMuXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vIENvbnNpZGVyIHRoaXMgdGhlIFwiYWN0dWFsXCIgY29uc3RydWN0b3IgY29kZSwgSSBzdXBwb3NlLlxyXG4gICAgICAgICAgICB0aGlzLl90aGlzID0gX3RoaXM7XHJcbiAgICAgICAgICAgIGluc3RhbnRpYXRlZENsYXNzZXMuc2V0KF90aGlzLCBuZXcgV2Vha1JlZih0aGlzKSk7XHJcbiAgICAgICAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMsIF90aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChhcmdzWzBdICE9IFNlY3JldE5vRGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9IG5ldy50YXJnZXQuX2Rlc3RydWN0b3I7XHJcblxyXG4gICAgICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLnNldChfdGhpcywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RydWN0b3IoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbnRpYXRlZENsYXNzZXMuZGVsZXRlKF90aGlzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBbU3ltYm9sLmRpc3Bvc2VdKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIE9ubHkgcnVuIHRoZSBkZXN0cnVjdG9yIGlmIHdlIG91cnNlbHZlcyBjb25zdHJ1Y3RlZCB0aGlzIGNsYXNzIChhcyBvcHBvc2VkIHRvIGBpbnNwZWN0YGluZyBpdClcclxuICAgICAgICBjb25zdCBkZXN0cnVjdG9yID0gZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKTtcclxuICAgICAgICBpZiAoZGVzdHJ1Y3Rvcikge1xyXG4gICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpPy4oKTtcclxuICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmRlbGV0ZSh0aGlzLl90aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKiogXHJcbiAqIEluc3RlYWQgb2YgaW5zdGFudGlhdGluZyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzLCBcclxuICogeW91IGNhbiBpbnNwZWN0IGFuIGV4aXN0aW5nIHBvaW50ZXIgaW5zdGVhZC5cclxuICpcclxuICogVGhpcyBpcyBtYWlubHkgaW50ZW5kZWQgZm9yIHNpdHVhdGlvbnMgdGhhdCBFbWJpbmQgZG9lc24ndCBzdXBwb3J0LFxyXG4gKiBsaWtlIGFycmF5LW9mLXN0cnVjdHMtYXMtYS1wb2ludGVyLlxyXG4gKiBcclxuICogQmUgYXdhcmUgdGhhdCB0aGVyZSdzIG5vIGxpZmV0aW1lIHRyYWNraW5nIGludm9sdmVkLCBzb1xyXG4gKiBtYWtlIHN1cmUgeW91IGRvbid0IGtlZXAgdGhpcyB2YWx1ZSBhcm91bmQgYWZ0ZXIgdGhlXHJcbiAqIHBvaW50ZXIncyBiZWVuIGludmFsaWRhdGVkLiBcclxuICogXHJcbiAqICoqRG8gbm90IGNhbGwgW1N5bWJvbC5kaXNwb3NlXSoqIG9uIGFuIGluc3BlY3RlZCBjbGFzcyxcclxuICogc2luY2UgdGhlIGFzc3VtcHRpb24gaXMgdGhhdCB0aGUgQysrIGNvZGUgb3ducyB0aGF0IHBvaW50ZXJcclxuICogYW5kIHdlJ3JlIGp1c3QgbG9va2luZyBhdCBpdCwgc28gZGVzdHJveWluZyBpdCB3b3VsZCBiZSBydWRlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluc3BlY3RDbGFzc0J5UG9pbnRlcjxUPihwb2ludGVyOiBudW1iZXIpOiBUIHtcclxuICAgIHJldHVybiBuZXcgRW1ib3VuZENsYXNzKFNlY3JldE5vRGlzcG9zZSwgcG9pbnRlcikgYXMgVDtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUYWJsZUZ1bmN0aW9uPFQgZXh0ZW5kcyBGdW5jdGlvbj4oaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgc2lnbmF0dXJlUHRyOiBudW1iZXIsIGZ1bmN0aW9uSW5kZXg6IG51bWJlcik6IFQge1xyXG4gICAgY29uc3QgZnAgPSBpbXBsLmV4cG9ydHMuX19pbmRpcmVjdF9mdW5jdGlvbl90YWJsZS5nZXQoZnVuY3Rpb25JbmRleCk7XHJcbiAgICBjb25zb2xlLmFzc2VydCh0eXBlb2YgZnAgPT0gXCJmdW5jdGlvblwiKTtcclxuICAgIHJldHVybiBmcCBhcyBUO1xyXG59IiwgImltcG9ydCB7IHJlbmFtZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtbmFtZWQtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzLCBFbWJvdW5kQ2xhc3NlcywgU2VjcmV0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgV2lyZUNvbnZlcnNpb25SZXN1bHQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5leHBvcnQgeyBpbnNwZWN0Q2xhc3NCeVBvaW50ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyhcclxuICAgIHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICByYXdUeXBlOiBudW1iZXIsXHJcbiAgICByYXdQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgcmF3Q29uc3RQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgYmFzZUNsYXNzUmF3VHlwZTogbnVtYmVyLFxyXG4gICAgZ2V0QWN0dWFsVHlwZVNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgZ2V0QWN0dWFsVHlwZVB0cjogbnVtYmVyLFxyXG4gICAgdXBjYXN0U2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICB1cGNhc3RQdHI6IG51bWJlcixcclxuICAgIGRvd25jYXN0U2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBkb3duY2FzdFB0cjogbnVtYmVyLFxyXG4gICAgbmFtZVB0cjogbnVtYmVyLFxyXG4gICAgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgcmF3RGVzdHJ1Y3RvclB0cjogbnVtYmVyKTogdm9pZCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBOb3RlOiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzIGRvZXNuJ3QgaGF2ZSBhIGNvcnJlc3BvbmRpbmcgYGZpbmFsaXplYCB2ZXJzaW9uLFxyXG4gICAgICogbGlrZSB2YWx1ZV9hcnJheSBhbmQgdmFsdWVfb2JqZWN0IGhhdmUsIHdoaWNoIGlzIGZpbmUgSSBndWVzcz9cclxuICAgICAqIFxyXG4gICAgICogQnV0IGl0IG1lYW5zIHRoYXQgd2UgY2FuJ3QganVzdCBjcmVhdGUgYSBjbGFzcyBwcmUtaW5zdGFsbGVkIHdpdGggZXZlcnl0aGluZyBpdCBuZWVkcy0tXHJcbiAgICAgKiB3ZSBuZWVkIHRvIGFkZCBtZW1iZXIgZnVuY3Rpb25zIGFuZCBwcm9wZXJ0aWVzIGFuZCBzdWNoIGFzIHdlIGdldCB0aGVtLCBhbmQgd2VcclxuICAgICAqIG5ldmVyIHJlYWxseSBrbm93IHdoZW4gd2UncmUgZG9uZS5cclxuICAgICAqL1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICBjb25zdCByYXdEZXN0cnVjdG9ySW52b2tlciA9IGdldFRhYmxlRnVuY3Rpb248KF90aGlzOiBudW1iZXIpID0+IHZvaWQ+KHRoaXMsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3JQdHIpO1xyXG5cclxuICAgICAgICAvLyBUT0RPKD8pIEl0J3MgcHJvYmFibHkgbm90IG5lY2Vzc2FyeSB0byBoYXZlIEVtYm91bmRDbGFzc2VzIGFuZCB0aGlzLmVtYmluZCBiYXNpY2FsbHkgYmUgdGhlIHNhbWUgZXhhY3QgdGhpbmcuXHJcbiAgICAgICAgRW1ib3VuZENsYXNzZXNbcmF3VHlwZV0gPSAodGhpcy5lbWJpbmQgYXMgYW55KVtuYW1lXSA9IHJlbmFtZUZ1bmN0aW9uKG5hbWUsXHJcbiAgICAgICAgICAgIC8vIFVubGlrZSB0aGUgY29uc3RydWN0b3IsIHRoZSBkZXN0cnVjdG9yIGlzIGtub3duIGVhcmx5IGVub3VnaCB0byBhc3NpZ24gbm93LlxyXG4gICAgICAgICAgICAvLyBQcm9iYWJseSBiZWNhdXNlIGRlc3RydWN0b3JzIGNhbid0IGJlIG92ZXJsb2FkZWQgYnkgYW55dGhpbmcgc28gdGhlcmUncyBvbmx5IGV2ZXIgb25lLlxyXG4gICAgICAgICAgICAvLyBBbnl3YXksIGFzc2lnbiBpdCB0byB0aGlzIG5ldyBjbGFzcy5cclxuICAgICAgICAgICAgY2xhc3MgZXh0ZW5kcyBFbWJvdW5kQ2xhc3Mge1xyXG4gICAgICAgICAgICAgICAgc3RhdGljIF9kZXN0cnVjdG9yID0gcmF3RGVzdHJ1Y3Rvckludm9rZXI7XHJcbiAgICAgICAgICAgIH0gYXMgYW55KTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZnJvbVdpcmVUeXBlKF90aGlzOiBudW1iZXIpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIEVtYm91bmRDbGFzcz4geyBjb25zdCBqc1ZhbHVlID0gbmV3IEVtYm91bmRDbGFzc2VzW3Jhd1R5cGVdKFNlY3JldCwgX3RoaXMpOyByZXR1cm4geyB3aXJlVmFsdWU6IF90aGlzLCBqc1ZhbHVlLCBzdGFja0Rlc3RydWN0b3I6ICgpID0+IGpzVmFsdWVbU3ltYm9sLmRpc3Bvc2VdKCkgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gdG9XaXJlVHlwZShqc09iamVjdDogRW1ib3VuZENsYXNzKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogKGpzT2JqZWN0IGFzIGFueSkuX3RoaXMsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBqc09iamVjdCxcclxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IG5vIGRlc3RydWN0b3JzIGZvciBhbnkgb2YgdGhlc2UsXHJcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIHRoZXkncmUganVzdCBmb3IgdmFsdWUtdHlwZXMtYXMtb2JqZWN0LXR5cGVzLlxyXG4gICAgICAgICAgICAgICAgLy8gQWRkaW5nIGl0IGhlcmUgd291bGRuJ3Qgd29yayBwcm9wZXJseSwgYmVjYXVzZSBpdCBhc3N1bWVzXHJcbiAgICAgICAgICAgICAgICAvLyB3ZSBvd24gdGhlIG9iamVjdCAod2hlbiBjb252ZXJ0aW5nIGZyb20gYSBKUyBzdHJpbmcgdG8gc3RkOjpzdHJpbmcsIHdlIGVmZmVjdGl2ZWx5IGRvLCBidXQgbm90IGhlcmUpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBXaXNoIG90aGVyIHR5cGVzIGluY2x1ZGVkIHBvaW50ZXIgVHlwZUlEcyB3aXRoIHRoZW0gdG9vLi4uXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBuYW1lLCB7IHR5cGVJZDogcmF3VHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgYCR7bmFtZX0qYCwgeyB0eXBlSWQ6IHJhd1BvaW50ZXJUeXBlLCBmcm9tV2lyZVR5cGUsIHRvV2lyZVR5cGUgfSk7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBgJHtuYW1lfSBjb25zdCpgLCB7IHR5cGVJZDogcmF3Q29uc3RQb2ludGVyVHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgIlxyXG5leHBvcnQgZnVuY3Rpb24gcnVuRGVzdHJ1Y3RvcnMoZGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdKTogdm9pZCB7XHJcbiAgICB3aGlsZSAoZGVzdHJ1Y3RvcnMubGVuZ3RoKSB7XHJcbiAgICAgICAgZGVzdHJ1Y3RvcnMucG9wKCkhKCk7XHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyByZW5hbWVGdW5jdGlvbiB9IGZyb20gXCIuL2NyZWF0ZS1uYW1lZC1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBydW5EZXN0cnVjdG9ycyB9IGZyb20gXCIuL2Rlc3RydWN0b3JzLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzcyB9IGZyb20gXCIuL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUeXBlSW5mbyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIEpTIGZ1bmN0aW9uIHRoYXQgY2FsbHMgYSBDKysgZnVuY3Rpb24sIGFjY291bnRpbmcgZm9yIGB0aGlzYCB0eXBlcyBhbmQgY29udGV4dC5cclxuICogXHJcbiAqIEl0IGNvbnZlcnRzIGFsbCBhcmd1bWVudHMgYmVmb3JlIHBhc3NpbmcgdGhlbSwgYW5kIGNvbnZlcnRzIHRoZSByZXR1cm4gdHlwZSBiZWZvcmUgcmV0dXJuaW5nLlxyXG4gKiBcclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBhcmdUeXBlSWRzIEFsbCBSVFRJIFR5cGVJZHMsIGluIHRoZSBvcmRlciBvZiBbUmV0VHlwZSwgVGhpc1R5cGUsIC4uLkFyZ1R5cGVzXS4gVGhpc1R5cGUgY2FuIGJlIG51bGwgZm9yIHN0YW5kYWxvbmUgZnVuY3Rpb25zLlxyXG4gKiBAcGFyYW0gaW52b2tlclNpZ25hdHVyZSBBIHBvaW50ZXIgdG8gdGhlIHNpZ25hdHVyZSBzdHJpbmcuXHJcbiAqIEBwYXJhbSBpbnZva2VySW5kZXggVGhlIGluZGV4IHRvIHRoZSBpbnZva2VyIGZ1bmN0aW9uIGluIHRoZSBgV2ViQXNzZW1ibHkuVGFibGVgLlxyXG4gKiBAcGFyYW0gaW52b2tlckNvbnRleHQgVGhlIGNvbnRleHQgcG9pbnRlciB0byB1c2UsIGlmIGFueS5cclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlR2x1ZUZ1bmN0aW9uPEYgZXh0ZW5kcyAoKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpIHwgRnVuY3Rpb24+KFxyXG4gICAgaW1wbDogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHJldHVyblR5cGVJZDogbnVtYmVyLFxyXG4gICAgYXJnVHlwZUlkczogbnVtYmVyW10sXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIgfCBudWxsXHJcbik6IFByb21pc2U8Rj4ge1xyXG5cclxuICAgIHR5cGUgUiA9IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIGFueT47XHJcbiAgICB0eXBlIEFyZ1R5cGVzID0gRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdpcmVUeXBlcywgYW55PltdO1xyXG5cclxuXHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZSwgLi4uYXJnVHlwZXNdID0gYXdhaXQgZ2V0VHlwZUluZm88W1IsIC4uLkFyZ1R5cGVzXT4ocmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzKTtcclxuICAgIGNvbnN0IHJhd0ludm9rZXIgPSBnZXRUYWJsZUZ1bmN0aW9uPCguLi5hcmdzOiBXaXJlVHlwZXNbXSkgPT4gYW55PihpbXBsLCBpbnZva2VyU2lnbmF0dXJlLCBpbnZva2VySW5kZXgpO1xyXG5cclxuXHJcbiAgICByZXR1cm4gcmVuYW1lRnVuY3Rpb24obmFtZSwgZnVuY3Rpb24gKHRoaXM6IEVtYm91bmRDbGFzcywgLi4uanNBcmdzOiBhbnlbXSkge1xyXG4gICAgICAgIGNvbnN0IHdpcmVkVGhpcyA9IHRoaXMgPyB0aGlzLl90aGlzIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIGNvbnN0IHdpcmVkQXJnczogV2lyZVR5cGVzW10gPSBbXTtcclxuICAgICAgICBjb25zdCBzdGFja0Jhc2VkRGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdID0gW107ICAgLy8gVXNlZCB0byBwcmV0ZW5kIGxpa2Ugd2UncmUgYSBwYXJ0IG9mIHRoZSBXQVNNIHN0YWNrLCB3aGljaCB3b3VsZCBkZXN0cm95IHRoZXNlIG9iamVjdHMgYWZ0ZXJ3YXJkcy5cclxuXHJcbiAgICAgICAgaWYgKGludm9rZXJDb250ZXh0KVxyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaChpbnZva2VyQ29udGV4dCk7XHJcbiAgICAgICAgaWYgKHdpcmVkVGhpcylcclxuICAgICAgICAgICAgd2lyZWRBcmdzLnB1c2god2lyZWRUaGlzKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCBlYWNoIEpTIGFyZ3VtZW50IHRvIGl0cyBXQVNNIGVxdWl2YWxlbnQgKGdlbmVyYWxseSBhIHBvaW50ZXIsIG9yIGludC9mbG9hdClcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ1R5cGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBhcmdUeXBlc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgYXJnID0ganNBcmdzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSB0eXBlLnRvV2lyZVR5cGUoYXJnKTtcclxuICAgICAgICAgICAgd2lyZWRBcmdzLnB1c2god2lyZVZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKHN0YWNrRGVzdHJ1Y3RvcilcclxuICAgICAgICAgICAgICAgIHN0YWNrQmFzZWREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZpbmFsbHksIGNhbGwgdGhlIFwicmF3XCIgV0FTTSBmdW5jdGlvblxyXG4gICAgICAgIGxldCB3aXJlZFJldHVybjogV2lyZVR5cGVzID0gcmF3SW52b2tlciguLi53aXJlZEFyZ3MpO1xyXG5cclxuICAgICAgICAvLyBTdGlsbCBwcmV0ZW5kaW5nIHdlJ3JlIGEgcGFydCBvZiB0aGUgc3RhY2ssIFxyXG4gICAgICAgIC8vIG5vdyBkZXN0cnVjdCBldmVyeXRoaW5nIHdlIFwicHVzaGVkXCIgb250byBpdC5cclxuICAgICAgICBydW5EZXN0cnVjdG9ycyhzdGFja0Jhc2VkRGVzdHJ1Y3RvcnMpO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IHdoYXRldmVyIHRoZSBXQVNNIGZ1bmN0aW9uIHJldHVybmVkIHRvIGEgSlMgcmVwcmVzZW50YXRpb25cclxuICAgICAgICAvLyBJZiB0aGUgb2JqZWN0IHJldHVybmVkIGlzIERpc3Bvc2FibGUsIHRoZW4gd2UgbGV0IHRoZSB1c2VyIGRpc3Bvc2Ugb2YgaXRcclxuICAgICAgICAvLyB3aGVuIHJlYWR5LlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gT3RoZXJ3aXNlIChuYW1lbHkgc3RyaW5ncyksIGRpc3Bvc2UgaXRzIG9yaWdpbmFsIHJlcHJlc2VudGF0aW9uIG5vdy5cclxuICAgICAgICBpZiAocmV0dXJuVHlwZSA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSByZXR1cm5UeXBlPy5mcm9tV2lyZVR5cGUod2lyZWRSZXR1cm4pO1xyXG4gICAgICAgIGlmIChzdGFja0Rlc3RydWN0b3IgJiYgIShqc1ZhbHVlICYmIHR5cGVvZiBqc1ZhbHVlID09IFwib2JqZWN0XCIgJiYgKFN5bWJvbC5kaXNwb3NlIGluIGpzVmFsdWUpKSlcclxuICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yKGpzVmFsdWUsIHdpcmVWYWx1ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiBqc1ZhbHVlO1xyXG5cclxuICAgIH0gYXMgRik7XHJcbn1cclxuIiwgIlxyXG5leHBvcnQgdHlwZSBJczY0ID0gZmFsc2U7XHJcbmV4cG9ydCBjb25zdCBJczY0ID0gZmFsc2U7XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBJczY0IH0gZnJvbSBcIi4vaXMtNjQuanNcIjtcclxuXHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IFBvaW50ZXJTaXplOiA0IHwgOCA9IChJczY0ID8gOCA6IDQpO1xyXG5leHBvcnQgY29uc3QgZ2V0UG9pbnRlcjogXCJnZXRCaWdVaW50NjRcIiB8IFwiZ2V0VWludDMyXCIgPSAoSXM2NCA/IFwiZ2V0QmlnVWludDY0XCIgOiBcImdldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBjb25zdCBzZXRQb2ludGVyOiBcInNldEJpZ1VpbnQ2NFwiIHwgXCJzZXRVaW50MzJcIiA9IChJczY0ID8gXCJzZXRCaWdVaW50NjRcIiA6IFwic2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQb2ludGVyU2l6ZShfaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20pOiA0IHsgcmV0dXJuIFBvaW50ZXJTaXplIGFzIDQ7IH0iLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyIH0gZnJvbSBcIi4vcG9pbnRlci5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTYW1lIGFzIGByZWFkVWludDMyYCwgYnV0IHR5cGVkIGZvciBwb2ludGVycywgYW5kIGZ1dHVyZS1wcm9vZnMgYWdhaW5zdCA2NC1iaXQgYXJjaGl0ZWN0dXJlcy5cclxuICogXHJcbiAqIFRoaXMgaXMgKm5vdCogdGhlIHNhbWUgYXMgZGVyZWZlcmVuY2luZyBhIHBvaW50ZXIuIFRoaXMgaXMgYWJvdXQgcmVhZGluZyB0aGUgbnVtZXJpY2FsIHZhbHVlIGF0IGEgZ2l2ZW4gYWRkcmVzcyB0aGF0IGlzLCBpdHNlbGYsIHRvIGJlIGludGVycHJldGVkIGFzIGEgcG9pbnRlci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkUG9pbnRlcihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tnZXRQb2ludGVyXShwdHIsIHRydWUpIGFzIG51bWJlcjsgfVxyXG4iLCAiaW1wb3J0IHsgZ2V0UG9pbnRlclNpemUgfSBmcm9tIFwiLi4vLi4vdXRpbC9wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRQb2ludGVyIH0gZnJvbSBcIi4uLy4uL3V0aWwvcmVhZC1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcblxyXG4vKipcclxuICogR2VuZXJhbGx5LCBFbWJpbmQgZnVuY3Rpb25zIGluY2x1ZGUgYW4gYXJyYXkgb2YgUlRUSSBUeXBlSWRzIGluIHRoZSBmb3JtIG9mXHJcbiAqIFtSZXRUeXBlLCBUaGlzVHlwZT8sIC4uLkFyZ1R5cGVzXVxyXG4gKiBcclxuICogVGhpcyByZXR1cm5zIHRoYXQgYXJyYXkgb2YgdHlwZUlkcyBmb3IgYSBnaXZlbiBmdW5jdGlvbi5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkQXJyYXlPZlR5cGVzKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIGNvdW50OiBudW1iZXIsIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCByZXQ6IG51bWJlcltdID0gW107XHJcbiAgICBjb25zdCBwb2ludGVyU2l6ZSA9IGdldFBvaW50ZXJTaXplKGltcGwpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7ICsraSkge1xyXG4gICAgICAgIHJldC5wdXNoKHJlYWRQb2ludGVyKGltcGwsIHJhd0FyZ1R5cGVzUHRyICsgaSAqIHBvaW50ZXJTaXplKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBtZXRob2ROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJJbmRleDogbnVtYmVyLFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlcixcclxuICAgIGlzQXN5bmM6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBtZXRob2ROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgICgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIG5hbWUsIHJldHVyblR5cGVJZCwgYXJnVHlwZUlkcywgaW52b2tlclNpZ25hdHVyZVB0ciwgaW52b2tlckluZGV4LCBpbnZva2VyQ29udGV4dCk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kQ2xhc3NlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyByZWFkQXJyYXlPZlR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IodGhpczogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJJbmRleDogbnVtYmVyLFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKHRoaXMsIFwiPGNvbnN0cnVjdG9yPlwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgKChFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0gYXMgYW55KSkuX2NvbnN0cnVjdG9yID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIFwiPGNvbnN0cnVjdG9yPlwiLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIG1ldGhvZE5hbWVQdHI6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLCAvLyBbUmV0dXJuVHlwZSwgVGhpc1R5cGUsIEFyZ3MuLi5dXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBpc1B1cmVWaXJ0dWFsOiBudW1iZXIsXHJcbiAgICBpc0FzeW5jOiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCB0aGlzVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIC8vY29uc29sZS5hc3NlcnQodGhpc1R5cGVJZCAhPSByYXdDbGFzc1R5cGVJZCxgSW50ZXJuYWwgZXJyb3I7IGV4cGVjdGVkIHRoZSBSVFRJIHBvaW50ZXJzIGZvciB0aGUgY2xhc3MgdHlwZSBhbmQgaXRzIHBvaW50ZXIgdHlwZSB0byBiZSBkaWZmZXJlbnQuYCk7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG1ldGhvZE5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgICgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkucHJvdG90eXBlIGFzIGFueSlbbmFtZV0gPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIG5hbWUsXHJcbiAgICAgICAgICAgIHJldHVyblR5cGVJZCxcclxuICAgICAgICAgICAgYXJnVHlwZUlkcyxcclxuICAgICAgICAgICAgaW52b2tlclNpZ25hdHVyZVB0cixcclxuICAgICAgICAgICAgaW52b2tlckluZGV4LFxyXG4gICAgICAgICAgICBpbnZva2VyQ29udGV4dFxyXG4gICAgICAgICk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kQ2xhc3NlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eShcclxuICAgIHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgZmllbGROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlcixcclxuICAgIGdldHRlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgZ2V0dGVySW5kZXg6IG51bWJlcixcclxuICAgIGdldHRlckNvbnRleHQ6IG51bWJlcixcclxuICAgIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsXHJcbiAgICBzZXR0ZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIHNldHRlckluZGV4OiBudW1iZXIsXHJcbiAgICBzZXR0ZXJDb250ZXh0OiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgZmllbGROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBnZXQgPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb248KCkgPT4gYW55Pih0aGlzLCBgJHtuYW1lfV9nZXR0ZXJgLCBnZXR0ZXJSZXR1cm5UeXBlSWQsIFtdLCBnZXR0ZXJTaWduYXR1cmVQdHIsIGdldHRlckluZGV4LCBnZXR0ZXJDb250ZXh0KTtcclxuICAgICAgICBjb25zdCBzZXQgPSBzZXR0ZXJJbmRleD8gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uPCh2YWx1ZTogYW55KSA9PiB2b2lkPih0aGlzLCBgJHtuYW1lfV9zZXR0ZXJgLCAwLCBbc2V0dGVyQXJndW1lbnRUeXBlSWRdLCBzZXR0ZXJTaWduYXR1cmVQdHIsIHNldHRlckluZGV4LCBzZXR0ZXJDb250ZXh0KSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkucHJvdG90eXBlIGFzIGFueSksIG5hbWUsIHtcclxuICAgICAgICAgICAgZ2V0LFxyXG4gICAgICAgICAgICBzZXQsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiXHJcbmltcG9ydCB7IHJlZ2lzdGVyRW1ib3VuZCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudDxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4odGhpczogSW5zdGFudGlhdGVkV2FzbSwgbmFtZVB0cjogbnVtYmVyLCB0eXBlUHRyOiBudW1iZXIsIHZhbHVlQXNXaXJlVHlwZTogV1QpOiB2b2lkIHtcclxuXHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAoY29uc3ROYW1lKSA9PiB7XHJcbiAgICAgICAgLy8gV2FpdCB1bnRpbCB3ZSBrbm93IGhvdyB0byBwYXJzZSB0aGUgdHlwZSB0aGlzIGNvbnN0YW50IHJlZmVyZW5jZXMuXHJcbiAgICAgICAgY29uc3QgW3R5cGVdID0gYXdhaXQgZ2V0VHlwZUluZm88W0VtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD5dPih0eXBlUHRyKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB0aGUgY29uc3RhbnQgZnJvbSBpdHMgd2lyZSByZXByZXNlbnRhdGlvbiB0byBpdHMgSlMgcmVwcmVzZW50YXRpb24uXHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0eXBlLmZyb21XaXJlVHlwZSh2YWx1ZUFzV2lyZVR5cGUpO1xyXG5cclxuICAgICAgICAvLyBBZGQgdGhpcyBjb25zdGFudCB2YWx1ZSB0byB0aGUgYGVtYmluZGAgb2JqZWN0LlxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZDxUPih0aGlzLCBjb25zdE5hbWUsIHZhbHVlLmpzVmFsdWUpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbXZhbCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIC8vIFRPRE8uLi5cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbXZhbF90YWtlX3ZhbHVlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgcHRyOiBudW1iZXIpOiBhbnkge1xyXG4gICAgLy8gVE9ETy4uLlxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbXZhbF9kZWNyZWYodGhpczogSW5zdGFudGlhdGVkV2FzbSwgaGFuZGxlOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgLy8gVE9ETy4uLlxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSwgcmVnaXN0ZXJFbWJvdW5kIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuY29uc3QgQWxsRW51bXM6IFJlY29yZDxudW1iZXIsIFJlY29yZDxzdHJpbmcsIG51bWJlcj4+ID0ge307XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBzaXplOiBudW1iZXIsIGlzU2lnbmVkOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZW51bSBvYmplY3QgdGhhdCB0aGUgdXNlciB3aWxsIGluc3BlY3QgdG8gbG9vayBmb3IgZW51bSB2YWx1ZXNcclxuICAgICAgICBBbGxFbnVtc1t0eXBlUHRyXSA9IHt9O1xyXG5cclxuICAgICAgICAvLyBNYXJrIHRoaXMgdHlwZSBhcyByZWFkeSB0byBiZSB1c2VkIGJ5IG90aGVyIHR5cGVzIFxyXG4gICAgICAgIC8vIChldmVuIGlmIHdlIGRvbid0IGhhdmUgdGhlIGVudW0gdmFsdWVzIHlldCwgZW51bSB2YWx1ZXNcclxuICAgICAgICAvLyB0aGVtc2VsdmVzIGFyZW4ndCB1c2VkIGJ5IGFueSByZWdpc3RyYXRpb24gZnVuY3Rpb25zLilcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh3aXJlVmFsdWUpID0+IHsgcmV0dXJuIHt3aXJlVmFsdWUsIGpzVmFsdWU6IHdpcmVWYWx1ZX07IH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChqc1ZhbHVlKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZToganNWYWx1ZSwganNWYWx1ZSB9IH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gTWFrZSB0aGlzIHR5cGUgYXZhaWxhYmxlIGZvciB0aGUgdXNlclxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZCh0aGlzLCBuYW1lIGFzIG5ldmVyLCBBbGxFbnVtc1t0eXBlUHRyIGFzIGFueV0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd0VudW1UeXBlOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgZW51bVZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICAvLyBKdXN0IGFkZCB0aGlzIG5hbWUncyB2YWx1ZSB0byB0aGUgZXhpc3RpbmcgZW51bSB0eXBlLlxyXG4gICAgICAgIEFsbEVudW1zW3Jhd0VudW1UeXBlXVtuYW1lXSA9IGVudW1WYWx1ZTtcclxuICAgIH0pXHJcbn0iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBieXRlV2lkdGg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHZhbHVlKSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZX0pLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAodmFsdWUpID0+ICh7IHdpcmVWYWx1ZTogdmFsdWUsIGpzVmFsdWU6IHZhbHVlfSksXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkQXJyYXlPZlR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFxyXG4gKiBAcGFyYW0gbmFtZVB0ciBBIHBvaW50ZXIgdG8gdGhlIG51bGwtdGVybWluYXRlZCBuYW1lIG9mIHRoaXMgZXhwb3J0LlxyXG4gKiBAcGFyYW0gYXJnQ291bnQgVGhlIG51bWJlciBvZiBhcmd1bWVudHMgdGhlIFdBU00gZnVuY3Rpb24gdGFrZXNcclxuICogQHBhcmFtIHJhd0FyZ1R5cGVzUHRyIEEgcG9pbnRlciB0byBhbiBhcnJheSBvZiBudW1iZXJzLCBlYWNoIHJlcHJlc2VudGluZyBhIFR5cGVJRC4gVGhlIDB0aCB2YWx1ZSBpcyB0aGUgcmV0dXJuIHR5cGUsIHRoZSByZXN0IGFyZSB0aGUgYXJndW1lbnRzIHRoZW1zZWx2ZXMuXHJcbiAqIEBwYXJhbSBzaWduYXR1cmUgQSBwb2ludGVyIHRvIGEgbnVsbC10ZXJtaW5hdGVkIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIFdBU00gc2lnbmF0dXJlIG9mIHRoZSBmdW5jdGlvbjsgZS5nLiBcImBwYFwiLCBcImBmcHBgXCIsIFwiYHZwYFwiLCBcImBmcGZmZmBcIiwgZXRjLlxyXG4gKiBAcGFyYW0gcmF3SW52b2tlclB0ciBUaGUgcG9pbnRlciB0byB0aGUgZnVuY3Rpb24gaW4gV0FTTS5cclxuICogQHBhcmFtIGZ1bmN0aW9uSW5kZXggVGhlIGluZGV4IG9mIHRoZSBmdW5jdGlvbiBpbiB0aGUgYFdlYkFzc2VtYmx5LlRhYmxlYCB0aGF0J3MgZXhwb3J0ZWQuXHJcbiAqIEBwYXJhbSBpc0FzeW5jIFVudXNlZC4uLnByb2JhYmx5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9mdW5jdGlvbihcclxuICAgIHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICBuYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlcixcclxuICAgIHNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgcmF3SW52b2tlclB0cjogbnVtYmVyLFxyXG4gICAgZnVuY3Rpb25JbmRleDogbnVtYmVyLFxyXG4gICAgaXNBc3luYzogYm9vbGVhblxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICAodGhpcy5lbWJpbmQgYXMgYW55KVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIHNpZ25hdHVyZSwgcmF3SW52b2tlclB0ciwgZnVuY3Rpb25JbmRleCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlcih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgYnl0ZVdpZHRoOiBudW1iZXIsIG1pblZhbHVlOiBudW1iZXIsIG1heFZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgaXNVbnNpZ25lZFR5cGUgPSAobWluVmFsdWUgPT09IDApO1xyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IGlzVW5zaWduZWRUeXBlID8gZnJvbVdpcmVUeXBlVShieXRlV2lkdGgpIDogZnJvbVdpcmVUeXBlUyhieXRlV2lkdGgpO1xyXG5cclxuICAgICAgICAvLyBUT0RPOiBtaW4vbWF4VmFsdWUgYXJlbid0IHVzZWQgZm9yIGJvdW5kcyBjaGVja2luZyxcclxuICAgICAgICAvLyBidXQgaWYgdGhleSBhcmUsIG1ha2Ugc3VyZSB0byBhZGp1c3QgbWF4VmFsdWUgZm9yIHRoZSBzYW1lIHNpZ25lZC91bnNpZ25lZCB0eXBlIGlzc3VlXHJcbiAgICAgICAgLy8gb24gMzItYml0IHNpZ25lZCBpbnQgdHlwZXM6XHJcbiAgICAgICAgLy8gbWF4VmFsdWUgPSBmcm9tV2lyZVR5cGUobWF4VmFsdWUpO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChqc1ZhbHVlOiBudW1iZXIpID0+ICh7IHdpcmVWYWx1ZToganNWYWx1ZSwganNWYWx1ZSB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4vLyBXZSBuZWVkIGEgc2VwYXJhdGUgZnVuY3Rpb24gZm9yIHVuc2lnbmVkIGNvbnZlcnNpb24gYmVjYXVzZSBXQVNNIG9ubHkgaGFzIHNpZ25lZCB0eXBlcywgXHJcbi8vIGV2ZW4gd2hlbiBsYW5ndWFnZXMgaGF2ZSB1bnNpZ25lZCB0eXBlcywgYW5kIGl0IGV4cGVjdHMgdGhlIGNsaWVudCB0byBtYW5hZ2UgdGhlIHRyYW5zaXRpb24uXHJcbi8vIFNvIHRoaXMgaXMgdXMsIG1hbmFnaW5nIHRoZSB0cmFuc2l0aW9uLlxyXG5mdW5jdGlvbiBmcm9tV2lyZVR5cGVVKGJ5dGVXaWR0aDogbnVtYmVyKTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPG51bWJlciwgbnVtYmVyPltcImZyb21XaXJlVHlwZVwiXSB7XHJcbiAgICAvLyBTaGlmdCBvdXQgYWxsIHRoZSBiaXRzIGhpZ2hlciB0aGFuIHdoYXQgd291bGQgZml0IGluIHRoaXMgaW50ZWdlciB0eXBlLFxyXG4gICAgLy8gYnV0IGluIHBhcnRpY3VsYXIgbWFrZSBzdXJlIHRoZSBuZWdhdGl2ZSBiaXQgZ2V0cyBjbGVhcmVkIG91dCBieSB0aGUgPj4+IGF0IHRoZSBlbmQuXHJcbiAgICBjb25zdCBvdmVyZmxvd0JpdENvdW50ID0gMzIgLSA4ICogYnl0ZVdpZHRoO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh3aXJlVmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogKCh3aXJlVmFsdWUgPDwgb3ZlcmZsb3dCaXRDb3VudCkgPj4+IG92ZXJmbG93Qml0Q291bnQpIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVMoYnl0ZVdpZHRoOiBudW1iZXIpOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8bnVtYmVyLCBudW1iZXI+W1wiZnJvbVdpcmVUeXBlXCJdIHtcclxuICAgIC8vIFNoaWZ0IG91dCBhbGwgdGhlIGJpdHMgaGlnaGVyIHRoYW4gd2hhdCB3b3VsZCBmaXQgaW4gdGhpcyBpbnRlZ2VyIHR5cGUuXHJcbiAgICBjb25zdCBvdmVyZmxvd0JpdENvdW50ID0gMzIgLSA4ICogYnl0ZVdpZHRoO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh3aXJlVmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogKCh3aXJlVmFsdWUgPDwgb3ZlcmZsb3dCaXRDb3VudCkgPj4gb3ZlcmZsb3dCaXRDb3VudCkgfTtcclxuICAgIH1cclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGV4OiBhbnkpOiB2b2lkIHtcclxuICAgIC8vIFRPRE9cclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgSXM2NCB9IGZyb20gXCIuL2lzLTY0LmpzXCI7XHJcbmltcG9ydCB7IFBvaW50ZXJTaXplIH0gZnJvbSBcIi4vcG9pbnRlci5qc1wiO1xyXG5cclxuY29uc3QgU2l6ZVRTaXplOiA0IHwgOCA9IFBvaW50ZXJTaXplO1xyXG5leHBvcnQgY29uc3Qgc2V0U2l6ZVQ6IFwic2V0QmlnVWludDY0XCIgfCBcInNldFVpbnQzMlwiID0gKElzNjQgPyBcInNldEJpZ1VpbnQ2NFwiIDogXCJzZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgY29uc3QgZ2V0U2l6ZVQ6IFwiZ2V0QmlnVWludDY0XCIgfCBcImdldFVpbnQzMlwiID0gKElzNjQgPyBcImdldEJpZ1VpbnQ2NFwiIDogXCJnZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2l6ZVRTaXplKF9pbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSk6IDQgeyByZXR1cm4gU2l6ZVRTaXplIGFzIDQ7IH1cclxuXHJcbiIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IGdldFNpemVUIH0gZnJvbSBcIi4vc2l6ZXQuanNcIjtcclxuXHJcblxyXG4vKipcclxuICogU2FtZSBhcyBgcmVhZFVpbnQzMmAsIGJ1dCB0eXBlZCBmb3Igc2l6ZV90IHZhbHVlcywgYW5kIGZ1dHVyZS1wcm9vZnMgYWdhaW5zdCA2NC1iaXQgYXJjaGl0ZWN0dXJlcy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkU2l6ZVQoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogUG9pbnRlcjxudW1iZXI+KTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbZ2V0U2l6ZVRdKHB0ciwgdHJ1ZSkgYXMgbnVtYmVyOyB9XHJcbiIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IHNldFNpemVUIH0gZnJvbSBcIi4vc2l6ZXQuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVNpemVUKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3W3NldFNpemVUXShwdHIsIHZhbHVlIGFzIG5ldmVyLCB0cnVlKTsgfVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDE2KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50MTYocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQzMihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0VWludDMyKHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50OChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0VWludDgocHRyLCB2YWx1ZSk7IH1cclxuIiwgImltcG9ydCB7IHJlYWRTaXplVCB9IGZyb20gXCIuLi8uLi91dGlsL3JlYWQtc2l6ZXQuanNcIjtcclxuaW1wb3J0IHsgZ2V0U2l6ZVRTaXplIH0gZnJvbSBcIi4uLy4uL3V0aWwvc2l6ZXQuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVTaXplVCB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXNpemV0LmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDE2IH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtdWludDE2LmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDggfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50OC5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBzdHJpbmdUb1V0ZjE2LCBzdHJpbmdUb1V0ZjMyLCBzdHJpbmdUb1V0ZjgsIHV0ZjE2VG9TdHJpbmdMLCB1dGYzMlRvU3RyaW5nTCwgdXRmOFRvU3RyaW5nTCB9IGZyb20gXCIuLi9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4vZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgV2lyZUNvbnZlcnNpb25SZXN1bHQgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLy8gU2hhcmVkIGJldHdlZW4gc3RkOjpzdHJpbmcgYW5kIHN0ZDo6d3N0cmluZ1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueShpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIsIGNoYXJXaWR0aDogMSB8IDIgfCA0LCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuXHJcbiAgICBjb25zdCB1dGZUb1N0cmluZ0wgPSAoY2hhcldpZHRoID09IDEpID8gdXRmOFRvU3RyaW5nTCA6IChjaGFyV2lkdGggPT0gMikgPyB1dGYxNlRvU3RyaW5nTCA6IHV0ZjMyVG9TdHJpbmdMO1xyXG4gICAgY29uc3Qgc3RyaW5nVG9VdGYgPSAoY2hhcldpZHRoID09IDEpID8gc3RyaW5nVG9VdGY4IDogKGNoYXJXaWR0aCA9PSAyKSA/IHN0cmluZ1RvVXRmMTYgOiBzdHJpbmdUb1V0ZjMyO1xyXG4gICAgY29uc3QgVWludEFycmF5ID0gKGNoYXJXaWR0aCA9PSAxKSA/IFVpbnQ4QXJyYXkgOiAoY2hhcldpZHRoID09IDIpID8gVWludDE2QXJyYXkgOiBVaW50MzJBcnJheTtcclxuICAgIGNvbnN0IHdyaXRlVWludCA9IChjaGFyV2lkdGggPT0gMSkgPyB3cml0ZVVpbnQ4IDogKGNoYXJXaWR0aCA9PSAyKSA/IHdyaXRlVWludDE2IDogd3JpdGVVaW50MzI7XHJcblxyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIoaW1wbCwgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gKHB0cjogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFRoZSB3aXJlIHR5cGUgaXMgYSBwb2ludGVyIHRvIGEgXCJzdHJ1Y3RcIiAobm90IHJlYWxseSBhIHN0cnVjdCBpbiB0aGUgdXN1YWwgc2Vuc2UuLi5cclxuICAgICAgICAgICAgLy8gZXhjZXB0IG1heWJlIGluIG5ld2VyIEMgdmVyc2lvbnMgSSBndWVzcykgd2hlcmUgXHJcbiAgICAgICAgICAgIC8vIHRoZSBmaXJzdCBmaWVsZCBpcyBhIHNpemVfdCByZXByZXNlbnRpbmcgdGhlIGxlbmd0aCxcclxuICAgICAgICAgICAgLy8gQW5kIHRoZSBzZWNvbmQgXCJmaWVsZFwiIGlzIHRoZSBzdHJpbmcgZGF0YSBpdHNlbGYsXHJcbiAgICAgICAgICAgIC8vIGZpbmFsbHkgYWxsIGVuZGVkIHdpdGggYW4gZXh0cmEgbnVsbCBieXRlLlxyXG4gICAgICAgICAgICBsZXQgbGVuZ3RoID0gcmVhZFNpemVUKGltcGwsIHB0cik7XHJcbiAgICAgICAgICAgIGxldCBwYXlsb2FkID0gcHRyICsgZ2V0U2l6ZVRTaXplKGltcGwpO1xyXG4gICAgICAgICAgICBsZXQgc3RyOiBzdHJpbmcgPSBcIlwiO1xyXG4gICAgICAgICAgICBsZXQgZGVjb2RlU3RhcnRQdHIgPSBwYXlsb2FkO1xyXG4gICAgICAgICAgICBzdHIgPSB1dGZUb1N0cmluZ0woaW1wbCwgZGVjb2RlU3RhcnRQdHIsIGxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAganNWYWx1ZTogc3RyLFxyXG4gICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGNhbGwgdG8gX2ZyZWUgaGFwcGVucyBiZWNhdXNlIEVtYmluZCBjYWxscyBtYWxsb2MgZHVyaW5nIGl0cyB0b1dpcmVUeXBlIGZ1bmN0aW9uLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFN1cmVseSB0aGVyZSdzIGEgd2F5IHRvIGF2b2lkIHRoaXMgY29weSBvZiBhIGNvcHkgb2YgYSBjb3B5IHRob3VnaCwgcmlnaHQ/IFJpZ2h0P1xyXG4gICAgICAgICAgICAgICAgICAgIGltcGwuZXhwb3J0cy5mcmVlKHB0cik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3QgdG9XaXJlVHlwZSA9IChzdHI6IHN0cmluZyk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PG51bWJlciwgc3RyaW5nPiA9PiB7XHJcblxyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTID0gbmV3IFVpbnRBcnJheShzdHJpbmdUb1V0ZihzdHIpKTtcclxuXHJcbiAgICAgICAgICAgIC8vIElzIGl0IG1vcmUgb3IgbGVzcyBjbGVhciB3aXRoIGFsbCB0aGVzZSB2YXJpYWJsZXMgZXhwbGljaXRseSBuYW1lZD9cclxuICAgICAgICAgICAgLy8gSG9wZWZ1bGx5IG1vcmUsIGF0IGxlYXN0IHNsaWdodGx5LlxyXG4gICAgICAgICAgICBjb25zdCBjaGFyQ291bnRXaXRob3V0TnVsbCA9IHZhbHVlQXNBcnJheUJ1ZmZlckluSlMubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCBjaGFyQ291bnRXaXRoTnVsbCA9IGNoYXJDb3VudFdpdGhvdXROdWxsICsgMTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVDb3VudFdpdGhvdXROdWxsID0gY2hhckNvdW50V2l0aG91dE51bGwgKiBjaGFyV2lkdGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVDb3VudFdpdGhOdWxsID0gY2hhckNvdW50V2l0aE51bGwgKiBjaGFyV2lkdGg7XHJcblxyXG4gICAgICAgICAgICAvLyAxLiAobSlhbGxvY2F0ZSBzcGFjZSBmb3IgdGhlIHN0cnVjdCBhYm92ZVxyXG4gICAgICAgICAgICBjb25zdCB3YXNtU3RyaW5nU3RydWN0ID0gaW1wbC5leHBvcnRzLm1hbGxvYyhnZXRTaXplVFNpemUoaW1wbCkgKyBieXRlQ291bnRXaXRoTnVsbCk7XHJcblxyXG4gICAgICAgICAgICAvLyAyLiBXcml0ZSB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcgdG8gdGhlIHN0cnVjdFxyXG4gICAgICAgICAgICBjb25zdCBzdHJpbmdTdGFydCA9IHdhc21TdHJpbmdTdHJ1Y3QgKyBnZXRTaXplVFNpemUoaW1wbCk7XHJcbiAgICAgICAgICAgIHdyaXRlU2l6ZVQoaW1wbCwgd2FzbVN0cmluZ1N0cnVjdCwgY2hhckNvdW50V2l0aG91dE51bGwpO1xyXG5cclxuICAgICAgICAgICAgLy8gMy4gV3JpdGUgdGhlIHN0cmluZyBkYXRhIHRvIHRoZSBzdHJ1Y3RcclxuICAgICAgICAgICAgY29uc3QgZGVzdGluYXRpb24gPSBuZXcgVWludEFycmF5KGltcGwuZXhwb3J0cy5tZW1vcnkuYnVmZmVyLCBzdHJpbmdTdGFydCwgYnl0ZUNvdW50V2l0aG91dE51bGwpO1xyXG4gICAgICAgICAgICBkZXN0aW5hdGlvbi5zZXQodmFsdWVBc0FycmF5QnVmZmVySW5KUyk7XHJcblxyXG4gICAgICAgICAgICAvLyA0LiBXcml0ZSBhIG51bGwgYnl0ZVxyXG4gICAgICAgICAgICB3cml0ZVVpbnQoaW1wbCwgc3RyaW5nU3RhcnQgKyBieXRlQ291bnRXaXRob3V0TnVsbCwgMCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiBpbXBsLmV4cG9ydHMuZnJlZSh3YXNtU3RyaW5nU3RydWN0KSxcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogd2FzbVN0cmluZ1N0cnVjdCxcclxuICAgICAgICAgICAgICAgIGpzVmFsdWU6IHN0clxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZShpbXBsLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLXN0ZC1zdHJpbmcuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcodGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHJldHVybiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55KHRoaXMsIHR5cGVQdHIsIDEsIG5hbWVQdHIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIsIGNoYXJXaWR0aDogMiB8IDQsIG5hbWVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgcmV0dXJuIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkodGhpcywgdHlwZVB0ciwgY2hhcldpZHRoLCBuYW1lUHRyKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUodGhpczogSW5zdGFudGlhdGVkV2FzbSwgLi4uYXJnczogbnVtYmVyW10pOiB2b2lkIHtcclxuICAgIGRlYnVnZ2VyO1xyXG4gICAgLy8gVE9ETy4uLlxyXG59IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4vZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4vZ2V0LXR5cGUtaW5mby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZUNvbnZlcnNpb25SZXN1bHQsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFdUPiA9IChnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHB0cjogbnVtYmVyKSA9PiBXVDtcclxuZXhwb3J0IHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxXVD4gPSAoc2V0dGVyQ29udGV4dDogbnVtYmVyLCBwdHI6IG51bWJlciwgd2lyZVR5cGU6IFdUKSA9PiB2b2lkO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvIHtcclxuICAgIG5hbWVQdHI6IG51bWJlcjtcclxuICAgIF9jb25zdHJ1Y3RvcigpOiBudW1iZXI7XHJcbiAgICBfZGVzdHJ1Y3RvcihwdHI6IFdpcmVUeXBlcyk6IHZvaWQ7XHJcbiAgICBlbGVtZW50czogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88YW55LCBhbnk+W107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IHtcclxuXHJcbiAgICAvKiogVGhlIFwicmF3XCIgZ2V0dGVyLCBleHBvcnRlZCBmcm9tIEVtYmluZC4gTmVlZHMgY29udmVyc2lvbiBiZXR3ZWVuIHR5cGVzLiAqL1xyXG4gICAgd2FzbUdldHRlcjogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXVD47XHJcblxyXG4gICAgLyoqIFRoZSBcInJhd1wiIHNldHRlciwgZXhwb3J0ZWQgZnJvbSBFbWJpbmQuIE5lZWRzIGNvbnZlcnNpb24gYmV0d2VlbiB0eXBlcy4gKi9cclxuICAgIHdhc21TZXR0ZXI6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V1Q+O1xyXG5cclxuICAgIC8qKiBUaGUgbnVtZXJpYyB0eXBlIElEIG9mIHRoZSB0eXBlIHRoZSBnZXR0ZXIgcmV0dXJucyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFRoZSBudW1lcmljIHR5cGUgSUQgb2YgdGhlIHR5cGUgdGhlIHNldHRlciBhY2NlcHRzICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBVbmtub3duOyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBlbWJpbmQgZ2V0dGVyICovXHJcbiAgICBnZXR0ZXJDb250ZXh0OiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFVua25vd247IHVzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIGVtYmluZCBzZXR0ZXIgKi9cclxuICAgIHNldHRlckNvbnRleHQ6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+IHtcclxuICAgIC8qKiBBIHZlcnNpb24gb2YgYHdhc21HZXR0ZXJgIHRoYXQgaGFuZGxlcyB0eXBlIGNvbnZlcnNpb24gKi9cclxuICAgIHJlYWQocHRyOiBXVCk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PFdULCBUPjtcclxuXHJcbiAgICAvKiogQSB2ZXJzaW9uIG9mIGB3YXNtU2V0dGVyYCB0aGF0IGhhbmRsZXMgdHlwZSBjb252ZXJzaW9uICovXHJcbiAgICB3cml0ZShwdHI6IG51bWJlciwgdmFsdWU6IFQpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxXVCwgVD47XHJcblxyXG4gICAgLyoqIGBnZXR0ZXJSZXR1cm5UeXBlSWQsIGJ1dCByZXNvbHZlZCB0byB0aGUgcGFyc2VkIHR5cGUgaW5mbyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdULCBUPjtcclxuXHJcbiAgICAvKiogYHNldHRlclJldHVyblR5cGVJZCwgYnV0IHJlc29sdmVkIHRvIHRoZSBwYXJzZWQgdHlwZSBpbmZvICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGU6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD47XHJcbn1cclxuXHJcbi8vIFRlbXBvcmFyeSBzY3JhdGNoIG1lbW9yeSB0byBjb21tdW5pY2F0ZSBiZXR3ZWVuIHJlZ2lzdHJhdGlvbiBjYWxscy5cclxuZXhwb3J0IGNvbnN0IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnM6IFJlY29yZDxudW1iZXIsIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8+ID0ge307XHJcblxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGU8VD4oaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0NvbnN0cnVjdG9yOiBudW1iZXIsIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3RGVzdHJ1Y3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdID0ge1xyXG4gICAgICAgIG5hbWVQdHIsXHJcbiAgICAgICAgX2NvbnN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uKGltcGwsIGNvbnN0cnVjdG9yU2lnbmF0dXJlLCByYXdDb25zdHJ1Y3RvciksXHJcbiAgICAgICAgX2Rlc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb24oaW1wbCwgZGVzdHJ1Y3RvclNpZ25hdHVyZSwgcmF3RGVzdHJ1Y3RvciksXHJcbiAgICAgICAgZWxlbWVudHM6IFtdLFxyXG4gICAgfTtcclxuXHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzPEkgZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8YW55LCBhbnk+PihlbGVtZW50czogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88YW55LCBhbnk+W10pOiBQcm9taXNlPElbXT4ge1xyXG4gICAgY29uc3QgZGVwZW5kZW5jeUlkcyA9IFsuLi5lbGVtZW50cy5tYXAoKGVsdCkgPT4gZWx0LmdldHRlclJldHVyblR5cGVJZCksIC4uLmVsZW1lbnRzLm1hcCgoZWx0KSA9PiBlbHQuc2V0dGVyQXJndW1lbnRUeXBlSWQpXTtcclxuXHJcbiAgICBjb25zdCBkZXBlbmRlbmNpZXMgPSBhd2FpdCBnZXRUeXBlSW5mbyguLi5kZXBlbmRlbmN5SWRzKTtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KGRlcGVuZGVuY2llcy5sZW5ndGggPT0gZWxlbWVudHMubGVuZ3RoICogMik7XHJcblxyXG4gICAgY29uc3QgZmllbGRSZWNvcmRzID0gZWxlbWVudHMubWFwKChmaWVsZCwgaSk6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxhbnksIGFueT4gPT4ge1xyXG4gICAgICAgIGNvbnN0IGdldHRlclJldHVyblR5cGUgPSBkZXBlbmRlbmNpZXNbaV0hO1xyXG4gICAgICAgIGNvbnN0IHNldHRlckFyZ3VtZW50VHlwZSA9IGRlcGVuZGVuY2llc1tpICsgZWxlbWVudHMubGVuZ3RoXSE7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWQocHRyOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGdldHRlclJldHVyblR5cGUuZnJvbVdpcmVUeXBlKGZpZWxkLndhc21HZXR0ZXIoZmllbGQuZ2V0dGVyQ29udGV4dCwgcHRyKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlKHB0cjogbnVtYmVyLCBvOiBhbnkpIHtcclxuICAgICAgICAgICAgY29uc3QgcmV0ID0gc2V0dGVyQXJndW1lbnRUeXBlLnRvV2lyZVR5cGUobyk7XHJcbiAgICAgICAgICAgIGZpZWxkLndhc21TZXR0ZXIoZmllbGQuc2V0dGVyQ29udGV4dCwgcHRyLCByZXQud2lyZVZhbHVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJldDtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGdldHRlclJldHVyblR5cGUsXHJcbiAgICAgICAgICAgIHNldHRlckFyZ3VtZW50VHlwZSxcclxuICAgICAgICAgICAgcmVhZCxcclxuICAgICAgICAgICAgd3JpdGUsXHJcbiAgICAgICAgICAgIC4uLmZpZWxkXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGZpZWxkUmVjb3JkcyBhcyBJW107XHJcbn0iLCAiaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzLCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2NvbXBvc2l0ZSwgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRSwgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyLCBjb21wb3NpdGVSZWdpc3RyYXRpb25zIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1jb21wb3NpdGUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgQXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4geyB9XHJcbmludGVyZmFjZSBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdULCBUPiB7IH1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5PFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGU8VD4odGhpcywgcmF3VHlwZVB0ciwgbmFtZVB0ciwgY29uc3RydWN0b3JTaWduYXR1cmUsIHJhd0NvbnN0cnVjdG9yLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yKTtcclxuXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheV9lbGVtZW50PFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R1cGxlVHlwZTogbnVtYmVyLCBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlciwgZ2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIGdldHRlcjogbnVtYmVyLCBnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsIHNldHRlclNpZ25hdHVyZTogbnVtYmVyLCBzZXR0ZXI6IG51bWJlciwgc2V0dGVyQ29udGV4dDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R1cGxlVHlwZV0uZWxlbWVudHMucHVzaCh7XHJcbiAgICAgICAgZ2V0dGVyQ29udGV4dCxcclxuICAgICAgICBzZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIGdldHRlclJldHVyblR5cGVJZCxcclxuICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZCxcclxuICAgICAgICB3YXNtR2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8VD4+KHRoaXMsIGdldHRlclNpZ25hdHVyZSwgZ2V0dGVyKSxcclxuICAgICAgICB3YXNtU2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8VD4+KHRoaXMsIHNldHRlclNpZ25hdHVyZSwgc2V0dGVyKVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX2FycmF5PFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29uc3QgcmVnID0gY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXTtcclxuICAgIGRlbGV0ZSBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgcmVnLm5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGF3YWl0IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzPEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPGFueSwgVD4+KHJlZy5lbGVtZW50cyk7XHJcblxyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8YW55LCB1bmtub3duW10+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6IChwdHIpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50RGVzdHJ1Y3RvcnM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJldDogKGFueVtdKSA9IFtdIGFzIGFueTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZy5lbGVtZW50cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkID0gZmllbGRSZWNvcmRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IGZpZWxkUmVjb3Jkc1tpXS5yZWFkKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0W2ldID0ganNWYWx1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qcmV0W1N5bWJvbC5kaXNwb3NlXSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpXHJcbiAgICAgICAgICAgICAgICB9Ki9cclxuXHJcbiAgICAgICAgICAgICAgICBPYmplY3QuZnJlZXplKHJldCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiByZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkRlc3RydWN0b3JzKGVsZW1lbnREZXN0cnVjdG9ycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdHIgPSByZWcuX2NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmaWVsZCBvZiBmaWVsZFJlY29yZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZC53cml0ZShwdHIsIG9baV0gYXMgYW55KTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiBvLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBydW5EZXN0cnVjdG9ycyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZGVzdHJ1Y3RvcnMuanNcIjtcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHMsIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlciwgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbywgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0UsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlciwgdHlwZSBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1jb21wb3NpdGUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRMYXRpbjFTdHJpbmcgfSBmcm9tIFwiLi4vX3ByaXZhdGUvc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuaW50ZXJmYWNlIFN0cnVjdFJlZ2lzdHJhdGlvbkluZm8gZXh0ZW5kcyBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvIHtcclxuICAgIGVsZW1lbnRzOiBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88YW55LCBhbnk+W107XHJcbn1cclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+IHtcclxuICAgIC8qKiBUaGUgbmFtZSBvZiB0aGlzIGZpZWxkICovXHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4sIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCwgVD4geyB9XHJcblxyXG4vKipcclxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgZmlyc3QsIHRvIHN0YXJ0IHRoZSByZWdpc3RyYXRpb24gb2YgYSBzdHJ1Y3QgYW5kIGFsbCBpdHMgZmllbGRzLiBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgY29uc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3Q29uc3RydWN0b3I6IG51bWJlciwgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdEZXN0cnVjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZV0gPSB7XHJcbiAgICAgICAgbmFtZVB0cixcclxuICAgICAgICBfY29uc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb248KCkgPT4gbnVtYmVyPih0aGlzLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPCgpID0+IHZvaWQ+KHRoaXMsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpLFxyXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcclxuICAgIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIHBlciBmaWVsZCwgYWZ0ZXIgYF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0YCBhbmQgYmVmb3JlIGBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdGAuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQ8VD4odGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBmaWVsZE5hbWU6IG51bWJlciwgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsIGdldHRlclNpZ25hdHVyZTogbnVtYmVyLCBnZXR0ZXI6IG51bWJlciwgZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLCBzZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgc2V0dGVyOiBudW1iZXIsIHNldHRlckNvbnRleHQ6IG51bWJlcik6IHZvaWQge1xyXG4gICAgKGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl0gYXMgU3RydWN0UmVnaXN0cmF0aW9uSW5mbykuZWxlbWVudHMucHVzaCh7XHJcbiAgICAgICAgbmFtZTogcmVhZExhdGluMVN0cmluZyh0aGlzLCBmaWVsZE5hbWUpLFxyXG4gICAgICAgIGdldHRlckNvbnRleHQsXHJcbiAgICAgICAgc2V0dGVyQ29udGV4dCxcclxuICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgc2V0dGVyQXJndW1lbnRUeXBlSWQsXHJcbiAgICAgICAgd2FzbUdldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFQ+Pih0aGlzLCBnZXR0ZXJTaWduYXR1cmUsIGdldHRlciksXHJcbiAgICAgICAgd2FzbVNldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFQ+Pih0aGlzLCBzZXR0ZXJTaWduYXR1cmUsIHNldHRlciksXHJcbiAgICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGxlZCBhZnRlciBhbGwgb3RoZXIgb2JqZWN0IHJlZ2lzdHJhdGlvbiBmdW5jdGlvbnMgYXJlIGNhbGxlZDsgdGhpcyBjb250YWlucyB0aGUgYWN0dWFsIHJlZ2lzdHJhdGlvbiBjb2RlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfZmluYWxpemVfdmFsdWVfb2JqZWN0PFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29uc3QgcmVnID0gY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXTtcclxuICAgIGRlbGV0ZSBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgcmVnLm5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGF3YWl0IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzPFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mb0U8YW55LCBUPj4ocmVnLmVsZW1lbnRzKTtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlKHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6IChwdHIpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50RGVzdHJ1Y3RvcnM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJldCA9IHt9IGFzIGFueTtcclxuICAgICAgICAgICAgICAgIC8qT2JqZWN0LmRlZmluZVByb3BlcnR5KHJldCwgU3ltYm9sLmRpc3Bvc2UsIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7Ki9cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZy5lbGVtZW50cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkID0gZmllbGRSZWNvcmRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IGZpZWxkUmVjb3Jkc1tpXS5yZWFkKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJldCwgZmllbGQubmFtZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToganNWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogcmV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHRyID0gcmVnLl9jb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZmllbGQgb2YgZmllbGRSZWNvcmRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGQud3JpdGUocHRyLCBvW2ZpZWxkLm5hbWUgYXMgbmV2ZXJdKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogbyxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBuYW1lID0+IHtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCB1bmRlZmluZWQ+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICgpID0+ICh7IGpzVmFsdWU6IHVuZGVmaW5lZCEsIHdpcmVWYWx1ZTogdW5kZWZpbmVkISB9KSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKCkgPT4gKHsganNWYWx1ZTogdW5kZWZpbmVkISwgd2lyZVZhbHVlOiB1bmRlZmluZWQhIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KVxyXG5cclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWVtb3J5R3Jvd3RoRXZlbnREZXRhaWwgeyBpbmRleDogbnVtYmVyIH1cclxuXHJcbmV4cG9ydCBjbGFzcyBNZW1vcnlHcm93dGhFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PE1lbW9yeUdyb3d0aEV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJNZW1vcnlHcm93dGhFdmVudFwiLCB7IGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHsgaW5kZXggfSB9KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBpbmRleDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICB0aGlzLmNhY2hlZE1lbW9yeVZpZXcgPSBuZXcgRGF0YVZpZXcodGhpcy5leHBvcnRzLm1lbW9yeS5idWZmZXIpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBNZW1vcnlHcm93dGhFdmVudCh0aGlzLCBpbmRleCkpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTZWdmYXVsdEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoXCJTZWdtZW50YXRpb24gZmF1bHRcIik7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIFVzZWQgYnkgU0FGRV9IRUFQXHJcbmV4cG9ydCBmdW5jdGlvbiBzZWdmYXVsdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtKTogbmV2ZXIge1xyXG4gICAgdGhyb3cgbmV3IFNlZ2ZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBFbXNjcmlwdGVuRXhjZXB0aW9uIH0gZnJvbSBcIi4uL2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IHV0ZjhUb1N0cmluZ1ogfSBmcm9tIFwiLi9zdHJpbmcuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhjZXB0aW9uTWVzc2FnZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBleDogRW1zY3JpcHRlbkV4Y2VwdGlvbik6IFtzdHJpbmcsIHN0cmluZ10ge1xyXG4gICAgdmFyIHB0ciA9IGdldENwcEV4Y2VwdGlvblRocm93bk9iamVjdEZyb21XZWJBc3NlbWJseUV4Y2VwdGlvbihpbXBsLCBleCk7XHJcbiAgICByZXR1cm4gZ2V0RXhjZXB0aW9uTWVzc2FnZUNvbW1vbihpbXBsLCBwdHIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDcHBFeGNlcHRpb25UaHJvd25PYmplY3RGcm9tV2ViQXNzZW1ibHlFeGNlcHRpb24oaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgZXg6IEVtc2NyaXB0ZW5FeGNlcHRpb24pIHtcclxuICAgIC8vIEluIFdhc20gRUgsIHRoZSB2YWx1ZSBleHRyYWN0ZWQgZnJvbSBXZWJBc3NlbWJseS5FeGNlcHRpb24gaXMgYSBwb2ludGVyXHJcbiAgICAvLyB0byB0aGUgdW53aW5kIGhlYWRlci4gQ29udmVydCBpdCB0byB0aGUgYWN0dWFsIHRocm93biB2YWx1ZS5cclxuICAgIGNvbnN0IHVud2luZF9oZWFkZXI6IG51bWJlciA9IGV4LmdldEFyZygoaW1wbC5leHBvcnRzKS5fX2NwcF9leGNlcHRpb24sIDApO1xyXG4gICAgcmV0dXJuIChpbXBsLmV4cG9ydHMpLl9fdGhyb3duX29iamVjdF9mcm9tX3Vud2luZF9leGNlcHRpb24odW53aW5kX2hlYWRlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0YWNrU2F2ZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNtKSB7XHJcbiAgICByZXR1cm4gaW1wbC5leHBvcnRzLmVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2N1cnJlbnQoKTtcclxufVxyXG5mdW5jdGlvbiBzdGFja0FsbG9jKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHNpemU6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGltcGwuZXhwb3J0cy5fZW1zY3JpcHRlbl9zdGFja19hbGxvYyhzaXplKTtcclxufVxyXG5mdW5jdGlvbiBzdGFja1Jlc3RvcmUoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgc3RhY2tQb2ludGVyOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBpbXBsLmV4cG9ydHMuX2Vtc2NyaXB0ZW5fc3RhY2tfcmVzdG9yZShzdGFja1BvaW50ZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRFeGNlcHRpb25NZXNzYWdlQ29tbW9uKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogW3N0cmluZywgc3RyaW5nXSB7XHJcbiAgICBjb25zdCBzcCA9IHN0YWNrU2F2ZShpbXBsKTtcclxuICAgIGNvbnN0IHR5cGVfYWRkcl9hZGRyID0gc3RhY2tBbGxvYyhpbXBsLCBnZXRQb2ludGVyU2l6ZShpbXBsKSk7XHJcbiAgICBjb25zdCBtZXNzYWdlX2FkZHJfYWRkciA9IHN0YWNrQWxsb2MoaW1wbCwgZ2V0UG9pbnRlclNpemUoaW1wbCkpO1xyXG4gICAgaW1wbC5leHBvcnRzLl9fZ2V0X2V4Y2VwdGlvbl9tZXNzYWdlKHB0ciwgdHlwZV9hZGRyX2FkZHIsIG1lc3NhZ2VfYWRkcl9hZGRyKTtcclxuICAgIGNvbnN0IHR5cGVfYWRkciA9IHJlYWRQb2ludGVyKGltcGwsIHR5cGVfYWRkcl9hZGRyKTtcclxuICAgIGNvbnN0IG1lc3NhZ2VfYWRkciA9IHJlYWRQb2ludGVyKGltcGwsIG1lc3NhZ2VfYWRkcl9hZGRyKTtcclxuICAgIGNvbnN0IHR5cGUgPSB1dGY4VG9TdHJpbmdaKGltcGwsIHR5cGVfYWRkcik7XHJcbiAgICBpbXBsLmV4cG9ydHMuZnJlZSh0eXBlX2FkZHIpO1xyXG4gICAgbGV0IG1lc3NhZ2UgPSBcIlwiO1xyXG4gICAgaWYgKG1lc3NhZ2VfYWRkcikge1xyXG4gICAgICAgIG1lc3NhZ2UgPSB1dGY4VG9TdHJpbmdaKGltcGwsIG1lc3NhZ2VfYWRkcik7XHJcbiAgICAgICAgaW1wbC5leHBvcnRzLmZyZWUobWVzc2FnZV9hZGRyKTtcclxuICAgIH1cclxuICAgIHN0YWNrUmVzdG9yZShpbXBsLCBzcCk7XHJcbiAgICByZXR1cm4gW3R5cGUsIG1lc3NhZ2VdO1xyXG59XHJcblxyXG4iLCAiaW1wb3J0IHsgZ2V0RXhjZXB0aW9uTWVzc2FnZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9leGNlcHRpb24uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudERldGFpbCB7IGV4Y2VwdGlvbjogV2ViQXNzZW1ibHkuRXhjZXB0aW9uIH1cclxuXHJcbmRlY2xhcmUgbmFtZXNwYWNlIFdlYkFzc2VtYmx5IHtcclxuICAgIGNsYXNzIEV4Y2VwdGlvbiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IodGFnOiBudW1iZXIsIHBheWxvYWQ6IG51bWJlcltdLCBvcHRpb25zPzogeyB0cmFjZVN0YWNrPzogYm9vbGVhbiB9KTtcclxuICAgICAgICBnZXRBcmcoZXhjZXB0aW9uVGFnOiBudW1iZXIsIGluZGV4OiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1zY3JpcHRlbkV4Y2VwdGlvbiBleHRlbmRzIFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiB7XHJcbiAgICBtZXNzYWdlOiBbc3RyaW5nLCBzdHJpbmddO1xyXG59XHJcbi8qXHJcbmV4cG9ydCBjbGFzcyBXZWJBc3NlbWJseUV4Y2VwdGlvbkV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8V2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgZXhjZXB0aW9uOiBXZWJBc3NlbWJseS5FeGNlcHRpb24pIHtcclxuICAgICAgICBzdXBlcihcIldlYkFzc2VtYmx5RXhjZXB0aW9uRXZlbnRcIiwgeyBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZXhjZXB0aW9uIH0gfSlcclxuICAgIH1cclxufVxyXG4qL1xyXG5leHBvcnQgZnVuY3Rpb24gX190aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBleDogYW55KTogdm9pZCB7XHJcbiAgICBjb25zdCB0ID0gbmV3IFdlYkFzc2VtYmx5LkV4Y2VwdGlvbigodGhpcy5leHBvcnRzKS5fX2NwcF9leGNlcHRpb24sIFtleF0sIHsgdHJhY2VTdGFjazogdHJ1ZSB9KSBhcyBFbXNjcmlwdGVuRXhjZXB0aW9uO1xyXG4gICAgdC5tZXNzYWdlID0gZ2V0RXhjZXB0aW9uTWVzc2FnZSh0aGlzLCB0KTtcclxuICAgIHRocm93IHQ7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfdHpzZXRfanModGhpczogSW5zdGFudGlhdGVkV2FzbSx0aW1lem9uZTogbnVtYmVyLCBkYXlsaWdodDogbnVtYmVyLCBzdGRfbmFtZTogbnVtYmVyLCBkc3RfbmFtZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBkZWJ1Z2dlcjtcclxuICAgIC8vIFRPRE9cclxuICB9IiwgIlxyXG4vLyBUaGVzZSBjb25zdGFudHMgYXJlbid0IGRvbmUgYXMgYW4gZW51bSBiZWNhdXNlIDk1JSBvZiB0aGVtIGFyZSBuZXZlciByZWZlcmVuY2VkLFxyXG4vLyBidXQgdGhleSdkIGFsbW9zdCBjZXJ0YWlubHkgbmV2ZXIgYmUgdHJlZS1zaGFrZW4gb3V0LlxyXG5cclxuLyoqIE5vIGVycm9yIG9jY3VycmVkLiBTeXN0ZW0gY2FsbCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiAqLyAgIGV4cG9ydCBjb25zdCBFU1VDQ0VTUyA9IDA7XHJcbi8qKiBBcmd1bWVudCBsaXN0IHRvbyBsb25nLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRTJCSUcgPSAxO1xyXG4vKiogUGVybWlzc2lvbiBkZW5pZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBQ0NFUyA9IDI7XHJcbi8qKiBBZGRyZXNzIGluIHVzZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUFERFJJTlVTRSA9IDM7XHJcbi8qKiBBZGRyZXNzIG5vdCBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUFERFJOT1RBVkFJTCA9IDQ7XHJcbi8qKiBBZGRyZXNzIGZhbWlseSBub3Qgc3VwcG9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUFGTk9TVVBQT1JUID0gNTtcclxuLyoqIFJlc291cmNlIHVuYXZhaWxhYmxlLCBvciBvcGVyYXRpb24gd291bGQgYmxvY2suICovICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUdBSU4gPSA2O1xyXG4vKiogQ29ubmVjdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBTFJFQURZID0gNztcclxuLyoqIEJhZCBmaWxlIGRlc2NyaXB0b3IuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQkFERiA9IDg7XHJcbi8qKiBCYWQgbWVzc2FnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUJBRE1TRyA9IDk7XHJcbi8qKiBEZXZpY2Ugb3IgcmVzb3VyY2UgYnVzeS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUJVU1kgPSAxMDtcclxuLyoqIE9wZXJhdGlvbiBjYW5jZWxlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ0FOQ0VMRUQgPSAxMTtcclxuLyoqIE5vIGNoaWxkIHByb2Nlc3Nlcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ0hJTEQgPSAxMjtcclxuLyoqIENvbm5lY3Rpb24gYWJvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ09OTkFCT1JURUQgPSAxMztcclxuLyoqIENvbm5lY3Rpb24gcmVmdXNlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ09OTlJFRlVTRUQgPSAxNDtcclxuLyoqIENvbm5lY3Rpb24gcmVzZXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ09OTlJFU0VUID0gMTU7XHJcbi8qKiBSZXNvdXJjZSBkZWFkbG9jayB3b3VsZCBvY2N1ci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRURFQURMSyA9IDE2O1xyXG4vKiogRGVzdGluYXRpb24gYWRkcmVzcyByZXF1aXJlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVERVNUQUREUlJFUSA9IDE3O1xyXG4vKiogTWF0aGVtYXRpY3MgYXJndW1lbnQgb3V0IG9mIGRvbWFpbiBvZiBmdW5jdGlvbi4gKi8gICAgICAgICAgZXhwb3J0IGNvbnN0IEVET00gPSAxODtcclxuLyoqIFJlc2VydmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRFFVT1QgPSAxOTtcclxuLyoqIEZpbGUgZXhpc3RzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRVhJU1QgPSAyMDtcclxuLyoqIEJhZCBhZGRyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRkFVTFQgPSAyMTtcclxuLyoqIEZpbGUgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRkJJRyA9IDIyO1xyXG4vKiogSG9zdCBpcyB1bnJlYWNoYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVIT1NUVU5SRUFDSCA9IDIzO1xyXG4vKiogSWRlbnRpZmllciByZW1vdmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJRFJNID0gMjQ7XHJcbi8qKiBJbGxlZ2FsIGJ5dGUgc2VxdWVuY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlMU0VRID0gMjU7XHJcbi8qKiBPcGVyYXRpb24gaW4gcHJvZ3Jlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlOUFJPR1JFU1MgPSAyNjtcclxuLyoqIEludGVycnVwdGVkIGZ1bmN0aW9uLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU5UUiA9IDI3O1xyXG4vKiogSW52YWxpZCBhcmd1bWVudC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTlZBTCA9IDI4O1xyXG4vKiogSS9PIGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTyA9IDI5O1xyXG4vKiogU29ja2V0IGlzIGNvbm5lY3RlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJU0NPTk4gPSAzMDtcclxuLyoqIElzIGEgZGlyZWN0b3J5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSVNESVIgPSAzMTtcclxuLyoqIFRvbyBtYW55IGxldmVscyBvZiBzeW1ib2xpYyBsaW5rcy4gKi8gICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTE9PUCA9IDMyO1xyXG4vKiogRmlsZSBkZXNjcmlwdG9yIHZhbHVlIHRvbyBsYXJnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNRklMRSA9IDMzO1xyXG4vKiogVG9vIG1hbnkgbGlua3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNTElOSyA9IDM0O1xyXG4vKiogTWVzc2FnZSB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNU0dTSVpFID0gMzU7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1VTFRJSE9QID0gMzY7XHJcbi8qKiBGaWxlbmFtZSB0b28gbG9uZy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5BTUVUT09MT05HID0gMzc7XHJcbi8qKiBOZXR3b3JrIGlzIGRvd24uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVERPV04gPSAzODtcclxuLyoqIENvbm5lY3Rpb24gYWJvcnRlZCBieSBuZXR3b3JrLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkVUUkVTRVQgPSAzOTtcclxuLyoqIE5ldHdvcmsgdW5yZWFjaGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkVUVU5SRUFDSCA9IDQwO1xyXG4vKiogVG9vIG1hbnkgZmlsZXMgb3BlbiBpbiBzeXN0ZW0uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORklMRSA9IDQxO1xyXG4vKiogTm8gYnVmZmVyIHNwYWNlIGF2YWlsYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0JVRlMgPSA0MjtcclxuLyoqIE5vIHN1Y2ggZGV2aWNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9ERVYgPSA0MztcclxuLyoqIE5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9FTlQgPSA0NDtcclxuLyoqIEV4ZWN1dGFibGUgZmlsZSBmb3JtYXQgZXJyb3IuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9FWEVDID0gNDU7XHJcbi8qKiBObyBsb2NrcyBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PTENLID0gNDY7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PTElOSyA9IDQ3O1xyXG4vKiogTm90IGVub3VnaCBzcGFjZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT01FTSA9IDQ4O1xyXG4vKiogTm8gbWVzc2FnZSBvZiB0aGUgZGVzaXJlZCB0eXBlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT01TRyA9IDQ5O1xyXG4vKiogUHJvdG9jb2wgbm90IGF2YWlsYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1BST1RPT1BUID0gNTA7XHJcbi8qKiBObyBzcGFjZSBsZWZ0IG9uIGRldmljZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PU1BDID0gNTE7XHJcbi8qKiBGdW5jdGlvbiBub3Qgc3VwcG9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PU1lTID0gNTI7XHJcbi8qKiBUaGUgc29ja2V0IGlzIG5vdCBjb25uZWN0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVENPTk4gPSA1MztcclxuLyoqIE5vdCBhIGRpcmVjdG9yeSBvciBhIHN5bWJvbGljIGxpbmsgdG8gYSBkaXJlY3RvcnkuICovICAgICAgIGV4cG9ydCBjb25zdCBFTk9URElSID0gNTQ7XHJcbi8qKiBEaXJlY3Rvcnkgbm90IGVtcHR5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVEVNUFRZID0gNTU7XHJcbi8qKiBTdGF0ZSBub3QgcmVjb3ZlcmFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVFJFQ09WRVJBQkxFID0gNTY7XHJcbi8qKiBOb3QgYSBzb2NrZXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVFNPQ0sgPSA1NztcclxuLyoqIE5vdCBzdXBwb3J0ZWQsIG9yIG9wZXJhdGlvbiBub3Qgc3VwcG9ydGVkIG9uIHNvY2tldC4gKi8gICAgIGV4cG9ydCBjb25zdCBFTk9UU1VQID0gNTg7XHJcbi8qKiBJbmFwcHJvcHJpYXRlIEkvTyBjb250cm9sIG9wZXJhdGlvbi4gKi8gICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVFRZID0gNTk7XHJcbi8qKiBObyBzdWNoIGRldmljZSBvciBhZGRyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5YSU8gPSA2MDtcclxuLyoqIFZhbHVlIHRvbyBsYXJnZSB0byBiZSBzdG9yZWQgaW4gZGF0YSB0eXBlLiAqLyAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFT1ZFUkZMT1cgPSA2MTtcclxuLyoqIFByZXZpb3VzIG93bmVyIGRpZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFT1dORVJERUFEID0gNjI7XHJcbi8qKiBPcGVyYXRpb24gbm90IHBlcm1pdHRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBFUk0gPSA2MztcclxuLyoqIEJyb2tlbiBwaXBlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUElQRSA9IDY0O1xyXG4vKiogUHJvdG9jb2wgZXJyb3IuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQUk9UTyA9IDY1O1xyXG4vKiogUHJvdG9jb2wgbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQUk9UT05PU1VQUE9SVCA9IDY2O1xyXG4vKiogUHJvdG9jb2wgd3JvbmcgdHlwZSBmb3Igc29ja2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQUk9UT1RZUEUgPSA2NztcclxuLyoqIFJlc3VsdCB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUkFOR0UgPSA2ODtcclxuLyoqIFJlYWQtb25seSBmaWxlIHN5c3RlbS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUk9GUyA9IDY5O1xyXG4vKiogSW52YWxpZCBzZWVrLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVTUElQRSA9IDcwO1xyXG4vKiogTm8gc3VjaCBwcm9jZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVTUkNIID0gNzE7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVNUQUxFID0gNzI7XHJcbi8qKiBDb25uZWN0aW9uIHRpbWVkIG91dC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVRJTUVET1VUID0gNzM7XHJcbi8qKiBUZXh0IGZpbGUgYnVzeS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVRYVEJTWSA9IDc0O1xyXG4vKiogQ3Jvc3MtZGV2aWNlIGxpbmsuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVYREVWID0gNzU7XHJcbi8qKiBFeHRlbnNpb246IENhcGFiaWxpdGllcyBpbnN1ZmZpY2llbnQuICovICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVENBUEFCTEUgPSA3NjsiLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDY0KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IGJpZ2ludCk6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRCaWdVaW50NjQocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEVJTlZBTCwgRU5PU1lTLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQ2NCB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQ2NC5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBlbnVtIENsb2NrSWQge1xyXG4gICAgUkVBTFRJTUUgPSAwLFxyXG4gICAgTU9OT1RPTklDID0gMSxcclxuICAgIFBST0NFU1NfQ1BVVElNRV9JRCA9IDIsXHJcbiAgICBUSFJFQURfQ1BVVElNRV9JRCA9IDNcclxufVxyXG5cclxuY29uc3QgcCA9IChnbG9iYWxUaGlzLnBlcmZvcm1hbmNlKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbG9ja190aW1lX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBjbGtfaWQ6IG51bWJlciwgX3ByZWNpc2lvbjogbnVtYmVyLCBvdXRQdHI6IG51bWJlcik6IG51bWJlciB7XHJcblxyXG4gICAgbGV0IG5vd01zOiBudW1iZXI7XHJcbiAgICBzd2l0Y2ggKGNsa19pZCkge1xyXG4gICAgICAgIGNhc2UgQ2xvY2tJZC5SRUFMVElNRTpcclxuICAgICAgICAgICAgbm93TXMgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIENsb2NrSWQuTU9OT1RPTklDOlxyXG4gICAgICAgICAgICBpZiAocCA9PSBudWxsKSByZXR1cm4gRU5PU1lTOyAgIC8vIFRPRE86IFBvc3NpYmxlIHRvIGJlIG51bGwgaW4gV29ya2xldHM/XHJcbiAgICAgICAgICAgIG5vd01zID0gcC5ub3coKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLlBST0NFU1NfQ1BVVElNRV9JRDpcclxuICAgICAgICBjYXNlIENsb2NrSWQuVEhSRUFEX0NQVVRJTUVfSUQ6XHJcbiAgICAgICAgICAgIHJldHVybiBFTk9TWVM7XHJcbiAgICAgICAgZGVmYXVsdDogcmV0dXJuIEVJTlZBTDtcclxuICAgIH1cclxuICAgIGNvbnN0IG5vd05zID0gQmlnSW50KE1hdGgucm91bmQobm93TXMgKiAxMDAwICogMTAwMCkpO1xyXG4gICAgd3JpdGVVaW50NjQodGhpcywgb3V0UHRyLCBub3dOcyk7XHJcblxyXG4gICAgcmV0dXJuIEVTVUNDRVNTO1xyXG59IiwgImltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVudmlyb25fZ2V0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGVudmlyb25Db3VudE91dHB1dDogUG9pbnRlcjxQb2ludGVyPG51bWJlcj4+LCBlbnZpcm9uU2l6ZU91dHB1dDogUG9pbnRlcjxudW1iZXI+KSB7XHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBlbnZpcm9uQ291bnRPdXRwdXQsIDApO1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvblNpemVPdXRwdXQsIDApO1xyXG5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlbnZpcm9uX3NpemVzX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBlbnZpcm9uQ291bnRPdXRwdXQ6IFBvaW50ZXI8UG9pbnRlcjxudW1iZXI+PiwgZW52aXJvblNpemVPdXRwdXQ6IFBvaW50ZXI8bnVtYmVyPikge1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvbkNvdW50T3V0cHV0LCAwKTtcclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25TaXplT3V0cHV0LCAwKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYC4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcImZkX2Nsb3NlXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQT1NJWCBjbG9zZSAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfY2xvc2UodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZmQ6IEZpbGVEZXNjcmlwdG9yKTogdm9pZCB7XHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnQoZmQpO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuXHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkUG9pbnRlciB9IGZyb20gXCIuLi91dGlsL3JlYWQtcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW92ZWMge1xyXG4gICAgYnVmZmVyU3RhcnQ6IG51bWJlcjtcclxuICAgIGJ1ZmZlckxlbmd0aDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UoaW5mbzogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBJb3ZlYyB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJ1ZmZlclN0YXJ0OiByZWFkUG9pbnRlcihpbmZvLCBwdHIpLFxyXG4gICAgICAgIGJ1ZmZlckxlbmd0aDogcmVhZFVpbnQzMihpbmZvLCBwdHIgKyBnZXRQb2ludGVyU2l6ZShpbmZvKSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uKiBwYXJzZUFycmF5KGluZm86IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogR2VuZXJhdG9yPElvdmVjLCB2b2lkLCB2b2lkPiB7XHJcbiAgICBjb25zdCBzaXplb2ZTdHJ1Y3QgPSBnZXRQb2ludGVyU2l6ZShpbmZvKSArIDQ7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcclxuICAgICAgICB5aWVsZCBwYXJzZShpbmZvLCBwdHIgKyAoaSAqIHNpemVvZlN0cnVjdCkpXHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IHR5cGUgSW92ZWMsIHBhcnNlQXJyYXkgfSBmcm9tIFwiLi4vX3ByaXZhdGUvaW92ZWMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQ4IH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDguanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JSZWFkRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKiBcclxuICAgICAqIEl0J3MgbW9yZS1vci1sZXNzIFt1bml2ZXJzYWxseSBleHBlY3RlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3RhbmRhcmRfc3RyZWFtKSB0aGF0IDAgaXMgZm9yIGlucHV0LCAxIGZvciBvdXRwdXQsIGFuZCAyIGZvciBlcnJvcnMsXHJcbiAgICAgKiBzbyB5b3UgY2FuIG1hcCAxIHRvIGBjb25zb2xlLmxvZ2AgYW5kIDIgdG8gYGNvbnNvbGUuZXJyb3JgLCB3aXRoIG90aGVycyBoYW5kbGVkIHdpdGggdGhlIHZhcmlvdXMgZmlsZS1vcGVuaW5nIGNhbGxzLiBcclxuICAgICAqL1xyXG4gICAgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxuXHJcbiAgICByZXF1ZXN0ZWRCdWZmZXJzOiBJb3ZlY1tdO1xyXG5cclxuICAgIHJlYWRJbnRvTWVtb3J5KGJ1ZmZlcnM6IChVaW50OEFycmF5KVtdKTogdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JSZWFkRXZlbnREZXRhaWw+IHtcclxuICAgIHByaXZhdGUgX2J5dGVzV3JpdHRlbiA9IDA7XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgZmlsZURlc2NyaXB0b3I6IG51bWJlciwgcmVxdWVzdGVkQnVmZmVySW5mbzogSW92ZWNbXSkge1xyXG4gICAgICAgIHN1cGVyKFwiZmRfcmVhZFwiLCB7XHJcbiAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICBkZXRhaWw6IHtcclxuICAgICAgICAgICAgICAgIGZpbGVEZXNjcmlwdG9yLFxyXG4gICAgICAgICAgICAgICAgcmVxdWVzdGVkQnVmZmVyczogcmVxdWVzdGVkQnVmZmVySW5mbyxcclxuICAgICAgICAgICAgICAgIHJlYWRJbnRvTWVtb3J5OiAoaW5wdXRCdWZmZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gMTAwJSB1bnRlc3RlZCwgcHJvYmFibHkgZG9lc24ndCB3b3JrIGlmIEknbSBiZWluZyBob25lc3RcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlcXVlc3RlZEJ1ZmZlckluZm8ubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPj0gaW5wdXRCdWZmZXJzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBpbnB1dEJ1ZmZlcnNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgTWF0aC5taW4oYnVmZmVyLmJ5dGVMZW5ndGgsIGlucHV0QnVmZmVyc1tqXS5ieXRlTGVuZ3RoKTsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZVVpbnQ4KGltcGwsIHJlcXVlc3RlZEJ1ZmZlckluZm9baV0uYnVmZmVyU3RhcnQgKyBqLCBidWZmZXJbal0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKyt0aGlzLl9ieXRlc1dyaXR0ZW47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGJ5dGVzV3JpdHRlbigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9ieXRlc1dyaXR0ZW47XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVbmhhbmRsZWRGaWxlUmVhZEV2ZW50IGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoZmQ6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKGBVbmhhbmRsZWQgcmVhZCB0byBmaWxlIGRlc2NyaXB0b3IgIyR7ZmR9LmApO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqIFBPU0lYIHJlYWR2ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmZF9yZWFkKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpIHtcclxuXHJcbiAgICBsZXQgbldyaXR0ZW4gPSAwO1xyXG4gICAgY29uc3QgZ2VuID0gcGFyc2VBcnJheSh0aGlzLCBpb3YsIGlvdmNudCk7XHJcblxyXG4gICAgLy8gR2V0IGFsbCB0aGUgZGF0YSB0byByZWFkIGluIGl0cyBzZXBhcmF0ZSBidWZmZXJzXHJcbiAgICAvL2NvbnN0IGFzVHlwZWRBcnJheXMgPSBbLi4uZ2VuXS5tYXAoKHsgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCB9KSA9PiB7IG5Xcml0dGVuICs9IGJ1ZmZlckxlbmd0aDsgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuZ2V0TWVtb3J5KCkuYnVmZmVyLCBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoKSB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudCh0aGlzLCBmZCwgWy4uLmdlbl0pO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBuV3JpdHRlbiA9IDA7XHJcbiAgICAgICAgLyppZiAoZmQgPT0gMCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gZXJyb3Juby5iYWRmOyovXHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBuV3JpdHRlbiA9IGV2ZW50LmJ5dGVzV3JpdHRlbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHdyaXRlVWludDMyKHRoaXMsIHBudW0sIG5Xcml0dGVuKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG5cclxuXHJcbmNvbnN0IHRleHREZWNvZGVycyA9IG5ldyBNYXA8c3RyaW5nLCBUZXh0RGVjb2Rlcj4oKTtcclxuZnVuY3Rpb24gZ2V0VGV4dERlY29kZXIobGFiZWw6IHN0cmluZykge1xyXG4gICAgbGV0IHJldDogVGV4dERlY29kZXIgfCB1bmRlZmluZWQgPSB0ZXh0RGVjb2RlcnMuZ2V0KGxhYmVsKTtcclxuICAgIGlmICghcmV0KSB7XHJcbiAgICAgICAgcmV0ID0gbmV3IFRleHREZWNvZGVyKGxhYmVsKTtcclxuICAgICAgICB0ZXh0RGVjb2RlcnMuc2V0KGxhYmVsLCByZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbn0iLCAiaW1wb3J0IHsgRUJBREYsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IsIFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JTZWVrRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKiBcclxuICAgICAqIEl0J3MgbW9yZS1vci1sZXNzIFt1bml2ZXJzYWxseSBleHBlY3RlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3RhbmRhcmRfc3RyZWFtKSB0aGF0IDAgaXMgZm9yIGlucHV0LCAxIGZvciBvdXRwdXQsIGFuZCAyIGZvciBlcnJvcnMsXHJcbiAgICAgKiBzbyB5b3UgY2FuIG1hcCAxIHRvIGBjb25zb2xlLmxvZ2AgYW5kIDIgdG8gYGNvbnNvbGUuZXJyb3JgLiBcclxuICAgICAqL1xyXG4gICAgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JTZWVrRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcImZkX3NlZWtcIiwgeyBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZmlsZURlc2NyaXB0b3IgfSB9KTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqIFBPU0lYIGxzZWVrICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmZF9zZWVrKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvciwgb2Zmc2V0OiBudW1iZXIsIHdoZW5jZTogbnVtYmVyLCBvZmZzZXRPdXQ6IFBvaW50ZXI8bnVtYmVyPik6IHR5cGVvZiBFQkFERiB8IHR5cGVvZiBFU1VDQ0VTUyB7XHJcbiAgICBpZiAodGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBGaWxlRGVzY3JpcHRvclNlZWtFdmVudChmZCkpKSB7XHJcbiAgICAgICAgc3dpdGNoIChmZCkge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIEVCQURGO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufVxyXG4iLCAiaW1wb3J0IHsgcGFyc2VBcnJheSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9pb3ZlYy5qc1wiO1xyXG5pbXBvcnQgeyBFQkFERiwgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKiBcclxuICAgICAqIEl0J3MgbW9yZS1vci1sZXNzIFt1bml2ZXJzYWxseSBleHBlY3RlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3RhbmRhcmRfc3RyZWFtKSB0aGF0IDAgaXMgZm9yIGlucHV0LCAxIGZvciBvdXRwdXQsIGFuZCAyIGZvciBlcnJvcnMsXHJcbiAgICAgKiBzbyB5b3UgY2FuIG1hcCAxIHRvIGBjb25zb2xlLmxvZ2AgYW5kIDIgdG8gYGNvbnNvbGUuZXJyb3JgLCB3aXRoIG90aGVycyBoYW5kbGVkIHdpdGggdGhlIHZhcmlvdXMgZmlsZS1vcGVuaW5nIGNhbGxzLiBcclxuICAgICAqL1xyXG4gICAgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxuICAgIGRhdGE6IFVpbnQ4QXJyYXlbXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoZmlsZURlc2NyaXB0b3I6IG51bWJlciwgZGF0YTogVWludDhBcnJheVtdKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF93cml0ZVwiLCB7IGJ1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZGF0YSwgZmlsZURlc2NyaXB0b3IgfSB9KTtcclxuICAgIH1cclxuICAgIGFzU3RyaW5nKGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRldGFpbC5kYXRhLm1hcCgoZCwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGRlY29kZWQgPSBnZXRUZXh0RGVjb2RlcihsYWJlbCkuZGVjb2RlKGQpO1xyXG4gICAgICAgICAgICBpZiAoZGVjb2RlZCA9PSBcIlxcMFwiICYmIGluZGV4ID09IHRoaXMuZGV0YWlsLmRhdGEubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlZDtcclxuICAgICAgICB9KS5qb2luKFwiXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5oYW5kbGVkRmlsZVdyaXRlRXZlbnQgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihmZDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYFVuaGFuZGxlZCB3cml0ZSB0byBmaWxlIGRlc2NyaXB0b3IgIyR7ZmR9LmApO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqIFBPU0lYIHdyaXRldiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfd3JpdGUodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZmQ6IEZpbGVEZXNjcmlwdG9yLCBpb3Y6IG51bWJlciwgaW92Y250OiBudW1iZXIsIHBudW06IG51bWJlcik6IHR5cGVvZiBFU1VDQ0VTUyB8IHR5cGVvZiBFQkFERiB7XHJcblxyXG4gICAgbGV0IG5Xcml0dGVuID0gMDtcclxuICAgIGNvbnN0IGdlbiA9IHBhcnNlQXJyYXkodGhpcywgaW92LCBpb3ZjbnQpO1xyXG5cclxuICAgIC8vIEdldCBhbGwgdGhlIGRhdGEgdG8gd3JpdGUgaW4gaXRzIHNlcGFyYXRlIGJ1ZmZlcnNcclxuICAgIGNvbnN0IGFzVHlwZWRBcnJheXMgPSBbLi4uZ2VuXS5tYXAoKHsgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCB9KSA9PiB7IG5Xcml0dGVuICs9IGJ1ZmZlckxlbmd0aDsgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuY2FjaGVkTWVtb3J5Vmlldy5idWZmZXIsIGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGgpIH0pO1xyXG5cclxuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudChmZCwgYXNUeXBlZEFycmF5cyk7XHJcbiAgICBpZiAodGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KSkge1xyXG4gICAgICAgIGNvbnN0IHN0ciA9IGV2ZW50LmFzU3RyaW5nKFwidXRmLThcIik7XHJcbiAgICAgICAgaWYgKGZkID09IDEpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHN0cik7XHJcbiAgICAgICAgZWxzZSBpZiAoZmQgPT0gMilcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihzdHIpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIEVCQURGO1xyXG4gICAgfVxyXG5cclxuICAgIHdyaXRlVWludDMyKHRoaXMsIHBudW0sIG5Xcml0dGVuKTtcclxuXHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn1cclxuXHJcblxyXG5jb25zdCB0ZXh0RGVjb2RlcnMgPSBuZXcgTWFwPHN0cmluZywgVGV4dERlY29kZXI+KCk7XHJcbmZ1bmN0aW9uIGdldFRleHREZWNvZGVyKGxhYmVsOiBzdHJpbmcpIHtcclxuICAgIGxldCByZXQ6IFRleHREZWNvZGVyIHwgdW5kZWZpbmVkID0gdGV4dERlY29kZXJzLmdldChsYWJlbCk7XHJcbiAgICBpZiAoIXJldCkge1xyXG4gICAgICAgIHJldCA9IG5ldyBUZXh0RGVjb2RlcihsYWJlbCk7XHJcbiAgICAgICAgdGV4dERlY29kZXJzLnNldChsYWJlbCwgcmV0KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0O1xyXG59IiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFib3J0RXZlbnREZXRhaWwge1xyXG4gICAgY29kZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQWJvcnRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEFib3J0RXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjb2RlOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcInByb2NfZXhpdFwiLCB7IGJ1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiBmYWxzZSwgZGV0YWlsOiB7IGNvZGUgfSB9KTtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBYm9ydEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoY29kZTogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYGFib3J0KCR7Y29kZX0pIHdhcyBjYWxsZWRgKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByb2NfZXhpdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBjb2RlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQWJvcnRFdmVudChjb2RlKSk7XHJcbiAgICB0aHJvdyBuZXcgQWJvcnRFcnJvcihjb2RlKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgYWxpZ25mYXVsdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9hbGlnbmZhdWx0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9ib29sIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHkgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsIF9lbXZhbF9kZWNyZWYsIF9lbXZhbF90YWtlX3ZhbHVlIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9lbXZhbC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2VudW0sIF9lbWJpbmRfcmVnaXN0ZXJfZW51bV92YWx1ZSwgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mdW5jdGlvbiB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXkuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QsIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdF9maWVsZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdm9pZC5qc1wiO1xyXG5pbXBvcnQgeyBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGguanNcIjtcclxuaW1wb3J0IHsgc2VnZmF1bHQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvc2VnZmF1bHQuanNcIjtcclxuaW1wb3J0IHsgX190aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS5qc1wiO1xyXG5pbXBvcnQgeyBfdHpzZXRfanMgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvdHpzZXRfanMuanNcIjtcclxuaW1wb3J0IHsgY2xvY2tfdGltZV9nZXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Nsb2NrX3RpbWVfZ2V0LmpzXCI7XHJcbmltcG9ydCB7IGVudmlyb25fZ2V0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX2dldC5qc1wiO1xyXG5pbXBvcnQgeyBlbnZpcm9uX3NpemVzX2dldCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9zaXplc19nZXQuanNcIjtcclxuaW1wb3J0IHsgZmRfY2xvc2UgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX2Nsb3NlLmpzXCI7XHJcbmltcG9ydCB7IGZkX3JlYWQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3JlYWQuanNcIjtcclxuaW1wb3J0IHsgZmRfc2VlayB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfc2Vlay5qc1wiO1xyXG5pbXBvcnQgeyBmZF93cml0ZSB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfd3JpdGUuanNcIjtcclxuaW1wb3J0IHsgcHJvY19leGl0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9wcm9jX2V4aXQuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFN0cnVjdFRlc3Qge1xyXG4gICAgc3RyaW5nOiBzdHJpbmc7XHJcbiAgICBudW1iZXI6IG51bWJlcjtcclxuICAgIHRyaXBsZTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xyXG59XHJcblxyXG5leHBvcnQgZGVjbGFyZSBjbGFzcyBUZXN0Q2xhc3MgaW1wbGVtZW50cyBEaXNwb3NhYmxlIHtcclxuICAgIHB1YmxpYyB4OiBudW1iZXI7XHJcbiAgICBwdWJsaWMgeTogc3RyaW5nO1xyXG4gICAgY29uc3RydWN0b3IoeDogbnVtYmVyLCB5OiBzdHJpbmcpO1xyXG4gICAgaW5jcmVtZW50WCgpOiBUZXN0Q2xhc3M7XHJcblxyXG4gICAgZ2V0WCgpOiBudW1iZXI7XHJcbiAgICBzZXRYKHg6IG51bWJlcik6IHZvaWQ7XHJcblxyXG4gICAgc3RhdGljIGdldFN0cmluZ0Zyb21JbnN0YW5jZShpbnN0YW5jZTogVGVzdENsYXNzKTogc3RyaW5nO1xyXG5cclxuICAgIHN0YXRpYyBjcmVhdGUoKTogVGVzdENsYXNzO1xyXG5cclxuICAgIHN0YXRpYyBpZGVudGl0eUNvbnN0UG9pbnRlcihpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5UG9pbnRlcihpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5UmVmZXJlbmNlKGlucHV0OiBUZXN0Q2xhc3MpOiBUZXN0Q2xhc3M7XHJcbiAgICBzdGF0aWMgaWRlbnRpdHlDb25zdFJlZmVyZW5jZShpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5Q29weShpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG5cclxuICAgIFtTeW1ib2wuZGlzcG9zZV0oKTogdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbWJvdW5kVHlwZXMge1xyXG5cclxuICAgIGlkZW50aXR5X3U4KG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X2k4KG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X3UxNihuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV9pMTYobjogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgaWRlbnRpdHlfdTMyKG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X2kzMihuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV91NjQobjogYmlnaW50KTogYmlnaW50O1xyXG4gICAgaWRlbnRpdHlfaTY0KG46IGJpZ2ludCk6IGJpZ2ludDtcclxuICAgIGlkZW50aXR5X3N0cmluZyhuOiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV93c3RyaW5nKG46IHN0cmluZyk6IHN0cmluZztcclxuICAgIGlkZW50aXR5X29sZF9lbnVtKG46IGFueSk6IHN0cmluZztcclxuICAgIGlkZW50aXR5X25ld19lbnVtKG46IGFueSk6IHN0cmluZztcclxuICAgIGlkZW50aXR5X3N0cnVjdF9wb2ludGVyKG46IFN0cnVjdFRlc3QpOiBTdHJ1Y3RUZXN0O1xyXG4gICAgc3RydWN0X2NyZWF0ZSgpOiBTdHJ1Y3RUZXN0O1xyXG4gICAgc3RydWN0X2NvbnN1bWUobjogU3RydWN0VGVzdCk6IHZvaWQ7XHJcbiAgICBpZGVudGl0eV9zdHJ1Y3RfY29weShuOiBTdHJ1Y3RUZXN0KTogU3RydWN0VGVzdDtcclxuICAgIHRlc3RDbGFzc0FycmF5KCk6IG51bWJlcjtcclxuICAgIG5vd1N0ZWFkeSgpOiBudW1iZXI7XHJcbiAgICBub3dTeXN0ZW0oKTogbnVtYmVyO1xyXG4gICAgdGhyb3dzRXhjZXB0aW9uKCk6IG5ldmVyO1xyXG4gICAgY2F0Y2hlc0V4Y2VwdGlvbigpOiBuZXZlcjtcclxuXHJcbiAgICBUZXN0Q2xhc3M6IHR5cGVvZiBUZXN0Q2xhc3M7XHJcbn1cclxuXHJcbmludGVyZmFjZSBLbm93bkluc3RhbmNlRXhwb3J0cyB7XHJcbiAgICBwcmludFRlc3QoKTogbnVtYmVyO1xyXG4gICAgcmV2ZXJzZUlucHV0KCk6IG51bWJlcjtcclxuICAgIGdldFJhbmRvbU51bWJlcigpOiBudW1iZXI7XHJcbiAgICBnZXRLZXkoKTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFudGlhdGUod2hlcmU6IHN0cmluZywgdW5pbnN0YW50aWF0ZWQ/OiBBcnJheUJ1ZmZlcik6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzbTxLbm93bkluc3RhbmNlRXhwb3J0cywgRW1ib3VuZFR5cGVzPj4ge1xyXG5cclxuICAgIGxldCB3YXNtID0gYXdhaXQgSW5zdGFudGlhdGVkV2FzbS5pbnN0YW50aWF0ZTxLbm93bkluc3RhbmNlRXhwb3J0cywgRW1ib3VuZFR5cGVzPih1bmluc3RhbnRpYXRlZCA/PyBmZXRjaChuZXcgVVJMKFwid2FzbS53YXNtXCIsIGltcG9ydC5tZXRhLnVybCkpLCB7XHJcbiAgICAgICAgZW52OiB7XHJcbiAgICAgICAgICAgIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UsXHJcbiAgICAgICAgICAgIGVtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9ib29sLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCxcclxuICAgICAgICAgICAgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9hcnJheSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9lbnVtLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUsXHJcbiAgICAgICAgICAgIF9lbXZhbF90YWtlX3ZhbHVlLFxyXG4gICAgICAgICAgICBfZW12YWxfZGVjcmVmLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSxcclxuICAgICAgICAgICAgX3R6c2V0X2pzLFxyXG4gICAgICAgICAgICBzZWdmYXVsdCxcclxuICAgICAgICAgICAgYWxpZ25mYXVsdCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdhc2lfc25hcHNob3RfcHJldmlldzE6IHtcclxuICAgICAgICAgICAgZmRfY2xvc2UsXHJcbiAgICAgICAgICAgIGZkX3JlYWQsXHJcbiAgICAgICAgICAgIGZkX3NlZWssXHJcbiAgICAgICAgICAgIGZkX3dyaXRlLFxyXG4gICAgICAgICAgICBlbnZpcm9uX2dldCxcclxuICAgICAgICAgICAgZW52aXJvbl9zaXplc19nZXQsXHJcbiAgICAgICAgICAgIHByb2NfZXhpdCxcclxuICAgICAgICAgICAgY2xvY2tfdGltZV9nZXRcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICB3YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJmZF93cml0ZVwiLCBlID0+IHtcclxuICAgICAgICBpZiAoZS5kZXRhaWwuZmlsZURlc2NyaXB0b3IgPT0gMSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZS5hc1N0cmluZyhcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJHt3aGVyZX06ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHdhc207XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUdNLFNBQVUsV0FBVyxVQUE0QixLQUFvQjtBQUFZLFNBQU8sU0FBUyxpQkFBaUIsVUFBVSxLQUFLLElBQUk7QUFBRzs7O0FDQXhJLFNBQVUsVUFBVSxVQUE0QixLQUFvQjtBQUFZLFNBQU8sU0FBUyxpQkFBaUIsU0FBUyxHQUFHO0FBQUc7OztBQ01oSSxTQUFVLGlCQUFpQixNQUF3QixLQUFXO0FBQ2hFLE1BQUksTUFBTTtBQUNWLE1BQUk7QUFDSixTQUFPLFdBQVcsVUFBVSxNQUFNLEtBQUssR0FBRztBQUN0QyxXQUFPLE9BQU8sYUFBYSxRQUFRO0VBQ3ZDO0FBQ0EsU0FBTztBQUNYO0FBR0EsSUFBSSxjQUFjLElBQUksWUFBWSxPQUFPO0FBQ3pDLElBQUksZUFBZSxJQUFJLFlBQVksVUFBVTtBQUM3QyxJQUFJLGNBQWMsSUFBSSxZQUFXO0FBUzNCLFNBQVUsY0FBYyxN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QUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDSjtBQUFBLElBQ0Esd0JBQXdCO0FBQUEsTUFDcEI7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDSjtBQUFBLEVBQ0osQ0FBQztBQUVELE9BQUssaUJBQWlCLFlBQVksT0FBSztBQUNuQyxRQUFJLEVBQUUsT0FBTyxrQkFBa0IsR0FBRztBQUM5QixRQUFFLGVBQWU7QUFDakIsWUFBTSxRQUFRLEVBQUUsU0FBUyxPQUFPO0FBQ2hDLGNBQVEsSUFBSSxHQUFHLEtBQUssS0FBSyxLQUFLLEVBQUU7QUFBQSxJQUNwQztBQUFBLEVBQ0osQ0FBQztBQUVELFNBQU87QUFDWDsiLAogICJuYW1lcyI6IFsicCIsICJqc1ZhbHVlIiwgIndpcmVWYWx1ZSIsICJzdGFja0Rlc3RydWN0b3IiLCAiQ2xvY2tJZCJdCn0K
