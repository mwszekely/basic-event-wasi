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
      return this.constructor._constructor(...args);
    } else {
      const _this = args[1];
      const existing = instantiatedClasses.get(_this)?.deref();
      if (existing)
        return existing;
      this._this = _this;
      instantiatedClasses.set(_this, new WeakRef(this));
      registry.register(this, _this);
      if (args[0] != SecretNoDispose) {
        const destructor = this.constructor._destructor;
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
        ret[Symbol.dispose] = () => {
          runDestructors(elementDestructors);
          reg._destructor(ptr);
        };
        Object.freeze(ret);
        return {
          jsValue: ret,
          wireValue: ptr,
          stackDestructor: () => ret[Symbol.dispose]()
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
        Object.defineProperty(ret, Symbol.dispose, {
          value: () => {
            runDestructors(elementDestructors);
            reg._destructor(ptr);
          },
          enumerable: false,
          writable: false
        });
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
            ret[Symbol.dispose]();
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

// ../dist/instantiated-wasi.js
var InstantiatedWasiEventTarget = EventTarget;
var InstantiatedWasi = class extends InstantiatedWasiEventTarget {
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
  cachedMemoryView;
  /** Not intended to be called directly. Use the `instantiate` function instead, which returns one of these. */
  constructor() {
    super();
    this.module = this.instance = this.exports = this.cachedMemoryView = null;
    this.embind = {};
  }
  _init(module, instance) {
    this.module = module;
    this.instance = instance;
    this.exports = instance.exports;
    this.cachedMemoryView = new DataView(this.exports.memory.buffer);
  }
};

// ../dist/_private/instantiate-wasi.js
function instantiateWasi(wasmInstance, unboundImports, { dispatchEvent } = {}) {
  let resolve;
  let ret = new InstantiatedWasi();
  wasmInstance.then((o) => {
    const { instance, module } = o;
    ret._init(module, instance);
    console.assert("_initialize" in instance.exports != "_start" in instance.exports, `Expected either _initialize XOR _start to be exported from this WASM.`);
    if ("_initialize" in instance.exports) {
      instance.exports._initialize();
    } else if ("_start" in instance.exports) {
      instance.exports._start();
    }
    resolve(ret);
  });
  const wasi_snapshot_preview1 = bindAllFuncs(ret, unboundImports.wasi_snapshot_preview1);
  const env = bindAllFuncs(ret, unboundImports.env);
  const boundImports = { wasi_snapshot_preview1, env };
  return {
    imports: boundImports,
    // Until this resolves, no WASI functions can be called (and by extension no wasm exports can be called)
    // It resolves immediately after the input promise to the instance&module resolves
    wasiReady: new Promise((res) => {
      resolve = res;
    })
  };
}
function bindAllFuncs(p2, r) {
  return Object.fromEntries(Object.entries(r).map(([key, func]) => {
    return [key, typeof func == "function" ? func.bind(p2) : func];
  }));
}

// ../dist/_private/instantiate-wasm.js
async function instantiateWasmGeneric(instantiateWasm, unboundImports) {
  const { promise: wasmReady, resolve: resolveWasm } = Promise.withResolvers();
  const { imports, wasiReady } = instantiateWasi(wasmReady, unboundImports);
  resolveWasm(await instantiateWasm({ ...imports }));
  const ret = await wasiReady;
  await awaitAllEmbind();
  return ret;
}
WebAssembly.instantiate;

// ../dist/instantiate.js
async function instantiate(wasm, unboundImports) {
  return await instantiateWasmGeneric(async (combinedImports) => {
    if (wasm instanceof WebAssembly.Module)
      return { module: wasm, instance: await WebAssembly.instantiate(wasm, { ...combinedImports }) };
    else if (wasm instanceof ArrayBuffer || ArrayBuffer.isView(wasm))
      return await WebAssembly.instantiate(wasm, { ...combinedImports });
    else if ("then" in wasm || "Response" in globalThis && wasm instanceof Response)
      return await WebAssembly.instantiateStreaming(wasm, { ...combinedImports });
    else
      return await wasm(combinedImports);
  }, unboundImports);
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
async function instantiate2(where, uninstantiated) {
  let wasm = await instantiate(uninstantiated ?? fetch(new URL("wasm.wasm", import.meta.url)), {
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
  instantiate2 as instantiate
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc3JjL2Vudi9hbGlnbmZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXR5cGUtaW5mby50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDMyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL3N0cmluZy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvaXMtNjQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcG9pbnRlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXBvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldy50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQxNi50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50MzIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92b2lkLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3NlZ2ZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9leGNlcHRpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3R6c2V0X2pzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9pbnN0YW50aWF0ZWQtd2FzaS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvaW5zdGFudGlhdGUtd2FzaS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvaW5zdGFudGlhdGUtd2FzbS50cyIsICIuLi8uLi8uLi8uLi9zcmMvaW5zdGFudGlhdGUudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vycm5vLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQ2NC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9jbG9ja190aW1lX2dldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX2dldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX3NpemVzX2dldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9jbG9zZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvaW92ZWMudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfcmVhZC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9zZWVrLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3dyaXRlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL3Byb2NfZXhpdC50cyIsICIuLi8uLi9pbnN0YW50aWF0ZS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFsaWduZmF1bHRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKFwiQWxpZ25tZW50IGZhdWx0XCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBVc2VkIGJ5IFNBRkVfSEVBUFxyXG5leHBvcnQgZnVuY3Rpb24gYWxpZ25mYXVsdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9Pik6IG5ldmVyIHtcclxuICAgIHRocm93IG5ldyBBbGlnbmZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBUeXBlSUQgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPFQ+IGV4dGVuZHMgUHJvbWlzZVdpdGhSZXNvbHZlcnM8VD4ge1xyXG4gICAgcmVzb2x2ZWRWYWx1ZTogVDtcclxufVxyXG5jb25zdCBEZXBlbmRlbmNpZXNUb1dhaXRGb3I6IE1hcDxUeXBlSUQsIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4+ID0gbmV3IE1hcDxUeXBlSUQsIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4+KCk7XHJcblxyXG4vKipcclxuICogUmV0dXJucyB0aGUgcGFyc2VkIHR5cGUgaW5mbywgY29udmVydGVycywgZXRjLiBmb3IgdGhlIGdpdmVuIEMrKyBSVFRJIFR5cGVJRCBwb2ludGVyLlxyXG4gKlxyXG4gKiBQYXNzaW5nIGEgbnVsbCB0eXBlIElEIGlzIGZpbmUgYW5kIHdpbGwganVzdCByZXN1bHQgaW4gYSBgbnVsbGAgYXQgdGhhdCBzcG90IGluIHRoZSByZXR1cm5lZCBhcnJheS5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRUeXBlSW5mbzxFIGV4dGVuZHMgKEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4gfCBudWxsIHwgdW5kZWZpbmVkKVtdPiguLi50eXBlSWRzOiBudW1iZXJbXSk6IFByb21pc2U8RT4ge1xyXG5cclxuICAgIHJldHVybiBhd2FpdCBQcm9taXNlLmFsbDxOb25OdWxsYWJsZTxFW251bWJlcl0+Pih0eXBlSWRzLm1hcChhc3luYyAodHlwZUlkKTogUHJvbWlzZTxOb25OdWxsYWJsZTxFW251bWJlcl0+PiA9PiB7XHJcbiAgICAgICAgaWYgKCF0eXBlSWQpXHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCEpO1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJlc29sdmVycyA9IGdldERlcGVuZGVuY3lSZXNvbHZlcnModHlwZUlkKTtcclxuICAgICAgICByZXR1cm4gYXdhaXQgKHdpdGhSZXNvbHZlcnMucHJvbWlzZSBhcyBQcm9taXNlPE5vbk51bGxhYmxlPEVbbnVtYmVyXT4+KTtcclxuICAgIH0pKSBhcyBhbnk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREZXBlbmRlbmN5UmVzb2x2ZXJzKHR5cGVJZDogbnVtYmVyKTogUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+PiB7XHJcbiAgICBsZXQgd2l0aFJlc29sdmVycyA9IERlcGVuZGVuY2llc1RvV2FpdEZvci5nZXQodHlwZUlkKTtcclxuICAgIGlmICh3aXRoUmVzb2x2ZXJzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgRGVwZW5kZW5jaWVzVG9XYWl0Rm9yLnNldCh0eXBlSWQsIHdpdGhSZXNvbHZlcnMgPSB7IHJlc29sdmVkVmFsdWU6IHVuZGVmaW5lZCEsIC4uLlByb21pc2Uud2l0aFJlc29sdmVyczxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+PigpIH0pO1xyXG4gICAgcmV0dXJuIHdpdGhSZXNvbHZlcnM7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgZ2V0RGVwZW5kZW5jeVJlc29sdmVycyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNldCBhIHZhbHVlIG9uIHRoZSBgZW1iaW5kYCBvYmplY3QuICBOb3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IHRvIGNhbGwuXHJcbiAqIEBwYXJhbSBpbXBsIFxyXG4gKiBAcGFyYW0gbmFtZSBcclxuICogQHBhcmFtIHZhbHVlIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRW1ib3VuZDxUPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgbmFtZTogc3RyaW5nLCB2YWx1ZTogVCk6IHZvaWQge1xyXG4gICAgKGltcGwuZW1iaW5kIGFzIGFueSlbbmFtZV0gPSB2YWx1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGwgd2hlbiBhIHR5cGUgaXMgcmVhZHkgdG8gYmUgdXNlZCBieSBvdGhlciB0eXBlcy5cclxuICogXHJcbiAqIEZvciB0aGluZ3MgbGlrZSBgaW50YCBvciBgYm9vbGAsIHRoaXMgY2FuIGp1c3QgYmUgY2FsbGVkIGltbWVkaWF0ZWx5IHVwb24gcmVnaXN0cmF0aW9uLlxyXG4gKiBAcGFyYW0gaW5mbyBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5hbGl6ZVR5cGU8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+KGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBuYW1lOiBzdHJpbmcsIHBhcnNlZFR5cGVJbmZvOiBPbWl0PEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD4sIFwibmFtZVwiPik6IHZvaWQge1xyXG4gICAgY29uc3QgaW5mbyA9IHsgbmFtZSwgLi4ucGFyc2VkVHlwZUluZm8gfTtcclxuICAgIGxldCB3aXRoUmVzb2x2ZXJzID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVycyhpbmZvLnR5cGVJZCk7XHJcbiAgICB3aXRoUmVzb2x2ZXJzLnJlc29sdmUod2l0aFJlc29sdmVycy5yZXNvbHZlZFZhbHVlID0gaW5mbyk7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFVpbnQzMihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+KTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuZ2V0VWludDMyKHB0ciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFVpbnQ4KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5nZXRVaW50OChwdHIpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50MTYgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQxNi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQ4IH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50OC5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFRPRE86IENhbid0IEMrKyBpZGVudGlmaWVycyBpbmNsdWRlIG5vbi1BU0NJSSBjaGFyYWN0ZXJzPyBcclxuICogV2h5IGRvIGFsbCB0aGUgdHlwZSBkZWNvZGluZyBmdW5jdGlvbnMgdXNlIHRoaXM/XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZExhdGluMVN0cmluZyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICBsZXQgbmV4dEJ5dGU6IG51bWJlclxyXG4gICAgd2hpbGUgKG5leHRCeXRlID0gcmVhZFVpbnQ4KGltcGwsIHB0cisrKSkge1xyXG4gICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHRCeXRlKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbi8vIE5vdGU6IEluIFdvcmtsZXRzLCBgVGV4dERlY29kZXJgIGFuZCBgVGV4dEVuY29kZXJgIG5lZWQgYSBwb2x5ZmlsbC5cclxubGV0IHV0ZjhEZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLThcIik7XHJcbmxldCB1dGYxNkRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtMTZsZVwiKTtcclxubGV0IHV0ZjhFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG51bGwtdGVybWluYXRlZCBVVEYtOCBzdHJpbmcuIElmIHlvdSBrbm93IHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgeW91IGNhbiBzYXZlIHRpbWUgYnkgdXNpbmcgYHV0ZjhUb1N0cmluZ0xgIGluc3RlYWQuXHJcbiAqIFxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIHB0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdXRmOFRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50OChpbXBsLCBlbmQrKykgIT0gMCk7XHJcblxyXG4gICAgcmV0dXJuIHV0ZjhUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYxNlRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50MTYoaW1wbCwgZW5kKSAhPSAwKSB7IGVuZCArPSAyO31cclxuXHJcbiAgICByZXR1cm4gdXRmMTZUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjMyVG9TdHJpbmdaKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzdGFydCA9IHB0cjtcclxuICAgIGxldCBlbmQgPSBzdGFydDtcclxuXHJcbiAgICB3aGlsZSAocmVhZFVpbnQzMihpbXBsLCBlbmQpICE9IDApIHsgZW5kICs9IDQ7fVxyXG5cclxuICAgIHJldHVybiB1dGYzMlRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyLCBieXRlQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdXRmOERlY29kZXIuZGVjb2RlKG5ldyBVaW50OEFycmF5KGltcGwuZXhwb3J0cy5tZW1vcnkuYnVmZmVyLCBwdHIsIGJ5dGVDb3VudCkpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYxNlRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdXRmMTZEZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCB3Y2hhckNvdW50ICogMikpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYzMlRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBjaGFycyA9IChuZXcgVWludDMyQXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgd2NoYXJDb3VudCkpO1xyXG4gICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICBmb3IgKGxldCBjaCBvZiBjaGFycykge1xyXG4gICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1V0Zjgoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICByZXR1cm4gdXRmOEVuY29kZXIuZW5jb2RlKHN0cmluZykuYnVmZmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nVG9VdGYxNihzdHJpbmc6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcclxuICAgIGxldCByZXQgPSBuZXcgVWludDE2QXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGgpKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmV0Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgcmV0W2ldID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0LmJ1ZmZlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmMzIoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICBsZXQgdHJ1ZUxlbmd0aCA9IDA7XHJcbiAgICAvLyBUaGUgd29yc3QtY2FzZSBzY2VuYXJpbyBpcyBhIHN0cmluZyBvZiBhbGwgc3Vycm9nYXRlLXBhaXJzLCBzbyBhbGxvY2F0ZSB0aGF0LlxyXG4gICAgLy8gV2UnbGwgc2hyaW5rIGl0IHRvIHRoZSBhY3R1YWwgc2l6ZSBhZnRlcndhcmRzLlxyXG4gICAgbGV0IHRlbXAgPSBuZXcgVWludDMyQXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGggKiA0ICogMikpO1xyXG4gICAgZm9yIChjb25zdCBjaCBvZiBzdHJpbmcpIHtcclxuICAgICAgICB0ZW1wW3RydWVMZW5ndGhdID0gY2guY29kZVBvaW50QXQoMCkhO1xyXG4gICAgICAgICsrdHJ1ZUxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGVtcC5idWZmZXIuc2xpY2UoMCwgdHJ1ZUxlbmd0aCAqIDQpO1xyXG59XHJcblxyXG4vKipcclxuICogVXNlZCB3aGVuIHNlbmRpbmcgc3RyaW5ncyBmcm9tIEpTIHRvIFdBU00uXHJcbiAqIFxyXG4gKiBcclxuICogQHBhcmFtIHN0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEY4KHN0cjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGxldCBsZW4gPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBsZXQgYyA9IHN0ci5jb2RlUG9pbnRBdChpKSE7XHJcbiAgICAgICAgaWYgKGMgPD0gMHg3RilcclxuICAgICAgICAgICAgbGVuKys7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8PSAweDdGRilcclxuICAgICAgICAgICAgbGVuICs9IDI7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8PSAweDdGRkYpXHJcbiAgICAgICAgICAgIGxlbiArPSAzO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBsZW4gKz0gNDtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBsZW47XHJcbn0iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyByZWFkTGF0aW4xU3RyaW5nIH0gZnJvbSBcIi4uL3N0cmluZy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVyaW5nIGEgdHlwZSBpcyBhbiBhc3luYyBmdW5jdGlvbiBjYWxsZWQgYnkgYSBzeW5jIGZ1bmN0aW9uLiBUaGlzIGhhbmRsZXMgdGhlIGNvbnZlcnNpb24sIGFkZGluZyB0aGUgcHJvbWlzZSB0byBgQWxsRW1iaW5kUHJvbWlzZXNgLlxyXG4gKiBcclxuICogQWxzbywgYmVjYXVzZSBldmVyeSBzaW5nbGUgcmVnaXN0cmF0aW9uIGNvbWVzIHdpdGggYSBuYW1lIHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkLCB0aGlzIGFsc28gcGFyc2VzIHRoYXQgbmFtZSBmb3IgeW91LlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXIoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIG5hbWVQdHI6IG51bWJlciwgZnVuYzogKG5hbWU6IHN0cmluZykgPT4gKHZvaWQgfCBQcm9taXNlPHZvaWQ+KSk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKGltcGwsIHJlYWRMYXRpbjFTdHJpbmcoaW1wbCwgbmFtZVB0ciksIGZ1bmMpO1xyXG59XHJcblxyXG4vKiogXHJcbiAqIFNhbWUgYXMgYF9lbWJpbmRfcmVnaXN0ZXJgLCBidXQgZm9yIGtub3duIChvciBzeW50aGV0aWMpIG5hbWVzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgbmFtZTogc3RyaW5nLCBmdW5jOiAobmFtZTogc3RyaW5nKSA9PiAodm9pZCB8IFByb21pc2U8dm9pZD4pKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgcHJvbWlzZTogUHJvbWlzZTx2b2lkPiA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgbGV0IGhhbmRsZSA9IDA7XHJcbiAgICAgICAgLy8gRnVuIGZhY3Q6IHNldFRpbWVvdXQgZG9lc24ndCBleGlzdCBpbiBXb3JrbGV0cyEgXHJcbiAgICAgICAgLy8gSSBndWVzcyBpdCB2YWd1ZWx5IG1ha2VzIHNlbnNlIGluIGEgXCJkZXRlcm1pbmlzbSBpcyBnb29kXCIgd2F5LCBcclxuICAgICAgICAvLyBidXQgaXQgYWxzbyBzZWVtcyBnZW5lcmFsbHkgdXNlZnVsIHRoZXJlP1xyXG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJylcclxuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiB7IGNvbnNvbGUud2FybihgVGhlIGZ1bmN0aW9uIFwiJHtuYW1lfVwiIHVzZXMgYW4gdW5zdXBwb3J0ZWQgYXJndW1lbnQgb3IgcmV0dXJuIHR5cGUsIGFzIGl0cyBkZXBlbmRlbmNpZXMgYXJlIG5vdCByZXNvbHZpbmcuIEl0J3MgdW5saWtlbHkgdGhlIGVtYmluZCBwcm9taXNlIHdpbGwgcmVzb2x2ZS5gKTsgfSwgMTAwMCkgYXMgYW55O1xyXG4gICAgICAgIGF3YWl0IGZ1bmMobmFtZSk7XHJcbiAgICAgICAgaWYgKGhhbmRsZSlcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIEFsbEVtYmluZFByb21pc2VzLnB1c2gocHJvbWlzZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhd2FpdEFsbEVtYmluZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKEFsbEVtYmluZFByb21pc2VzKTtcclxufVxyXG5cclxuY29uc3QgQWxsRW1iaW5kUHJvbWlzZXMgPSBuZXcgQXJyYXk8UHJvbWlzZTx2b2lkPj4oKTtcclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIHNpemU6IG51bWJlciwgbWluUmFuZ2U6IGJpZ2ludCwgbWF4UmFuZ2U6IGJpZ2ludCk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkID0gKG1pblJhbmdlID09PSAwbik7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZCA/IGZyb21XaXJlVHlwZVVuc2lnbmVkIDogZnJvbVdpcmVUeXBlU2lnbmVkO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8YmlnaW50LCBiaWdpbnQ+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IHZhbHVlID0+ICh7IHdpcmVWYWx1ZTogdmFsdWUsIGpzVmFsdWU6IHZhbHVlIH0pLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVNpZ25lZCh3aXJlVmFsdWU6IGJpZ2ludCkgeyByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6IEJpZ0ludCh3aXJlVmFsdWUpIH07IH1cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlVW5zaWduZWQod2lyZVZhbHVlOiBiaWdpbnQpIHsgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiBCaWdJbnQod2lyZVZhbHVlKSAmIDB4RkZGRl9GRkZGX0ZGRkZfRkZGRm4gfSB9IiwgIlxyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Jvb2wodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCB0cnVlVmFsdWU6IDEsIGZhbHNlVmFsdWU6IDApOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgbmFtZSA9PiB7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIgfCBib29sZWFuLCBib29sZWFuPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAod2lyZVZhbHVlKSA9PiB7IHJldHVybiB7IGpzVmFsdWU6ICEhd2lyZVZhbHVlLCB3aXJlVmFsdWUgfTsgfSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKG8pID0+IHsgcmV0dXJuIHsgd2lyZVZhbHVlOiBvID8gdHJ1ZVZhbHVlIDogZmFsc2VWYWx1ZSwganNWYWx1ZTogbyB9OyB9LFxyXG4gICAgICAgIH0pXHJcbiAgICB9KVxyXG59XHJcbiIsICJcclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmFtZUZ1bmN0aW9uPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpIHwgRnVuY3Rpb24+KG5hbWU6IHN0cmluZywgYm9keTogVCk6IFQge1xyXG4gICAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShib2R5LCAnbmFtZScsIHsgdmFsdWU6IG5hbWUgfSk7XHJcbn1cclxuIiwgIi8vIFRoZXNlIGFyZSBhbGwgdGhlIGNsYXNzZXMgdGhhdCBoYXZlIGJlZW4gcmVnaXN0ZXJlZCwgYWNjZXNzZWQgYnkgdGhlaXIgUlRUSSBUeXBlSWRcclxuLy8gSXQncyBvZmYgaW4gaXRzIG93biBmaWxlIHRvIGtlZXAgaXQgcHJpdmF0ZS5cclxuZXhwb3J0IGNvbnN0IEVtYm91bmRDbGFzc2VzOiBSZWNvcmQ8bnVtYmVyLCB0eXBlb2YgRW1ib3VuZENsYXNzPiA9IHt9O1xyXG5cclxuXHJcbi8vIFRoaXMgaXMgYSBydW5uaW5nIGxpc3Qgb2YgYWxsIHRoZSBpbnN0YW50aWF0ZWQgY2xhc3NlcywgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbmNvbnN0IGluc3RhbnRpYXRlZENsYXNzZXMgPSBuZXcgTWFwPG51bWJlciwgV2Vha1JlZjxFbWJvdW5kQ2xhc3M+PigpO1xyXG5cclxuLy8gVGhpcyBrZWVwcyB0cmFjayBvZiBhbGwgZGVzdHJ1Y3RvcnMgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbi8vIFVzZWQgZm9yIEZpbmFsaXphdGlvblJlZ2lzdHJ5IGFuZCB0aGUgZGVzdHJ1Y3RvciBpdHNlbGYuXHJcbmNvbnN0IGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZCA9IG5ldyBNYXA8bnVtYmVyLCAoKSA9PiB2b2lkPigpO1xyXG5cclxuLy8gVXNlZCB0byBlbnN1cmUgbm8gb25lIGJ1dCB0aGUgdHlwZSBjb252ZXJ0ZXJzIGNhbiB1c2UgdGhlIHNlY3JldCBwb2ludGVyIGNvbnN0cnVjdG9yLlxyXG5leHBvcnQgY29uc3QgU2VjcmV0OiBTeW1ib2wgPSBTeW1ib2woKTtcclxuZXhwb3J0IGNvbnN0IFNlY3JldE5vRGlzcG9zZTogU3ltYm9sID0gU3ltYm9sKCk7XHJcblxyXG4vLyBUT0RPOiBUaGlzIG5lZWRzIHByb3BlciB0ZXN0aW5nLCBvciBwb3NzaWJseSBldmVuIGp1c3RpZmljYXRpb24gZm9yIGl0cyBleGlzdGVuY2UuXHJcbi8vIEknbSBwcmV0dHkgc3VyZSBvbmx5IEpTIGhlYXAgcHJlc3N1cmUgd2lsbCBpbnZva2UgYSBjYWxsYmFjaywgbWFraW5nIGl0IGtpbmQgb2YgXHJcbi8vIHBvaW50bGVzcyBmb3IgQysrIGNsZWFudXAsIHdoaWNoIGhhcyBubyBpbnRlcmFjdGlvbiB3aXRoIHRoZSBKUyBoZWFwLlxyXG5jb25zdCByZWdpc3RyeSA9IG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoX3RoaXM6IG51bWJlcikgPT4ge1xyXG4gICAgY29uc29sZS53YXJuKGBXQVNNIGNsYXNzIGF0IGFkZHJlc3MgJHtfdGhpc30gd2FzIG5vdCBwcm9wZXJseSBkaXNwb3NlZC5gKTtcclxuICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQoX3RoaXMpPy4oKTtcclxufSk7XHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgYWxsIEVtYmluZC1lbmFibGVkIGNsYXNzZXMuXHJcbiAqXHJcbiAqIEluIGdlbmVyYWwsIGlmIHR3byAocXVvdGUtdW5xdW90ZSkgXCJpbnN0YW5jZXNcIiBvZiB0aGlzIGNsYXNzIGhhdmUgdGhlIHNhbWUgYF90aGlzYCBwb2ludGVyLFxyXG4gKiB0aGVuIHRoZXkgd2lsbCBjb21wYXJlIGVxdWFsbHkgd2l0aCBgPT1gLCBhcyBpZiBjb21wYXJpbmcgYWRkcmVzc2VzIGluIEMrKy5cclxuICovXHJcblxyXG5leHBvcnQgY2xhc3MgRW1ib3VuZENsYXNzIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB0cmFuc2Zvcm1lZCBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0aGF0IHRha2VzIEpTIGFyZ3VtZW50cyBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfY29uc3RydWN0b3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gRW1ib3VuZENsYXNzO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXNzaWduZWQgYnkgdGhlIGRlcml2ZWQgY2xhc3Mgd2hlbiB0aGF0IGNsYXNzIGlzIHJlZ2lzdGVyZWQuXHJcbiAgICAgKlxyXG4gICAgICogVGhpcyBvbmUgaXMgbm90IHRyYW5zZm9ybWVkIGJlY2F1c2UgaXQgb25seSB0YWtlcyBhIHBvaW50ZXIgYW5kIHJldHVybnMgbm90aGluZy5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9kZXN0cnVjdG9yOiAoX3RoaXM6IG51bWJlcikgPT4gdm9pZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwb2ludGVyIHRvIHRoZSBjbGFzcyBpbiBXQVNNIG1lbW9yeTsgdGhlIHNhbWUgYXMgdGhlIEMrKyBgdGhpc2AgcG9pbnRlci5cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIF90aGlzITogbnVtYmVyO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IGFueVtdKSB7XHJcbiAgICAgICAgY29uc3QgQ3JlYXRlZEZyb21XYXNtID0gKGFyZ3MubGVuZ3RoID09PSAyICYmIChhcmdzWzBdID09PSBTZWNyZXQgfHwgYXJnc1swXSA9PSBTZWNyZXROb0Rpc3Bvc2UpICYmIHR5cGVvZiBhcmdzWzFdID09PSAnbnVtYmVyJyk7XHJcblxyXG4gICAgICAgIGlmICghQ3JlYXRlZEZyb21XYXNtKSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGEgY2FsbCB0byBjcmVhdGUgdGhpcyBjbGFzcyBmcm9tIEpTLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBVbmxpa2UgYSBub3JtYWwgY29uc3RydWN0b3IsIHdlIGRlbGVnYXRlIHRoZSBjbGFzcyBjcmVhdGlvbiB0b1xyXG4gICAgICAgICAgICAgKiBhIGNvbWJpbmF0aW9uIG9mIF9jb25zdHJ1Y3RvciBhbmQgYGZyb21XaXJlVHlwZWAuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIGBfY29uc3RydWN0b3JgIHdpbGwgY2FsbCB0aGUgQysrIGNvZGUgdGhhdCBhbGxvY2F0ZXMgbWVtb3J5LFxyXG4gICAgICAgICAgICAgKiBpbml0aWFsaXplcyB0aGUgY2xhc3MsIGFuZCByZXR1cm5zIGl0cyBgdGhpc2AgcG9pbnRlcixcclxuICAgICAgICAgICAgICogd2hpbGUgYGZyb21XaXJlVHlwZWAsIGNhbGxlZCBhcyBwYXJ0IG9mIHRoZSBnbHVlLWNvZGUgcHJvY2VzcyxcclxuICAgICAgICAgICAgICogd2lsbCBhY3R1YWxseSBpbnN0YW50aWF0ZSB0aGlzIGNsYXNzLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiAoSW4gb3RoZXIgd29yZHMsIHRoaXMgcGFydCBydW5zIGZpcnN0LCB0aGVuIHRoZSBgZWxzZWAgYmVsb3cgcnVucylcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgRW1ib3VuZENsYXNzKS5fY29uc3RydWN0b3IoLi4uYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBDKysuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFdlIGdldCBoZXJlIHZpYSBgZnJvbVdpcmVUeXBlYCwgbWVhbmluZyB0aGF0IHRoZVxyXG4gICAgICAgICAgICAgKiBjbGFzcyBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZCBpbiBDKyssIGFuZCB3ZVxyXG4gICAgICAgICAgICAgKiBqdXN0IG5lZWQgb3VyIFwiaGFuZGxlXCIgdG8gaXQgaW4gSlMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IGFyZ3NbMV07XHJcblxyXG4gICAgICAgICAgICAvLyBGaXJzdCwgbWFrZSBzdXJlIHdlIGhhdmVuJ3QgaW5zdGFudGlhdGVkIHRoaXMgY2xhc3MgeWV0LlxyXG4gICAgICAgICAgICAvLyBXZSB3YW50IGFsbCBjbGFzc2VzIHdpdGggdGhlIHNhbWUgYHRoaXNgIHBvaW50ZXIgdG8gXHJcbiAgICAgICAgICAgIC8vIGFjdHVhbGx5ICpiZSogdGhlIHNhbWUuXHJcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gaW5zdGFudGlhdGVkQ2xhc3Nlcy5nZXQoX3RoaXMpPy5kZXJlZigpO1xyXG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpc3Rpbmc7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB3ZSBnb3QgaGVyZSwgdGhlbiBjb25ncmF0dWxhdGlvbnMsIHRoaXMtaW5zdGFudGlhdGlvbi1vZi10aGlzLWNsYXNzLCBcclxuICAgICAgICAgICAgLy8geW91J3JlIGFjdHVhbGx5IHRoZSBvbmUgdG8gYmUgaW5zdGFudGlhdGVkLiBObyBtb3JlIGhhY2t5IGNvbnN0cnVjdG9yIHJldHVybnMuXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vIENvbnNpZGVyIHRoaXMgdGhlIFwiYWN0dWFsXCIgY29uc3RydWN0b3IgY29kZSwgSSBzdXBwb3NlLlxyXG4gICAgICAgICAgICB0aGlzLl90aGlzID0gX3RoaXM7XHJcbiAgICAgICAgICAgIGluc3RhbnRpYXRlZENsYXNzZXMuc2V0KF90aGlzLCBuZXcgV2Vha1JlZih0aGlzKSk7XHJcbiAgICAgICAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMsIF90aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChhcmdzWzBdICE9IFNlY3JldE5vRGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBFbWJvdW5kQ2xhc3MpLl9kZXN0cnVjdG9yO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5zZXQoX3RoaXMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0cnVjdG9yKF90aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLmRlbGV0ZShfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgW1N5bWJvbC5kaXNwb3NlXSgpOiB2b2lkIHtcclxuICAgICAgICAvLyBPbmx5IHJ1biB0aGUgZGVzdHJ1Y3RvciBpZiB3ZSBvdXJzZWx2ZXMgY29uc3RydWN0ZWQgdGhpcyBjbGFzcyAoYXMgb3Bwb3NlZCB0byBgaW5zcGVjdGBpbmcgaXQpXHJcbiAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9IGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgaWYgKGRlc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKT8uKCk7XHJcbiAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5kZWxldGUodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIFxyXG4gKiBJbnN0ZWFkIG9mIGluc3RhbnRpYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgXHJcbiAqIHlvdSBjYW4gaW5zcGVjdCBhbiBleGlzdGluZyBwb2ludGVyIGluc3RlYWQuXHJcbiAqXHJcbiAqIFRoaXMgaXMgbWFpbmx5IGludGVuZGVkIGZvciBzaXR1YXRpb25zIHRoYXQgRW1iaW5kIGRvZXNuJ3Qgc3VwcG9ydCxcclxuICogbGlrZSBhcnJheS1vZi1zdHJ1Y3RzLWFzLWEtcG9pbnRlci5cclxuICogXHJcbiAqIEJlIGF3YXJlIHRoYXQgdGhlcmUncyBubyBsaWZldGltZSB0cmFja2luZyBpbnZvbHZlZCwgc29cclxuICogbWFrZSBzdXJlIHlvdSBkb24ndCBrZWVwIHRoaXMgdmFsdWUgYXJvdW5kIGFmdGVyIHRoZVxyXG4gKiBwb2ludGVyJ3MgYmVlbiBpbnZhbGlkYXRlZC4gXHJcbiAqIFxyXG4gKiAqKkRvIG5vdCBjYWxsIFtTeW1ib2wuZGlzcG9zZV0qKiBvbiBhbiBpbnNwZWN0ZWQgY2xhc3MsXHJcbiAqIHNpbmNlIHRoZSBhc3N1bXB0aW9uIGlzIHRoYXQgdGhlIEMrKyBjb2RlIG93bnMgdGhhdCBwb2ludGVyXHJcbiAqIGFuZCB3ZSdyZSBqdXN0IGxvb2tpbmcgYXQgaXQsIHNvIGRlc3Ryb3lpbmcgaXQgd291bGQgYmUgcnVkZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNwZWN0Q2xhc3NCeVBvaW50ZXI8VD4ocG9pbnRlcjogbnVtYmVyKTogVCB7XHJcbiAgICByZXR1cm4gbmV3IEVtYm91bmRDbGFzcyhTZWNyZXROb0Rpc3Bvc2UsIHBvaW50ZXIpIGFzIFQ7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFRhYmxlRnVuY3Rpb248VCBleHRlbmRzIEZ1bmN0aW9uPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9Piwgc2lnbmF0dXJlUHRyOiBudW1iZXIsIGZ1bmN0aW9uSW5kZXg6IG51bWJlcik6IFQge1xyXG4gICAgY29uc3QgZnAgPSBpbXBsLmV4cG9ydHMuX19pbmRpcmVjdF9mdW5jdGlvbl90YWJsZS5nZXQoZnVuY3Rpb25JbmRleCk7XHJcbiAgICBjb25zb2xlLmFzc2VydCh0eXBlb2YgZnAgPT0gXCJmdW5jdGlvblwiKTtcclxuICAgIHJldHVybiBmcCBhcyBUO1xyXG59IiwgImltcG9ydCB7IHJlbmFtZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtbmFtZWQtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzLCBFbWJvdW5kQ2xhc3NlcywgU2VjcmV0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IFdpcmVDb252ZXJzaW9uUmVzdWx0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmV4cG9ydCB7IGluc3BlY3RDbGFzc0J5UG9pbnRlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzKFxyXG4gICAgdGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICByYXdUeXBlOiBudW1iZXIsXHJcbiAgICByYXdQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgcmF3Q29uc3RQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgYmFzZUNsYXNzUmF3VHlwZTogbnVtYmVyLFxyXG4gICAgZ2V0QWN0dWFsVHlwZVNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgZ2V0QWN0dWFsVHlwZVB0cjogbnVtYmVyLFxyXG4gICAgdXBjYXN0U2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICB1cGNhc3RQdHI6IG51bWJlcixcclxuICAgIGRvd25jYXN0U2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBkb3duY2FzdFB0cjogbnVtYmVyLFxyXG4gICAgbmFtZVB0cjogbnVtYmVyLFxyXG4gICAgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgcmF3RGVzdHJ1Y3RvclB0cjogbnVtYmVyKTogdm9pZCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBOb3RlOiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzIGRvZXNuJ3QgaGF2ZSBhIGNvcnJlc3BvbmRpbmcgYGZpbmFsaXplYCB2ZXJzaW9uLFxyXG4gICAgICogbGlrZSB2YWx1ZV9hcnJheSBhbmQgdmFsdWVfb2JqZWN0IGhhdmUsIHdoaWNoIGlzIGZpbmUgSSBndWVzcz9cclxuICAgICAqIFxyXG4gICAgICogQnV0IGl0IG1lYW5zIHRoYXQgd2UgY2FuJ3QganVzdCBjcmVhdGUgYSBjbGFzcyBwcmUtaW5zdGFsbGVkIHdpdGggZXZlcnl0aGluZyBpdCBuZWVkcy0tXHJcbiAgICAgKiB3ZSBuZWVkIHRvIGFkZCBtZW1iZXIgZnVuY3Rpb25zIGFuZCBwcm9wZXJ0aWVzIGFuZCBzdWNoIGFzIHdlIGdldCB0aGVtLCBhbmQgd2VcclxuICAgICAqIG5ldmVyIHJlYWxseSBrbm93IHdoZW4gd2UncmUgZG9uZS5cclxuICAgICAqL1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICBjb25zdCByYXdEZXN0cnVjdG9ySW52b2tlciA9IGdldFRhYmxlRnVuY3Rpb248KF90aGlzOiBudW1iZXIpID0+IHZvaWQ+KHRoaXMsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3JQdHIpO1xyXG5cclxuICAgICAgICAvLyBUT0RPKD8pIEl0J3MgcHJvYmFibHkgbm90IG5lY2Vzc2FyeSB0byBoYXZlIEVtYm91bmRDbGFzc2VzIGFuZCB0aGlzLmVtYmluZCBiYXNpY2FsbHkgYmUgdGhlIHNhbWUgZXhhY3QgdGhpbmcuXHJcbiAgICAgICAgRW1ib3VuZENsYXNzZXNbcmF3VHlwZV0gPSAodGhpcy5lbWJpbmQgYXMgYW55KVtuYW1lXSA9IHJlbmFtZUZ1bmN0aW9uKG5hbWUsXHJcbiAgICAgICAgICAgIC8vIFVubGlrZSB0aGUgY29uc3RydWN0b3IsIHRoZSBkZXN0cnVjdG9yIGlzIGtub3duIGVhcmx5IGVub3VnaCB0byBhc3NpZ24gbm93LlxyXG4gICAgICAgICAgICAvLyBQcm9iYWJseSBiZWNhdXNlIGRlc3RydWN0b3JzIGNhbid0IGJlIG92ZXJsb2FkZWQgYnkgYW55dGhpbmcgc28gdGhlcmUncyBvbmx5IGV2ZXIgb25lLlxyXG4gICAgICAgICAgICAvLyBBbnl3YXksIGFzc2lnbiBpdCB0byB0aGlzIG5ldyBjbGFzcy5cclxuICAgICAgICAgICAgY2xhc3MgZXh0ZW5kcyBFbWJvdW5kQ2xhc3Mge1xyXG4gICAgICAgICAgICAgICAgc3RhdGljIF9kZXN0cnVjdG9yID0gcmF3RGVzdHJ1Y3Rvckludm9rZXI7XHJcbiAgICAgICAgICAgIH0gYXMgYW55KTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZnJvbVdpcmVUeXBlKF90aGlzOiBudW1iZXIpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIEVtYm91bmRDbGFzcz4geyBjb25zdCBqc1ZhbHVlID0gbmV3IEVtYm91bmRDbGFzc2VzW3Jhd1R5cGVdKFNlY3JldCwgX3RoaXMpOyByZXR1cm4geyB3aXJlVmFsdWU6IF90aGlzLCBqc1ZhbHVlLCBzdGFja0Rlc3RydWN0b3I6ICgpID0+IGpzVmFsdWVbU3ltYm9sLmRpc3Bvc2VdKCkgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gdG9XaXJlVHlwZShqc09iamVjdDogRW1ib3VuZENsYXNzKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogKGpzT2JqZWN0IGFzIGFueSkuX3RoaXMsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBqc09iamVjdCxcclxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IG5vIGRlc3RydWN0b3JzIGZvciBhbnkgb2YgdGhlc2UsXHJcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIHRoZXkncmUganVzdCBmb3IgdmFsdWUtdHlwZXMtYXMtb2JqZWN0LXR5cGVzLlxyXG4gICAgICAgICAgICAgICAgLy8gQWRkaW5nIGl0IGhlcmUgd291bGRuJ3Qgd29yayBwcm9wZXJseSwgYmVjYXVzZSBpdCBhc3N1bWVzXHJcbiAgICAgICAgICAgICAgICAvLyB3ZSBvd24gdGhlIG9iamVjdCAod2hlbiBjb252ZXJ0aW5nIGZyb20gYSBKUyBzdHJpbmcgdG8gc3RkOjpzdHJpbmcsIHdlIGVmZmVjdGl2ZWx5IGRvLCBidXQgbm90IGhlcmUpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBXaXNoIG90aGVyIHR5cGVzIGluY2x1ZGVkIHBvaW50ZXIgVHlwZUlEcyB3aXRoIHRoZW0gdG9vLi4uXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBuYW1lLCB7IHR5cGVJZDogcmF3VHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgYCR7bmFtZX0qYCwgeyB0eXBlSWQ6IHJhd1BvaW50ZXJUeXBlLCBmcm9tV2lyZVR5cGUsIHRvV2lyZVR5cGUgfSk7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBgJHtuYW1lfSBjb25zdCpgLCB7IHR5cGVJZDogcmF3Q29uc3RQb2ludGVyVHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgIlxyXG5leHBvcnQgZnVuY3Rpb24gcnVuRGVzdHJ1Y3RvcnMoZGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdKTogdm9pZCB7XHJcbiAgICB3aGlsZSAoZGVzdHJ1Y3RvcnMubGVuZ3RoKSB7XHJcbiAgICAgICAgZGVzdHJ1Y3RvcnMucG9wKCkhKCk7XHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgcmVuYW1lRnVuY3Rpb24gfSBmcm9tIFwiLi9jcmVhdGUtbmFtZWQtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kQ2xhc3MgfSBmcm9tIFwiLi9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZVR5cGVzIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgSlMgZnVuY3Rpb24gdGhhdCBjYWxscyBhIEMrKyBmdW5jdGlvbiwgYWNjb3VudGluZyBmb3IgYHRoaXNgIHR5cGVzIGFuZCBjb250ZXh0LlxyXG4gKiBcclxuICogSXQgY29udmVydHMgYWxsIGFyZ3VtZW50cyBiZWZvcmUgcGFzc2luZyB0aGVtLCBhbmQgY29udmVydHMgdGhlIHJldHVybiB0eXBlIGJlZm9yZSByZXR1cm5pbmcuXHJcbiAqIFxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIGFyZ1R5cGVJZHMgQWxsIFJUVEkgVHlwZUlkcywgaW4gdGhlIG9yZGVyIG9mIFtSZXRUeXBlLCBUaGlzVHlwZSwgLi4uQXJnVHlwZXNdLiBUaGlzVHlwZSBjYW4gYmUgbnVsbCBmb3Igc3RhbmRhbG9uZSBmdW5jdGlvbnMuXHJcbiAqIEBwYXJhbSBpbnZva2VyU2lnbmF0dXJlIEEgcG9pbnRlciB0byB0aGUgc2lnbmF0dXJlIHN0cmluZy5cclxuICogQHBhcmFtIGludm9rZXJJbmRleCBUaGUgaW5kZXggdG8gdGhlIGludm9rZXIgZnVuY3Rpb24gaW4gdGhlIGBXZWJBc3NlbWJseS5UYWJsZWAuXHJcbiAqIEBwYXJhbSBpbnZva2VyQ29udGV4dCBUaGUgY29udGV4dCBwb2ludGVyIHRvIHVzZSwgaWYgYW55LlxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVHbHVlRnVuY3Rpb248RiBleHRlbmRzICgoLi4uYXJnczogYW55W10pID0+IGFueSkgfCBGdW5jdGlvbj4oXHJcbiAgICBpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PixcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHJldHVyblR5cGVJZDogbnVtYmVyLFxyXG4gICAgYXJnVHlwZUlkczogbnVtYmVyW10sXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIgfCBudWxsXHJcbik6IFByb21pc2U8Rj4ge1xyXG5cclxuICAgIHR5cGUgUiA9IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIGFueT47XHJcbiAgICAvL3R5cGUgVGhpc1R5cGUgPSBudWxsIHwgdW5kZWZpbmVkIHwgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdpcmVUeXBlcywgYW55PjtcclxuICAgIHR5cGUgQXJnVHlwZXMgPSBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V2lyZVR5cGVzLCBhbnk+W107XHJcblxyXG5cclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlLCAuLi5hcmdUeXBlc10gPSBhd2FpdCBnZXRUeXBlSW5mbzxbUiwgLi4uQXJnVHlwZXNdPihyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHMpO1xyXG4gICAgY29uc3QgcmF3SW52b2tlciA9IGdldFRhYmxlRnVuY3Rpb248KC4uLmFyZ3M6IFdpcmVUeXBlc1tdKSA9PiBhbnk+KGltcGwsIGludm9rZXJTaWduYXR1cmUsIGludm9rZXJJbmRleCk7XHJcblxyXG5cclxuICAgIHJldHVybiByZW5hbWVGdW5jdGlvbihuYW1lLCBmdW5jdGlvbiAodGhpczogRW1ib3VuZENsYXNzLCAuLi5qc0FyZ3M6IGFueVtdKSB7XHJcbiAgICAgICAgY29uc3Qgd2lyZWRUaGlzID0gdGhpcyA/IHRoaXMuX3RoaXMgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgY29uc3Qgd2lyZWRBcmdzOiBXaXJlVHlwZXNbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHN0YWNrQmFzZWREZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10gPSBbXTsgICAvLyBVc2VkIHRvIHByZXRlbmQgbGlrZSB3ZSdyZSBhIHBhcnQgb2YgdGhlIFdBU00gc3RhY2ssIHdoaWNoIHdvdWxkIGRlc3Ryb3kgdGhlc2Ugb2JqZWN0cyBhZnRlcndhcmRzLlxyXG5cclxuICAgICAgICBpZiAoaW52b2tlckNvbnRleHQpXHJcbiAgICAgICAgICAgIHdpcmVkQXJncy5wdXNoKGludm9rZXJDb250ZXh0KTtcclxuICAgICAgICBpZiAod2lyZWRUaGlzKVxyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaCh3aXJlZFRoaXMpO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IGVhY2ggSlMgYXJndW1lbnQgdG8gaXRzIFdBU00gZXF1aXZhbGVudCAoZ2VuZXJhbGx5IGEgcG9pbnRlciwgb3IgaW50L2Zsb2F0KVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnVHlwZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGFyZ1R5cGVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBhcmcgPSBqc0FyZ3NbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IHR5cGUudG9XaXJlVHlwZShhcmcpO1xyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaCh3aXJlVmFsdWUpO1xyXG4gICAgICAgICAgICBpZiAoc3RhY2tEZXN0cnVjdG9yKVxyXG4gICAgICAgICAgICAgICAgc3RhY2tCYXNlZERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmluYWxseSwgY2FsbCB0aGUgXCJyYXdcIiBXQVNNIGZ1bmN0aW9uXHJcbiAgICAgICAgbGV0IHdpcmVkUmV0dXJuOiBXaXJlVHlwZXMgPSByYXdJbnZva2VyKC4uLndpcmVkQXJncyk7XHJcblxyXG4gICAgICAgIC8vIFN0aWxsIHByZXRlbmRpbmcgd2UncmUgYSBwYXJ0IG9mIHRoZSBzdGFjaywgXHJcbiAgICAgICAgLy8gbm93IGRlc3RydWN0IGV2ZXJ5dGhpbmcgd2UgXCJwdXNoZWRcIiBvbnRvIGl0LlxyXG4gICAgICAgIHJ1bkRlc3RydWN0b3JzKHN0YWNrQmFzZWREZXN0cnVjdG9ycyk7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgd2hhdGV2ZXIgdGhlIFdBU00gZnVuY3Rpb24gcmV0dXJuZWQgdG8gYSBKUyByZXByZXNlbnRhdGlvblxyXG4gICAgICAgIC8vIElmIHRoZSBvYmplY3QgcmV0dXJuZWQgaXMgRGlzcG9zYWJsZSwgdGhlbiB3ZSBsZXQgdGhlIHVzZXIgZGlzcG9zZSBvZiBpdFxyXG4gICAgICAgIC8vIHdoZW4gcmVhZHkuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBPdGhlcndpc2UgKG5hbWVseSBzdHJpbmdzKSwgZGlzcG9zZSBpdHMgb3JpZ2luYWwgcmVwcmVzZW50YXRpb24gbm93LlxyXG4gICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IHJldHVyblR5cGU/LmZyb21XaXJlVHlwZSh3aXJlZFJldHVybik7XHJcbiAgICAgICAgaWYgKHN0YWNrRGVzdHJ1Y3RvciAmJiAhKGpzVmFsdWUgJiYgdHlwZW9mIGpzVmFsdWUgPT0gXCJvYmplY3RcIiAmJiAoU3ltYm9sLmRpc3Bvc2UgaW4ganNWYWx1ZSkpKVxyXG4gICAgICAgICAgICBzdGFja0Rlc3RydWN0b3IoanNWYWx1ZSwgd2lyZVZhbHVlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGpzVmFsdWU7XHJcblxyXG4gICAgfSBhcyBGKTtcclxufVxyXG4iLCAiXHJcbmV4cG9ydCB0eXBlIElzNjQgPSBmYWxzZTtcclxuZXhwb3J0IGNvbnN0IElzNjQgPSBmYWxzZTtcclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBJczY0IH0gZnJvbSBcIi4vaXMtNjQuanNcIjtcclxuXHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IFBvaW50ZXJTaXplOiA0IHwgOCA9IChJczY0ID8gOCA6IDQpO1xyXG5leHBvcnQgY29uc3QgZ2V0UG9pbnRlcjogXCJnZXRCaWdVaW50NjRcIiB8IFwiZ2V0VWludDMyXCIgPSAoSXM2NCA/IFwiZ2V0QmlnVWludDY0XCIgOiBcImdldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBjb25zdCBzZXRQb2ludGVyOiBcInNldEJpZ1VpbnQ2NFwiIHwgXCJzZXRVaW50MzJcIiA9IChJczY0ID8gXCJzZXRCaWdVaW50NjRcIiA6IFwic2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQb2ludGVyU2l6ZShfaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+KTogNCB7IHJldHVybiBQb2ludGVyU2l6ZSBhcyA0OyB9IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IGdldFBvaW50ZXIgfSBmcm9tIFwiLi9wb2ludGVyLmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgYHJlYWRVaW50MzJgLCBidXQgdHlwZWQgZm9yIHBvaW50ZXJzLCBhbmQgZnV0dXJlLXByb29mcyBhZ2FpbnN0IDY0LWJpdCBhcmNoaXRlY3R1cmVzLlxyXG4gKiBcclxuICogVGhpcyBpcyAqbm90KiB0aGUgc2FtZSBhcyBkZXJlZmVyZW5jaW5nIGEgcG9pbnRlci4gVGhpcyBpcyBhYm91dCByZWFkaW5nIHRoZSBudW1lcmljYWwgdmFsdWUgYXQgYSBnaXZlbiBhZGRyZXNzIHRoYXQgaXMsIGl0c2VsZiwgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgYSBwb2ludGVyLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRQb2ludGVyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tnZXRQb2ludGVyXShwdHIsIHRydWUpIGFzIG51bWJlcjsgfVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uLy4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkUG9pbnRlciB9IGZyb20gXCIuLi8uLi91dGlsL3JlYWQtcG9pbnRlci5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYWxseSwgRW1iaW5kIGZ1bmN0aW9ucyBpbmNsdWRlIGFuIGFycmF5IG9mIFJUVEkgVHlwZUlkcyBpbiB0aGUgZm9ybSBvZlxyXG4gKiBbUmV0VHlwZSwgVGhpc1R5cGU/LCAuLi5BcmdUeXBlc11cclxuICogXHJcbiAqIFRoaXMgcmV0dXJucyB0aGF0IGFycmF5IG9mIHR5cGVJZHMgZm9yIGEgZ2l2ZW4gZnVuY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFycmF5T2ZUeXBlcyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgY291bnQ6IG51bWJlciwgcmF3QXJnVHlwZXNQdHI6IG51bWJlcik6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHJldDogbnVtYmVyW10gPSBbXTtcclxuICAgIGNvbnN0IHBvaW50ZXJTaXplID0gZ2V0UG9pbnRlclNpemUoaW1wbCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XHJcbiAgICAgICAgcmV0LnB1c2gocmVhZFBvaW50ZXIoaW1wbCwgcmF3QXJnVHlwZXNQdHIgKyBpICogcG9pbnRlclNpemUpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgbWV0aG9kTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBpc0FzeW5jOiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbWV0aG9kTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICAoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpKVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvcih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLCBcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsIFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlciwgXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsIFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsIFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKHRoaXMsIFwiPGNvbnN0cnVjdG9yPlwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgKChFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0gYXMgYW55KSkuX2NvbnN0cnVjdG9yID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIFwiPGNvbnN0cnVjdG9yPlwiLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sICBcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBtZXRob2ROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlciwgLy8gW1JldHVyblR5cGUsIFRoaXNUeXBlLCBBcmdzLi4uXVxyXG4gICAgaW52b2tlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyLFxyXG4gICAgaXNQdXJlVmlydHVhbDogbnVtYmVyLFxyXG4gICAgaXNBc3luYzogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgdGhpc1R5cGVJZCwgLi4uYXJnVHlwZUlkc10gPSByZWFkQXJyYXlPZlR5cGVzKHRoaXMsIGFyZ0NvdW50LCByYXdBcmdUeXBlc1B0cik7XHJcbiAgICAvL2NvbnNvbGUuYXNzZXJ0KHRoaXNUeXBlSWQgIT0gcmF3Q2xhc3NUeXBlSWQsYEludGVybmFsIGVycm9yOyBleHBlY3RlZCB0aGUgUlRUSSBwb2ludGVycyBmb3IgdGhlIGNsYXNzIHR5cGUgYW5kIGl0cyBwb2ludGVyIHR5cGUgdG8gYmUgZGlmZmVyZW50LmApO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBtZXRob2ROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICAoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpLnByb3RvdHlwZSBhcyBhbnkpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICByZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgICAgIGFyZ1R5cGVJZHMsXHJcbiAgICAgICAgICAgIGludm9rZXJTaWduYXR1cmVQdHIsXHJcbiAgICAgICAgICAgIGludm9rZXJJbmRleCxcclxuICAgICAgICAgICAgaW52b2tlckNvbnRleHRcclxuICAgICAgICApO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5KFxyXG4gICAgdGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgZmllbGROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlcixcclxuICAgIGdldHRlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgZ2V0dGVySW5kZXg6IG51bWJlcixcclxuICAgIGdldHRlckNvbnRleHQ6IG51bWJlcixcclxuICAgIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsXHJcbiAgICBzZXR0ZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIHNldHRlckluZGV4OiBudW1iZXIsXHJcbiAgICBzZXR0ZXJDb250ZXh0OiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgZmllbGROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBnZXQgPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb248KCkgPT4gYW55Pih0aGlzLCBgJHtuYW1lfV9nZXR0ZXJgLCBnZXR0ZXJSZXR1cm5UeXBlSWQsIFtdLCBnZXR0ZXJTaWduYXR1cmVQdHIsIGdldHRlckluZGV4LCBnZXR0ZXJDb250ZXh0KTtcclxuICAgICAgICBjb25zdCBzZXQgPSBzZXR0ZXJJbmRleD8gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uPCh2YWx1ZTogYW55KSA9PiB2b2lkPih0aGlzLCBgJHtuYW1lfV9zZXR0ZXJgLCAwLCBbc2V0dGVyQXJndW1lbnRUeXBlSWRdLCBzZXR0ZXJTaWduYXR1cmVQdHIsIHNldHRlckluZGV4LCBzZXR0ZXJDb250ZXh0KSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkucHJvdG90eXBlIGFzIGFueSksIG5hbWUsIHtcclxuICAgICAgICAgICAgZ2V0LFxyXG4gICAgICAgICAgICBzZXQsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiXHJcbmltcG9ydCB7IHJlZ2lzdGVyRW1ib3VuZCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50PFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgbmFtZVB0cjogbnVtYmVyLCB0eXBlUHRyOiBudW1iZXIsIHZhbHVlQXNXaXJlVHlwZTogV1QpOiB2b2lkIHtcclxuXHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAoY29uc3ROYW1lKSA9PiB7XHJcbiAgICAgICAgLy8gV2FpdCB1bnRpbCB3ZSBrbm93IGhvdyB0byBwYXJzZSB0aGUgdHlwZSB0aGlzIGNvbnN0YW50IHJlZmVyZW5jZXMuXHJcbiAgICAgICAgY29uc3QgW3R5cGVdID0gYXdhaXQgZ2V0VHlwZUluZm88W0VtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD5dPih0eXBlUHRyKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB0aGUgY29uc3RhbnQgZnJvbSBpdHMgd2lyZSByZXByZXNlbnRhdGlvbiB0byBpdHMgSlMgcmVwcmVzZW50YXRpb24uXHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0eXBlLmZyb21XaXJlVHlwZSh2YWx1ZUFzV2lyZVR5cGUpO1xyXG5cclxuICAgICAgICAvLyBBZGQgdGhpcyBjb25zdGFudCB2YWx1ZSB0byB0aGUgYGVtYmluZGAgb2JqZWN0LlxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZDxUPih0aGlzLCBjb25zdE5hbWUsIHZhbHVlLmpzVmFsdWUpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgLy8gVE9ETy4uLlxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtdmFsX3Rha2VfdmFsdWUodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgcHRyOiBudW1iZXIpOiBhbnkge1xyXG4gICAgLy8gVE9ETy4uLlxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbXZhbF9kZWNyZWYodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGhhbmRsZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIC8vIFRPRE8uLi5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUsIHJlZ2lzdGVyRW1ib3VuZCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5jb25zdCBBbGxFbnVtczogUmVjb3JkPG51bWJlciwgUmVjb3JkPHN0cmluZywgbnVtYmVyPj4gPSB7fTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2VudW0odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBzaXplOiBudW1iZXIsIGlzU2lnbmVkOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZW51bSBvYmplY3QgdGhhdCB0aGUgdXNlciB3aWxsIGluc3BlY3QgdG8gbG9vayBmb3IgZW51bSB2YWx1ZXNcclxuICAgICAgICBBbGxFbnVtc1t0eXBlUHRyXSA9IHt9O1xyXG5cclxuICAgICAgICAvLyBNYXJrIHRoaXMgdHlwZSBhcyByZWFkeSB0byBiZSB1c2VkIGJ5IG90aGVyIHR5cGVzIFxyXG4gICAgICAgIC8vIChldmVuIGlmIHdlIGRvbid0IGhhdmUgdGhlIGVudW0gdmFsdWVzIHlldCwgZW51bSB2YWx1ZXNcclxuICAgICAgICAvLyB0aGVtc2VsdmVzIGFyZW4ndCB1c2VkIGJ5IGFueSByZWdpc3RyYXRpb24gZnVuY3Rpb25zLilcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh3aXJlVmFsdWUpID0+IHsgcmV0dXJuIHt3aXJlVmFsdWUsIGpzVmFsdWU6IHdpcmVWYWx1ZX07IH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChqc1ZhbHVlKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZToganNWYWx1ZSwganNWYWx1ZSB9IH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gTWFrZSB0aGlzIHR5cGUgYXZhaWxhYmxlIGZvciB0aGUgdXNlclxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZCh0aGlzLCBuYW1lIGFzIG5ldmVyLCBBbGxFbnVtc1t0eXBlUHRyIGFzIGFueV0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdFbnVtVHlwZTogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGVudW1WYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgLy8gSnVzdCBhZGQgdGhpcyBuYW1lJ3MgdmFsdWUgdG8gdGhlIGV4aXN0aW5nIGVudW0gdHlwZS5cclxuICAgICAgICBBbGxFbnVtc1tyYXdFbnVtVHlwZV1bbmFtZV0gPSBlbnVtVmFsdWU7XHJcbiAgICB9KVxyXG59IiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBieXRlV2lkdGg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHZhbHVlKSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZX0pLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAodmFsdWUpID0+ICh7IHdpcmVWYWx1ZTogdmFsdWUsIGpzVmFsdWU6IHZhbHVlfSksXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkQXJyYXlPZlR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBcclxuICogQHBhcmFtIG5hbWVQdHIgQSBwb2ludGVyIHRvIHRoZSBudWxsLXRlcm1pbmF0ZWQgbmFtZSBvZiB0aGlzIGV4cG9ydC5cclxuICogQHBhcmFtIGFyZ0NvdW50IFRoZSBudW1iZXIgb2YgYXJndW1lbnRzIHRoZSBXQVNNIGZ1bmN0aW9uIHRha2VzXHJcbiAqIEBwYXJhbSByYXdBcmdUeXBlc1B0ciBBIHBvaW50ZXIgdG8gYW4gYXJyYXkgb2YgbnVtYmVycywgZWFjaCByZXByZXNlbnRpbmcgYSBUeXBlSUQuIFRoZSAwdGggdmFsdWUgaXMgdGhlIHJldHVybiB0eXBlLCB0aGUgcmVzdCBhcmUgdGhlIGFyZ3VtZW50cyB0aGVtc2VsdmVzLlxyXG4gKiBAcGFyYW0gc2lnbmF0dXJlIEEgcG9pbnRlciB0byBhIG51bGwtdGVybWluYXRlZCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBXQVNNIHNpZ25hdHVyZSBvZiB0aGUgZnVuY3Rpb247IGUuZy4gXCJgcGBcIiwgXCJgZnBwYFwiLCBcImB2cGBcIiwgXCJgZnBmZmZgXCIsIGV0Yy5cclxuICogQHBhcmFtIHJhd0ludm9rZXJQdHIgVGhlIHBvaW50ZXIgdG8gdGhlIGZ1bmN0aW9uIGluIFdBU00uXHJcbiAqIEBwYXJhbSBmdW5jdGlvbkluZGV4IFRoZSBpbmRleCBvZiB0aGUgZnVuY3Rpb24gaW4gdGhlIGBXZWJBc3NlbWJseS5UYWJsZWAgdGhhdCdzIGV4cG9ydGVkLlxyXG4gKiBAcGFyYW0gaXNBc3luYyBVbnVzZWQuLi5wcm9iYWJseVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24oXHJcbiAgICB0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PixcclxuICAgIG5hbWVQdHI6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLFxyXG4gICAgc2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICByYXdJbnZva2VyUHRyOiBudW1iZXIsXHJcbiAgICBmdW5jdGlvbkluZGV4OiBudW1iZXIsXHJcbiAgICBpc0FzeW5jOiBib29sZWFuXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgLi4uYXJnVHlwZUlkc10gPSByZWFkQXJyYXlPZlR5cGVzKHRoaXMsIGFyZ0NvdW50LCByYXdBcmdUeXBlc1B0cik7XHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgICh0aGlzLmVtYmluZCBhcyBhbnkpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIG5hbWUsIHJldHVyblR5cGVJZCwgYXJnVHlwZUlkcywgc2lnbmF0dXJlLCByYXdJbnZva2VyUHRyLCBmdW5jdGlvbkluZGV4KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBieXRlV2lkdGg6IG51bWJlciwgbWluVmFsdWU6IG51bWJlciwgbWF4VmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkVHlwZSA9IChtaW5WYWx1ZSA9PT0gMCk7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZFR5cGUgPyBmcm9tV2lyZVR5cGVVKGJ5dGVXaWR0aCkgOiBmcm9tV2lyZVR5cGVTKGJ5dGVXaWR0aCk7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IG1pbi9tYXhWYWx1ZSBhcmVuJ3QgdXNlZCBmb3IgYm91bmRzIGNoZWNraW5nLFxyXG4gICAgICAgIC8vIGJ1dCBpZiB0aGV5IGFyZSwgbWFrZSBzdXJlIHRvIGFkanVzdCBtYXhWYWx1ZSBmb3IgdGhlIHNhbWUgc2lnbmVkL3Vuc2lnbmVkIHR5cGUgaXNzdWVcclxuICAgICAgICAvLyBvbiAzMi1iaXQgc2lnbmVkIGludCB0eXBlczpcclxuICAgICAgICAvLyBtYXhWYWx1ZSA9IGZyb21XaXJlVHlwZShtYXhWYWx1ZSk7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKGpzVmFsdWU6IG51bWJlcikgPT4gKHsgd2lyZVZhbHVlOiBqc1ZhbHVlLCBqc1ZhbHVlIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbi8vIFdlIG5lZWQgYSBzZXBhcmF0ZSBmdW5jdGlvbiBmb3IgdW5zaWduZWQgY29udmVyc2lvbiBiZWNhdXNlIFdBU00gb25seSBoYXMgc2lnbmVkIHR5cGVzLCBcclxuLy8gZXZlbiB3aGVuIGxhbmd1YWdlcyBoYXZlIHVuc2lnbmVkIHR5cGVzLCBhbmQgaXQgZXhwZWN0cyB0aGUgY2xpZW50IHRvIG1hbmFnZSB0aGUgdHJhbnNpdGlvbi5cclxuLy8gU28gdGhpcyBpcyB1cywgbWFuYWdpbmcgdGhlIHRyYW5zaXRpb24uXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVUoYnl0ZVdpZHRoOiBudW1iZXIpOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8bnVtYmVyLCBudW1iZXI+W1wiZnJvbVdpcmVUeXBlXCJdIHtcclxuICAgIC8vIFNoaWZ0IG91dCBhbGwgdGhlIGJpdHMgaGlnaGVyIHRoYW4gd2hhdCB3b3VsZCBmaXQgaW4gdGhpcyBpbnRlZ2VyIHR5cGUsXHJcbiAgICAvLyBidXQgaW4gcGFydGljdWxhciBtYWtlIHN1cmUgdGhlIG5lZ2F0aXZlIGJpdCBnZXRzIGNsZWFyZWQgb3V0IGJ5IHRoZSA+Pj4gYXQgdGhlIGVuZC5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+Pj4gb3ZlcmZsb3dCaXRDb3VudCkgfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlUyhieXRlV2lkdGg6IG51bWJlcik6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxudW1iZXIsIG51bWJlcj5bXCJmcm9tV2lyZVR5cGVcIl0ge1xyXG4gICAgLy8gU2hpZnQgb3V0IGFsbCB0aGUgYml0cyBoaWdoZXIgdGhhbiB3aGF0IHdvdWxkIGZpdCBpbiB0aGlzIGludGVnZXIgdHlwZS5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+PiBvdmVyZmxvd0JpdENvdW50KSB9O1xyXG4gICAgfVxyXG59IiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBleDogYW55KTogdm9pZCB7XHJcbiAgICAvLyBUT0RPXHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBJczY0IH0gZnJvbSBcIi4vaXMtNjQuanNcIjtcclxuaW1wb3J0IHsgUG9pbnRlclNpemUgfSBmcm9tIFwiLi9wb2ludGVyLmpzXCI7XHJcblxyXG5jb25zdCBTaXplVFNpemU6IDQgfCA4ID0gUG9pbnRlclNpemU7XHJcbmV4cG9ydCBjb25zdCBzZXRTaXplVDogXCJzZXRCaWdVaW50NjRcIiB8IFwic2V0VWludDMyXCIgPSAoSXM2NCA/IFwic2V0QmlnVWludDY0XCIgOiBcInNldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBjb25zdCBnZXRTaXplVDogXCJnZXRCaWdVaW50NjRcIiB8IFwiZ2V0VWludDMyXCIgPSAoSXM2NCA/IFwiZ2V0QmlnVWludDY0XCIgOiBcImdldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRTaXplVFNpemUoX2luc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9Pik6IDQgeyByZXR1cm4gU2l6ZVRTaXplIGFzIDQ7IH1cclxuXHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBnZXRTaXplVCB9IGZyb20gXCIuL3NpemV0LmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgYHJlYWRVaW50MzJgLCBidXQgdHlwZWQgZm9yIHNpemVfdCB2YWx1ZXMsIGFuZCBmdXR1cmUtcHJvb2ZzIGFnYWluc3QgNjQtYml0IGFyY2hpdGVjdHVyZXMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNpemVUKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tnZXRTaXplVF0ocHRyLCB0cnVlKSBhcyBudW1iZXI7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHNldFNpemVUIH0gZnJvbSBcIi4vc2l6ZXQuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVNpemVUKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tzZXRTaXplVF0ocHRyLCB2YWx1ZSBhcyBuZXZlciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50MTYoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50MTYocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50MzIoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50MzIocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50OChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+LCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LnNldFVpbnQ4KHB0ciwgdmFsdWUpOyB9XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgcmVhZFNpemVUIH0gZnJvbSBcIi4uLy4uL3V0aWwvcmVhZC1zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyBnZXRTaXplVFNpemUgfSBmcm9tIFwiLi4vLi4vdXRpbC9zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVNpemVUIH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtc2l6ZXQuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MTYgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50MTYuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50OCB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQ4LmpzXCI7XHJcbmltcG9ydCB7IHN0cmluZ1RvVXRmMTYsIHN0cmluZ1RvVXRmMzIsIHN0cmluZ1RvVXRmOCwgdXRmMTZUb1N0cmluZ0wsIHV0ZjMyVG9TdHJpbmdMLCB1dGY4VG9TdHJpbmdMIH0gZnJvbSBcIi4uL3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4vcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgV2lyZUNvbnZlcnNpb25SZXN1bHQgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLy8gU2hhcmVkIGJldHdlZW4gc3RkOjpzdHJpbmcgYW5kIHN0ZDo6d3N0cmluZ1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueShpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgdHlwZVB0cjogbnVtYmVyLCBjaGFyV2lkdGg6IDEgfCAyIHwgNCwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgdXRmVG9TdHJpbmdMID0gKGNoYXJXaWR0aCA9PSAxKSA/IHV0ZjhUb1N0cmluZ0wgOiAoY2hhcldpZHRoID09IDIpID8gdXRmMTZUb1N0cmluZ0wgOiB1dGYzMlRvU3RyaW5nTDtcclxuICAgIGNvbnN0IHN0cmluZ1RvVXRmID0gKGNoYXJXaWR0aCA9PSAxKSA/IHN0cmluZ1RvVXRmOCA6IChjaGFyV2lkdGggPT0gMikgPyBzdHJpbmdUb1V0ZjE2IDogc3RyaW5nVG9VdGYzMjtcclxuICAgIGNvbnN0IFVpbnRBcnJheSA9IChjaGFyV2lkdGggPT0gMSkgPyBVaW50OEFycmF5IDogKGNoYXJXaWR0aCA9PSAyKSA/IFVpbnQxNkFycmF5IDogVWludDMyQXJyYXk7XHJcbiAgICBjb25zdCB3cml0ZVVpbnQgPSAoY2hhcldpZHRoID09IDEpID8gd3JpdGVVaW50OCA6IChjaGFyV2lkdGggPT0gMikgPyB3cml0ZVVpbnQxNiA6IHdyaXRlVWludDMyO1xyXG5cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKGltcGwsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IChwdHI6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAvLyBUaGUgd2lyZSB0eXBlIGlzIGEgcG9pbnRlciB0byBhIFwic3RydWN0XCIgKG5vdCByZWFsbHkgYSBzdHJ1Y3QgaW4gdGhlIHVzdWFsIHNlbnNlLi4uXHJcbiAgICAgICAgICAgIC8vIGV4Y2VwdCBtYXliZSBpbiBuZXdlciBDIHZlcnNpb25zIEkgZ3Vlc3MpIHdoZXJlIFxyXG4gICAgICAgICAgICAvLyB0aGUgZmlyc3QgZmllbGQgaXMgYSBzaXplX3QgcmVwcmVzZW50aW5nIHRoZSBsZW5ndGgsXHJcbiAgICAgICAgICAgIC8vIEFuZCB0aGUgc2Vjb25kIFwiZmllbGRcIiBpcyB0aGUgc3RyaW5nIGRhdGEgaXRzZWxmLFxyXG4gICAgICAgICAgICAvLyBmaW5hbGx5IGFsbCBlbmRlZCB3aXRoIGFuIGV4dHJhIG51bGwgYnl0ZS5cclxuICAgICAgICAgICAgbGV0IGxlbmd0aCA9IHJlYWRTaXplVChpbXBsLCBwdHIpO1xyXG4gICAgICAgICAgICBsZXQgcGF5bG9hZCA9IHB0ciArIGdldFNpemVUU2l6ZShpbXBsKTtcclxuICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gXCJcIjtcclxuICAgICAgICAgICAgbGV0IGRlY29kZVN0YXJ0UHRyID0gcGF5bG9hZDtcclxuICAgICAgICAgICAgc3RyID0gdXRmVG9TdHJpbmdMKGltcGwsIGRlY29kZVN0YXJ0UHRyLCBsZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGpzVmFsdWU6IHN0cixcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBjYWxsIHRvIF9mcmVlIGhhcHBlbnMgYmVjYXVzZSBFbWJpbmQgY2FsbHMgbWFsbG9jIGR1cmluZyBpdHMgdG9XaXJlVHlwZSBmdW5jdGlvbi5cclxuICAgICAgICAgICAgICAgICAgICAvLyBTdXJlbHkgdGhlcmUncyBhIHdheSB0byBhdm9pZCB0aGlzIGNvcHkgb2YgYSBjb3B5IG9mIGEgY29weSB0aG91Z2gsIHJpZ2h0PyBSaWdodD9cclxuICAgICAgICAgICAgICAgICAgICBpbXBsLmV4cG9ydHMuZnJlZShwdHIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHRvV2lyZVR5cGUgPSAoc3RyOiBzdHJpbmcpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIHN0cmluZz4gPT4ge1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFsdWVBc0FycmF5QnVmZmVySW5KUyA9IG5ldyBVaW50QXJyYXkoc3RyaW5nVG9VdGYoc3RyKSk7XHJcblxyXG4gICAgICAgICAgICAvLyBJcyBpdCBtb3JlIG9yIGxlc3MgY2xlYXIgd2l0aCBhbGwgdGhlc2UgdmFyaWFibGVzIGV4cGxpY2l0bHkgbmFtZWQ/XHJcbiAgICAgICAgICAgIC8vIEhvcGVmdWxseSBtb3JlLCBhdCBsZWFzdCBzbGlnaHRseS5cclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aG91dE51bGwgPSB2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aE51bGwgPSBjaGFyQ291bnRXaXRob3V0TnVsbCArIDE7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRob3V0TnVsbCA9IGNoYXJDb3VudFdpdGhvdXROdWxsICogY2hhcldpZHRoO1xyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRoTnVsbCA9IGNoYXJDb3VudFdpdGhOdWxsICogY2hhcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgLy8gMS4gKG0pYWxsb2NhdGUgc3BhY2UgZm9yIHRoZSBzdHJ1Y3QgYWJvdmVcclxuICAgICAgICAgICAgY29uc3Qgd2FzbVN0cmluZ1N0cnVjdCA9IGltcGwuZXhwb3J0cy5tYWxsb2MoZ2V0U2l6ZVRTaXplKGltcGwpICsgYnl0ZUNvdW50V2l0aE51bGwpO1xyXG5cclxuICAgICAgICAgICAgLy8gMi4gV3JpdGUgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nIHRvIHRoZSBzdHJ1Y3RcclxuICAgICAgICAgICAgY29uc3Qgc3RyaW5nU3RhcnQgPSB3YXNtU3RyaW5nU3RydWN0ICsgZ2V0U2l6ZVRTaXplKGltcGwpO1xyXG4gICAgICAgICAgICB3cml0ZVNpemVUKGltcGwsIHdhc21TdHJpbmdTdHJ1Y3QsIGNoYXJDb3VudFdpdGhvdXROdWxsKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDMuIFdyaXRlIHRoZSBzdHJpbmcgZGF0YSB0byB0aGUgc3RydWN0XHJcbiAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gbmV3IFVpbnRBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgc3RyaW5nU3RhcnQsIGJ5dGVDb3VudFdpdGhvdXROdWxsKTtcclxuICAgICAgICAgICAgZGVzdGluYXRpb24uc2V0KHZhbHVlQXNBcnJheUJ1ZmZlckluSlMpO1xyXG5cclxuICAgICAgICAgICAgLy8gNC4gV3JpdGUgYSBudWxsIGJ5dGVcclxuICAgICAgICAgICAgd3JpdGVVaW50KGltcGwsIHN0cmluZ1N0YXJ0ICsgYnl0ZUNvdW50V2l0aG91dE51bGwsIDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4gaW1wbC5leHBvcnRzLmZyZWUod2FzbVN0cmluZ1N0cnVjdCksXHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHdhc21TdHJpbmdTdHJ1Y3QsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBzdHJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGUoaW1wbCwgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHJldHVybiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55KHRoaXMsIHR5cGVQdHIsIDEsIG5hbWVQdHIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgY2hhcldpZHRoOiAyIHwgNCwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICByZXR1cm4gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSh0aGlzLCB0eXBlUHRyLCBjaGFyV2lkdGgsIG5hbWVQdHIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIC4uLmFyZ3M6IG51bWJlcltdKTogdm9pZCB7XHJcbiAgICBkZWJ1Z2dlcjtcclxuICAgIC8vIFRPRE8uLi5cclxufSIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZUNvbnZlcnNpb25SZXN1bHQsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFdUPiA9IChnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHB0cjogbnVtYmVyKSA9PiBXVDtcclxuZXhwb3J0IHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxXVD4gPSAoc2V0dGVyQ29udGV4dDogbnVtYmVyLCBwdHI6IG51bWJlciwgd2lyZVR5cGU6IFdUKSA9PiB2b2lkO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvIHtcclxuICAgIG5hbWVQdHI6IG51bWJlcjtcclxuICAgIF9jb25zdHJ1Y3RvcigpOiBudW1iZXI7XHJcbiAgICBfZGVzdHJ1Y3RvcihwdHI6IFdpcmVUeXBlcyk6IHZvaWQ7XHJcbiAgICBlbGVtZW50czogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88YW55LCBhbnk+W107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IHtcclxuXHJcbiAgICAvKiogVGhlIFwicmF3XCIgZ2V0dGVyLCBleHBvcnRlZCBmcm9tIEVtYmluZC4gTmVlZHMgY29udmVyc2lvbiBiZXR3ZWVuIHR5cGVzLiAqL1xyXG4gICAgd2FzbUdldHRlcjogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXVD47XHJcblxyXG4gICAgLyoqIFRoZSBcInJhd1wiIHNldHRlciwgZXhwb3J0ZWQgZnJvbSBFbWJpbmQuIE5lZWRzIGNvbnZlcnNpb24gYmV0d2VlbiB0eXBlcy4gKi9cclxuICAgIHdhc21TZXR0ZXI6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V1Q+O1xyXG5cclxuICAgIC8qKiBUaGUgbnVtZXJpYyB0eXBlIElEIG9mIHRoZSB0eXBlIHRoZSBnZXR0ZXIgcmV0dXJucyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFRoZSBudW1lcmljIHR5cGUgSUQgb2YgdGhlIHR5cGUgdGhlIHNldHRlciBhY2NlcHRzICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBVbmtub3duOyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBlbWJpbmQgZ2V0dGVyICovXHJcbiAgICBnZXR0ZXJDb250ZXh0OiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFVua25vd247IHVzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIGVtYmluZCBzZXR0ZXIgKi9cclxuICAgIHNldHRlckNvbnRleHQ6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+IHtcclxuICAgIC8qKiBBIHZlcnNpb24gb2YgYHdhc21HZXR0ZXJgIHRoYXQgaGFuZGxlcyB0eXBlIGNvbnZlcnNpb24gKi9cclxuICAgIHJlYWQocHRyOiBXVCk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PFdULCBUPjtcclxuXHJcbiAgICAvKiogQSB2ZXJzaW9uIG9mIGB3YXNtU2V0dGVyYCB0aGF0IGhhbmRsZXMgdHlwZSBjb252ZXJzaW9uICovXHJcbiAgICB3cml0ZShwdHI6IG51bWJlciwgdmFsdWU6IFQpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxXVCwgVD47XHJcblxyXG4gICAgLyoqIGBnZXR0ZXJSZXR1cm5UeXBlSWQsIGJ1dCByZXNvbHZlZCB0byB0aGUgcGFyc2VkIHR5cGUgaW5mbyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdULCBUPjtcclxuXHJcbiAgICAvKiogYHNldHRlclJldHVyblR5cGVJZCwgYnV0IHJlc29sdmVkIHRvIHRoZSBwYXJzZWQgdHlwZSBpbmZvICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGU6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD47XHJcbn1cclxuXHJcbi8vIFRlbXBvcmFyeSBzY3JhdGNoIG1lbW9yeSB0byBjb21tdW5pY2F0ZSBiZXR3ZWVuIHJlZ2lzdHJhdGlvbiBjYWxscy5cclxuZXhwb3J0IGNvbnN0IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnM6IFJlY29yZDxudW1iZXIsIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8+ID0ge307XHJcblxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGU8VD4oaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXSA9IHtcclxuICAgICAgICBuYW1lUHRyLFxyXG4gICAgICAgIF9jb25zdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbihpbXBsLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uKGltcGwsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpLFxyXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcclxuICAgIH07XHJcblxyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxJIGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPGFueSwgYW55Pj4oZWxlbWVudHM6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPGFueSwgYW55PltdKTogUHJvbWlzZTxJW10+IHtcclxuICAgIGNvbnN0IGRlcGVuZGVuY3lJZHMgPSBbLi4uZWxlbWVudHMubWFwKChlbHQpID0+IGVsdC5nZXR0ZXJSZXR1cm5UeXBlSWQpLCAuLi5lbGVtZW50cy5tYXAoKGVsdCkgPT4gZWx0LnNldHRlckFyZ3VtZW50VHlwZUlkKV07XHJcblxyXG4gICAgY29uc3QgZGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0VHlwZUluZm8oLi4uZGVwZW5kZW5jeUlkcyk7XHJcbiAgICBjb25zb2xlLmFzc2VydChkZXBlbmRlbmNpZXMubGVuZ3RoID09IGVsZW1lbnRzLmxlbmd0aCAqIDIpO1xyXG5cclxuICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGVsZW1lbnRzLm1hcCgoZmllbGQsIGkpOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8YW55LCBhbnk+ID0+IHtcclxuICAgICAgICBjb25zdCBnZXR0ZXJSZXR1cm5UeXBlID0gZGVwZW5kZW5jaWVzW2ldITtcclxuICAgICAgICBjb25zdCBzZXR0ZXJBcmd1bWVudFR5cGUgPSBkZXBlbmRlbmNpZXNbaSArIGVsZW1lbnRzLmxlbmd0aF0hO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkKHB0cjogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXR0ZXJSZXR1cm5UeXBlLmZyb21XaXJlVHlwZShmaWVsZC53YXNtR2V0dGVyKGZpZWxkLmdldHRlckNvbnRleHQsIHB0cikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZShwdHI6IG51bWJlciwgbzogYW55KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IHNldHRlckFyZ3VtZW50VHlwZS50b1dpcmVUeXBlKG8pO1xyXG4gICAgICAgICAgICBmaWVsZC53YXNtU2V0dGVyKGZpZWxkLnNldHRlckNvbnRleHQsIHB0ciwgcmV0LndpcmVWYWx1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlLFxyXG4gICAgICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGUsXHJcbiAgICAgICAgICAgIHJlYWQsXHJcbiAgICAgICAgICAgIHdyaXRlLFxyXG4gICAgICAgICAgICAuLi5maWVsZFxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBmaWVsZFJlY29yZHMgYXMgSVtdO1xyXG59IiwgImltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50cywgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGUsIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXIsIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0UsIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXIsIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8sIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcblxyXG5cclxuaW50ZXJmYWNlIEFycmF5UmVnaXN0cmF0aW9uSW5mbyBleHRlbmRzIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8geyB9XHJcbmludGVyZmFjZSBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiB7IH1cclxuaW50ZXJmYWNlIEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+LCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QsIFQ+IHsgfVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheTxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0NvbnN0cnVjdG9yOiBudW1iZXIsIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3RGVzdHJ1Y3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2NvbXBvc2l0ZTxUPih0aGlzLCByYXdUeXBlUHRyLCBuYW1lUHRyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpO1xyXG5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQ8VD4odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R1cGxlVHlwZTogbnVtYmVyLCBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlciwgZ2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIGdldHRlcjogbnVtYmVyLCBnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsIHNldHRlclNpZ25hdHVyZTogbnVtYmVyLCBzZXR0ZXI6IG51bWJlciwgc2V0dGVyQ29udGV4dDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R1cGxlVHlwZV0uZWxlbWVudHMucHVzaCh7XHJcbiAgICAgICAgZ2V0dGVyQ29udGV4dCxcclxuICAgICAgICBzZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIGdldHRlclJldHVyblR5cGVJZCxcclxuICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZCxcclxuICAgICAgICB3YXNtR2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8VD4+KHRoaXMsIGdldHRlclNpZ25hdHVyZSwgZ2V0dGVyKSxcclxuICAgICAgICB3YXNtU2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8VD4+KHRoaXMsIHNldHRlclNpZ25hdHVyZSwgc2V0dGVyKVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX2FycmF5PFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbnN0IHJlZyA9IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcbiAgICBkZWxldGUgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXTtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIHJlZy5uYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBmaWVsZFJlY29yZHMgPSBhd2FpdCBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxhbnksIFQ+PihyZWcuZWxlbWVudHMpO1xyXG5cclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPGFueSwgdW5rbm93bltdPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAocHRyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXQ6IChhbnlbXSAmIERpc3Bvc2FibGUpID0gW10gYXMgYW55O1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnLmVsZW1lbnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmllbGQgPSBmaWVsZFJlY29yZHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGRSZWNvcmRzW2ldLnJlYWQocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBqc1ZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0W1N5bWJvbC5kaXNwb3NlXSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogcmV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4gcmV0W1N5bWJvbC5kaXNwb3NlXSgpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHRyID0gcmVnLl9jb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZmllbGQgb2YgZmllbGRSZWNvcmRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGQud3JpdGUocHRyLCBvW2ldIGFzIGFueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogbyxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbywgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyLCBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvLCBjb21wb3NpdGVSZWdpc3RyYXRpb25zIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1jb21wb3NpdGUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyByZWFkTGF0aW4xU3RyaW5nIH0gZnJvbSBcIi4uL19wcml2YXRlL3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0UmVnaXN0cmF0aW9uSW5mbyBleHRlbmRzIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8ge1xyXG4gICAgZWxlbWVudHM6IFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxhbnksIGFueT5bXTtcclxufVxyXG5cclxuaW50ZXJmYWNlIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4ge1xyXG4gICAgLyoqIFRoZSBuYW1lIG9mIHRoaXMgZmllbGQgKi9cclxuICAgIG5hbWU6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdULCBUPiB7IH1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmaXJzdCwgdG8gc3RhcnQgdGhlIHJlZ2lzdHJhdGlvbiBvZiBhIHN0cnVjdCBhbmQgYWxsIGl0cyBmaWVsZHMuIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgY29uc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3Q29uc3RydWN0b3I6IG51bWJlciwgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdEZXN0cnVjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZV0gPSB7XHJcbiAgICAgICAgbmFtZVB0cixcclxuICAgICAgICBfY29uc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb248KCkgPT4gbnVtYmVyPih0aGlzLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPCgpID0+IHZvaWQ+KHRoaXMsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpLFxyXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcclxuICAgIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIHBlciBmaWVsZCwgYWZ0ZXIgYF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0YCBhbmQgYmVmb3JlIGBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdGAuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQ8VD4odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgZmllbGROYW1lOiBudW1iZXIsIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyLCBnZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgZ2V0dGVyOiBudW1iZXIsIGdldHRlckNvbnRleHQ6IG51bWJlciwgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlciwgc2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIHNldHRlcjogbnVtYmVyLCBzZXR0ZXJDb250ZXh0OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIChjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdIGFzIFN0cnVjdFJlZ2lzdHJhdGlvbkluZm8pLmVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgIG5hbWU6IHJlYWRMYXRpbjFTdHJpbmcodGhpcywgZmllbGROYW1lKSxcclxuICAgICAgICBnZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIHNldHRlckNvbnRleHQsXHJcbiAgICAgICAgZ2V0dGVyUmV0dXJuVHlwZUlkLFxyXG4gICAgICAgIHNldHRlckFyZ3VtZW50VHlwZUlkLFxyXG4gICAgICAgIHdhc21HZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxUPj4odGhpcywgZ2V0dGVyU2lnbmF0dXJlLCBnZXR0ZXIpLFxyXG4gICAgICAgIHdhc21TZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxUPj4odGhpcywgc2V0dGVyU2lnbmF0dXJlLCBzZXR0ZXIpLFxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgYWZ0ZXIgYWxsIG90aGVyIG9iamVjdCByZWdpc3RyYXRpb24gZnVuY3Rpb25zIGFyZSBjYWxsZWQ7IHRoaXMgY29udGFpbnMgdGhlIGFjdHVhbCByZWdpc3RyYXRpb24gY29kZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdDxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb25zdCByZWcgPSBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdO1xyXG4gICAgZGVsZXRlIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCByZWcubmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZmllbGRSZWNvcmRzID0gYXdhaXQgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHM8U3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvRTxhbnksIFQ+PihyZWcuZWxlbWVudHMpO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGUodGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHB0cikgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmV0OiBEaXNwb3NhYmxlID0ge30gYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJldCwgU3ltYm9sLmRpc3Bvc2UsIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWcuZWxlbWVudHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZCA9IGZpZWxkUmVjb3Jkc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZFJlY29yZHNbaV0ucmVhZChwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIGZpZWxkLm5hbWUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGpzVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIE9iamVjdC5mcmVlemUocmV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IHJldCxcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0W1N5bWJvbC5kaXNwb3NlXSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdHIgPSByZWcuX2NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmaWVsZCBvZiBmaWVsZFJlY29yZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZC53cml0ZShwdHIsIG9bZmllbGQubmFtZSBhcyBuZXZlcl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiBvLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxufVxyXG5cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgbmFtZSA9PiB7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgdW5kZWZpbmVkPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAoKSA9PiAoeyBqc1ZhbHVlOiB1bmRlZmluZWQhLCB3aXJlVmFsdWU6IHVuZGVmaW5lZCEgfSksXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6ICgpID0+ICh7IGpzVmFsdWU6IHVuZGVmaW5lZCEsIHdpcmVWYWx1ZTogdW5kZWZpbmVkISB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSlcclxuXHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZW1vcnlHcm93dGhFdmVudERldGFpbCB7IGluZGV4OiBudW1iZXIgfVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lbW9yeUdyb3d0aEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8TWVtb3J5R3Jvd3RoRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJNZW1vcnlHcm93dGhFdmVudFwiLCB7IGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHsgaW5kZXggfSB9KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgaW5kZXg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgdGhpcy5jYWNoZWRNZW1vcnlWaWV3ID0gbmV3IERhdGFWaWV3KHRoaXMuZXhwb3J0cy5tZW1vcnkuYnVmZmVyKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgTWVtb3J5R3Jvd3RoRXZlbnQodGhpcywgaW5kZXgpKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNlZ2ZhdWx0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcihcIlNlZ21lbnRhdGlvbiBmYXVsdFwiKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gVXNlZCBieSBTQUZFX0hFQVBcclxuZXhwb3J0IGZ1bmN0aW9uIHNlZ2ZhdWx0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+KTogbmV2ZXIge1xyXG4gICAgdGhyb3cgbmV3IFNlZ2ZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgRW1zY3JpcHRlbkV4Y2VwdGlvbiB9IGZyb20gXCIuLi9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgdXRmOFRvU3RyaW5nWiB9IGZyb20gXCIuL3N0cmluZy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGNlcHRpb25NZXNzYWdlKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBleDogRW1zY3JpcHRlbkV4Y2VwdGlvbik6IFtzdHJpbmcsIHN0cmluZ10ge1xyXG4gICAgdmFyIHB0ciA9IGdldENwcEV4Y2VwdGlvblRocm93bk9iamVjdEZyb21XZWJBc3NlbWJseUV4Y2VwdGlvbihpbXBsLCBleCk7XHJcbiAgICByZXR1cm4gZ2V0RXhjZXB0aW9uTWVzc2FnZUNvbW1vbihpbXBsLCBwdHIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDcHBFeGNlcHRpb25UaHJvd25PYmplY3RGcm9tV2ViQXNzZW1ibHlFeGNlcHRpb24oaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGV4OiBFbXNjcmlwdGVuRXhjZXB0aW9uKSB7XHJcbiAgICAvLyBJbiBXYXNtIEVILCB0aGUgdmFsdWUgZXh0cmFjdGVkIGZyb20gV2ViQXNzZW1ibHkuRXhjZXB0aW9uIGlzIGEgcG9pbnRlclxyXG4gICAgLy8gdG8gdGhlIHVud2luZCBoZWFkZXIuIENvbnZlcnQgaXQgdG8gdGhlIGFjdHVhbCB0aHJvd24gdmFsdWUuXHJcbiAgICBjb25zdCB1bndpbmRfaGVhZGVyOiBudW1iZXIgPSBleC5nZXRBcmcoKGltcGwuZXhwb3J0cykuX19jcHBfZXhjZXB0aW9uLCAwKTtcclxuICAgIHJldHVybiAoaW1wbC5leHBvcnRzKS5fX3Rocm93bl9vYmplY3RfZnJvbV91bndpbmRfZXhjZXB0aW9uKHVud2luZF9oZWFkZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdGFja1NhdmUoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4pIHtcclxuICAgIHJldHVybiBpbXBsLmV4cG9ydHMuZW1zY3JpcHRlbl9zdGFja19nZXRfY3VycmVudCgpO1xyXG59XHJcbmZ1bmN0aW9uIHN0YWNrQWxsb2MoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHNpemU6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGltcGwuZXhwb3J0cy5fZW1zY3JpcHRlbl9zdGFja19hbGxvYyhzaXplKTtcclxufVxyXG5mdW5jdGlvbiBzdGFja1Jlc3RvcmUoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHN0YWNrUG9pbnRlcjogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gaW1wbC5leHBvcnRzLl9lbXNjcmlwdGVuX3N0YWNrX3Jlc3RvcmUoc3RhY2tQb2ludGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RXhjZXB0aW9uTWVzc2FnZUNvbW1vbihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBbc3RyaW5nLCBzdHJpbmddIHtcclxuICAgIGNvbnN0IHNwID0gc3RhY2tTYXZlKGltcGwpO1xyXG4gICAgY29uc3QgdHlwZV9hZGRyX2FkZHIgPSBzdGFja0FsbG9jKGltcGwsIGdldFBvaW50ZXJTaXplKGltcGwpKTtcclxuICAgIGNvbnN0IG1lc3NhZ2VfYWRkcl9hZGRyID0gc3RhY2tBbGxvYyhpbXBsLCBnZXRQb2ludGVyU2l6ZShpbXBsKSk7XHJcbiAgICBpbXBsLmV4cG9ydHMuX19nZXRfZXhjZXB0aW9uX21lc3NhZ2UocHRyLCB0eXBlX2FkZHJfYWRkciwgbWVzc2FnZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgdHlwZV9hZGRyID0gcmVhZFBvaW50ZXIoaW1wbCwgdHlwZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgbWVzc2FnZV9hZGRyID0gcmVhZFBvaW50ZXIoaW1wbCwgbWVzc2FnZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgdHlwZSA9IHV0ZjhUb1N0cmluZ1ooaW1wbCwgdHlwZV9hZGRyKTtcclxuICAgIGltcGwuZXhwb3J0cy5mcmVlKHR5cGVfYWRkcik7XHJcbiAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XHJcbiAgICBpZiAobWVzc2FnZV9hZGRyKSB7XHJcbiAgICAgICAgbWVzc2FnZSA9IHV0ZjhUb1N0cmluZ1ooaW1wbCwgbWVzc2FnZV9hZGRyKTtcclxuICAgICAgICBpbXBsLmV4cG9ydHMuZnJlZShtZXNzYWdlX2FkZHIpO1xyXG4gICAgfVxyXG4gICAgc3RhY2tSZXN0b3JlKGltcGwsIHNwKTtcclxuICAgIHJldHVybiBbdHlwZSwgbWVzc2FnZV07XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBnZXRFeGNlcHRpb25NZXNzYWdlIH0gZnJvbSBcIi4uL19wcml2YXRlL2V4Y2VwdGlvbi5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudERldGFpbCB7IGV4Y2VwdGlvbjogV2ViQXNzZW1ibHkuRXhjZXB0aW9uIH1cclxuXHJcbmRlY2xhcmUgbmFtZXNwYWNlIFdlYkFzc2VtYmx5IHtcclxuICAgIGNsYXNzIEV4Y2VwdGlvbiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IodGFnOiBudW1iZXIsIHBheWxvYWQ6IG51bWJlcltdLCBvcHRpb25zPzogeyB0cmFjZVN0YWNrPzogYm9vbGVhbiB9KTtcclxuICAgICAgICBnZXRBcmcoZXhjZXB0aW9uVGFnOiBudW1iZXIsIGluZGV4OiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1zY3JpcHRlbkV4Y2VwdGlvbiBleHRlbmRzIFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiB7XHJcbiAgICBtZXNzYWdlOiBbc3RyaW5nLCBzdHJpbmddO1xyXG59XHJcbi8qXHJcbmV4cG9ydCBjbGFzcyBXZWJBc3NlbWJseUV4Y2VwdGlvbkV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8V2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGV4Y2VwdGlvbjogV2ViQXNzZW1ibHkuRXhjZXB0aW9uKSB7XHJcbiAgICAgICAgc3VwZXIoXCJXZWJBc3NlbWJseUV4Y2VwdGlvbkV2ZW50XCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGV4Y2VwdGlvbiB9IH0pXHJcbiAgICB9XHJcbn1cclxuKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGV4OiBhbnkpOiB2b2lkIHtcclxuICAgIGNvbnN0IHQgPSBuZXcgV2ViQXNzZW1ibHkuRXhjZXB0aW9uKCh0aGlzLmV4cG9ydHMpLl9fY3BwX2V4Y2VwdGlvbiwgW2V4XSwgeyB0cmFjZVN0YWNrOiB0cnVlIH0pIGFzIEVtc2NyaXB0ZW5FeGNlcHRpb247XHJcbiAgICB0Lm1lc3NhZ2UgPSBnZXRFeGNlcHRpb25NZXNzYWdlKHRoaXMsIHQpO1xyXG4gICAgdGhyb3cgdDtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfdHpzZXRfanModGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sdGltZXpvbmU6IG51bWJlciwgZGF5bGlnaHQ6IG51bWJlciwgc3RkX25hbWU6IG51bWJlciwgZHN0X25hbWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgZGVidWdnZXI7XHJcbiAgICAvLyBUT0RPXHJcbiAgfSIsICJpbXBvcnQgeyBFbWJvdW5kVHlwZXMgfSBmcm9tIFwiLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFdmVudFR5cGVzTWFwIH0gZnJvbSBcIi4vX3ByaXZhdGUvZXZlbnQtdHlwZXMtbWFwLmpzXCI7XHJcbmltcG9ydCB7IEtub3duSW5zdGFuY2VFeHBvcnRzMiB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgSW5zdGFudGlhdGVkV2FzaUV2ZW50VGFyZ2V0IGV4dGVuZHMgRXZlbnRUYXJnZXQge1xyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcjxLIGV4dGVuZHMga2V5b2YgRXZlbnRUeXBlc01hcD4odHlwZTogSywgbGlzdGVuZXI6ICh0aGlzOiBGaWxlUmVhZGVyLCBldjogRXZlbnRUeXBlc01hcFtLXSkgPT4gYW55LCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdm9pZDtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXIodHlwZTogc3RyaW5nLCBjYWxsYmFjazogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsIG9wdGlvbnM/OiBFdmVudExpc3RlbmVyT3B0aW9ucyB8IGJvb2xlYW4pOiB2b2lkO1xyXG59XHJcblxyXG5cclxuLy8gIFRoaXMgcmVhc3NpZ25tZW50IGlzIGEgVHlwZXNjcmlwdCBoYWNrIHRvIGFkZCBjdXN0b20gdHlwZXMgdG8gYWRkRXZlbnRMaXN0ZW5lci4uLlxyXG5jb25zdCBJbnN0YW50aWF0ZWRXYXNpRXZlbnRUYXJnZXQgPSBFdmVudFRhcmdldCBhcyB7bmV3KCk6IEluc3RhbnRpYXRlZFdhc2lFdmVudFRhcmdldDsgcHJvdG90eXBlOiBJbnN0YW50aWF0ZWRXYXNpRXZlbnRUYXJnZXR9O1xyXG5cclxuLyoqXHJcbiAqIEV4dGVuc2lvbiBvZiBgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2VgIHRoYXQgaXMgYWxzbyBhbiBgRXZlbnRUYXJnZXRgIGZvciBhbGwgV0FTSSBcImV2ZW50XCJzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEluc3RhbnRpYXRlZFdhc2k8RSBleHRlbmRzIHt9PiBleHRlbmRzIEluc3RhbnRpYXRlZFdhc2lFdmVudFRhcmdldCBpbXBsZW1lbnRzIFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlIHtcclxuICAgIC8qKiBUaGUgYFdlYkFzc2VtYmx5Lk1vZHVsZWAgdGhpcyBpbnN0YW5jZSB3YXMgYnVpbHQgZnJvbS4gUmFyZWx5IHVzZWZ1bCBieSBpdHNlbGYuICovXHJcbiAgICBwdWJsaWMgbW9kdWxlOiBXZWJBc3NlbWJseS5Nb2R1bGU7XHJcbiAgICAvKiogVGhlIGBXZWJBc3NlbWJseS5Nb2R1bGVgIHRoaXMgaW5zdGFuY2Ugd2FzIGJ1aWx0IGZyb20uIFJhcmVseSB1c2VmdWwgYnkgaXRzZWxmLiAqL1xyXG4gICAgcHVibGljIGluc3RhbmNlOiBXZWJBc3NlbWJseS5JbnN0YW5jZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnRhaW5zIGV2ZXJ5dGhpbmcgZXhwb3J0ZWQgdXNpbmcgZW1iaW5kLlxyXG4gICAgICogXHJcbiAgICAgKiBUaGVzZSBhcmUgc2VwYXJhdGUgZnJvbSByZWd1bGFyIGV4cG9ydHMgb24gYGluc3RhbmNlLmV4cG9ydGAuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBlbWJpbmQ6IEVtYm91bmRUeXBlcztcclxuXHJcbiAgICAvKiogXHJcbiAgICAgKiBUaGUgXCJyYXdcIiBXQVNNIGV4cG9ydHMuIE5vbmUgYXJlIHByZWZpeGVkIHdpdGggXCJfXCIuXHJcbiAgICAgKiBcclxuICAgICAqIE5vIGNvbnZlcnNpb24gaXMgcGVyZm9ybWVkIG9uIHRoZSB0eXBlcyBoZXJlOyBldmVyeXRoaW5nIHRha2VzIG9yIHJldHVybnMgYSBudW1iZXIuXHJcbiAgICAgKiBcclxuICAgICAqL1xyXG4gICAgcHVibGljIGV4cG9ydHM6IEUgJiBLbm93bkluc3RhbmNlRXhwb3J0czI7XHJcbiAgICBwdWJsaWMgY2FjaGVkTWVtb3J5VmlldzogRGF0YVZpZXc7XHJcblxyXG4gICAgLyoqIE5vdCBpbnRlbmRlZCB0byBiZSBjYWxsZWQgZGlyZWN0bHkuIFVzZSB0aGUgYGluc3RhbnRpYXRlYCBmdW5jdGlvbiBpbnN0ZWFkLCB3aGljaCByZXR1cm5zIG9uZSBvZiB0aGVzZS4gKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5tb2R1bGUgPSB0aGlzLmluc3RhbmNlID0gdGhpcy5leHBvcnRzID0gdGhpcy5jYWNoZWRNZW1vcnlWaWV3ID0gbnVsbCFcclxuICAgICAgICB0aGlzLmVtYmluZCA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgX2luaXQobW9kdWxlOiBXZWJBc3NlbWJseS5Nb2R1bGUsIGluc3RhbmNlOiBXZWJBc3NlbWJseS5JbnN0YW5jZSk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMubW9kdWxlID0gbW9kdWxlO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgICB0aGlzLmV4cG9ydHMgPSBpbnN0YW5jZS5leHBvcnRzIGFzIEUgYXMgRSAmIEtub3duSW5zdGFuY2VFeHBvcnRzMjtcclxuICAgICAgICB0aGlzLmNhY2hlZE1lbW9yeVZpZXcgPSBuZXcgRGF0YVZpZXcodGhpcy5leHBvcnRzLm1lbW9yeS5idWZmZXIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVudGlyZVB1YmxpY0ludGVyZmFjZSB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXYXNpUmV0dXJuPEUgZXh0ZW5kcyB7fSwgSSBleHRlbmRzIEVudGlyZVB1YmxpY0ludGVyZmFjZT4ge1xyXG4gICAgaW1wb3J0czogSTtcclxuICAgIHdhc2lSZWFkeTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNpPEU+PjtcclxufVxyXG5cclxuXHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBJbnN0YW50aWF0ZSB0aGUgV0FTSSBpbnRlcmZhY2UsIGJpbmRpbmcgYWxsIGl0cyBmdW5jdGlvbnMgdG8gdGhlIFdBU00gaW5zdGFuY2UgaXRzZWxmLlxyXG4gKiBcclxuICogTXVzdCBiZSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGgsIGUuZy4sIGBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZWAuIEJlY2F1c2UgdGhhdCBhbmQgdGhpcyBib3RoIHJlcXVpcmUgZWFjaCBvdGhlciBjaXJjdWxhcmx5LCBcclxuICogYGluc3RhbnRpYXRlU3RyZWFtaW5nV2l0aFdhc2lgIGFuZCBgaW5zdGFudGlhdGVXaXRoV2FzaWAgYXJlIGNvbnZlbmllbmNlIGZ1bmN0aW9ucyB0aGF0IGRvIGJvdGggYXQgb25jZS5cclxuICogXHJcbiAqIFRoZSBXQVNJIGludGVyZmFjZSBmdW5jdGlvbnMgY2FuJ3QgYmUgdXNlZCBhbG9uZSAtLSB0aGV5IG5lZWQgY29udGV4dCBsaWtlICh3aGF0IG1lbW9yeSBpcyB0aGlzIGEgcG9pbnRlciBpbikgYW5kIHN1Y2guXHJcbiAqIFxyXG4gKiBUaGlzIGZ1bmN0aW9uIHByb3ZpZGVzIHRoYXQgY29udGV4dCB0byBhbiBpbXBvcnQgYmVmb3JlIGl0J3MgcGFzc2VkIHRvIGFuIGBJbnN0YW5jZWAgZm9yIGNvbnN0cnVjdGlvbi5cclxuICogXHJcbiAqIEByZW1hcmtzIEludGVuZGVkIHVzYWdlOlxyXG4gKiBcclxuICogYGBgdHlwZXNjcmlwdFxyXG4gKiBpbXBvcnQgeyBmZF93cml0ZSwgcHJvY19leGl0IH0gZnJvbSBcImJhc2ljLWV2ZW50LXdhc2lcIiBcclxuICogLy8gV2FpdGluZyBmb3IgaHR0cHM6Ly9naXRodWIuY29tL3RjMzkvcHJvcG9zYWwtcHJvbWlzZS13aXRoLXJlc29sdmVycy4uLlxyXG4gKiBsZXQgcmVzb2x2ZTogKGluZm86IFdlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlKSA9PiB2b2lkO1xyXG4gKiBsZXQgcmVqZWN0OiAoZXJyb3I6IGFueSkgPT4gdm9pZDtcclxuICogbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZTxXZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZT4oKHJlcywgcmVqKSA9PiB7XHJcbiAqICAgICByZXNvbHZlID0gcmVzO1xyXG4gKiAgICAgcmVqZWN0ID0gcmVqO1xyXG4gKiB9KTtcclxuICogXHJcbiAqIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKHNvdXJjZSwgeyAuLi5tYWtlV2FzaUludGVyZmFjZShwcm9taXNlLnRoZW4ocyA9PiBzLmluc3RhbmNlKSwgeyBmZF93cml0ZSwgcHJvY19leGl0IH0pIH0pO1xyXG4gKiBgYGBcclxuICogKFtQbGVhc2UgcGxlYXNlIHBsZWFzZSBwbGVhc2UgcGxlYXNlXShodHRwczovL2dpdGh1Yi5jb20vdGMzOS9wcm9wb3NhbC1wcm9taXNlLXdpdGgtcmVzb2x2ZXJzKSlcclxuICogXHJcbiAqIEBwYXJhbSB3YXNtSW5zdGFuY2UgXHJcbiAqIEBwYXJhbSB1bmJvdW5kSW1wb3J0cyBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFudGlhdGVXYXNpPEUgZXh0ZW5kcyB7fSwgSSBleHRlbmRzIEVudGlyZVB1YmxpY0ludGVyZmFjZT4od2FzbUluc3RhbmNlOiBQcm9taXNlPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPiwgdW5ib3VuZEltcG9ydHM6IEksIHsgZGlzcGF0Y2hFdmVudCB9OiB7IGRpc3BhdGNoRXZlbnQ/KGV2ZW50OiBFdmVudCk6IGJvb2xlYW4gfSA9IHt9KTogV2FzaVJldHVybjxFLCBJPiB7XHJcbiAgICBsZXQgcmVzb2x2ZSE6ICh2YWx1ZTogSW5zdGFudGlhdGVkV2FzaTxFPikgPT4gdm9pZDtcclxuICAgIGxldCByZXQgPSBuZXcgSW5zdGFudGlhdGVkV2FzaTxFPigpO1xyXG4gICAgd2FzbUluc3RhbmNlLnRoZW4oKG8pID0+IHtcclxuICAgICAgICBjb25zdCB7IGluc3RhbmNlLCBtb2R1bGUgfSA9IG87XHJcblxyXG4gICAgICAgIC8vIE5lZWRzIHRvIGNvbWUgYmVmb3JlIF9pbml0aWFsaXplKCkgb3IgX3N0YXJ0KCkuXHJcbiAgICAgICAgKHJldCBhcyBhbnkpLl9pbml0KG1vZHVsZSwgaW5zdGFuY2UpO1xyXG5cclxuICAgICAgICBjb25zb2xlLmFzc2VydCgoXCJfaW5pdGlhbGl6ZVwiIGluIGluc3RhbmNlLmV4cG9ydHMpICE9IFwiX3N0YXJ0XCIgaW4gaW5zdGFuY2UuZXhwb3J0cywgYEV4cGVjdGVkIGVpdGhlciBfaW5pdGlhbGl6ZSBYT1IgX3N0YXJ0IHRvIGJlIGV4cG9ydGVkIGZyb20gdGhpcyBXQVNNLmApO1xyXG4gICAgICAgIGlmIChcIl9pbml0aWFsaXplXCIgaW4gaW5zdGFuY2UuZXhwb3J0cykge1xyXG4gICAgICAgICAgICAoaW5zdGFuY2UuZXhwb3J0cyBhcyBhbnkpLl9pbml0aWFsaXplKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKFwiX3N0YXJ0XCIgaW4gaW5zdGFuY2UuZXhwb3J0cykge1xyXG4gICAgICAgICAgICAoaW5zdGFuY2UuZXhwb3J0cyBhcyBhbnkpLl9zdGFydCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXNvbHZlKHJldCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGwgdGhlIGZ1bmN0aW9ucyB3ZSd2ZSBiZWVuIHBhc3NlZCB3ZXJlIGltcG9ydGVkIGFuZCBoYXZlbid0IGJlZW4gYm91bmQgeWV0LlxyXG4gICAgLy8gUmV0dXJuIGEgbmV3IG9iamVjdCB3aXRoIGVhY2ggbWVtYmVyIGJvdW5kIHRvIHRoZSBwcml2YXRlIGluZm9ybWF0aW9uIHdlIHBhc3MgYXJvdW5kLlxyXG5cclxuICAgIGNvbnN0IHdhc2lfc25hcHNob3RfcHJldmlldzEgPSBiaW5kQWxsRnVuY3MocmV0LCB1bmJvdW5kSW1wb3J0cy53YXNpX3NuYXBzaG90X3ByZXZpZXcxKTtcclxuICAgIGNvbnN0IGVudiA9IGJpbmRBbGxGdW5jcyhyZXQsIHVuYm91bmRJbXBvcnRzLmVudik7XHJcblxyXG4gICAgY29uc3QgYm91bmRJbXBvcnRzID0geyB3YXNpX3NuYXBzaG90X3ByZXZpZXcxLCBlbnYgfSBhcyBJO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbXBvcnRzOiBib3VuZEltcG9ydHMsXHJcbiAgICAgICAgLy8gVW50aWwgdGhpcyByZXNvbHZlcywgbm8gV0FTSSBmdW5jdGlvbnMgY2FuIGJlIGNhbGxlZCAoYW5kIGJ5IGV4dGVuc2lvbiBubyB3YXNtIGV4cG9ydHMgY2FuIGJlIGNhbGxlZClcclxuICAgICAgICAvLyBJdCByZXNvbHZlcyBpbW1lZGlhdGVseSBhZnRlciB0aGUgaW5wdXQgcHJvbWlzZSB0byB0aGUgaW5zdGFuY2UmbW9kdWxlIHJlc29sdmVzXHJcbiAgICAgICAgd2FzaVJlYWR5OiBuZXcgUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNpPEU+PigocmVzKSA9PiB7IHJlc29sdmUhID0gcmVzIH0pXHJcbiAgICB9O1xyXG59XHJcblxyXG5cclxuLy8gR2l2ZW4gYW4gb2JqZWN0LCBiaW5kcyBlYWNoIGZ1bmN0aW9uIGluIHRoYXQgb2JqZWN0IHRvIHAgKHNoYWxsb3dseSkuXHJcbmZ1bmN0aW9uIGJpbmRBbGxGdW5jczxSIGV4dGVuZHMge30+KHA6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByOiBSKTogUiB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKE9iamVjdC5lbnRyaWVzKHIpLm1hcCgoW2tleSwgZnVuY10pID0+IHsgcmV0dXJuIFtrZXksICh0eXBlb2YgZnVuYyA9PSBcImZ1bmN0aW9uXCIgPyBmdW5jLmJpbmQocCkgOiBmdW5jKV0gYXMgY29uc3Q7IH0pKSBhcyBSO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbnRpcmVQdWJsaWNJbnRlcmZhY2UgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgYXdhaXRBbGxFbWJpbmQgfSBmcm9tIFwiLi9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgaW5zdGFudGlhdGVXYXNpIH0gZnJvbSBcIi4vaW5zdGFudGlhdGUtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgUm9sbHVwV2FzbVByb21pc2U8SSBleHRlbmRzIEVudGlyZVB1YmxpY0ludGVyZmFjZSA9IEVudGlyZVB1YmxpY0ludGVyZmFjZT4gPSAoaW1wb3J0cz86IEkpID0+IFByb21pc2U8V2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2U+O1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlV2FzbUdlbmVyaWM8RSBleHRlbmRzIHt9LCBJIGV4dGVuZHMgRW50aXJlUHVibGljSW50ZXJmYWNlID0gRW50aXJlUHVibGljSW50ZXJmYWNlPihpbnN0YW50aWF0ZVdhc206IChib3VuZEltcG9ydHM6IEkpID0+IFByb21pc2U8V2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2U+LCB1bmJvdW5kSW1wb3J0czogSSk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj4ge1xyXG5cclxuICAgIC8vIFRoZXJlJ3MgYSBiaXQgb2Ygc29uZyBhbmQgZGFuY2UgdG8gZ2V0IGFyb3VuZCB0aGUgZmFjdCB0aGF0OlxyXG4gICAgLy8gMS4gV0FTTSBuZWVkcyBpdHMgV0FTSSBpbXBvcnRzIGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi5cclxuICAgIC8vIDIuIFdBU0kgbmVlZHMgaXRzIFdBU00gSW5zdGFuY2UgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLlxyXG4gICAgLy8gU28gd2UgdXNlIHByb21pc2VzIHRvIG5vdGlmeSBlYWNoIHRoYXQgdGhlIG90aGVyJ3MgYmVlbiBjcmVhdGVkLlxyXG5cclxuICAgIGNvbnN0IHsgcHJvbWlzZTogd2FzbVJlYWR5LCByZXNvbHZlOiByZXNvbHZlV2FzbSB9ID0gUHJvbWlzZS53aXRoUmVzb2x2ZXJzPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPigpO1xyXG4gICAgY29uc3QgeyBpbXBvcnRzLCB3YXNpUmVhZHkgfSA9IGluc3RhbnRpYXRlV2FzaTxFLCBJPih3YXNtUmVhZHksIHVuYm91bmRJbXBvcnRzKTtcclxuICAgIHJlc29sdmVXYXNtKGF3YWl0IGluc3RhbnRpYXRlV2FzbSh7IC4uLmltcG9ydHMgfSkpO1xyXG4gICAgY29uc3QgcmV0ID0gYXdhaXQgd2FzaVJlYWR5O1xyXG5cclxuICAgIGF3YWl0IGF3YWl0QWxsRW1iaW5kKCk7XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxufVxyXG5XZWJBc3NlbWJseS5pbnN0YW50aWF0ZSIsICJpbXBvcnQgeyB0eXBlIFJvbGx1cFdhc21Qcm9taXNlLCBpbnN0YW50aWF0ZVdhc21HZW5lcmljIH0gZnJvbSBcIi4vX3ByaXZhdGUvaW5zdGFudGlhdGUtd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgRW50aXJlUHVibGljSW50ZXJmYWNlIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW50aWF0ZXMgYSBXQVNNIG1vZHVsZSB3aXRoIHRoZSBzcGVjaWZpZWQgV0FTSSBpbXBvcnRzLlxyXG4gKiBcclxuICogYGlucHV0YCBjYW4gYmUgYW55IG9uZSBvZjpcclxuICogXHJcbiAqICogYFJlc3BvbnNlYCBvciBgUHJvbWlzZTxSZXNwb25zZT5gIChmcm9tIGUuZy4gYGZldGNoYCkuIFVzZXMgYFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nYC5cclxuICogKiBgQXJyYXlCdWZmZXJgIHJlcHJlc2VudGluZyB0aGUgV0FTTSBpbiBiaW5hcnkgZm9ybSwgb3IgYSBgV2ViQXNzZW1ibHkuTW9kdWxlYC4gXHJcbiAqICogQSBmdW5jdGlvbiB0aGF0IHRha2VzIDEgYXJndW1lbnQgb2YgdHlwZSBgV2ViQXNzZW1ibHkuSW1wb3J0c2AgYW5kIHJldHVybnMgYSBgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2VgLiBUaGlzIGlzIHRoZSB0eXBlIHRoYXQgYEByb2xsdXAvcGx1Z2luLXdhc21gIHJldHVybnMgd2hlbiBidW5kbGluZyBhIHByZS1idWlsdCBXQVNNIGJpbmFyeS5cclxuICogXHJcbiAqIEBwYXJhbSB3YXNtRmV0Y2hQcm9taXNlIFxyXG4gKiBAcGFyYW0gdW5ib3VuZEltcG9ydHMgXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFudGlhdGU8RSBleHRlbmRzIHt9Pih3YXNtRmV0Y2hQcm9taXNlOiBSZXNwb25zZSB8IFByb21pc2VMaWtlPFJlc3BvbnNlPiwgdW5ib3VuZEltcG9ydHM6IEVudGlyZVB1YmxpY0ludGVyZmFjZSk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj47XHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZTxFIGV4dGVuZHMge30+KG1vZHVsZUJ5dGVzOiBXZWJBc3NlbWJseS5Nb2R1bGUgfCBCdWZmZXJTb3VyY2UsIHVuYm91bmRJbXBvcnRzOiBFbnRpcmVQdWJsaWNJbnRlcmZhY2UpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8RT4+O1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFudGlhdGU8RSBleHRlbmRzIHt9Pih3YXNtSW5zdGFudGlhdG9yOiBSb2xsdXBXYXNtUHJvbWlzZSwgdW5ib3VuZEltcG9ydHM6IEVudGlyZVB1YmxpY0ludGVyZmFjZSk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj47XHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZTxFIGV4dGVuZHMge30+KHdhc206IFJvbGx1cFdhc21Qcm9taXNlIHwgV2ViQXNzZW1ibHkuTW9kdWxlIHwgQnVmZmVyU291cmNlIHwgUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4sIHVuYm91bmRJbXBvcnRzOiBFbnRpcmVQdWJsaWNJbnRlcmZhY2UpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8RT4+IHtcclxuICAgIHJldHVybiBhd2FpdCBpbnN0YW50aWF0ZVdhc21HZW5lcmljPEU+KGFzeW5jIChjb21iaW5lZEltcG9ydHMpID0+IHtcclxuICAgICAgICBpZiAod2FzbSBpbnN0YW5jZW9mIFdlYkFzc2VtYmx5Lk1vZHVsZSlcclxuICAgICAgICAgICAgcmV0dXJuICh7IG1vZHVsZTogd2FzbSwgaW5zdGFuY2U6IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKHdhc20sIHsgLi4uY29tYmluZWRJbXBvcnRzIH0pIH0pO1xyXG4gICAgICAgIGVsc2UgaWYgKHdhc20gaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fCBBcnJheUJ1ZmZlci5pc1ZpZXcod2FzbSkpXHJcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSh3YXNtLCB7IC4uLmNvbWJpbmVkSW1wb3J0cyB9KTtcclxuICAgICAgICBlbHNlIGlmIChcInRoZW5cIiBpbiB3YXNtIHx8IChcIlJlc3BvbnNlXCIgaW4gZ2xvYmFsVGhpcyAmJiB3YXNtIGluc3RhbmNlb2YgUmVzcG9uc2UpKVxyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmcod2FzbSwgeyAuLi5jb21iaW5lZEltcG9ydHMgfSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgKHdhc20gYXMgUm9sbHVwV2FzbVByb21pc2UpKGNvbWJpbmVkSW1wb3J0cyk7XHJcblxyXG4gICAgfSwgdW5ib3VuZEltcG9ydHMpXHJcbn1cclxuXHJcblxyXG4iLCAiXHJcbi8vIFRoZXNlIGNvbnN0YW50cyBhcmVuJ3QgZG9uZSBhcyBhbiBlbnVtIGJlY2F1c2UgOTUlIG9mIHRoZW0gYXJlIG5ldmVyIHJlZmVyZW5jZWQsXHJcbi8vIGJ1dCB0aGV5J2QgYWxtb3N0IGNlcnRhaW5seSBuZXZlciBiZSB0cmVlLXNoYWtlbiBvdXQuXHJcblxyXG4vKiogTm8gZXJyb3Igb2NjdXJyZWQuIFN5c3RlbSBjYWxsIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuICovICAgZXhwb3J0IGNvbnN0IEVTVUNDRVNTID0gICAgICAgICAwO1xyXG4vKiogQXJndW1lbnQgbGlzdCB0b28gbG9uZy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEUyQklHID0gICAgICAgICAgICAxO1xyXG4vKiogUGVybWlzc2lvbiBkZW5pZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBQ0NFUyA9ICAgICAgICAgICAyO1xyXG4vKiogQWRkcmVzcyBpbiB1c2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSSU5VU0UgPSAgICAgICAzO1xyXG4vKiogQWRkcmVzcyBub3QgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSTk9UQVZBSUwgPSAgICA0O1xyXG4vKiogQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRk5PU1VQUE9SVCA9ICAgICA1O1xyXG4vKiogUmVzb3VyY2UgdW5hdmFpbGFibGUsIG9yIG9wZXJhdGlvbiB3b3VsZCBibG9jay4gKi8gICAgICAgICAgZXhwb3J0IGNvbnN0IEVBR0FJTiA9ICAgICAgICAgICA2O1xyXG4vKiogQ29ubmVjdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBTFJFQURZID0gICAgICAgICA3O1xyXG4vKiogQmFkIGZpbGUgZGVzY3JpcHRvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCQURGID0gICAgICAgICAgICA4O1xyXG4vKiogQmFkIG1lc3NhZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCQURNU0cgPSAgICAgICAgICA5O1xyXG4vKiogRGV2aWNlIG9yIHJlc291cmNlIGJ1c3kuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCVVNZID0gICAgICAgICAgICAxMDtcclxuLyoqIE9wZXJhdGlvbiBjYW5jZWxlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ0FOQ0VMRUQgPSAgICAgICAgMTE7XHJcbi8qKiBObyBjaGlsZCBwcm9jZXNzZXMuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNISUxEID0gICAgICAgICAgIDEyO1xyXG4vKiogQ29ubmVjdGlvbiBhYm9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDT05OQUJPUlRFRCA9ICAgICAxMztcclxuLyoqIENvbm5lY3Rpb24gcmVmdXNlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ09OTlJFRlVTRUQgPSAgICAgMTQ7XHJcbi8qKiBDb25uZWN0aW9uIHJlc2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5SRVNFVCA9ICAgICAgIDE1O1xyXG4vKiogUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVERUFETEsgPSAgICAgICAgICAxNjtcclxuLyoqIERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFREVTVEFERFJSRVEgPSAgICAgMTc7XHJcbi8qKiBNYXRoZW1hdGljcyBhcmd1bWVudCBvdXQgb2YgZG9tYWluIG9mIGZ1bmN0aW9uLiAqLyAgICAgICAgICBleHBvcnQgY29uc3QgRURPTSA9ICAgICAgICAgICAgIDE4O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVEUVVPVCA9ICAgICAgICAgICAxOTtcclxuLyoqIEZpbGUgZXhpc3RzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRVhJU1QgPSAgICAgICAgICAgMjA7XHJcbi8qKiBCYWQgYWRkcmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUZBVUxUID0gICAgICAgICAgIDIxO1xyXG4vKiogRmlsZSB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVGQklHID0gICAgICAgICAgICAyMjtcclxuLyoqIEhvc3QgaXMgdW5yZWFjaGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSE9TVFVOUkVBQ0ggPSAgICAgMjM7XHJcbi8qKiBJZGVudGlmaWVyIHJlbW92ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlEUk0gPSAgICAgICAgICAgIDI0O1xyXG4vKiogSWxsZWdhbCBieXRlIHNlcXVlbmNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTFNFUSA9ICAgICAgICAgICAyNTtcclxuLyoqIE9wZXJhdGlvbiBpbiBwcm9ncmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU5QUk9HUkVTUyA9ICAgICAgMjY7XHJcbi8qKiBJbnRlcnJ1cHRlZCBmdW5jdGlvbi4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlOVFIgPSAgICAgICAgICAgIDI3O1xyXG4vKiogSW52YWxpZCBhcmd1bWVudC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTlZBTCA9ICAgICAgICAgICAyODtcclxuLyoqIEkvTyBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU8gPSAgICAgICAgICAgICAgMjk7XHJcbi8qKiBTb2NrZXQgaXMgY29ubmVjdGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlTQ09OTiA9ICAgICAgICAgIDMwO1xyXG4vKiogSXMgYSBkaXJlY3RvcnkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJU0RJUiA9ICAgICAgICAgICAzMTtcclxuLyoqIFRvbyBtYW55IGxldmVscyBvZiBzeW1ib2xpYyBsaW5rcy4gKi8gICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTE9PUCA9ICAgICAgICAgICAgMzI7XHJcbi8qKiBGaWxlIGRlc2NyaXB0b3IgdmFsdWUgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1GSUxFID0gICAgICAgICAgIDMzO1xyXG4vKiogVG9vIG1hbnkgbGlua3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNTElOSyA9ICAgICAgICAgICAzNDtcclxuLyoqIE1lc3NhZ2UgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTVNHU0laRSA9ICAgICAgICAgMzU7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1VTFRJSE9QID0gICAgICAgIDM2O1xyXG4vKiogRmlsZW5hbWUgdG9vIGxvbmcuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOQU1FVE9PTE9ORyA9ICAgICAzNztcclxuLyoqIE5ldHdvcmsgaXMgZG93bi4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkVURE9XTiA9ICAgICAgICAgMzg7XHJcbi8qKiBDb25uZWN0aW9uIGFib3J0ZWQgYnkgbmV0d29yay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVFJFU0VUID0gICAgICAgIDM5O1xyXG4vKiogTmV0d29yayB1bnJlYWNoYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORVRVTlJFQUNIID0gICAgICA0MDtcclxuLyoqIFRvbyBtYW55IGZpbGVzIG9wZW4gaW4gc3lzdGVtLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkZJTEUgPSAgICAgICAgICAgNDE7XHJcbi8qKiBObyBidWZmZXIgc3BhY2UgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PQlVGUyA9ICAgICAgICAgIDQyO1xyXG4vKiogTm8gc3VjaCBkZXZpY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0RFViA9ICAgICAgICAgICA0MztcclxuLyoqIE5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9FTlQgPSAgICAgICAgICAgNDQ7XHJcbi8qKiBFeGVjdXRhYmxlIGZpbGUgZm9ybWF0IGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PRVhFQyA9ICAgICAgICAgIDQ1O1xyXG4vKiogTm8gbG9ja3MgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0xDSyA9ICAgICAgICAgICA0NjtcclxuLyoqIFJlc2VydmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9MSU5LID0gICAgICAgICAgNDc7XHJcbi8qKiBOb3QgZW5vdWdoIHNwYWNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PTUVNID0gICAgICAgICAgIDQ4O1xyXG4vKiogTm8gbWVzc2FnZSBvZiB0aGUgZGVzaXJlZCB0eXBlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT01TRyA9ICAgICAgICAgICA0OTtcclxuLyoqIFByb3RvY29sIG5vdCBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9QUk9UT09QVCA9ICAgICAgNTA7XHJcbi8qKiBObyBzcGFjZSBsZWZ0IG9uIGRldmljZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PU1BDID0gICAgICAgICAgIDUxO1xyXG4vKiogRnVuY3Rpb24gbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1NZUyA9ICAgICAgICAgICA1MjtcclxuLyoqIFRoZSBzb2NrZXQgaXMgbm90IGNvbm5lY3RlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UQ09OTiA9ICAgICAgICAgNTM7XHJcbi8qKiBOb3QgYSBkaXJlY3Rvcnkgb3IgYSBzeW1ib2xpYyBsaW5rIHRvIGEgZGlyZWN0b3J5LiAqLyAgICAgICBleHBvcnQgY29uc3QgRU5PVERJUiA9ICAgICAgICAgIDU0O1xyXG4vKiogRGlyZWN0b3J5IG5vdCBlbXB0eS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RFTVBUWSA9ICAgICAgICA1NTtcclxuLyoqIFN0YXRlIG5vdCByZWNvdmVyYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UUkVDT1ZFUkFCTEUgPSAgNTY7XHJcbi8qKiBOb3QgYSBzb2NrZXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVFNPQ0sgPSAgICAgICAgIDU3O1xyXG4vKiogTm90IHN1cHBvcnRlZCwgb3Igb3BlcmF0aW9uIG5vdCBzdXBwb3J0ZWQgb24gc29ja2V0LiAqLyAgICAgZXhwb3J0IGNvbnN0IEVOT1RTVVAgPSAgICAgICAgICA1ODtcclxuLyoqIEluYXBwcm9wcmlhdGUgSS9PIGNvbnRyb2wgb3BlcmF0aW9uLiAqLyAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UVFkgPSAgICAgICAgICAgNTk7XHJcbi8qKiBObyBzdWNoIGRldmljZSBvciBhZGRyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5YSU8gPSAgICAgICAgICAgIDYwO1xyXG4vKiogVmFsdWUgdG9vIGxhcmdlIHRvIGJlIHN0b3JlZCBpbiBkYXRhIHR5cGUuICovICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVPVkVSRkxPVyA9ICAgICAgICA2MTtcclxuLyoqIFByZXZpb3VzIG93bmVyIGRpZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFT1dORVJERUFEID0gICAgICAgNjI7XHJcbi8qKiBPcGVyYXRpb24gbm90IHBlcm1pdHRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBFUk0gPSAgICAgICAgICAgIDYzO1xyXG4vKiogQnJva2VuIHBpcGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQSVBFID0gICAgICAgICAgICA2NDtcclxuLyoqIFByb3RvY29sIGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE8gPSAgICAgICAgICAgNjU7XHJcbi8qKiBQcm90b2NvbCBub3Qgc3VwcG9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBST1RPTk9TVVBQT1JUID0gIDY2O1xyXG4vKiogUHJvdG9jb2wgd3JvbmcgdHlwZSBmb3Igc29ja2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQUk9UT1RZUEUgPSAgICAgICA2NztcclxuLyoqIFJlc3VsdCB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUkFOR0UgPSAgICAgICAgICAgNjg7XHJcbi8qKiBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVJPRlMgPSAgICAgICAgICAgIDY5O1xyXG4vKiogSW52YWxpZCBzZWVrLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVTUElQRSA9ICAgICAgICAgICA3MDtcclxuLyoqIE5vIHN1Y2ggcHJvY2Vzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1JDSCA9ICAgICAgICAgICAgNzE7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVNUQUxFID0gICAgICAgICAgIDcyO1xyXG4vKiogQ29ubmVjdGlvbiB0aW1lZCBvdXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVUSU1FRE9VVCA9ICAgICAgICA3MztcclxuLyoqIFRleHQgZmlsZSBidXN5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFVFhUQlNZID0gICAgICAgICAgNzQ7XHJcbi8qKiBDcm9zcy1kZXZpY2UgbGluay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVhERVYgPSAgICAgICAgICAgIDc1O1xyXG4vKiogRXh0ZW5zaW9uOiBDYXBhYmlsaXRpZXMgaW5zdWZmaWNpZW50LiAqLyAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RDQVBBQkxFID0gICAgICA3NjsiLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQ2NChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+LCB2YWx1ZTogYmlnaW50KTogdm9pZCB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LnNldEJpZ1VpbnQ2NChwdHIsIHZhbHVlLCB0cnVlKTsgfVxyXG4iLCAiaW1wb3J0IHsgRUlOVkFMLCBFTk9TWVMsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50NjQgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50NjQuanNcIjtcclxuXHJcbmV4cG9ydCBlbnVtIENsb2NrSWQge1xyXG4gICAgUkVBTFRJTUUgPSAwLFxyXG4gICAgTU9OT1RPTklDID0gMSxcclxuICAgIFBST0NFU1NfQ1BVVElNRV9JRCA9IDIsXHJcbiAgICBUSFJFQURfQ1BVVElNRV9JRCA9IDNcclxufVxyXG5cclxuY29uc3QgcCA9IChnbG9iYWxUaGlzLnBlcmZvcm1hbmNlKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbG9ja190aW1lX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgY2xrX2lkOiBudW1iZXIsIF9wcmVjaXNpb246IG51bWJlciwgb3V0UHRyOiBudW1iZXIpOiBudW1iZXIge1xyXG5cclxuICAgIGxldCBub3dNczogbnVtYmVyO1xyXG4gICAgc3dpdGNoIChjbGtfaWQpIHtcclxuICAgICAgICBjYXNlIENsb2NrSWQuUkVBTFRJTUU6XHJcbiAgICAgICAgICAgIG5vd01zID0gRGF0ZS5ub3coKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLk1PTk9UT05JQzpcclxuICAgICAgICAgICAgaWYgKHAgPT0gbnVsbCkgcmV0dXJuIEVOT1NZUzsgICAvLyBUT0RPOiBQb3NzaWJsZSB0byBiZSBudWxsIGluIFdvcmtsZXRzP1xyXG4gICAgICAgICAgICBub3dNcyA9IHAubm93KCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgQ2xvY2tJZC5QUk9DRVNTX0NQVVRJTUVfSUQ6XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLlRIUkVBRF9DUFVUSU1FX0lEOlxyXG4gICAgICAgICAgICByZXR1cm4gRU5PU1lTO1xyXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBFSU5WQUw7XHJcbiAgICB9XHJcbiAgICBjb25zdCBub3dOcyA9IEJpZ0ludChNYXRoLnJvdW5kKG5vd01zICogMTAwMCAqIDEwMDApKTtcclxuICAgIHdyaXRlVWludDY0KHRoaXMsIG91dFB0ciwgbm93TnMpO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW52aXJvbl9nZXQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGVudmlyb25Db3VudE91dHB1dDogUG9pbnRlcjxQb2ludGVyPG51bWJlcj4+LCBlbnZpcm9uU2l6ZU91dHB1dDogUG9pbnRlcjxudW1iZXI+KSB7XHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBlbnZpcm9uQ291bnRPdXRwdXQsIDApO1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvblNpemVPdXRwdXQsIDApO1xyXG5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW52aXJvbl9zaXplc19nZXQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGVudmlyb25Db3VudE91dHB1dDogUG9pbnRlcjxQb2ludGVyPG51bWJlcj4+LCBlbnZpcm9uU2l6ZU91dHB1dDogUG9pbnRlcjxudW1iZXI+KSB7XHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBlbnZpcm9uQ291bnRPdXRwdXQsIDApO1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvblNpemVPdXRwdXQsIDApO1xyXG5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYC4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcImZkX2Nsb3NlXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQT1NJWCBjbG9zZSAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfY2xvc2UodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGZkOiBGaWxlRGVzY3JpcHRvcik6IHZvaWQge1xyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50KGZkKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDMyLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElvdmVjIHtcclxuICAgIGJ1ZmZlclN0YXJ0OiBudW1iZXI7XHJcbiAgICBidWZmZXJMZW5ndGg6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKGluZm86IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IG51bWJlcik6IElvdmVjIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYnVmZmVyU3RhcnQ6IHJlYWRQb2ludGVyKGluZm8sIHB0ciksXHJcbiAgICAgICAgYnVmZmVyTGVuZ3RoOiByZWFkVWludDMyKGluZm8sIHB0ciArIGdldFBvaW50ZXJTaXplKGluZm8pKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24qIHBhcnNlQXJyYXkoaW5mbzogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogR2VuZXJhdG9yPElvdmVjLCB2b2lkLCB2b2lkPiB7XHJcbiAgICBjb25zdCBzaXplb2ZTdHJ1Y3QgPSBnZXRQb2ludGVyU2l6ZShpbmZvKSArIDQ7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcclxuICAgICAgICB5aWVsZCBwYXJzZShpbmZvLCBwdHIgKyAoaSAqIHNpemVvZlN0cnVjdCkpXHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IHR5cGUgSW92ZWMsIHBhcnNlQXJyYXkgfSBmcm9tIFwiLi4vX3ByaXZhdGUvaW92ZWMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50OCB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQ4LmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYCwgd2l0aCBvdGhlcnMgaGFuZGxlZCB3aXRoIHRoZSB2YXJpb3VzIGZpbGUtb3BlbmluZyBjYWxscy4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcblxyXG4gICAgcmVxdWVzdGVkQnVmZmVyczogSW92ZWNbXTtcclxuXHJcbiAgICByZWFkSW50b01lbW9yeShidWZmZXJzOiAoVWludDhBcnJheSlbXSk6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50RGV0YWlsPiB7XHJcbiAgICBwcml2YXRlIF9ieXRlc1dyaXR0ZW4gPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBmaWxlRGVzY3JpcHRvcjogbnVtYmVyLCByZXF1ZXN0ZWRCdWZmZXJJbmZvOiBJb3ZlY1tdKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9yZWFkXCIsIHtcclxuICAgICAgICAgICAgYnViYmxlczogZmFsc2UsXHJcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIGRldGFpbDoge1xyXG4gICAgICAgICAgICAgICAgZmlsZURlc2NyaXB0b3IsXHJcbiAgICAgICAgICAgICAgICByZXF1ZXN0ZWRCdWZmZXJzOiByZXF1ZXN0ZWRCdWZmZXJJbmZvLFxyXG4gICAgICAgICAgICAgICAgcmVhZEludG9NZW1vcnk6IChpbnB1dEJ1ZmZlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAxMDAlIHVudGVzdGVkLCBwcm9iYWJseSBkb2Vzbid0IHdvcmsgaWYgSSdtIGJlaW5nIGhvbmVzdFxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVxdWVzdGVkQnVmZmVySW5mby5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA+PSBpbnB1dEJ1ZmZlcnMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGlucHV0QnVmZmVyc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBNYXRoLm1pbihidWZmZXIuYnl0ZUxlbmd0aCwgaW5wdXRCdWZmZXJzW2pdLmJ5dGVMZW5ndGgpOyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlVWludDgoaW1wbCwgcmVxdWVzdGVkQnVmZmVySW5mb1tpXS5idWZmZXJTdGFydCArIGosIGJ1ZmZlcltqXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK3RoaXMuX2J5dGVzV3JpdHRlbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYnl0ZXNXcml0dGVuKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J5dGVzV3JpdHRlbjtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVuaGFuZGxlZEZpbGVSZWFkRXZlbnQgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihmZDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYFVuaGFuZGxlZCByZWFkIHRvIGZpbGUgZGVzY3JpcHRvciAjJHtmZH0uYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG4vKiogUE9TSVggcmVhZHYgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX3JlYWQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpIHtcclxuXHJcbiAgICBsZXQgbldyaXR0ZW4gPSAwO1xyXG4gICAgY29uc3QgZ2VuID0gcGFyc2VBcnJheSh0aGlzLCBpb3YsIGlvdmNudCk7XHJcblxyXG4gICAgLy8gR2V0IGFsbCB0aGUgZGF0YSB0byByZWFkIGluIGl0cyBzZXBhcmF0ZSBidWZmZXJzXHJcbiAgICAvL2NvbnN0IGFzVHlwZWRBcnJheXMgPSBbLi4uZ2VuXS5tYXAoKHsgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCB9KSA9PiB7IG5Xcml0dGVuICs9IGJ1ZmZlckxlbmd0aDsgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuZ2V0TWVtb3J5KCkuYnVmZmVyLCBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoKSB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudCh0aGlzLCBmZCwgWy4uLmdlbl0pO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBuV3JpdHRlbiA9IDA7XHJcbiAgICAgICAgLyppZiAoZmQgPT0gMCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gZXJyb3Juby5iYWRmOyovXHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBuV3JpdHRlbiA9IGV2ZW50LmJ5dGVzV3JpdHRlbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHdyaXRlVWludDMyKHRoaXMsIHBudW0sIG5Xcml0dGVuKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG5cclxuXHJcbmNvbnN0IHRleHREZWNvZGVycyA9IG5ldyBNYXA8c3RyaW5nLCBUZXh0RGVjb2Rlcj4oKTtcclxuZnVuY3Rpb24gZ2V0VGV4dERlY29kZXIobGFiZWw6IHN0cmluZykge1xyXG4gICAgbGV0IHJldDogVGV4dERlY29kZXIgfCB1bmRlZmluZWQgPSB0ZXh0RGVjb2RlcnMuZ2V0KGxhYmVsKTtcclxuICAgIGlmICghcmV0KSB7XHJcbiAgICAgICAgcmV0ID0gbmV3IFRleHREZWNvZGVyKGxhYmVsKTtcclxuICAgICAgICB0ZXh0RGVjb2RlcnMuc2V0KGxhYmVsLCByZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbn0iLCAiaW1wb3J0IHsgRUJBREYsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yLCBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYC4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclNlZWtFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9zZWVrXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQT1NJWCBsc2VlayAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfc2Vlayh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgZmQ6IEZpbGVEZXNjcmlwdG9yLCBvZmZzZXQ6IG51bWJlciwgd2hlbmNlOiBudW1iZXIsIG9mZnNldE91dDogUG9pbnRlcjxudW1iZXI+KTogdHlwZW9mIEVCQURGIHwgdHlwZW9mIEVTVUNDRVNTIHtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50KGZkKSkpIHtcclxuICAgICAgICBzd2l0Y2ggKGZkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gRUJBREY7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIEVTVUNDRVNTO1xyXG59XHJcbiIsICJpbXBvcnQgeyBwYXJzZUFycmF5IH0gZnJvbSBcIi4uL19wcml2YXRlL2lvdmVjLmpzXCI7XHJcbmltcG9ydCB7IEVCQURGLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKiBcclxuICAgICAqIEl0J3MgbW9yZS1vci1sZXNzIFt1bml2ZXJzYWxseSBleHBlY3RlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3RhbmRhcmRfc3RyZWFtKSB0aGF0IDAgaXMgZm9yIGlucHV0LCAxIGZvciBvdXRwdXQsIGFuZCAyIGZvciBlcnJvcnMsXHJcbiAgICAgKiBzbyB5b3UgY2FuIG1hcCAxIHRvIGBjb25zb2xlLmxvZ2AgYW5kIDIgdG8gYGNvbnNvbGUuZXJyb3JgLCB3aXRoIG90aGVycyBoYW5kbGVkIHdpdGggdGhlIHZhcmlvdXMgZmlsZS1vcGVuaW5nIGNhbGxzLiBcclxuICAgICAqL1xyXG4gICAgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxuICAgIGRhdGE6IFVpbnQ4QXJyYXlbXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoZmlsZURlc2NyaXB0b3I6IG51bWJlciwgZGF0YTogVWludDhBcnJheVtdKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF93cml0ZVwiLCB7IGJ1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZGF0YSwgZmlsZURlc2NyaXB0b3IgfSB9KTtcclxuICAgIH1cclxuICAgIGFzU3RyaW5nKGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRldGFpbC5kYXRhLm1hcCgoZCwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGRlY29kZWQgPSBnZXRUZXh0RGVjb2RlcihsYWJlbCkuZGVjb2RlKGQpO1xyXG4gICAgICAgICAgICBpZiAoZGVjb2RlZCA9PSBcIlxcMFwiICYmIGluZGV4ID09IHRoaXMuZGV0YWlsLmRhdGEubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlZDtcclxuICAgICAgICB9KS5qb2luKFwiXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5oYW5kbGVkRmlsZVdyaXRlRXZlbnQgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihmZDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYFVuaGFuZGxlZCB3cml0ZSB0byBmaWxlIGRlc2NyaXB0b3IgIyR7ZmR9LmApO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqIFBPU0lYIHdyaXRldiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfd3JpdGUodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpOiB0eXBlb2YgRVNVQ0NFU1MgfCB0eXBlb2YgRUJBREYge1xyXG5cclxuICAgIGxldCBuV3JpdHRlbiA9IDA7XHJcbiAgICBjb25zdCBnZW4gPSBwYXJzZUFycmF5KHRoaXMsIGlvdiwgaW92Y250KTtcclxuXHJcbiAgICAvLyBHZXQgYWxsIHRoZSBkYXRhIHRvIHdyaXRlIGluIGl0cyBzZXBhcmF0ZSBidWZmZXJzXHJcbiAgICBjb25zdCBhc1R5cGVkQXJyYXlzID0gWy4uLmdlbl0ubWFwKCh7IGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGggfSkgPT4geyBuV3JpdHRlbiArPSBidWZmZXJMZW5ndGg7IHJldHVybiBuZXcgVWludDhBcnJheSh0aGlzLmNhY2hlZE1lbW9yeVZpZXcuYnVmZmVyLCBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoKSB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnQoZmQsIGFzVHlwZWRBcnJheXMpO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBjb25zdCBzdHIgPSBldmVudC5hc1N0cmluZyhcInV0Zi04XCIpO1xyXG4gICAgICAgIGlmIChmZCA9PSAxKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzdHIpO1xyXG4gICAgICAgIGVsc2UgaWYgKGZkID09IDIpXHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3Ioc3RyKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBFQkFERjtcclxuICAgIH1cclxuXHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBwbnVtLCBuV3JpdHRlbik7XHJcblxyXG4gICAgcmV0dXJuIEVTVUNDRVNTO1xyXG59XHJcblxyXG5cclxuY29uc3QgdGV4dERlY29kZXJzID0gbmV3IE1hcDxzdHJpbmcsIFRleHREZWNvZGVyPigpO1xyXG5mdW5jdGlvbiBnZXRUZXh0RGVjb2RlcihsYWJlbDogc3RyaW5nKSB7XHJcbiAgICBsZXQgcmV0OiBUZXh0RGVjb2RlciB8IHVuZGVmaW5lZCA9IHRleHREZWNvZGVycy5nZXQobGFiZWwpO1xyXG4gICAgaWYgKCFyZXQpIHtcclxuICAgICAgICByZXQgPSBuZXcgVGV4dERlY29kZXIobGFiZWwpO1xyXG4gICAgICAgIHRleHREZWNvZGVycy5zZXQobGFiZWwsIHJldCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQWJvcnRFdmVudERldGFpbCB7XHJcbiAgICBjb2RlOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBYm9ydEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8QWJvcnRFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIGNvZGU6bnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJwcm9jX2V4aXRcIiwgeyBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogeyBjb2RlIH0gfSk7XHJcbiAgICB9XHJcbiAgICBcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFib3J0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3Rvcihjb2RlOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihgYWJvcnQoJHtjb2RlfSkgd2FzIGNhbGxlZGApO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvY19leGl0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBjb2RlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQWJvcnRFdmVudChjb2RlKSk7XHJcbiAgICB0aHJvdyBuZXcgQWJvcnRFcnJvcihjb2RlKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgYWxpZ25mYXVsdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9hbGlnbmZhdWx0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9ib29sIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHkgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsIF9lbXZhbF9kZWNyZWYsIF9lbXZhbF90YWtlX3ZhbHVlIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9lbXZhbC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2VudW0sIF9lbWJpbmRfcmVnaXN0ZXJfZW51bV92YWx1ZSwgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mdW5jdGlvbiB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXkuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QsIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdF9maWVsZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdm9pZC5qc1wiO1xyXG5pbXBvcnQgeyBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGguanNcIjtcclxuaW1wb3J0IHsgc2VnZmF1bHQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvc2VnZmF1bHQuanNcIjtcclxuaW1wb3J0IHsgX190aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS5qc1wiO1xyXG5pbXBvcnQgeyBfdHpzZXRfanMgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvdHpzZXRfanMuanNcIjtcclxuaW1wb3J0IHsgaW5zdGFudGlhdGUgYXMgaSB9IGZyb20gXCIuLi8uLi9kaXN0L2luc3RhbnRpYXRlLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9kaXN0L2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGNsb2NrX3RpbWVfZ2V0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9jbG9ja190aW1lX2dldC5qc1wiO1xyXG5pbXBvcnQgeyBlbnZpcm9uX2dldCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9nZXQuanNcIjtcclxuaW1wb3J0IHsgZW52aXJvbl9zaXplc19nZXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fc2l6ZXNfZ2V0LmpzXCI7XHJcbmltcG9ydCB7IGZkX2Nsb3NlIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9jbG9zZS5qc1wiO1xyXG5pbXBvcnQgeyBmZF9yZWFkIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9yZWFkLmpzXCI7XHJcbmltcG9ydCB7IGZkX3NlZWsgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3NlZWsuanNcIjtcclxuaW1wb3J0IHsgZmRfd3JpdGUgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3dyaXRlLmpzXCI7XHJcbmltcG9ydCB7IHByb2NfZXhpdCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvcHJvY19leGl0LmpzXCI7XHJcblxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgS25vd25JbnN0YW5jZUV4cG9ydHMge1xyXG4gICAgcHJpbnRUZXN0KCk6IG51bWJlcjtcclxuICAgIHJldmVyc2VJbnB1dCgpOiBudW1iZXI7XHJcbiAgICBnZXRSYW5kb21OdW1iZXIoKTogbnVtYmVyO1xyXG4gICAgZ2V0S2V5KCk6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlKHdoZXJlOiBzdHJpbmcsIHVuaW5zdGFudGlhdGVkPzogQXJyYXlCdWZmZXIpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8S25vd25JbnN0YW5jZUV4cG9ydHM+PiB7XHJcblxyXG4gICAgbGV0IHdhc20gPSBhd2FpdCBpPEtub3duSW5zdGFuY2VFeHBvcnRzPih1bmluc3RhbnRpYXRlZCA/PyBmZXRjaChuZXcgVVJMKFwid2FzbS53YXNtXCIsIGltcG9ydC5tZXRhLnVybCkpLCB7XHJcbiAgICAgICAgZW52OiB7XHJcbiAgICAgICAgICAgIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UsXHJcbiAgICAgICAgICAgIGVtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9ib29sLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCxcclxuICAgICAgICAgICAgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9hcnJheSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9lbnVtLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUsXHJcbiAgICAgICAgICAgIF9lbXZhbF90YWtlX3ZhbHVlLFxyXG4gICAgICAgICAgICBfZW12YWxfZGVjcmVmLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSxcclxuICAgICAgICAgICAgX3R6c2V0X2pzLFxyXG4gICAgICAgICAgICBzZWdmYXVsdCxcclxuICAgICAgICAgICAgYWxpZ25mYXVsdCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdhc2lfc25hcHNob3RfcHJldmlldzE6IHtcclxuICAgICAgICAgICAgZmRfY2xvc2UsXHJcbiAgICAgICAgICAgIGZkX3JlYWQsXHJcbiAgICAgICAgICAgIGZkX3NlZWssXHJcbiAgICAgICAgICAgIGZkX3dyaXRlLFxyXG4gICAgICAgICAgICBlbnZpcm9uX2dldCxcclxuICAgICAgICAgICAgZW52aXJvbl9zaXplc19nZXQsXHJcbiAgICAgICAgICAgIHByb2NfZXhpdCxcclxuICAgICAgICAgICAgY2xvY2tfdGltZV9nZXRcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICB3YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJmZF93cml0ZVwiLCBlID0+IHtcclxuICAgICAgICBpZiAoZS5kZXRhaWwuZmlsZURlc2NyaXB0b3IgPT0gMSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZS5hc1N0cmluZyhcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJHt3aGVyZX06ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHdhc207XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUVNLElBQU8sa0JBQVAsY0FBK0IsTUFBSztFQUN0QyxjQUFBO0FBQ0ksVUFBTSxpQkFBaUI7RUFDM0I7O0FBSUUsU0FBVSxhQUFVO0FBQ3RCLFFBQU0sSUFBSSxnQkFBZTtBQUM3Qjs7O0FDTkEsSUFBTSx3QkFBb0csb0JB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QSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0o7QUFBQSxJQUNBLHdCQUF3QjtBQUFBLE1BQ3BCO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0o7QUFBQSxFQUNKLENBQUM7QUFFRCxPQUFLLGlCQUFpQixZQUFZLE9BQUs7QUFDbkMsUUFBSSxFQUFFLE9BQU8sa0JBQWtCLEdBQUc7QUFDOUIsUUFBRSxlQUFlO0FBQ2pCLFlBQU0sUUFBUSxFQUFFLFNBQVMsT0FBTztBQUNoQyxjQUFRLElBQUksR0FBRyxLQUFLLEtBQUssS0FBSyxFQUFFO0FBQUEsSUFDcEM7QUFBQSxFQUNKLENBQUM7QUFFRCxTQUFPO0FBQ1g7IiwKICAibmFtZXMiOiBbImpzVmFsdWUiLCAid2lyZVZhbHVlIiwgInN0YWNrRGVzdHJ1Y3RvciIsICJwIiwgIkNsb2NrSWQiLCAiaW5zdGFudGlhdGUiXQp9Cg==
