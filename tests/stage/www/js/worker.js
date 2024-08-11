// node_modules/.pnpm/comlink@4.4.1/node_modules/comlink/dist/esm/comlink.mjs
var proxyMarker = Symbol("Comlink.proxy");
var createEndpoint = Symbol("Comlink.endpoint");
var releaseProxy = Symbol("Comlink.releaseProxy");
var finalizer = Symbol("Comlink.finalizer");
var throwMarker = Symbol("Comlink.thrown");
var isObject = (val) => typeof val === "object" && val !== null || typeof val === "function";
var proxyTransferHandler = {
  canHandle: (val) => isObject(val) && val[proxyMarker],
  serialize(obj) {
    const { port1, port2 } = new MessageChannel();
    expose(obj, port1);
    return [port2, [port2]];
  },
  deserialize(port) {
    port.start();
    return wrap(port);
  }
};
var throwTransferHandler = {
  canHandle: (value) => isObject(value) && throwMarker in value,
  serialize({ value }) {
    let serialized;
    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack
        }
      };
    } else {
      serialized = { isError: false, value };
    }
    return [serialized, []];
  },
  deserialize(serialized) {
    if (serialized.isError) {
      throw Object.assign(new Error(serialized.value.message), serialized.value);
    }
    throw serialized.value;
  }
};
var transferHandlers = /* @__PURE__ */ new Map([
  ["proxy", proxyTransferHandler],
  ["throw", throwTransferHandler]
]);
function isAllowedOrigin(allowedOrigins, origin) {
  for (const allowedOrigin of allowedOrigins) {
    if (origin === allowedOrigin || allowedOrigin === "*") {
      return true;
    }
    if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
      return true;
    }
  }
  return false;
}
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
  ep.addEventListener("message", function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }
    if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
      console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
      return;
    }
    const { id, type, path } = Object.assign({ path: [] }, ev.data);
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj2, prop) => obj2[prop], obj);
      const rawValue = path.reduce((obj2, prop) => obj2[prop], obj);
      switch (type) {
        case "GET":
          {
            returnValue = rawValue;
          }
          break;
        case "SET":
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;
        case "APPLY":
          {
            returnValue = rawValue.apply(parent, argumentList);
          }
          break;
        case "CONSTRUCT":
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        case "ENDPOINT":
          {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;
        case "RELEASE":
          {
            returnValue = void 0;
          }
          break;
        default:
          return;
      }
    } catch (value) {
      returnValue = { value, [throwMarker]: 0 };
    }
    Promise.resolve(returnValue).catch((value) => {
      return { value, [throwMarker]: 0 };
    }).then((returnValue2) => {
      const [wireValue, transferables] = toWireValue(returnValue2);
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
      if (type === "RELEASE") {
        ep.removeEventListener("message", callback);
        closeEndPoint(ep);
        if (finalizer in obj && typeof obj[finalizer] === "function") {
          obj[finalizer]();
        }
      }
    }).catch((error) => {
      const [wireValue, transferables] = toWireValue({
        value: new TypeError("Unserializable return value"),
        [throwMarker]: 0
      });
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
    });
  });
  if (ep.start) {
    ep.start();
  }
}
function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint))
    endpoint.close();
}
function wrap(ep, target) {
  return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}
function releaseEndpoint(ep) {
  return requestResponseMessage(ep, {
    type: "RELEASE"
  }).then(() => {
    closeEndPoint(ep);
  });
}
var proxyCounter = /* @__PURE__ */ new WeakMap();
var proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((ep) => {
  const newCount = (proxyCounter.get(ep) || 0) - 1;
  proxyCounter.set(ep, newCount);
  if (newCount === 0) {
    releaseEndpoint(ep);
  }
});
function registerProxy(proxy2, ep) {
  const newCount = (proxyCounter.get(ep) || 0) + 1;
  proxyCounter.set(ep, newCount);
  if (proxyFinalizers) {
    proxyFinalizers.register(proxy2, ep, proxy2);
  }
}
function unregisterProxy(proxy2) {
  if (proxyFinalizers) {
    proxyFinalizers.unregister(proxy2);
  }
}
function createProxy(ep, path = [], target = function() {
}) {
  let isProxyReleased = false;
  const proxy2 = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);
      if (prop === releaseProxy) {
        return () => {
          unregisterProxy(proxy2);
          releaseEndpoint(ep);
          isProxyReleased = true;
        };
      }
      if (prop === "then") {
        if (path.length === 0) {
          return { then: () => proxy2 };
        }
        const r = requestResponseMessage(ep, {
          type: "GET",
          path: path.map((p2) => p2.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(ep, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased);
      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, {
        type: "SET",
        path: [...path, prop].map((p2) => p2.toString()),
        value
      }, transferables).then(fromWireValue);
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];
      if (last === createEndpoint) {
        return requestResponseMessage(ep, {
          type: "ENDPOINT"
        }).then(fromWireValue);
      }
      if (last === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: "APPLY",
        path: path.map((p2) => p2.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: "CONSTRUCT",
        path: path.map((p2) => p2.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    }
  });
  registerProxy(proxy2, ep);
  return proxy2;
}
function myFlat(arr) {
  return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
  const processed = argumentList.map(toWireValue);
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
var transferCache = /* @__PURE__ */ new WeakMap();
function transfer(obj, transfers) {
  transferCache.set(obj, transfers);
  return obj;
}
function proxy(obj) {
  return Object.assign(obj, { [proxyMarker]: true });
}
function toWireValue(value) {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: "HANDLER",
          name,
          value: serializedValue
        },
        transferables
      ];
    }
  }
  return [
    {
      type: "RAW",
      value
    },
    transferCache.get(value) || []
  ];
}
function fromWireValue(value) {
  switch (value.type) {
    case "HANDLER":
      return transferHandlers.get(value.name).deserialize(value.value);
    case "RAW":
      return value.value;
  }
}
function requestResponseMessage(ep, msg, transfers) {
  return new Promise((resolve) => {
    const id = generateUUID();
    ep.addEventListener("message", function l(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }
      ep.removeEventListener("message", l);
      resolve(ev.data);
    });
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id }, msg), transfers);
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
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
async function instantiate(wasm2, unboundImports) {
  return await instantiateWasmGeneric(async (combinedImports) => {
    if (wasm2 instanceof WebAssembly.Module)
      return { module: wasm2, instance: await WebAssembly.instantiate(wasm2, { ...combinedImports }) };
    else if (wasm2 instanceof ArrayBuffer || ArrayBuffer.isView(wasm2))
      return await WebAssembly.instantiate(wasm2, { ...combinedImports });
    else if ("then" in wasm2 || "Response" in globalThis && wasm2 instanceof Response)
      return await WebAssembly.instantiateStreaming(wasm2, { ...combinedImports });
    else
      return await wasm2(combinedImports);
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
  let wasm2 = await instantiate(uninstantiated ?? fetch(new URL("wasm.wasm", import.meta.url)), {
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
  wasm2.addEventListener("fd_write", (e) => {
    if (e.detail.fileDescriptor == 1) {
      e.preventDefault();
      const value = e.asString("utf-8");
      console.log(`${where}: ${value}`);
    }
  });
  return wasm2;
}

// stage/worker.ts
var wasm = await instantiate2("Worker");
expose({
  execute(str) {
    return new Function("wasm", str)(wasm);
  }
});
/*! Bundled license information:

comlink/dist/esm/comlink.mjs:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL2NvbWxpbmtANC40LjEvbm9kZV9tb2R1bGVzL2NvbWxpbmsvc3JjL2NvbWxpbmsudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9hbGlnbmZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXR5cGUtaW5mby50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDMyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL3N0cmluZy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvaXMtNjQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcG9pbnRlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXBvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldy50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQxNi50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50MzIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92b2lkLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3NlZ2ZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9leGNlcHRpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3R6c2V0X2pzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9pbnN0YW50aWF0ZWQtd2FzaS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvaW5zdGFudGlhdGUtd2FzaS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvaW5zdGFudGlhdGUtd2FzbS50cyIsICIuLi8uLi8uLi8uLi9zcmMvaW5zdGFudGlhdGUudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vycm5vLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQ2NC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9jbG9ja190aW1lX2dldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX2dldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX3NpemVzX2dldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9jbG9zZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvaW92ZWMudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfcmVhZC50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9zZWVrLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3dyaXRlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL3Byb2NfZXhpdC50cyIsICIuLi8uLi9pbnN0YW50aWF0ZS50cyIsICIuLi8uLi93b3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG4gKi9cblxuaW1wb3J0IHtcbiAgRW5kcG9pbnQsXG4gIEV2ZW50U291cmNlLFxuICBNZXNzYWdlLFxuICBNZXNzYWdlVHlwZSxcbiAgUG9zdE1lc3NhZ2VXaXRoT3JpZ2luLFxuICBXaXJlVmFsdWUsXG4gIFdpcmVWYWx1ZVR5cGUsXG59IGZyb20gXCIuL3Byb3RvY29sXCI7XG5leHBvcnQgdHlwZSB7IEVuZHBvaW50IH07XG5cbmV4cG9ydCBjb25zdCBwcm94eU1hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsucHJveHlcIik7XG5leHBvcnQgY29uc3QgY3JlYXRlRW5kcG9pbnQgPSBTeW1ib2woXCJDb21saW5rLmVuZHBvaW50XCIpO1xuZXhwb3J0IGNvbnN0IHJlbGVhc2VQcm94eSA9IFN5bWJvbChcIkNvbWxpbmsucmVsZWFzZVByb3h5XCIpO1xuZXhwb3J0IGNvbnN0IGZpbmFsaXplciA9IFN5bWJvbChcIkNvbWxpbmsuZmluYWxpemVyXCIpO1xuXG5jb25zdCB0aHJvd01hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsudGhyb3duXCIpO1xuXG4vKipcbiAqIEludGVyZmFjZSBvZiB2YWx1ZXMgdGhhdCB3ZXJlIG1hcmtlZCB0byBiZSBwcm94aWVkIHdpdGggYGNvbWxpbmsucHJveHkoKWAuXG4gKiBDYW4gYWxzbyBiZSBpbXBsZW1lbnRlZCBieSBjbGFzc2VzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb3h5TWFya2VkIHtcbiAgW3Byb3h5TWFya2VyXTogdHJ1ZTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHR5cGUgYW5kIHdyYXBzIGl0IGluIGEgUHJvbWlzZSwgaWYgaXQgbm90IGFscmVhZHkgaXMgb25lLlxuICogVGhpcyBpcyB0byBhdm9pZCBgUHJvbWlzZTxQcm9taXNlPFQ+PmAuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgVW5wcm9taXNpZnk8VD5gLlxuICovXG50eXBlIFByb21pc2lmeTxUPiA9IFQgZXh0ZW5kcyBQcm9taXNlPHVua25vd24+ID8gVCA6IFByb21pc2U8VD47XG4vKipcbiAqIFRha2VzIGEgdHlwZSB0aGF0IG1heSBiZSBQcm9taXNlIGFuZCB1bndyYXBzIHRoZSBQcm9taXNlIHR5cGUuXG4gKiBJZiBgUGAgaXMgbm90IGEgUHJvbWlzZSwgaXQgcmV0dXJucyBgUGAuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUHJvbWlzaWZ5PFQ+YC5cbiAqL1xudHlwZSBVbnByb21pc2lmeTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IFA7XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIHByb3BlcnR5IGFuZCByZXR1cm5zIHRoZSB0eXBlIHRoYXQgaXMgdmlzaWJsZSB0byB0aGUgbG9jYWwgdGhyZWFkIG9uIHRoZSBwcm94eS5cbiAqXG4gKiBOb3RlOiBUaGlzIG5lZWRzIHRvIGJlIGl0cyBvd24gdHlwZSBhbGlhcywgb3RoZXJ3aXNlIGl0IHdpbGwgbm90IGRpc3RyaWJ1dGUgb3ZlciB1bmlvbnMuXG4gKiBTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svYWR2YW5jZWQtdHlwZXMuaHRtbCNkaXN0cmlidXRpdmUtY29uZGl0aW9uYWwtdHlwZXNcbiAqL1xudHlwZSBSZW1vdGVQcm9wZXJ0eTxUPiA9XG4gIC8vIElmIHRoZSB2YWx1ZSBpcyBhIG1ldGhvZCwgY29tbGluayB3aWxsIHByb3h5IGl0IGF1dG9tYXRpY2FsbHkuXG4gIC8vIE9iamVjdHMgYXJlIG9ubHkgcHJveGllZCBpZiB0aGV5IGFyZSBtYXJrZWQgdG8gYmUgcHJveGllZC5cbiAgLy8gT3RoZXJ3aXNlLCB0aGUgcHJvcGVydHkgaXMgY29udmVydGVkIHRvIGEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRoZSBjbG9uZWQgdmFsdWUuXG4gIFQgZXh0ZW5kcyBGdW5jdGlvbiB8IFByb3h5TWFya2VkID8gUmVtb3RlPFQ+IDogUHJvbWlzaWZ5PFQ+O1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHByb3BlcnR5IGFzIGEgcmVtb3RlIHRocmVhZCB3b3VsZCBzZWUgaXQgdGhyb3VnaCBhIHByb3h5IChlLmcuIHdoZW4gcGFzc2VkIGluIGFzIGEgZnVuY3Rpb25cbiAqIGFyZ3VtZW50KSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGF0IHRoZSBsb2NhbCB0aHJlYWQgaGFzIHRvIHN1cHBseS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnZlcnNlIG9mIGBSZW1vdGVQcm9wZXJ0eTxUPmAuXG4gKlxuICogTm90ZTogVGhpcyBuZWVkcyB0byBiZSBpdHMgb3duIHR5cGUgYWxpYXMsIG90aGVyd2lzZSBpdCB3aWxsIG5vdCBkaXN0cmlidXRlIG92ZXIgdW5pb25zLiBTZWVcbiAqIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL2FkdmFuY2VkLXR5cGVzLmh0bWwjZGlzdHJpYnV0aXZlLWNvbmRpdGlvbmFsLXR5cGVzXG4gKi9cbnR5cGUgTG9jYWxQcm9wZXJ0eTxUPiA9IFQgZXh0ZW5kcyBGdW5jdGlvbiB8IFByb3h5TWFya2VkXG4gID8gTG9jYWw8VD5cbiAgOiBVbnByb21pc2lmeTxUPjtcblxuLyoqXG4gKiBQcm94aWVzIGBUYCBpZiBpdCBpcyBhIGBQcm94eU1hcmtlZGAsIGNsb25lcyBpdCBvdGhlcndpc2UgKGFzIGhhbmRsZWQgYnkgc3RydWN0dXJlZCBjbG9uaW5nIGFuZCB0cmFuc2ZlciBoYW5kbGVycykuXG4gKi9cbmV4cG9ydCB0eXBlIFByb3h5T3JDbG9uZTxUPiA9IFQgZXh0ZW5kcyBQcm94eU1hcmtlZCA/IFJlbW90ZTxUPiA6IFQ7XG4vKipcbiAqIEludmVyc2Ugb2YgYFByb3h5T3JDbG9uZTxUPmAuXG4gKi9cbmV4cG9ydCB0eXBlIFVucHJveHlPckNsb25lPFQ+ID0gVCBleHRlbmRzIFJlbW90ZU9iamVjdDxQcm94eU1hcmtlZD5cbiAgPyBMb2NhbDxUPlxuICA6IFQ7XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIG9iamVjdCBpbiB0aGUgb3RoZXIgdGhyZWFkIGFuZCByZXR1cm5zIHRoZSB0eXBlIGFzIGl0IGlzIHZpc2libGUgdG8gdGhlIGxvY2FsIHRocmVhZFxuICogd2hlbiBwcm94aWVkIHdpdGggYENvbWxpbmsucHJveHkoKWAuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBoYW5kbGUgY2FsbCBzaWduYXR1cmVzLCB3aGljaCBpcyBoYW5kbGVkIGJ5IHRoZSBtb3JlIGdlbmVyYWwgYFJlbW90ZTxUPmAgdHlwZS5cbiAqXG4gKiBAdGVtcGxhdGUgVCBUaGUgcmF3IHR5cGUgb2YgYSByZW1vdGUgb2JqZWN0IGFzIHNlZW4gaW4gdGhlIG90aGVyIHRocmVhZC5cbiAqL1xuZXhwb3J0IHR5cGUgUmVtb3RlT2JqZWN0PFQ+ID0geyBbUCBpbiBrZXlvZiBUXTogUmVtb3RlUHJvcGVydHk8VFtQXT4gfTtcbi8qKlxuICogVGFrZXMgdGhlIHR5cGUgb2YgYW4gb2JqZWN0IGFzIGEgcmVtb3RlIHRocmVhZCB3b3VsZCBzZWUgaXQgdGhyb3VnaCBhIHByb3h5IChlLmcuIHdoZW4gcGFzc2VkIGluIGFzIGEgZnVuY3Rpb25cbiAqIGFyZ3VtZW50KSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGF0IHRoZSBsb2NhbCB0aHJlYWQgaGFzIHRvIHN1cHBseS5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IGhhbmRsZSBjYWxsIHNpZ25hdHVyZXMsIHdoaWNoIGlzIGhhbmRsZWQgYnkgdGhlIG1vcmUgZ2VuZXJhbCBgTG9jYWw8VD5gIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUmVtb3RlT2JqZWN0PFQ+YC5cbiAqXG4gKiBAdGVtcGxhdGUgVCBUaGUgdHlwZSBvZiBhIHByb3hpZWQgb2JqZWN0LlxuICovXG5leHBvcnQgdHlwZSBMb2NhbE9iamVjdDxUPiA9IHsgW1AgaW4ga2V5b2YgVF06IExvY2FsUHJvcGVydHk8VFtQXT4gfTtcblxuLyoqXG4gKiBBZGRpdGlvbmFsIHNwZWNpYWwgY29tbGluayBtZXRob2RzIGF2YWlsYWJsZSBvbiBlYWNoIHByb3h5IHJldHVybmVkIGJ5IGBDb21saW5rLndyYXAoKWAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJveHlNZXRob2RzIHtcbiAgW2NyZWF0ZUVuZHBvaW50XTogKCkgPT4gUHJvbWlzZTxNZXNzYWdlUG9ydD47XG4gIFtyZWxlYXNlUHJveHldOiAoKSA9PiB2b2lkO1xufVxuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBvYmplY3QsIGZ1bmN0aW9uIG9yIGNsYXNzIGluIHRoZSBvdGhlciB0aHJlYWQgYW5kIHJldHVybnMgdGhlIHR5cGUgYXMgaXQgaXMgdmlzaWJsZSB0b1xuICogdGhlIGxvY2FsIHRocmVhZCBmcm9tIHRoZSBwcm94eSByZXR1cm4gdmFsdWUgb2YgYENvbWxpbmsud3JhcCgpYCBvciBgQ29tbGluay5wcm94eSgpYC5cbiAqL1xuZXhwb3J0IHR5cGUgUmVtb3RlPFQ+ID1cbiAgLy8gSGFuZGxlIHByb3BlcnRpZXNcbiAgUmVtb3RlT2JqZWN0PFQ+ICZcbiAgICAvLyBIYW5kbGUgY2FsbCBzaWduYXR1cmUgKGlmIHByZXNlbnQpXG4gICAgKFQgZXh0ZW5kcyAoLi4uYXJnczogaW5mZXIgVEFyZ3VtZW50cykgPT4gaW5mZXIgVFJldHVyblxuICAgICAgPyAoXG4gICAgICAgICAgLi4uYXJnczogeyBbSSBpbiBrZXlvZiBUQXJndW1lbnRzXTogVW5wcm94eU9yQ2xvbmU8VEFyZ3VtZW50c1tJXT4gfVxuICAgICAgICApID0+IFByb21pc2lmeTxQcm94eU9yQ2xvbmU8VW5wcm9taXNpZnk8VFJldHVybj4+PlxuICAgICAgOiB1bmtub3duKSAmXG4gICAgLy8gSGFuZGxlIGNvbnN0cnVjdCBzaWduYXR1cmUgKGlmIHByZXNlbnQpXG4gICAgLy8gVGhlIHJldHVybiBvZiBjb25zdHJ1Y3Qgc2lnbmF0dXJlcyBpcyBhbHdheXMgcHJveGllZCAod2hldGhlciBtYXJrZWQgb3Igbm90KVxuICAgIChUIGV4dGVuZHMgeyBuZXcgKC4uLmFyZ3M6IGluZmVyIFRBcmd1bWVudHMpOiBpbmZlciBUSW5zdGFuY2UgfVxuICAgICAgPyB7XG4gICAgICAgICAgbmV3IChcbiAgICAgICAgICAgIC4uLmFyZ3M6IHtcbiAgICAgICAgICAgICAgW0kgaW4ga2V5b2YgVEFyZ3VtZW50c106IFVucHJveHlPckNsb25lPFRBcmd1bWVudHNbSV0+O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk6IFByb21pc2lmeTxSZW1vdGU8VEluc3RhbmNlPj47XG4gICAgICAgIH1cbiAgICAgIDogdW5rbm93bikgJlxuICAgIC8vIEluY2x1ZGUgYWRkaXRpb25hbCBzcGVjaWFsIGNvbWxpbmsgbWV0aG9kcyBhdmFpbGFibGUgb24gdGhlIHByb3h5LlxuICAgIFByb3h5TWV0aG9kcztcblxuLyoqXG4gKiBFeHByZXNzZXMgdGhhdCBhIHR5cGUgY2FuIGJlIGVpdGhlciBhIHN5bmMgb3IgYXN5bmMuXG4gKi9cbnR5cGUgTWF5YmVQcm9taXNlPFQ+ID0gUHJvbWlzZTxUPiB8IFQ7XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIG9iamVjdCwgZnVuY3Rpb24gb3IgY2xhc3MgYXMgYSByZW1vdGUgdGhyZWFkIHdvdWxkIHNlZSBpdCB0aHJvdWdoIGEgcHJveHkgKGUuZy4gd2hlblxuICogcGFzc2VkIGluIGFzIGEgZnVuY3Rpb24gYXJndW1lbnQpIGFuZCByZXR1cm5zIHRoZSB0eXBlIHRoZSBsb2NhbCB0aHJlYWQgaGFzIHRvIHN1cHBseS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnZlcnNlIG9mIGBSZW1vdGU8VD5gLiBJdCB0YWtlcyBhIGBSZW1vdGU8VD5gIGFuZCByZXR1cm5zIGl0cyBvcmlnaW5hbCBpbnB1dCBgVGAuXG4gKi9cbmV4cG9ydCB0eXBlIExvY2FsPFQ+ID1cbiAgLy8gT21pdCB0aGUgc3BlY2lhbCBwcm94eSBtZXRob2RzICh0aGV5IGRvbid0IG5lZWQgdG8gYmUgc3VwcGxpZWQsIGNvbWxpbmsgYWRkcyB0aGVtKVxuICBPbWl0PExvY2FsT2JqZWN0PFQ+LCBrZXlvZiBQcm94eU1ldGhvZHM+ICZcbiAgICAvLyBIYW5kbGUgY2FsbCBzaWduYXR1cmVzIChpZiBwcmVzZW50KVxuICAgIChUIGV4dGVuZHMgKC4uLmFyZ3M6IGluZmVyIFRBcmd1bWVudHMpID0+IGluZmVyIFRSZXR1cm5cbiAgICAgID8gKFxuICAgICAgICAgIC4uLmFyZ3M6IHsgW0kgaW4ga2V5b2YgVEFyZ3VtZW50c106IFByb3h5T3JDbG9uZTxUQXJndW1lbnRzW0ldPiB9XG4gICAgICAgICkgPT4gLy8gVGhlIHJhdyBmdW5jdGlvbiBjb3VsZCBlaXRoZXIgYmUgc3luYyBvciBhc3luYywgYnV0IGlzIGFsd2F5cyBwcm94aWVkIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgTWF5YmVQcm9taXNlPFVucHJveHlPckNsb25lPFVucHJvbWlzaWZ5PFRSZXR1cm4+Pj5cbiAgICAgIDogdW5rbm93bikgJlxuICAgIC8vIEhhbmRsZSBjb25zdHJ1Y3Qgc2lnbmF0dXJlIChpZiBwcmVzZW50KVxuICAgIC8vIFRoZSByZXR1cm4gb2YgY29uc3RydWN0IHNpZ25hdHVyZXMgaXMgYWx3YXlzIHByb3hpZWQgKHdoZXRoZXIgbWFya2VkIG9yIG5vdClcbiAgICAoVCBleHRlbmRzIHsgbmV3ICguLi5hcmdzOiBpbmZlciBUQXJndW1lbnRzKTogaW5mZXIgVEluc3RhbmNlIH1cbiAgICAgID8ge1xuICAgICAgICAgIG5ldyAoXG4gICAgICAgICAgICAuLi5hcmdzOiB7XG4gICAgICAgICAgICAgIFtJIGluIGtleW9mIFRBcmd1bWVudHNdOiBQcm94eU9yQ2xvbmU8VEFyZ3VtZW50c1tJXT47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTogLy8gVGhlIHJhdyBjb25zdHJ1Y3RvciBjb3VsZCBlaXRoZXIgYmUgc3luYyBvciBhc3luYywgYnV0IGlzIGFsd2F5cyBwcm94aWVkIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICBNYXliZVByb21pc2U8TG9jYWw8VW5wcm9taXNpZnk8VEluc3RhbmNlPj4+O1xuICAgICAgICB9XG4gICAgICA6IHVua25vd24pO1xuXG5jb25zdCBpc09iamVjdCA9ICh2YWw6IHVua25vd24pOiB2YWwgaXMgb2JqZWN0ID0+XG4gICh0eXBlb2YgdmFsID09PSBcIm9iamVjdFwiICYmIHZhbCAhPT0gbnVsbCkgfHwgdHlwZW9mIHZhbCA9PT0gXCJmdW5jdGlvblwiO1xuXG4vKipcbiAqIEN1c3RvbWl6ZXMgdGhlIHNlcmlhbGl6YXRpb24gb2YgY2VydGFpbiB2YWx1ZXMgYXMgZGV0ZXJtaW5lZCBieSBgY2FuSGFuZGxlKClgLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIFRoZSBpbnB1dCB0eXBlIGJlaW5nIGhhbmRsZWQgYnkgdGhpcyB0cmFuc2ZlciBoYW5kbGVyLlxuICogQHRlbXBsYXRlIFMgVGhlIHNlcmlhbGl6ZWQgdHlwZSBzZW50IG92ZXIgdGhlIHdpcmUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmZXJIYW5kbGVyPFQsIFM+IHtcbiAgLyoqXG4gICAqIEdldHMgY2FsbGVkIGZvciBldmVyeSB2YWx1ZSB0byBkZXRlcm1pbmUgd2hldGhlciB0aGlzIHRyYW5zZmVyIGhhbmRsZXJcbiAgICogc2hvdWxkIHNlcmlhbGl6ZSB0aGUgdmFsdWUsIHdoaWNoIGluY2x1ZGVzIGNoZWNraW5nIHRoYXQgaXQgaXMgb2YgdGhlIHJpZ2h0XG4gICAqIHR5cGUgKGJ1dCBjYW4gcGVyZm9ybSBjaGVja3MgYmV5b25kIHRoYXQgYXMgd2VsbCkuXG4gICAqL1xuICBjYW5IYW5kbGUodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBUO1xuXG4gIC8qKlxuICAgKiBHZXRzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZSBpZiBgY2FuSGFuZGxlKClgIHJldHVybmVkIGB0cnVlYCB0byBwcm9kdWNlIGFcbiAgICogdmFsdWUgdGhhdCBjYW4gYmUgc2VudCBpbiBhIG1lc3NhZ2UsIGNvbnNpc3Rpbmcgb2Ygc3RydWN0dXJlZC1jbG9uZWFibGVcbiAgICogdmFsdWVzIGFuZC9vciB0cmFuc2ZlcnJhYmxlIG9iamVjdHMuXG4gICAqL1xuICBzZXJpYWxpemUodmFsdWU6IFQpOiBbUywgVHJhbnNmZXJhYmxlW11dO1xuXG4gIC8qKlxuICAgKiBHZXRzIGNhbGxlZCB0byBkZXNlcmlhbGl6ZSBhbiBpbmNvbWluZyB2YWx1ZSB0aGF0IHdhcyBzZXJpYWxpemVkIGluIHRoZVxuICAgKiBvdGhlciB0aHJlYWQgd2l0aCB0aGlzIHRyYW5zZmVyIGhhbmRsZXIgKGtub3duIHRocm91Z2ggdGhlIG5hbWUgaXQgd2FzXG4gICAqIHJlZ2lzdGVyZWQgdW5kZXIpLlxuICAgKi9cbiAgZGVzZXJpYWxpemUodmFsdWU6IFMpOiBUO1xufVxuXG4vKipcbiAqIEludGVybmFsIHRyYW5zZmVyIGhhbmRsZSB0byBoYW5kbGUgb2JqZWN0cyBtYXJrZWQgdG8gcHJveHkuXG4gKi9cbmNvbnN0IHByb3h5VHJhbnNmZXJIYW5kbGVyOiBUcmFuc2ZlckhhbmRsZXI8b2JqZWN0LCBNZXNzYWdlUG9ydD4gPSB7XG4gIGNhbkhhbmRsZTogKHZhbCk6IHZhbCBpcyBQcm94eU1hcmtlZCA9PlxuICAgIGlzT2JqZWN0KHZhbCkgJiYgKHZhbCBhcyBQcm94eU1hcmtlZClbcHJveHlNYXJrZXJdLFxuICBzZXJpYWxpemUob2JqKSB7XG4gICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIGV4cG9zZShvYmosIHBvcnQxKTtcbiAgICByZXR1cm4gW3BvcnQyLCBbcG9ydDJdXTtcbiAgfSxcbiAgZGVzZXJpYWxpemUocG9ydCkge1xuICAgIHBvcnQuc3RhcnQoKTtcbiAgICByZXR1cm4gd3JhcChwb3J0KTtcbiAgfSxcbn07XG5cbmludGVyZmFjZSBUaHJvd25WYWx1ZSB7XG4gIFt0aHJvd01hcmtlcl06IHVua25vd247IC8vIGp1c3QgbmVlZHMgdG8gYmUgcHJlc2VudFxuICB2YWx1ZTogdW5rbm93bjtcbn1cbnR5cGUgU2VyaWFsaXplZFRocm93blZhbHVlID1cbiAgfCB7IGlzRXJyb3I6IHRydWU7IHZhbHVlOiBFcnJvciB9XG4gIHwgeyBpc0Vycm9yOiBmYWxzZTsgdmFsdWU6IHVua25vd24gfTtcblxuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGVyIHRvIGhhbmRsZSB0aHJvd24gZXhjZXB0aW9ucy5cbiAqL1xuY29uc3QgdGhyb3dUcmFuc2ZlckhhbmRsZXI6IFRyYW5zZmVySGFuZGxlcjxcbiAgVGhyb3duVmFsdWUsXG4gIFNlcmlhbGl6ZWRUaHJvd25WYWx1ZVxuPiA9IHtcbiAgY2FuSGFuZGxlOiAodmFsdWUpOiB2YWx1ZSBpcyBUaHJvd25WYWx1ZSA9PlxuICAgIGlzT2JqZWN0KHZhbHVlKSAmJiB0aHJvd01hcmtlciBpbiB2YWx1ZSxcbiAgc2VyaWFsaXplKHsgdmFsdWUgfSkge1xuICAgIGxldCBzZXJpYWxpemVkOiBTZXJpYWxpemVkVGhyb3duVmFsdWU7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIHNlcmlhbGl6ZWQgPSB7XG4gICAgICAgIGlzRXJyb3I6IHRydWUsXG4gICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgbWVzc2FnZTogdmFsdWUubWVzc2FnZSxcbiAgICAgICAgICBuYW1lOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgIHN0YWNrOiB2YWx1ZS5zdGFjayxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlcmlhbGl6ZWQgPSB7IGlzRXJyb3I6IGZhbHNlLCB2YWx1ZSB9O1xuICAgIH1cbiAgICByZXR1cm4gW3NlcmlhbGl6ZWQsIFtdXTtcbiAgfSxcbiAgZGVzZXJpYWxpemUoc2VyaWFsaXplZCkge1xuICAgIGlmIChzZXJpYWxpemVkLmlzRXJyb3IpIHtcbiAgICAgIHRocm93IE9iamVjdC5hc3NpZ24oXG4gICAgICAgIG5ldyBFcnJvcihzZXJpYWxpemVkLnZhbHVlLm1lc3NhZ2UpLFxuICAgICAgICBzZXJpYWxpemVkLnZhbHVlXG4gICAgICApO1xuICAgIH1cbiAgICB0aHJvdyBzZXJpYWxpemVkLnZhbHVlO1xuICB9LFxufTtcblxuLyoqXG4gKiBBbGxvd3MgY3VzdG9taXppbmcgdGhlIHNlcmlhbGl6YXRpb24gb2YgY2VydGFpbiB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB0cmFuc2ZlckhhbmRsZXJzID0gbmV3IE1hcDxcbiAgc3RyaW5nLFxuICBUcmFuc2ZlckhhbmRsZXI8dW5rbm93biwgdW5rbm93bj5cbj4oW1xuICBbXCJwcm94eVwiLCBwcm94eVRyYW5zZmVySGFuZGxlcl0sXG4gIFtcInRocm93XCIsIHRocm93VHJhbnNmZXJIYW5kbGVyXSxcbl0pO1xuXG5mdW5jdGlvbiBpc0FsbG93ZWRPcmlnaW4oXG4gIGFsbG93ZWRPcmlnaW5zOiAoc3RyaW5nIHwgUmVnRXhwKVtdLFxuICBvcmlnaW46IHN0cmluZ1xuKTogYm9vbGVhbiB7XG4gIGZvciAoY29uc3QgYWxsb3dlZE9yaWdpbiBvZiBhbGxvd2VkT3JpZ2lucykge1xuICAgIGlmIChvcmlnaW4gPT09IGFsbG93ZWRPcmlnaW4gfHwgYWxsb3dlZE9yaWdpbiA9PT0gXCIqXCIpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoYWxsb3dlZE9yaWdpbiBpbnN0YW5jZW9mIFJlZ0V4cCAmJiBhbGxvd2VkT3JpZ2luLnRlc3Qob3JpZ2luKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4cG9zZShcbiAgb2JqOiBhbnksXG4gIGVwOiBFbmRwb2ludCA9IGdsb2JhbFRoaXMgYXMgYW55LFxuICBhbGxvd2VkT3JpZ2luczogKHN0cmluZyB8IFJlZ0V4cClbXSA9IFtcIipcIl1cbikge1xuICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBjYWxsYmFjayhldjogTWVzc2FnZUV2ZW50KSB7XG4gICAgaWYgKCFldiB8fCAhZXYuZGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWlzQWxsb3dlZE9yaWdpbihhbGxvd2VkT3JpZ2lucywgZXYub3JpZ2luKSkge1xuICAgICAgY29uc29sZS53YXJuKGBJbnZhbGlkIG9yaWdpbiAnJHtldi5vcmlnaW59JyBmb3IgY29tbGluayBwcm94eWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7IGlkLCB0eXBlLCBwYXRoIH0gPSB7XG4gICAgICBwYXRoOiBbXSBhcyBzdHJpbmdbXSxcbiAgICAgIC4uLihldi5kYXRhIGFzIE1lc3NhZ2UpLFxuICAgIH07XG4gICAgY29uc3QgYXJndW1lbnRMaXN0ID0gKGV2LmRhdGEuYXJndW1lbnRMaXN0IHx8IFtdKS5tYXAoZnJvbVdpcmVWYWx1ZSk7XG4gICAgbGV0IHJldHVyblZhbHVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLnNsaWNlKDAsIC0xKS5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgY29uc3QgcmF3VmFsdWUgPSBwYXRoLnJlZHVjZSgob2JqLCBwcm9wKSA9PiBvYmpbcHJvcF0sIG9iaik7XG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5HRVQ6XG4gICAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuU0VUOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHBhcmVudFtwYXRoLnNsaWNlKC0xKVswXV0gPSBmcm9tV2lyZVZhbHVlKGV2LmRhdGEudmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5BUFBMWTpcbiAgICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHJhd1ZhbHVlLmFwcGx5KHBhcmVudCwgYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuQ09OU1RSVUNUOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbmV3IHJhd1ZhbHVlKC4uLmFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHByb3h5KHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuRU5EUE9JTlQ6XG4gICAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICAgICAgZXhwb3NlKG9iaiwgcG9ydDIpO1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cmFuc2Zlcihwb3J0MSwgW3BvcnQxXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLlJFTEVBU0U6XG4gICAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGNhdGNoICh2YWx1ZSkge1xuICAgICAgcmV0dXJuVmFsdWUgPSB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgfVxuICAgIFByb21pc2UucmVzb2x2ZShyZXR1cm5WYWx1ZSlcbiAgICAgIC5jYXRjaCgodmFsdWUpID0+IHtcbiAgICAgICAgcmV0dXJuIHsgdmFsdWUsIFt0aHJvd01hcmtlcl06IDAgfTtcbiAgICAgIH0pXG4gICAgICAudGhlbigocmV0dXJuVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyZXR1cm5WYWx1ZSk7XG4gICAgICAgIGVwLnBvc3RNZXNzYWdlKHsgLi4ud2lyZVZhbHVlLCBpZCB9LCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgaWYgKHR5cGUgPT09IE1lc3NhZ2VUeXBlLlJFTEVBU0UpIHtcbiAgICAgICAgICAvLyBkZXRhY2ggYW5kIGRlYWN0aXZlIGFmdGVyIHNlbmRpbmcgcmVsZWFzZSByZXNwb25zZSBhYm92ZS5cbiAgICAgICAgICBlcC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYWxsYmFjayBhcyBhbnkpO1xuICAgICAgICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICAgICAgICAgIGlmIChmaW5hbGl6ZXIgaW4gb2JqICYmIHR5cGVvZiBvYmpbZmluYWxpemVyXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvYmpbZmluYWxpemVyXSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgLy8gU2VuZCBTZXJpYWxpemF0aW9uIEVycm9yIFRvIENhbGxlclxuICAgICAgICBjb25zdCBbd2lyZVZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHtcbiAgICAgICAgICB2YWx1ZTogbmV3IFR5cGVFcnJvcihcIlVuc2VyaWFsaXphYmxlIHJldHVybiB2YWx1ZVwiKSxcbiAgICAgICAgICBbdGhyb3dNYXJrZXJdOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgZXAucG9zdE1lc3NhZ2UoeyAuLi53aXJlVmFsdWUsIGlkIH0sIHRyYW5zZmVyYWJsZXMpO1xuICAgICAgfSk7XG4gIH0gYXMgYW55KTtcbiAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgZXAuc3RhcnQoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc01lc3NhZ2VQb3J0KGVuZHBvaW50OiBFbmRwb2ludCk6IGVuZHBvaW50IGlzIE1lc3NhZ2VQb3J0IHtcbiAgcmV0dXJuIGVuZHBvaW50LmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTWVzc2FnZVBvcnRcIjtcbn1cblxuZnVuY3Rpb24gY2xvc2VFbmRQb2ludChlbmRwb2ludDogRW5kcG9pbnQpIHtcbiAgaWYgKGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQpKSBlbmRwb2ludC5jbG9zZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JhcDxUPihlcDogRW5kcG9pbnQsIHRhcmdldD86IGFueSk6IFJlbW90ZTxUPiB7XG4gIHJldHVybiBjcmVhdGVQcm94eTxUPihlcCwgW10sIHRhcmdldCkgYXMgYW55O1xufVxuXG5mdW5jdGlvbiB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1JlbGVhc2VkOiBib29sZWFuKSB7XG4gIGlmIChpc1JlbGVhc2VkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUHJveHkgaGFzIGJlZW4gcmVsZWFzZWQgYW5kIGlzIG5vdCB1c2VhYmxlXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbGVhc2VFbmRwb2ludChlcDogRW5kcG9pbnQpIHtcbiAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICB0eXBlOiBNZXNzYWdlVHlwZS5SRUxFQVNFLFxuICB9KS50aGVuKCgpID0+IHtcbiAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgfSk7XG59XG5cbmludGVyZmFjZSBGaW5hbGl6YXRpb25SZWdpc3RyeTxUPiB7XG4gIG5ldyAoY2I6IChoZWxkVmFsdWU6IFQpID0+IHZvaWQpOiBGaW5hbGl6YXRpb25SZWdpc3RyeTxUPjtcbiAgcmVnaXN0ZXIoXG4gICAgd2Vha0l0ZW06IG9iamVjdCxcbiAgICBoZWxkVmFsdWU6IFQsXG4gICAgdW5yZWdpc3RlclRva2VuPzogb2JqZWN0IHwgdW5kZWZpbmVkXG4gICk6IHZvaWQ7XG4gIHVucmVnaXN0ZXIodW5yZWdpc3RlclRva2VuOiBvYmplY3QpOiB2b2lkO1xufVxuZGVjbGFyZSB2YXIgRmluYWxpemF0aW9uUmVnaXN0cnk6IEZpbmFsaXphdGlvblJlZ2lzdHJ5PEVuZHBvaW50PjtcblxuY29uc3QgcHJveHlDb3VudGVyID0gbmV3IFdlYWtNYXA8RW5kcG9pbnQsIG51bWJlcj4oKTtcbmNvbnN0IHByb3h5RmluYWxpemVycyA9XG4gIFwiRmluYWxpemF0aW9uUmVnaXN0cnlcIiBpbiBnbG9iYWxUaGlzICYmXG4gIG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoZXA6IEVuZHBvaW50KSA9PiB7XG4gICAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgLSAxO1xuICAgIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgICBpZiAobmV3Q291bnQgPT09IDApIHtcbiAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgfVxuICB9KTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJQcm94eShwcm94eTogb2JqZWN0LCBlcDogRW5kcG9pbnQpIHtcbiAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgKyAxO1xuICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICBwcm94eUZpbmFsaXplcnMucmVnaXN0ZXIocHJveHksIGVwLCBwcm94eSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdW5yZWdpc3RlclByb3h5KHByb3h5OiBvYmplY3QpIHtcbiAgaWYgKHByb3h5RmluYWxpemVycykge1xuICAgIHByb3h5RmluYWxpemVycy51bnJlZ2lzdGVyKHByb3h5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVQcm94eTxUPihcbiAgZXA6IEVuZHBvaW50LFxuICBwYXRoOiAoc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sKVtdID0gW10sXG4gIHRhcmdldDogb2JqZWN0ID0gZnVuY3Rpb24gKCkge31cbik6IFJlbW90ZTxUPiB7XG4gIGxldCBpc1Byb3h5UmVsZWFzZWQgPSBmYWxzZTtcbiAgY29uc3QgcHJveHkgPSBuZXcgUHJveHkodGFyZ2V0LCB7XG4gICAgZ2V0KF90YXJnZXQsIHByb3ApIHtcbiAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICBpZiAocHJvcCA9PT0gcmVsZWFzZVByb3h5KSB7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgdW5yZWdpc3RlclByb3h5KHByb3h5KTtcbiAgICAgICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgICAgICAgIGlzUHJveHlSZWxlYXNlZCA9IHRydWU7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAocHJvcCA9PT0gXCJ0aGVuXCIpIHtcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHsgdGhlbjogKCkgPT4gcHJveHkgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByID0gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLkdFVCxcbiAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHIudGhlbi5iaW5kKHIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBbLi4ucGF0aCwgcHJvcF0pO1xuICAgIH0sXG4gICAgc2V0KF90YXJnZXQsIHByb3AsIHJhd1ZhbHVlKSB7XG4gICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgLy8gRklYTUU6IEVTNiBQcm94eSBIYW5kbGVyIGBzZXRgIG1ldGhvZHMgYXJlIHN1cHBvc2VkIHRvIHJldHVybiBhXG4gICAgICAvLyBib29sZWFuLiBUbyBzaG93IGdvb2Qgd2lsbCwgd2UgcmV0dXJuIHRydWUgYXN5bmNocm9ub3VzbHkgXHUwMEFGXFxfKFx1MzBDNClfL1x1MDBBRlxuICAgICAgY29uc3QgW3ZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHJhd1ZhbHVlKTtcbiAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKFxuICAgICAgICBlcCxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLlNFVCxcbiAgICAgICAgICBwYXRoOiBbLi4ucGF0aCwgcHJvcF0ubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzXG4gICAgICApLnRoZW4oZnJvbVdpcmVWYWx1ZSkgYXMgYW55O1xuICAgIH0sXG4gICAgYXBwbHkoX3RhcmdldCwgX3RoaXNBcmcsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgIGNvbnN0IGxhc3QgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoKGxhc3QgYXMgYW55KSA9PT0gY3JlYXRlRW5kcG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5FTkRQT0lOVCxcbiAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgIH1cbiAgICAgIC8vIFdlIGp1c3QgcHJldGVuZCB0aGF0IGBiaW5kKClgIGRpZG5cdTIwMTl0IGhhcHBlbi5cbiAgICAgIGlmIChsYXN0ID09PSBcImJpbmRcIikge1xuICAgICAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIHBhdGguc2xpY2UoMCwgLTEpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoXG4gICAgICAgIGVwLFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuQVBQTFksXG4gICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzXG4gICAgICApLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgfSxcbiAgICBjb25zdHJ1Y3QoX3RhcmdldCwgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgY29uc3QgW2FyZ3VtZW50TGlzdCwgdHJhbnNmZXJhYmxlc10gPSBwcm9jZXNzQXJndW1lbnRzKHJhd0FyZ3VtZW50TGlzdCk7XG4gICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShcbiAgICAgICAgZXAsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5DT05TVFJVQ1QsXG4gICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzXG4gICAgICApLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgfSxcbiAgfSk7XG4gIHJlZ2lzdGVyUHJveHkocHJveHksIGVwKTtcbiAgcmV0dXJuIHByb3h5IGFzIGFueTtcbn1cblxuZnVuY3Rpb24gbXlGbGF0PFQ+KGFycjogKFQgfCBUW10pW10pOiBUW10ge1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgYXJyKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc0FyZ3VtZW50cyhhcmd1bWVudExpc3Q6IGFueVtdKTogW1dpcmVWYWx1ZVtdLCBUcmFuc2ZlcmFibGVbXV0ge1xuICBjb25zdCBwcm9jZXNzZWQgPSBhcmd1bWVudExpc3QubWFwKHRvV2lyZVZhbHVlKTtcbiAgcmV0dXJuIFtwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzBdKSwgbXlGbGF0KHByb2Nlc3NlZC5tYXAoKHYpID0+IHZbMV0pKV07XG59XG5cbmNvbnN0IHRyYW5zZmVyQ2FjaGUgPSBuZXcgV2Vha01hcDxhbnksIFRyYW5zZmVyYWJsZVtdPigpO1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZmVyPFQ+KG9iajogVCwgdHJhbnNmZXJzOiBUcmFuc2ZlcmFibGVbXSk6IFQge1xuICB0cmFuc2ZlckNhY2hlLnNldChvYmosIHRyYW5zZmVycyk7XG4gIHJldHVybiBvYmo7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm94eTxUIGV4dGVuZHMge30+KG9iajogVCk6IFQgJiBQcm94eU1hcmtlZCB7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgeyBbcHJveHlNYXJrZXJdOiB0cnVlIH0pIGFzIGFueTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpbmRvd0VuZHBvaW50KFxuICB3OiBQb3N0TWVzc2FnZVdpdGhPcmlnaW4sXG4gIGNvbnRleHQ6IEV2ZW50U291cmNlID0gZ2xvYmFsVGhpcyxcbiAgdGFyZ2V0T3JpZ2luID0gXCIqXCJcbik6IEVuZHBvaW50IHtcbiAgcmV0dXJuIHtcbiAgICBwb3N0TWVzc2FnZTogKG1zZzogYW55LCB0cmFuc2ZlcmFibGVzOiBUcmFuc2ZlcmFibGVbXSkgPT5cbiAgICAgIHcucG9zdE1lc3NhZ2UobXNnLCB0YXJnZXRPcmlnaW4sIHRyYW5zZmVyYWJsZXMpLFxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGNvbnRleHQucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICB9O1xufVxuXG5mdW5jdGlvbiB0b1dpcmVWYWx1ZSh2YWx1ZTogYW55KTogW1dpcmVWYWx1ZSwgVHJhbnNmZXJhYmxlW11dIHtcbiAgZm9yIChjb25zdCBbbmFtZSwgaGFuZGxlcl0gb2YgdHJhbnNmZXJIYW5kbGVycykge1xuICAgIGlmIChoYW5kbGVyLmNhbkhhbmRsZSh2YWx1ZSkpIHtcbiAgICAgIGNvbnN0IFtzZXJpYWxpemVkVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gaGFuZGxlci5zZXJpYWxpemUodmFsdWUpO1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IFdpcmVWYWx1ZVR5cGUuSEFORExFUixcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIHZhbHVlOiBzZXJpYWxpemVkVmFsdWUsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyYWJsZXMsXG4gICAgICBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIHR5cGU6IFdpcmVWYWx1ZVR5cGUuUkFXLFxuICAgICAgdmFsdWUsXG4gICAgfSxcbiAgICB0cmFuc2ZlckNhY2hlLmdldCh2YWx1ZSkgfHwgW10sXG4gIF07XG59XG5cbmZ1bmN0aW9uIGZyb21XaXJlVmFsdWUodmFsdWU6IFdpcmVWYWx1ZSk6IGFueSB7XG4gIHN3aXRjaCAodmFsdWUudHlwZSkge1xuICAgIGNhc2UgV2lyZVZhbHVlVHlwZS5IQU5ETEVSOlxuICAgICAgcmV0dXJuIHRyYW5zZmVySGFuZGxlcnMuZ2V0KHZhbHVlLm5hbWUpIS5kZXNlcmlhbGl6ZSh2YWx1ZS52YWx1ZSk7XG4gICAgY2FzZSBXaXJlVmFsdWVUeXBlLlJBVzpcbiAgICAgIHJldHVybiB2YWx1ZS52YWx1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKFxuICBlcDogRW5kcG9pbnQsXG4gIG1zZzogTWVzc2FnZSxcbiAgdHJhbnNmZXJzPzogVHJhbnNmZXJhYmxlW11cbik6IFByb21pc2U8V2lyZVZhbHVlPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGlkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gbChldjogTWVzc2FnZUV2ZW50KSB7XG4gICAgICBpZiAoIWV2LmRhdGEgfHwgIWV2LmRhdGEuaWQgfHwgZXYuZGF0YS5pZCAhPT0gaWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbCBhcyBhbnkpO1xuICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICB9IGFzIGFueSk7XG4gICAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgICBlcC5zdGFydCgpO1xuICAgIH1cbiAgICBlcC5wb3N0TWVzc2FnZSh7IGlkLCAuLi5tc2cgfSwgdHJhbnNmZXJzKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpOiBzdHJpbmcge1xuICByZXR1cm4gbmV3IEFycmF5KDQpXG4gICAgLmZpbGwoMClcbiAgICAubWFwKCgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKS50b1N0cmluZygxNikpXG4gICAgLmpvaW4oXCItXCIpO1xufVxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBBbGlnbmZhdWx0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcihcIkFsaWdubWVudCBmYXVsdFwiKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gVXNlZCBieSBTQUZFX0hFQVBcclxuZXhwb3J0IGZ1bmN0aW9uIGFsaWduZmF1bHQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4pOiBuZXZlciB7XHJcbiAgICB0aHJvdyBuZXcgQWxpZ25mYXVsdEVycm9yKCk7XHJcbn1cclxuIiwgImltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgVHlwZUlEIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxUPiBleHRlbmRzIFByb21pc2VXaXRoUmVzb2x2ZXJzPFQ+IHtcclxuICAgIHJlc29sdmVkVmFsdWU6IFQ7XHJcbn1cclxuY29uc3QgRGVwZW5kZW5jaWVzVG9XYWl0Rm9yOiBNYXA8VHlwZUlELCBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4+PiA9IG5ldyBNYXA8VHlwZUlELCBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4+PigpO1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIHBhcnNlZCB0eXBlIGluZm8sIGNvbnZlcnRlcnMsIGV0Yy4gZm9yIHRoZSBnaXZlbiBDKysgUlRUSSBUeXBlSUQgcG9pbnRlci5cclxuICpcclxuICogUGFzc2luZyBhIG51bGwgdHlwZSBJRCBpcyBmaW5lIGFuZCB3aWxsIGp1c3QgcmVzdWx0IGluIGEgYG51bGxgIGF0IHRoYXQgc3BvdCBpbiB0aGUgcmV0dXJuZWQgYXJyYXkuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VHlwZUluZm88RSBleHRlbmRzIChFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+IHwgbnVsbCB8IHVuZGVmaW5lZClbXT4oLi4udHlwZUlkczogbnVtYmVyW10pOiBQcm9taXNlPEU+IHtcclxuXHJcbiAgICByZXR1cm4gYXdhaXQgUHJvbWlzZS5hbGw8Tm9uTnVsbGFibGU8RVtudW1iZXJdPj4odHlwZUlkcy5tYXAoYXN5bmMgKHR5cGVJZCk6IFByb21pc2U8Tm9uTnVsbGFibGU8RVtudW1iZXJdPj4gPT4ge1xyXG4gICAgICAgIGlmICghdHlwZUlkKVxyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwhKTtcclxuXHJcbiAgICAgICAgbGV0IHdpdGhSZXNvbHZlcnMgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXJzKHR5cGVJZCk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0ICh3aXRoUmVzb2x2ZXJzLnByb21pc2UgYXMgUHJvbWlzZTxOb25OdWxsYWJsZTxFW251bWJlcl0+Pik7XHJcbiAgICB9KSkgYXMgYW55O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVwZW5kZW5jeVJlc29sdmVycyh0eXBlSWQ6IG51bWJlcik6IFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4ge1xyXG4gICAgbGV0IHdpdGhSZXNvbHZlcnMgPSBEZXBlbmRlbmNpZXNUb1dhaXRGb3IuZ2V0KHR5cGVJZCk7XHJcbiAgICBpZiAod2l0aFJlc29sdmVycyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgIERlcGVuZGVuY2llc1RvV2FpdEZvci5zZXQodHlwZUlkLCB3aXRoUmVzb2x2ZXJzID0geyByZXNvbHZlZFZhbHVlOiB1bmRlZmluZWQhLCAuLi5Qcm9taXNlLndpdGhSZXNvbHZlcnM8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4oKSB9KTtcclxuICAgIHJldHVybiB3aXRoUmVzb2x2ZXJzO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGdldERlcGVuZGVuY3lSZXNvbHZlcnMgfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZVR5cGVzIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBDb252ZW5pZW5jZSBmdW5jdGlvbiB0byBzZXQgYSB2YWx1ZSBvbiB0aGUgYGVtYmluZGAgb2JqZWN0LiAgTm90IHN0cmljdGx5IG5lY2Vzc2FyeSB0byBjYWxsLlxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIG5hbWUgXHJcbiAqIEBwYXJhbSB2YWx1ZSBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckVtYm91bmQ8VD4oaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIG5hbWU6IHN0cmluZywgdmFsdWU6IFQpOiB2b2lkIHtcclxuICAgIChpbXBsLmVtYmluZCBhcyBhbnkpW25hbWVdID0gdmFsdWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsIHdoZW4gYSB0eXBlIGlzIHJlYWR5IHRvIGJlIHVzZWQgYnkgb3RoZXIgdHlwZXMuXHJcbiAqIFxyXG4gKiBGb3IgdGhpbmdzIGxpa2UgYGludGAgb3IgYGJvb2xgLCB0aGlzIGNhbiBqdXN0IGJlIGNhbGxlZCBpbW1lZGlhdGVseSB1cG9uIHJlZ2lzdHJhdGlvbi5cclxuICogQHBhcmFtIGluZm8gXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluYWxpemVUeXBlPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgbmFtZTogc3RyaW5nLCBwYXJzZWRUeXBlSW5mbzogT21pdDxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+LCBcIm5hbWVcIj4pOiB2b2lkIHtcclxuICAgIGNvbnN0IGluZm8gPSB7IG5hbWUsIC4uLnBhcnNlZFR5cGVJbmZvIH07XHJcbiAgICBsZXQgd2l0aFJlc29sdmVycyA9IGdldERlcGVuZGVuY3lSZXNvbHZlcnMoaW5mby50eXBlSWQpO1xyXG4gICAgd2l0aFJlc29sdmVycy5yZXNvbHZlKHdpdGhSZXNvbHZlcnMucmVzb2x2ZWRWYWx1ZSA9IGluZm8pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRVaW50MzIoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IFBvaW50ZXI8bnVtYmVyPik6IG51bWJlciB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LmdldFVpbnQzMihwdHIsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRVaW50OChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+KTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuZ2V0VWludDgocHRyKTsgfVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyByZWFkVWludDE2IH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MTYuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDMyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50OCB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDguanNcIjtcclxuXHJcbi8qKlxyXG4gKiBUT0RPOiBDYW4ndCBDKysgaWRlbnRpZmllcnMgaW5jbHVkZSBub24tQVNDSUkgY2hhcmFjdGVycz8gXHJcbiAqIFdoeSBkbyBhbGwgdGhlIHR5cGUgZGVjb2RpbmcgZnVuY3Rpb25zIHVzZSB0aGlzP1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRMYXRpbjFTdHJpbmcoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGxldCByZXQgPSBcIlwiO1xyXG4gICAgbGV0IG5leHRCeXRlOiBudW1iZXJcclxuICAgIHdoaWxlIChuZXh0Qnl0ZSA9IHJlYWRVaW50OChpbXBsLCBwdHIrKykpIHtcclxuICAgICAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0Qnl0ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG4vLyBOb3RlOiBJbiBXb3JrbGV0cywgYFRleHREZWNvZGVyYCBhbmQgYFRleHRFbmNvZGVyYCBuZWVkIGEgcG9seWZpbGwuXHJcbmxldCB1dGY4RGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcihcInV0Zi04XCIpO1xyXG5sZXQgdXRmMTZEZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLTE2bGVcIik7XHJcbmxldCB1dGY4RW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBudWxsLXRlcm1pbmF0ZWQgVVRGLTggc3RyaW5nLiBJZiB5b3Uga25vdyB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcsIHlvdSBjYW4gc2F2ZSB0aW1lIGJ5IHVzaW5nIGB1dGY4VG9TdHJpbmdMYCBpbnN0ZWFkLlxyXG4gKiBcclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBwdHIgXHJcbiAqIEByZXR1cm5zIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhUb1N0cmluZ1ooaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gcHRyO1xyXG4gICAgbGV0IGVuZCA9IHN0YXJ0O1xyXG5cclxuICAgIHdoaWxlIChyZWFkVWludDgoaW1wbCwgZW5kKyspICE9IDApO1xyXG5cclxuICAgIHJldHVybiB1dGY4VG9TdHJpbmdMKGltcGwsIHN0YXJ0LCBlbmQgLSBzdGFydCAtIDEpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMTZUb1N0cmluZ1ooaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gcHRyO1xyXG4gICAgbGV0IGVuZCA9IHN0YXJ0O1xyXG5cclxuICAgIHdoaWxlIChyZWFkVWludDE2KGltcGwsIGVuZCkgIT0gMCkgeyBlbmQgKz0gMjt9XHJcblxyXG4gICAgcmV0dXJuIHV0ZjE2VG9TdHJpbmdMKGltcGwsIHN0YXJ0LCBlbmQgLSBzdGFydCAtIDEpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYzMlRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50MzIoaW1wbCwgZW5kKSAhPSAwKSB7IGVuZCArPSA0O31cclxuXHJcbiAgICByZXR1cm4gdXRmMzJUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1dGY4VG9TdHJpbmdMKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IG51bWJlciwgYnl0ZUNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHV0ZjhEZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCBieXRlQ291bnQpKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMTZUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyLCB3Y2hhckNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHV0ZjE2RGVjb2Rlci5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgd2NoYXJDb3VudCAqIDIpKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMzJUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyLCB3Y2hhckNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgY2hhcnMgPSAobmV3IFVpbnQzMkFycmF5KGltcGwuZXhwb3J0cy5tZW1vcnkuYnVmZmVyLCBwdHIsIHdjaGFyQ291bnQpKTtcclxuICAgIGxldCByZXQgPSBcIlwiO1xyXG4gICAgZm9yIChsZXQgY2ggb2YgY2hhcnMpIHtcclxuICAgICAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjaCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nVG9VdGY4KHN0cmluZzogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xyXG4gICAgcmV0dXJuIHV0ZjhFbmNvZGVyLmVuY29kZShzdHJpbmcpLmJ1ZmZlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmMTYoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICBsZXQgcmV0ID0gbmV3IFVpbnQxNkFycmF5KG5ldyBBcnJheUJ1ZmZlcihzdHJpbmcubGVuZ3RoKSk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJldC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHJldFtpXSA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldC5idWZmZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1V0ZjMyKHN0cmluZzogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xyXG4gICAgbGV0IHRydWVMZW5ndGggPSAwO1xyXG4gICAgLy8gVGhlIHdvcnN0LWNhc2Ugc2NlbmFyaW8gaXMgYSBzdHJpbmcgb2YgYWxsIHN1cnJvZ2F0ZS1wYWlycywgc28gYWxsb2NhdGUgdGhhdC5cclxuICAgIC8vIFdlJ2xsIHNocmluayBpdCB0byB0aGUgYWN0dWFsIHNpemUgYWZ0ZXJ3YXJkcy5cclxuICAgIGxldCB0ZW1wID0gbmV3IFVpbnQzMkFycmF5KG5ldyBBcnJheUJ1ZmZlcihzdHJpbmcubGVuZ3RoICogNCAqIDIpKTtcclxuICAgIGZvciAoY29uc3QgY2ggb2Ygc3RyaW5nKSB7XHJcbiAgICAgICAgdGVtcFt0cnVlTGVuZ3RoXSA9IGNoLmNvZGVQb2ludEF0KDApITtcclxuICAgICAgICArK3RydWVMZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRlbXAuYnVmZmVyLnNsaWNlKDAsIHRydWVMZW5ndGggKiA0KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFVzZWQgd2hlbiBzZW5kaW5nIHN0cmluZ3MgZnJvbSBKUyB0byBXQVNNLlxyXG4gKiBcclxuICogXHJcbiAqIEBwYXJhbSBzdHIgXHJcbiAqIEByZXR1cm5zIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxlbmd0aEJ5dGVzVVRGOChzdHI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICBsZXQgbGVuID0gMDtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgbGV0IGMgPSBzdHIuY29kZVBvaW50QXQoaSkhO1xyXG4gICAgICAgIGlmIChjIDw9IDB4N0YpXHJcbiAgICAgICAgICAgIGxlbisrO1xyXG4gICAgICAgIGVsc2UgaWYgKGMgPD0gMHg3RkYpXHJcbiAgICAgICAgICAgIGxlbiArPSAyO1xyXG4gICAgICAgIGVsc2UgaWYgKGMgPD0gMHg3RkZGKVxyXG4gICAgICAgICAgICBsZW4gKz0gMztcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbGVuICs9IDQ7XHJcbiAgICAgICAgICAgICsraTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVuO1xyXG59IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgcmVhZExhdGluMVN0cmluZyB9IGZyb20gXCIuLi9zdHJpbmcuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlcmluZyBhIHR5cGUgaXMgYW4gYXN5bmMgZnVuY3Rpb24gY2FsbGVkIGJ5IGEgc3luYyBmdW5jdGlvbi4gVGhpcyBoYW5kbGVzIHRoZSBjb252ZXJzaW9uLCBhZGRpbmcgdGhlIHByb21pc2UgdG8gYEFsbEVtYmluZFByb21pc2VzYC5cclxuICogXHJcbiAqIEFsc28sIGJlY2F1c2UgZXZlcnkgc2luZ2xlIHJlZ2lzdHJhdGlvbiBjb21lcyB3aXRoIGEgbmFtZSB0aGF0IG5lZWRzIHRvIGJlIHBhcnNlZCwgdGhpcyBhbHNvIHBhcnNlcyB0aGF0IG5hbWUgZm9yIHlvdS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBuYW1lUHRyOiBudW1iZXIsIGZ1bmM6IChuYW1lOiBzdHJpbmcpID0+ICh2b2lkIHwgUHJvbWlzZTx2b2lkPikpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZShpbXBsLCByZWFkTGF0aW4xU3RyaW5nKGltcGwsIG5hbWVQdHIpLCBmdW5jKTtcclxufVxyXG5cclxuLyoqIFxyXG4gKiBTYW1lIGFzIGBfZW1iaW5kX3JlZ2lzdGVyYCwgYnV0IGZvciBrbm93biAob3Igc3ludGhldGljKSBuYW1lcy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIG5hbWU6IHN0cmluZywgZnVuYzogKG5hbWU6IHN0cmluZykgPT4gKHZvaWQgfCBQcm9taXNlPHZvaWQ+KSk6IHZvaWQge1xyXG5cclxuICAgIGNvbnN0IHByb21pc2U6IFByb21pc2U8dm9pZD4gPSAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGxldCBoYW5kbGUgPSAwO1xyXG4gICAgICAgIC8vIEZ1biBmYWN0OiBzZXRUaW1lb3V0IGRvZXNuJ3QgZXhpc3QgaW4gV29ya2xldHMhIFxyXG4gICAgICAgIC8vIEkgZ3Vlc3MgaXQgdmFndWVseSBtYWtlcyBzZW5zZSBpbiBhIFwiZGV0ZXJtaW5pc20gaXMgZ29vZFwiIHdheSwgXHJcbiAgICAgICAgLy8gYnV0IGl0IGFsc28gc2VlbXMgZ2VuZXJhbGx5IHVzZWZ1bCB0aGVyZT9cclxuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpXHJcbiAgICAgICAgICAgIGhhbmRsZSA9IHNldFRpbWVvdXQoKCkgPT4geyBjb25zb2xlLndhcm4oYFRoZSBmdW5jdGlvbiBcIiR7bmFtZX1cIiB1c2VzIGFuIHVuc3VwcG9ydGVkIGFyZ3VtZW50IG9yIHJldHVybiB0eXBlLCBhcyBpdHMgZGVwZW5kZW5jaWVzIGFyZSBub3QgcmVzb2x2aW5nLiBJdCdzIHVubGlrZWx5IHRoZSBlbWJpbmQgcHJvbWlzZSB3aWxsIHJlc29sdmUuYCk7IH0sIDEwMDApIGFzIGFueTtcclxuICAgICAgICBhd2FpdCBmdW5jKG5hbWUpO1xyXG4gICAgICAgIGlmIChoYW5kbGUpXHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xyXG4gICAgfSkoKTtcclxuXHJcbiAgICBBbGxFbWJpbmRQcm9taXNlcy5wdXNoKHByb21pc2UpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXdhaXRBbGxFbWJpbmQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChBbGxFbWJpbmRQcm9taXNlcyk7XHJcbn1cclxuXHJcbmNvbnN0IEFsbEVtYmluZFByb21pc2VzID0gbmV3IEFycmF5PFByb21pc2U8dm9pZD4+KCk7XHJcblxyXG4iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBzaXplOiBudW1iZXIsIG1pblJhbmdlOiBiaWdpbnQsIG1heFJhbmdlOiBiaWdpbnQpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgaXNVbnNpZ25lZCA9IChtaW5SYW5nZSA9PT0gMG4pO1xyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IGlzVW5zaWduZWQgPyBmcm9tV2lyZVR5cGVVbnNpZ25lZCA6IGZyb21XaXJlVHlwZVNpZ25lZDtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPGJpZ2ludCwgYmlnaW50Pih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiB2YWx1ZSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZSB9KSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmcm9tV2lyZVR5cGVTaWduZWQod2lyZVZhbHVlOiBiaWdpbnQpIHsgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiBCaWdJbnQod2lyZVZhbHVlKSB9OyB9XHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVVuc2lnbmVkKHdpcmVWYWx1ZTogYmlnaW50KSB7IHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogQmlnSW50KHdpcmVWYWx1ZSkgJiAweEZGRkZfRkZGRl9GRkZGX0ZGRkZuIH0gfSIsICJcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9ib29sKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgdHJ1ZVZhbHVlOiAxLCBmYWxzZVZhbHVlOiAwKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIG5hbWUgPT4ge1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyIHwgYm9vbGVhbiwgYm9vbGVhbj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHdpcmVWYWx1ZSkgPT4geyByZXR1cm4geyBqc1ZhbHVlOiAhIXdpcmVWYWx1ZSwgd2lyZVZhbHVlIH07IH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZTogbyA/IHRydWVWYWx1ZSA6IGZhbHNlVmFsdWUsIGpzVmFsdWU6IG8gfTsgfSxcclxuICAgICAgICB9KVxyXG4gICAgfSlcclxufVxyXG4iLCAiXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5hbWVGdW5jdGlvbjxUIGV4dGVuZHMgKCguLi5hcmdzOiBhbnlbXSkgPT4gYW55KSB8IEZ1bmN0aW9uPihuYW1lOiBzdHJpbmcsIGJvZHk6IFQpOiBUIHtcclxuICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoYm9keSwgJ25hbWUnLCB7IHZhbHVlOiBuYW1lIH0pO1xyXG59XHJcbiIsICIvLyBUaGVzZSBhcmUgYWxsIHRoZSBjbGFzc2VzIHRoYXQgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQsIGFjY2Vzc2VkIGJ5IHRoZWlyIFJUVEkgVHlwZUlkXHJcbi8vIEl0J3Mgb2ZmIGluIGl0cyBvd24gZmlsZSB0byBrZWVwIGl0IHByaXZhdGUuXHJcbmV4cG9ydCBjb25zdCBFbWJvdW5kQ2xhc3NlczogUmVjb3JkPG51bWJlciwgdHlwZW9mIEVtYm91bmRDbGFzcz4gPSB7fTtcclxuXHJcblxyXG4vLyBUaGlzIGlzIGEgcnVubmluZyBsaXN0IG9mIGFsbCB0aGUgaW5zdGFudGlhdGVkIGNsYXNzZXMsIGJ5IHRoZWlyIGB0aGlzYCBwb2ludGVyLlxyXG5jb25zdCBpbnN0YW50aWF0ZWRDbGFzc2VzID0gbmV3IE1hcDxudW1iZXIsIFdlYWtSZWY8RW1ib3VuZENsYXNzPj4oKTtcclxuXHJcbi8vIFRoaXMga2VlcHMgdHJhY2sgb2YgYWxsIGRlc3RydWN0b3JzIGJ5IHRoZWlyIGB0aGlzYCBwb2ludGVyLlxyXG4vLyBVc2VkIGZvciBGaW5hbGl6YXRpb25SZWdpc3RyeSBhbmQgdGhlIGRlc3RydWN0b3IgaXRzZWxmLlxyXG5jb25zdCBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQgPSBuZXcgTWFwPG51bWJlciwgKCkgPT4gdm9pZD4oKTtcclxuXHJcbi8vIFVzZWQgdG8gZW5zdXJlIG5vIG9uZSBidXQgdGhlIHR5cGUgY29udmVydGVycyBjYW4gdXNlIHRoZSBzZWNyZXQgcG9pbnRlciBjb25zdHJ1Y3Rvci5cclxuZXhwb3J0IGNvbnN0IFNlY3JldDogU3ltYm9sID0gU3ltYm9sKCk7XHJcbmV4cG9ydCBjb25zdCBTZWNyZXROb0Rpc3Bvc2U6IFN5bWJvbCA9IFN5bWJvbCgpO1xyXG5cclxuLy8gVE9ETzogVGhpcyBuZWVkcyBwcm9wZXIgdGVzdGluZywgb3IgcG9zc2libHkgZXZlbiBqdXN0aWZpY2F0aW9uIGZvciBpdHMgZXhpc3RlbmNlLlxyXG4vLyBJJ20gcHJldHR5IHN1cmUgb25seSBKUyBoZWFwIHByZXNzdXJlIHdpbGwgaW52b2tlIGEgY2FsbGJhY2ssIG1ha2luZyBpdCBraW5kIG9mIFxyXG4vLyBwb2ludGxlc3MgZm9yIEMrKyBjbGVhbnVwLCB3aGljaCBoYXMgbm8gaW50ZXJhY3Rpb24gd2l0aCB0aGUgSlMgaGVhcC5cclxuY29uc3QgcmVnaXN0cnkgPSBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKF90aGlzOiBudW1iZXIpID0+IHtcclxuICAgIGNvbnNvbGUud2FybihgV0FTTSBjbGFzcyBhdCBhZGRyZXNzICR7X3RoaXN9IHdhcyBub3QgcHJvcGVybHkgZGlzcG9zZWQuYCk7XHJcbiAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KF90aGlzKT8uKCk7XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIGFsbCBFbWJpbmQtZW5hYmxlZCBjbGFzc2VzLlxyXG4gKlxyXG4gKiBJbiBnZW5lcmFsLCBpZiB0d28gKHF1b3RlLXVucXVvdGUpIFwiaW5zdGFuY2VzXCIgb2YgdGhpcyBjbGFzcyBoYXZlIHRoZSBzYW1lIGBfdGhpc2AgcG9pbnRlcixcclxuICogdGhlbiB0aGV5IHdpbGwgY29tcGFyZSBlcXVhbGx5IHdpdGggYD09YCwgYXMgaWYgY29tcGFyaW5nIGFkZHJlc3NlcyBpbiBDKysuXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNsYXNzIEVtYm91bmRDbGFzcyB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgdHJhbnNmb3JtZWQgY29uc3RydWN0b3IgZnVuY3Rpb24gdGhhdCB0YWtlcyBKUyBhcmd1bWVudHMgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzc1xyXG4gICAgICovXHJcbiAgICBzdGF0aWMgX2NvbnN0cnVjdG9yOiAoLi4uYXJnczogYW55W10pID0+IEVtYm91bmRDbGFzcztcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFzc2lnbmVkIGJ5IHRoZSBkZXJpdmVkIGNsYXNzIHdoZW4gdGhhdCBjbGFzcyBpcyByZWdpc3RlcmVkLlxyXG4gICAgICpcclxuICAgICAqIFRoaXMgb25lIGlzIG5vdCB0cmFuc2Zvcm1lZCBiZWNhdXNlIGl0IG9ubHkgdGFrZXMgYSBwb2ludGVyIGFuZCByZXR1cm5zIG5vdGhpbmcuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfZGVzdHJ1Y3RvcjogKF90aGlzOiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcG9pbnRlciB0byB0aGUgY2xhc3MgaW4gV0FTTSBtZW1vcnk7IHRoZSBzYW1lIGFzIHRoZSBDKysgYHRoaXNgIHBvaW50ZXIuXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBfdGhpcyE6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiBhbnlbXSkge1xyXG4gICAgICAgIGNvbnN0IENyZWF0ZWRGcm9tV2FzbSA9IChhcmdzLmxlbmd0aCA9PT0gMiAmJiAoYXJnc1swXSA9PT0gU2VjcmV0IHx8IGFyZ3NbMF0gPT0gU2VjcmV0Tm9EaXNwb3NlKSAmJiB0eXBlb2YgYXJnc1sxXSA9PT0gJ251bWJlcicpO1xyXG5cclxuICAgICAgICBpZiAoIUNyZWF0ZWRGcm9tV2FzbSkge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBKUy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogVW5saWtlIGEgbm9ybWFsIGNvbnN0cnVjdG9yLCB3ZSBkZWxlZ2F0ZSB0aGUgY2xhc3MgY3JlYXRpb24gdG9cclxuICAgICAgICAgICAgICogYSBjb21iaW5hdGlvbiBvZiBfY29uc3RydWN0b3IgYW5kIGBmcm9tV2lyZVR5cGVgLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBgX2NvbnN0cnVjdG9yYCB3aWxsIGNhbGwgdGhlIEMrKyBjb2RlIHRoYXQgYWxsb2NhdGVzIG1lbW9yeSxcclxuICAgICAgICAgICAgICogaW5pdGlhbGl6ZXMgdGhlIGNsYXNzLCBhbmQgcmV0dXJucyBpdHMgYHRoaXNgIHBvaW50ZXIsXHJcbiAgICAgICAgICAgICAqIHdoaWxlIGBmcm9tV2lyZVR5cGVgLCBjYWxsZWQgYXMgcGFydCBvZiB0aGUgZ2x1ZS1jb2RlIHByb2Nlc3MsXHJcbiAgICAgICAgICAgICAqIHdpbGwgYWN0dWFsbHkgaW5zdGFudGlhdGUgdGhpcyBjbGFzcy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogKEluIG90aGVyIHdvcmRzLCB0aGlzIHBhcnQgcnVucyBmaXJzdCwgdGhlbiB0aGUgYGVsc2VgIGJlbG93IHJ1bnMpXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIEVtYm91bmRDbGFzcykuX2NvbnN0cnVjdG9yKC4uLmFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gQysrLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBXZSBnZXQgaGVyZSB2aWEgYGZyb21XaXJlVHlwZWAsIG1lYW5pbmcgdGhhdCB0aGVcclxuICAgICAgICAgICAgICogY2xhc3MgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWQgaW4gQysrLCBhbmQgd2VcclxuICAgICAgICAgICAgICoganVzdCBuZWVkIG91ciBcImhhbmRsZVwiIHRvIGl0IGluIEpTLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgY29uc3QgX3RoaXMgPSBhcmdzWzFdO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCBfdGhpcyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBTZWNyZXROb0Rpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgRW1ib3VuZENsYXNzKS5fZGVzdHJ1Y3RvcjtcclxuXHJcbiAgICAgICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuc2V0KF90aGlzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzdHJ1Y3RvcihfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFudGlhdGVkQ2xhc3Nlcy5kZWxldGUoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFtTeW1ib2wuZGlzcG9zZV0oKTogdm9pZCB7XHJcbiAgICAgICAgLy8gT25seSBydW4gdGhlIGRlc3RydWN0b3IgaWYgd2Ugb3Vyc2VsdmVzIGNvbnN0cnVjdGVkIHRoaXMgY2xhc3MgKGFzIG9wcG9zZWQgdG8gYGluc3BlY3RgaW5nIGl0KVxyXG4gICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpO1xyXG4gICAgICAgIGlmIChkZXN0cnVjdG9yKSB7XHJcbiAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk/LigpO1xyXG4gICAgICAgICAgICBkZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZGVsZXRlKHRoaXMuX3RoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLl90aGlzID0gMDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBcclxuICogSW5zdGVhZCBvZiBpbnN0YW50aWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3MsIFxyXG4gKiB5b3UgY2FuIGluc3BlY3QgYW4gZXhpc3RpbmcgcG9pbnRlciBpbnN0ZWFkLlxyXG4gKlxyXG4gKiBUaGlzIGlzIG1haW5seSBpbnRlbmRlZCBmb3Igc2l0dWF0aW9ucyB0aGF0IEVtYmluZCBkb2Vzbid0IHN1cHBvcnQsXHJcbiAqIGxpa2UgYXJyYXktb2Ytc3RydWN0cy1hcy1hLXBvaW50ZXIuXHJcbiAqIFxyXG4gKiBCZSBhd2FyZSB0aGF0IHRoZXJlJ3Mgbm8gbGlmZXRpbWUgdHJhY2tpbmcgaW52b2x2ZWQsIHNvXHJcbiAqIG1ha2Ugc3VyZSB5b3UgZG9uJ3Qga2VlcCB0aGlzIHZhbHVlIGFyb3VuZCBhZnRlciB0aGVcclxuICogcG9pbnRlcidzIGJlZW4gaW52YWxpZGF0ZWQuIFxyXG4gKiBcclxuICogKipEbyBub3QgY2FsbCBbU3ltYm9sLmRpc3Bvc2VdKiogb24gYW4gaW5zcGVjdGVkIGNsYXNzLFxyXG4gKiBzaW5jZSB0aGUgYXNzdW1wdGlvbiBpcyB0aGF0IHRoZSBDKysgY29kZSBvd25zIHRoYXQgcG9pbnRlclxyXG4gKiBhbmQgd2UncmUganVzdCBsb29raW5nIGF0IGl0LCBzbyBkZXN0cm95aW5nIGl0IHdvdWxkIGJlIHJ1ZGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5zcGVjdENsYXNzQnlQb2ludGVyPFQ+KHBvaW50ZXI6IG51bWJlcik6IFQge1xyXG4gICAgcmV0dXJuIG5ldyBFbWJvdW5kQ2xhc3MoU2VjcmV0Tm9EaXNwb3NlLCBwb2ludGVyKSBhcyBUO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUYWJsZUZ1bmN0aW9uPFQgZXh0ZW5kcyBGdW5jdGlvbj4oaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHNpZ25hdHVyZVB0cjogbnVtYmVyLCBmdW5jdGlvbkluZGV4OiBudW1iZXIpOiBUIHtcclxuICAgIGNvbnN0IGZwID0gaW1wbC5leHBvcnRzLl9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUuZ2V0KGZ1bmN0aW9uSW5kZXgpO1xyXG4gICAgY29uc29sZS5hc3NlcnQodHlwZW9mIGZwID09IFwiZnVuY3Rpb25cIik7XHJcbiAgICByZXR1cm4gZnAgYXMgVDtcclxufSIsICJpbXBvcnQgeyByZW5hbWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzcywgRW1ib3VuZENsYXNzZXMsIFNlY3JldCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBXaXJlQ29udmVyc2lvblJlc3VsdCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5leHBvcnQgeyBpbnNwZWN0Q2xhc3NCeVBvaW50ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyhcclxuICAgIHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LFxyXG4gICAgcmF3VHlwZTogbnVtYmVyLFxyXG4gICAgcmF3UG9pbnRlclR5cGU6IG51bWJlcixcclxuICAgIHJhd0NvbnN0UG9pbnRlclR5cGU6IG51bWJlcixcclxuICAgIGJhc2VDbGFzc1Jhd1R5cGU6IG51bWJlcixcclxuICAgIGdldEFjdHVhbFR5cGVTaWduYXR1cmU6IG51bWJlcixcclxuICAgIGdldEFjdHVhbFR5cGVQdHI6IG51bWJlcixcclxuICAgIHVwY2FzdFNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgdXBjYXN0UHRyOiBudW1iZXIsXHJcbiAgICBkb3duY2FzdFNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgZG93bmNhc3RQdHI6IG51bWJlcixcclxuICAgIG5hbWVQdHI6IG51bWJlcixcclxuICAgIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlcixcclxuICAgIHJhd0Rlc3RydWN0b3JQdHI6IG51bWJlcik6IHZvaWQge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTm90ZTogX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyBkb2Vzbid0IGhhdmUgYSBjb3JyZXNwb25kaW5nIGBmaW5hbGl6ZWAgdmVyc2lvbixcclxuICAgICAqIGxpa2UgdmFsdWVfYXJyYXkgYW5kIHZhbHVlX29iamVjdCBoYXZlLCB3aGljaCBpcyBmaW5lIEkgZ3Vlc3M/XHJcbiAgICAgKiBcclxuICAgICAqIEJ1dCBpdCBtZWFucyB0aGF0IHdlIGNhbid0IGp1c3QgY3JlYXRlIGEgY2xhc3MgcHJlLWluc3RhbGxlZCB3aXRoIGV2ZXJ5dGhpbmcgaXQgbmVlZHMtLVxyXG4gICAgICogd2UgbmVlZCB0byBhZGQgbWVtYmVyIGZ1bmN0aW9ucyBhbmQgcHJvcGVydGllcyBhbmQgc3VjaCBhcyB3ZSBnZXQgdGhlbSwgYW5kIHdlXHJcbiAgICAgKiBuZXZlciByZWFsbHkga25vdyB3aGVuIHdlJ3JlIGRvbmUuXHJcbiAgICAgKi9cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmF3RGVzdHJ1Y3Rvckludm9rZXIgPSBnZXRUYWJsZUZ1bmN0aW9uPChfdGhpczogbnVtYmVyKSA9PiB2b2lkPih0aGlzLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yUHRyKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETyg/KSBJdCdzIHByb2JhYmx5IG5vdCBuZWNlc3NhcnkgdG8gaGF2ZSBFbWJvdW5kQ2xhc3NlcyBhbmQgdGhpcy5lbWJpbmQgYmFzaWNhbGx5IGJlIHRoZSBzYW1lIGV4YWN0IHRoaW5nLlxyXG4gICAgICAgIEVtYm91bmRDbGFzc2VzW3Jhd1R5cGVdID0gKHRoaXMuZW1iaW5kIGFzIGFueSlbbmFtZV0gPSByZW5hbWVGdW5jdGlvbihuYW1lLFxyXG4gICAgICAgICAgICAvLyBVbmxpa2UgdGhlIGNvbnN0cnVjdG9yLCB0aGUgZGVzdHJ1Y3RvciBpcyBrbm93biBlYXJseSBlbm91Z2ggdG8gYXNzaWduIG5vdy5cclxuICAgICAgICAgICAgLy8gUHJvYmFibHkgYmVjYXVzZSBkZXN0cnVjdG9ycyBjYW4ndCBiZSBvdmVybG9hZGVkIGJ5IGFueXRoaW5nIHNvIHRoZXJlJ3Mgb25seSBldmVyIG9uZS5cclxuICAgICAgICAgICAgLy8gQW55d2F5LCBhc3NpZ24gaXQgdG8gdGhpcyBuZXcgY2xhc3MuXHJcbiAgICAgICAgICAgIGNsYXNzIGV4dGVuZHMgRW1ib3VuZENsYXNzIHtcclxuICAgICAgICAgICAgICAgIHN0YXRpYyBfZGVzdHJ1Y3RvciA9IHJhd0Rlc3RydWN0b3JJbnZva2VyO1xyXG4gICAgICAgICAgICB9IGFzIGFueSk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGZyb21XaXJlVHlwZShfdGhpczogbnVtYmVyKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+IHsgY29uc3QganNWYWx1ZSA9IG5ldyBFbWJvdW5kQ2xhc3Nlc1tyYXdUeXBlXShTZWNyZXQsIF90aGlzKTsgcmV0dXJuIHsgd2lyZVZhbHVlOiBfdGhpcywganNWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiBqc1ZhbHVlW1N5bWJvbC5kaXNwb3NlXSgpIH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHRvV2lyZVR5cGUoanNPYmplY3Q6IEVtYm91bmRDbGFzcyk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PG51bWJlciwgRW1ib3VuZENsYXNzPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IChqc09iamVjdCBhcyBhbnkpLl90aGlzLFxyXG4gICAgICAgICAgICAgICAganNWYWx1ZToganNPYmplY3QsXHJcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBubyBkZXN0cnVjdG9ycyBmb3IgYW55IG9mIHRoZXNlLFxyXG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSB0aGV5J3JlIGp1c3QgZm9yIHZhbHVlLXR5cGVzLWFzLW9iamVjdC10eXBlcy5cclxuICAgICAgICAgICAgICAgIC8vIEFkZGluZyBpdCBoZXJlIHdvdWxkbid0IHdvcmsgcHJvcGVybHksIGJlY2F1c2UgaXQgYXNzdW1lc1xyXG4gICAgICAgICAgICAgICAgLy8gd2Ugb3duIHRoZSBvYmplY3QgKHdoZW4gY29udmVydGluZyBmcm9tIGEgSlMgc3RyaW5nIHRvIHN0ZDo6c3RyaW5nLCB3ZSBlZmZlY3RpdmVseSBkbywgYnV0IG5vdCBoZXJlKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gV2lzaCBvdGhlciB0eXBlcyBpbmNsdWRlZCBwb2ludGVyIFR5cGVJRHMgd2l0aCB0aGVtIHRvby4uLlxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgbmFtZSwgeyB0eXBlSWQ6IHJhd1R5cGUsIGZyb21XaXJlVHlwZSwgdG9XaXJlVHlwZSB9KTtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+KHRoaXMsIGAke25hbWV9KmAsIHsgdHlwZUlkOiByYXdQb2ludGVyVHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgYCR7bmFtZX0gY29uc3QqYCwgeyB0eXBlSWQ6IHJhd0NvbnN0UG9pbnRlclR5cGUsIGZyb21XaXJlVHlwZSwgdG9XaXJlVHlwZSB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJcclxuZXhwb3J0IGZ1bmN0aW9uIHJ1bkRlc3RydWN0b3JzKGRlc3RydWN0b3JzOiAoKCkgPT4gdm9pZClbXSk6IHZvaWQge1xyXG4gICAgd2hpbGUgKGRlc3RydWN0b3JzLmxlbmd0aCkge1xyXG4gICAgICAgIGRlc3RydWN0b3JzLnBvcCgpISgpO1xyXG4gICAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IHJlbmFtZUZ1bmN0aW9uIH0gZnJvbSBcIi4vY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4vZGVzdHJ1Y3RvcnMuanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzIH0gZnJvbSBcIi4vZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4vZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4vZ2V0LXR5cGUtaW5mby5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIEpTIGZ1bmN0aW9uIHRoYXQgY2FsbHMgYSBDKysgZnVuY3Rpb24sIGFjY291bnRpbmcgZm9yIGB0aGlzYCB0eXBlcyBhbmQgY29udGV4dC5cclxuICogXHJcbiAqIEl0IGNvbnZlcnRzIGFsbCBhcmd1bWVudHMgYmVmb3JlIHBhc3NpbmcgdGhlbSwgYW5kIGNvbnZlcnRzIHRoZSByZXR1cm4gdHlwZSBiZWZvcmUgcmV0dXJuaW5nLlxyXG4gKiBcclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBhcmdUeXBlSWRzIEFsbCBSVFRJIFR5cGVJZHMsIGluIHRoZSBvcmRlciBvZiBbUmV0VHlwZSwgVGhpc1R5cGUsIC4uLkFyZ1R5cGVzXS4gVGhpc1R5cGUgY2FuIGJlIG51bGwgZm9yIHN0YW5kYWxvbmUgZnVuY3Rpb25zLlxyXG4gKiBAcGFyYW0gaW52b2tlclNpZ25hdHVyZSBBIHBvaW50ZXIgdG8gdGhlIHNpZ25hdHVyZSBzdHJpbmcuXHJcbiAqIEBwYXJhbSBpbnZva2VySW5kZXggVGhlIGluZGV4IHRvIHRoZSBpbnZva2VyIGZ1bmN0aW9uIGluIHRoZSBgV2ViQXNzZW1ibHkuVGFibGVgLlxyXG4gKiBAcGFyYW0gaW52b2tlckNvbnRleHQgVGhlIGNvbnRleHQgcG9pbnRlciB0byB1c2UsIGlmIGFueS5cclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlR2x1ZUZ1bmN0aW9uPEYgZXh0ZW5kcyAoKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpIHwgRnVuY3Rpb24+KFxyXG4gICAgaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICByZXR1cm5UeXBlSWQ6IG51bWJlcixcclxuICAgIGFyZ1R5cGVJZHM6IG51bWJlcltdLFxyXG4gICAgaW52b2tlclNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyIHwgbnVsbFxyXG4pOiBQcm9taXNlPEY+IHtcclxuXHJcbiAgICB0eXBlIFIgPSBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V2lyZVR5cGVzLCBhbnk+O1xyXG4gICAgLy90eXBlIFRoaXNUeXBlID0gbnVsbCB8IHVuZGVmaW5lZCB8IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIGFueT47XHJcbiAgICB0eXBlIEFyZ1R5cGVzID0gRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdpcmVUeXBlcywgYW55PltdO1xyXG5cclxuXHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZSwgLi4uYXJnVHlwZXNdID0gYXdhaXQgZ2V0VHlwZUluZm88W1IsIC4uLkFyZ1R5cGVzXT4ocmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzKTtcclxuICAgIGNvbnN0IHJhd0ludm9rZXIgPSBnZXRUYWJsZUZ1bmN0aW9uPCguLi5hcmdzOiBXaXJlVHlwZXNbXSkgPT4gYW55PihpbXBsLCBpbnZva2VyU2lnbmF0dXJlLCBpbnZva2VySW5kZXgpO1xyXG5cclxuXHJcbiAgICByZXR1cm4gcmVuYW1lRnVuY3Rpb24obmFtZSwgZnVuY3Rpb24gKHRoaXM6IEVtYm91bmRDbGFzcywgLi4uanNBcmdzOiBhbnlbXSkge1xyXG4gICAgICAgIGNvbnN0IHdpcmVkVGhpcyA9IHRoaXMgPyB0aGlzLl90aGlzIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIGNvbnN0IHdpcmVkQXJnczogV2lyZVR5cGVzW10gPSBbXTtcclxuICAgICAgICBjb25zdCBzdGFja0Jhc2VkRGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdID0gW107ICAgLy8gVXNlZCB0byBwcmV0ZW5kIGxpa2Ugd2UncmUgYSBwYXJ0IG9mIHRoZSBXQVNNIHN0YWNrLCB3aGljaCB3b3VsZCBkZXN0cm95IHRoZXNlIG9iamVjdHMgYWZ0ZXJ3YXJkcy5cclxuXHJcbiAgICAgICAgaWYgKGludm9rZXJDb250ZXh0KVxyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaChpbnZva2VyQ29udGV4dCk7XHJcbiAgICAgICAgaWYgKHdpcmVkVGhpcylcclxuICAgICAgICAgICAgd2lyZWRBcmdzLnB1c2god2lyZWRUaGlzKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCBlYWNoIEpTIGFyZ3VtZW50IHRvIGl0cyBXQVNNIGVxdWl2YWxlbnQgKGdlbmVyYWxseSBhIHBvaW50ZXIsIG9yIGludC9mbG9hdClcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ1R5cGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBhcmdUeXBlc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgYXJnID0ganNBcmdzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSB0eXBlLnRvV2lyZVR5cGUoYXJnKTtcclxuICAgICAgICAgICAgd2lyZWRBcmdzLnB1c2god2lyZVZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKHN0YWNrRGVzdHJ1Y3RvcilcclxuICAgICAgICAgICAgICAgIHN0YWNrQmFzZWREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZpbmFsbHksIGNhbGwgdGhlIFwicmF3XCIgV0FTTSBmdW5jdGlvblxyXG4gICAgICAgIGxldCB3aXJlZFJldHVybjogV2lyZVR5cGVzID0gcmF3SW52b2tlciguLi53aXJlZEFyZ3MpO1xyXG5cclxuICAgICAgICAvLyBTdGlsbCBwcmV0ZW5kaW5nIHdlJ3JlIGEgcGFydCBvZiB0aGUgc3RhY2ssIFxyXG4gICAgICAgIC8vIG5vdyBkZXN0cnVjdCBldmVyeXRoaW5nIHdlIFwicHVzaGVkXCIgb250byBpdC5cclxuICAgICAgICBydW5EZXN0cnVjdG9ycyhzdGFja0Jhc2VkRGVzdHJ1Y3RvcnMpO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IHdoYXRldmVyIHRoZSBXQVNNIGZ1bmN0aW9uIHJldHVybmVkIHRvIGEgSlMgcmVwcmVzZW50YXRpb25cclxuICAgICAgICAvLyBJZiB0aGUgb2JqZWN0IHJldHVybmVkIGlzIERpc3Bvc2FibGUsIHRoZW4gd2UgbGV0IHRoZSB1c2VyIGRpc3Bvc2Ugb2YgaXRcclxuICAgICAgICAvLyB3aGVuIHJlYWR5LlxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gT3RoZXJ3aXNlIChuYW1lbHkgc3RyaW5ncyksIGRpc3Bvc2UgaXRzIG9yaWdpbmFsIHJlcHJlc2VudGF0aW9uIG5vdy5cclxuICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSByZXR1cm5UeXBlPy5mcm9tV2lyZVR5cGUod2lyZWRSZXR1cm4pO1xyXG4gICAgICAgIGlmIChzdGFja0Rlc3RydWN0b3IgJiYgIShqc1ZhbHVlICYmIHR5cGVvZiBqc1ZhbHVlID09IFwib2JqZWN0XCIgJiYgKFN5bWJvbC5kaXNwb3NlIGluIGpzVmFsdWUpKSlcclxuICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yKGpzVmFsdWUsIHdpcmVWYWx1ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiBqc1ZhbHVlO1xyXG5cclxuICAgIH0gYXMgRik7XHJcbn1cclxuIiwgIlxyXG5leHBvcnQgdHlwZSBJczY0ID0gZmFsc2U7XHJcbmV4cG9ydCBjb25zdCBJczY0ID0gZmFsc2U7XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgSXM2NCB9IGZyb20gXCIuL2lzLTY0LmpzXCI7XHJcblxyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBQb2ludGVyU2l6ZTogNCB8IDggPSAoSXM2NCA/IDggOiA0KTtcclxuZXhwb3J0IGNvbnN0IGdldFBvaW50ZXI6IFwiZ2V0QmlnVWludDY0XCIgfCBcImdldFVpbnQzMlwiID0gKElzNjQgPyBcImdldEJpZ1VpbnQ2NFwiIDogXCJnZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgY29uc3Qgc2V0UG9pbnRlcjogXCJzZXRCaWdVaW50NjRcIiB8IFwic2V0VWludDMyXCIgPSAoSXM2NCA/IFwic2V0QmlnVWludDY0XCIgOiBcInNldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG9pbnRlclNpemUoX2luc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9Pik6IDQgeyByZXR1cm4gUG9pbnRlclNpemUgYXMgNDsgfSIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyIH0gZnJvbSBcIi4vcG9pbnRlci5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTYW1lIGFzIGByZWFkVWludDMyYCwgYnV0IHR5cGVkIGZvciBwb2ludGVycywgYW5kIGZ1dHVyZS1wcm9vZnMgYWdhaW5zdCA2NC1iaXQgYXJjaGl0ZWN0dXJlcy5cclxuICogXHJcbiAqIFRoaXMgaXMgKm5vdCogdGhlIHNhbWUgYXMgZGVyZWZlcmVuY2luZyBhIHBvaW50ZXIuIFRoaXMgaXMgYWJvdXQgcmVhZGluZyB0aGUgbnVtZXJpY2FsIHZhbHVlIGF0IGEgZ2l2ZW4gYWRkcmVzcyB0aGF0IGlzLCBpdHNlbGYsIHRvIGJlIGludGVycHJldGVkIGFzIGEgcG9pbnRlci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkUG9pbnRlcihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+KTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbZ2V0UG9pbnRlcl0ocHRyLCB0cnVlKSBhcyBudW1iZXI7IH1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi8uLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmFsbHksIEVtYmluZCBmdW5jdGlvbnMgaW5jbHVkZSBhbiBhcnJheSBvZiBSVFRJIFR5cGVJZHMgaW4gdGhlIGZvcm0gb2ZcclxuICogW1JldFR5cGUsIFRoaXNUeXBlPywgLi4uQXJnVHlwZXNdXHJcbiAqIFxyXG4gKiBUaGlzIHJldHVybnMgdGhhdCBhcnJheSBvZiB0eXBlSWRzIGZvciBhIGdpdmVuIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBcnJheU9mVHlwZXMoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGNvdW50OiBudW1iZXIsIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCByZXQ6IG51bWJlcltdID0gW107XHJcbiAgICBjb25zdCBwb2ludGVyU2l6ZSA9IGdldFBvaW50ZXJTaXplKGltcGwpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7ICsraSkge1xyXG4gICAgICAgIHJldC5wdXNoKHJlYWRQb2ludGVyKGltcGwsIHJhd0FyZ1R5cGVzUHRyICsgaSAqIHBvaW50ZXJTaXplKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIG1ldGhvZE5hbWVQdHI6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyLFxyXG4gICAgaXNBc3luYzogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgLi4uYXJnVHlwZUlkc10gPSByZWFkQXJyYXlPZlR5cGVzKHRoaXMsIGFyZ0NvdW50LCByYXdBcmdUeXBlc1B0cik7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG1ldGhvZE5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgKChFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0gYXMgYW55KSlbbmFtZV0gPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb24odGhpcywgbmFtZSwgcmV0dXJuVHlwZUlkLCBhcmdUeXBlSWRzLCBpbnZva2VyU2lnbmF0dXJlUHRyLCBpbnZva2VySW5kZXgsIGludm9rZXJDb250ZXh0KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlciwgXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLCBcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsIFxyXG4gICAgaW52b2tlclNpZ25hdHVyZVB0cjogbnVtYmVyLCBcclxuICAgIGludm9rZXJJbmRleDogbnVtYmVyLCBcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZSh0aGlzLCBcIjxjb25zdHJ1Y3Rvcj5cIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkpLl9jb25zdHJ1Y3RvciA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBcIjxjb25zdHJ1Y3Rvcj5cIiwgcmV0dXJuVHlwZUlkLCBhcmdUeXBlSWRzLCBpbnZva2VyU2lnbmF0dXJlUHRyLCBpbnZva2VySW5kZXgsIGludm9rZXJDb250ZXh0KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCAgXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgbWV0aG9kTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsIC8vIFtSZXR1cm5UeXBlLCBUaGlzVHlwZSwgQXJncy4uLl1cclxuICAgIGludm9rZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJJbmRleDogbnVtYmVyLFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlcixcclxuICAgIGlzUHVyZVZpcnR1YWw6IG51bWJlcixcclxuICAgIGlzQXN5bmM6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIHRoaXNUeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgLy9jb25zb2xlLmFzc2VydCh0aGlzVHlwZUlkICE9IHJhd0NsYXNzVHlwZUlkLGBJbnRlcm5hbCBlcnJvcjsgZXhwZWN0ZWQgdGhlIFJUVEkgcG9pbnRlcnMgZm9yIHRoZSBjbGFzcyB0eXBlIGFuZCBpdHMgcG9pbnRlciB0eXBlIHRvIGJlIGRpZmZlcmVudC5gKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbWV0aG9kTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgKChFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0gYXMgYW55KS5wcm90b3R5cGUgYXMgYW55KVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgbmFtZSxcclxuICAgICAgICAgICAgcmV0dXJuVHlwZUlkLFxyXG4gICAgICAgICAgICBhcmdUeXBlSWRzLFxyXG4gICAgICAgICAgICBpbnZva2VyU2lnbmF0dXJlUHRyLFxyXG4gICAgICAgICAgICBpbnZva2VySW5kZXgsXHJcbiAgICAgICAgICAgIGludm9rZXJDb250ZXh0XHJcbiAgICAgICAgKTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eShcclxuICAgIHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIGZpZWxkTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsXHJcbiAgICBnZXR0ZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGdldHRlckluZGV4OiBudW1iZXIsXHJcbiAgICBnZXR0ZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLFxyXG4gICAgc2V0dGVyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBzZXR0ZXJJbmRleDogbnVtYmVyLFxyXG4gICAgc2V0dGVyQ29udGV4dDogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIGZpZWxkTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZ2V0ID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uPCgpID0+IGFueT4odGhpcywgYCR7bmFtZX1fZ2V0dGVyYCwgZ2V0dGVyUmV0dXJuVHlwZUlkLCBbXSwgZ2V0dGVyU2lnbmF0dXJlUHRyLCBnZXR0ZXJJbmRleCwgZ2V0dGVyQ29udGV4dCk7XHJcbiAgICAgICAgY29uc3Qgc2V0ID0gc2V0dGVySW5kZXg/IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbjwodmFsdWU6IGFueSkgPT4gdm9pZD4odGhpcywgYCR7bmFtZX1fc2V0dGVyYCwgMCwgW3NldHRlckFyZ3VtZW50VHlwZUlkXSwgc2V0dGVyU2lnbmF0dXJlUHRyLCBzZXR0ZXJJbmRleCwgc2V0dGVyQ29udGV4dCkgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpLnByb3RvdHlwZSBhcyBhbnkpLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIGdldCxcclxuICAgICAgICAgICAgc2V0LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgIlxyXG5pbXBvcnQgeyByZWdpc3RlckVtYm91bmQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudDxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIG5hbWVQdHI6IG51bWJlciwgdHlwZVB0cjogbnVtYmVyLCB2YWx1ZUFzV2lyZVR5cGU6IFdUKTogdm9pZCB7XHJcblxyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKGNvbnN0TmFtZSkgPT4ge1xyXG4gICAgICAgIC8vIFdhaXQgdW50aWwgd2Uga25vdyBob3cgdG8gcGFyc2UgdGhlIHR5cGUgdGhpcyBjb25zdGFudCByZWZlcmVuY2VzLlxyXG4gICAgICAgIGNvbnN0IFt0eXBlXSA9IGF3YWl0IGdldFR5cGVJbmZvPFtFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+XT4odHlwZVB0cik7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIGNvbnN0YW50IGZyb20gaXRzIHdpcmUgcmVwcmVzZW50YXRpb24gdG8gaXRzIEpTIHJlcHJlc2VudGF0aW9uLlxyXG4gICAgICAgIGNvbnN0IHZhbHVlID0gdHlwZS5mcm9tV2lyZVR5cGUodmFsdWVBc1dpcmVUeXBlKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHRoaXMgY29uc3RhbnQgdmFsdWUgdG8gdGhlIGBlbWJpbmRgIG9iamVjdC5cclxuICAgICAgICByZWdpc3RlckVtYm91bmQ8VD4odGhpcywgY29uc3ROYW1lLCB2YWx1ZS5qc1ZhbHVlKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCB0eXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIC8vIFRPRE8uLi5cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbXZhbF90YWtlX3ZhbHVlKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlUHRyOiBudW1iZXIsIHB0cjogbnVtYmVyKTogYW55IHtcclxuICAgIC8vIFRPRE8uLi5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiBfZW12YWxfZGVjcmVmKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBoYW5kbGU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAvLyBUT0RPLi4uXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG4iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlLCByZWdpc3RlckVtYm91bmQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuY29uc3QgQWxsRW51bXM6IFJlY29yZDxudW1iZXIsIFJlY29yZDxzdHJpbmcsIG51bWJlcj4+ID0ge307XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgc2l6ZTogbnVtYmVyLCBpc1NpZ25lZDogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgdGhlIGVudW0gb2JqZWN0IHRoYXQgdGhlIHVzZXIgd2lsbCBpbnNwZWN0IHRvIGxvb2sgZm9yIGVudW0gdmFsdWVzXHJcbiAgICAgICAgQWxsRW51bXNbdHlwZVB0cl0gPSB7fTtcclxuXHJcbiAgICAgICAgLy8gTWFyayB0aGlzIHR5cGUgYXMgcmVhZHkgdG8gYmUgdXNlZCBieSBvdGhlciB0eXBlcyBcclxuICAgICAgICAvLyAoZXZlbiBpZiB3ZSBkb24ndCBoYXZlIHRoZSBlbnVtIHZhbHVlcyB5ZXQsIGVudW0gdmFsdWVzXHJcbiAgICAgICAgLy8gdGhlbXNlbHZlcyBhcmVuJ3QgdXNlZCBieSBhbnkgcmVnaXN0cmF0aW9uIGZ1bmN0aW9ucy4pXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgbnVtYmVyPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAod2lyZVZhbHVlKSA9PiB7IHJldHVybiB7d2lyZVZhbHVlLCBqc1ZhbHVlOiB3aXJlVmFsdWV9OyB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoanNWYWx1ZSkgPT4geyByZXR1cm4geyB3aXJlVmFsdWU6IGpzVmFsdWUsIGpzVmFsdWUgfSB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIE1ha2UgdGhpcyB0eXBlIGF2YWlsYWJsZSBmb3IgdGhlIHVzZXJcclxuICAgICAgICByZWdpc3RlckVtYm91bmQodGhpcywgbmFtZSBhcyBuZXZlciwgQWxsRW51bXNbdHlwZVB0ciBhcyBhbnldKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZW51bV92YWx1ZSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3RW51bVR5cGU6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBlbnVtVmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgIC8vIEp1c3QgYWRkIHRoaXMgbmFtZSdzIHZhbHVlIHRvIHRoZSBleGlzdGluZyBlbnVtIHR5cGUuXHJcbiAgICAgICAgQWxsRW51bXNbcmF3RW51bVR5cGVdW25hbWVdID0gZW51bVZhbHVlO1xyXG4gICAgfSlcclxufSIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgYnl0ZVdpZHRoOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh2YWx1ZSkgPT4gKHsgd2lyZVZhbHVlOiB2YWx1ZSwganNWYWx1ZTogdmFsdWV9KSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKHZhbHVlKSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZX0pLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG4vKipcclxuICogXHJcbiAqIEBwYXJhbSBuYW1lUHRyIEEgcG9pbnRlciB0byB0aGUgbnVsbC10ZXJtaW5hdGVkIG5hbWUgb2YgdGhpcyBleHBvcnQuXHJcbiAqIEBwYXJhbSBhcmdDb3VudCBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0aGUgV0FTTSBmdW5jdGlvbiB0YWtlc1xyXG4gKiBAcGFyYW0gcmF3QXJnVHlwZXNQdHIgQSBwb2ludGVyIHRvIGFuIGFycmF5IG9mIG51bWJlcnMsIGVhY2ggcmVwcmVzZW50aW5nIGEgVHlwZUlELiBUaGUgMHRoIHZhbHVlIGlzIHRoZSByZXR1cm4gdHlwZSwgdGhlIHJlc3QgYXJlIHRoZSBhcmd1bWVudHMgdGhlbXNlbHZlcy5cclxuICogQHBhcmFtIHNpZ25hdHVyZSBBIHBvaW50ZXIgdG8gYSBudWxsLXRlcm1pbmF0ZWQgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgV0FTTSBzaWduYXR1cmUgb2YgdGhlIGZ1bmN0aW9uOyBlLmcuIFwiYHBgXCIsIFwiYGZwcGBcIiwgXCJgdnBgXCIsIFwiYGZwZmZmYFwiLCBldGMuXHJcbiAqIEBwYXJhbSByYXdJbnZva2VyUHRyIFRoZSBwb2ludGVyIHRvIHRoZSBmdW5jdGlvbiBpbiBXQVNNLlxyXG4gKiBAcGFyYW0gZnVuY3Rpb25JbmRleCBUaGUgaW5kZXggb2YgdGhlIGZ1bmN0aW9uIGluIHRoZSBgV2ViQXNzZW1ibHkuVGFibGVgIHRoYXQncyBleHBvcnRlZC5cclxuICogQHBhcmFtIGlzQXN5bmMgVW51c2VkLi4ucHJvYmFibHlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uKFxyXG4gICAgdGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICBuYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlcixcclxuICAgIHNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgcmF3SW52b2tlclB0cjogbnVtYmVyLFxyXG4gICAgZnVuY3Rpb25JbmRleDogbnVtYmVyLFxyXG4gICAgaXNBc3luYzogYm9vbGVhblxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICAodGhpcy5lbWJpbmQgYXMgYW55KVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIHNpZ25hdHVyZSwgcmF3SW52b2tlclB0ciwgZnVuY3Rpb25JbmRleCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgYnl0ZVdpZHRoOiBudW1iZXIsIG1pblZhbHVlOiBudW1iZXIsIG1heFZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgaXNVbnNpZ25lZFR5cGUgPSAobWluVmFsdWUgPT09IDApO1xyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IGlzVW5zaWduZWRUeXBlID8gZnJvbVdpcmVUeXBlVShieXRlV2lkdGgpIDogZnJvbVdpcmVUeXBlUyhieXRlV2lkdGgpO1xyXG5cclxuICAgICAgICAvLyBUT0RPOiBtaW4vbWF4VmFsdWUgYXJlbid0IHVzZWQgZm9yIGJvdW5kcyBjaGVja2luZyxcclxuICAgICAgICAvLyBidXQgaWYgdGhleSBhcmUsIG1ha2Ugc3VyZSB0byBhZGp1c3QgbWF4VmFsdWUgZm9yIHRoZSBzYW1lIHNpZ25lZC91bnNpZ25lZCB0eXBlIGlzc3VlXHJcbiAgICAgICAgLy8gb24gMzItYml0IHNpZ25lZCBpbnQgdHlwZXM6XHJcbiAgICAgICAgLy8gbWF4VmFsdWUgPSBmcm9tV2lyZVR5cGUobWF4VmFsdWUpO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChqc1ZhbHVlOiBudW1iZXIpID0+ICh7IHdpcmVWYWx1ZToganNWYWx1ZSwganNWYWx1ZSB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4vLyBXZSBuZWVkIGEgc2VwYXJhdGUgZnVuY3Rpb24gZm9yIHVuc2lnbmVkIGNvbnZlcnNpb24gYmVjYXVzZSBXQVNNIG9ubHkgaGFzIHNpZ25lZCB0eXBlcywgXHJcbi8vIGV2ZW4gd2hlbiBsYW5ndWFnZXMgaGF2ZSB1bnNpZ25lZCB0eXBlcywgYW5kIGl0IGV4cGVjdHMgdGhlIGNsaWVudCB0byBtYW5hZ2UgdGhlIHRyYW5zaXRpb24uXHJcbi8vIFNvIHRoaXMgaXMgdXMsIG1hbmFnaW5nIHRoZSB0cmFuc2l0aW9uLlxyXG5mdW5jdGlvbiBmcm9tV2lyZVR5cGVVKGJ5dGVXaWR0aDogbnVtYmVyKTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPG51bWJlciwgbnVtYmVyPltcImZyb21XaXJlVHlwZVwiXSB7XHJcbiAgICAvLyBTaGlmdCBvdXQgYWxsIHRoZSBiaXRzIGhpZ2hlciB0aGFuIHdoYXQgd291bGQgZml0IGluIHRoaXMgaW50ZWdlciB0eXBlLFxyXG4gICAgLy8gYnV0IGluIHBhcnRpY3VsYXIgbWFrZSBzdXJlIHRoZSBuZWdhdGl2ZSBiaXQgZ2V0cyBjbGVhcmVkIG91dCBieSB0aGUgPj4+IGF0IHRoZSBlbmQuXHJcbiAgICBjb25zdCBvdmVyZmxvd0JpdENvdW50ID0gMzIgLSA4ICogYnl0ZVdpZHRoO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh3aXJlVmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogKCh3aXJlVmFsdWUgPDwgb3ZlcmZsb3dCaXRDb3VudCkgPj4+IG92ZXJmbG93Qml0Q291bnQpIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVMoYnl0ZVdpZHRoOiBudW1iZXIpOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8bnVtYmVyLCBudW1iZXI+W1wiZnJvbVdpcmVUeXBlXCJdIHtcclxuICAgIC8vIFNoaWZ0IG91dCBhbGwgdGhlIGJpdHMgaGlnaGVyIHRoYW4gd2hhdCB3b3VsZCBmaXQgaW4gdGhpcyBpbnRlZ2VyIHR5cGUuXHJcbiAgICBjb25zdCBvdmVyZmxvd0JpdENvdW50ID0gMzIgLSA4ICogYnl0ZVdpZHRoO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh3aXJlVmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogKCh3aXJlVmFsdWUgPDwgb3ZlcmZsb3dCaXRDb3VudCkgPj4gb3ZlcmZsb3dCaXRDb3VudCkgfTtcclxuICAgIH1cclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgZXg6IGFueSk6IHZvaWQge1xyXG4gICAgLy8gVE9ET1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgSXM2NCB9IGZyb20gXCIuL2lzLTY0LmpzXCI7XHJcbmltcG9ydCB7IFBvaW50ZXJTaXplIH0gZnJvbSBcIi4vcG9pbnRlci5qc1wiO1xyXG5cclxuY29uc3QgU2l6ZVRTaXplOiA0IHwgOCA9IFBvaW50ZXJTaXplO1xyXG5leHBvcnQgY29uc3Qgc2V0U2l6ZVQ6IFwic2V0QmlnVWludDY0XCIgfCBcInNldFVpbnQzMlwiID0gKElzNjQgPyBcInNldEJpZ1VpbnQ2NFwiIDogXCJzZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgY29uc3QgZ2V0U2l6ZVQ6IFwiZ2V0QmlnVWludDY0XCIgfCBcImdldFVpbnQzMlwiID0gKElzNjQgPyBcImdldEJpZ1VpbnQ2NFwiIDogXCJnZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2l6ZVRTaXplKF9pbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4pOiA0IHsgcmV0dXJuIFNpemVUU2l6ZSBhcyA0OyB9XHJcblxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgZ2V0U2l6ZVQgfSBmcm9tIFwiLi9zaXpldC5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTYW1lIGFzIGByZWFkVWludDMyYCwgYnV0IHR5cGVkIGZvciBzaXplX3QgdmFsdWVzLCBhbmQgZnV0dXJlLXByb29mcyBhZ2FpbnN0IDY0LWJpdCBhcmNoaXRlY3R1cmVzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTaXplVChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+KTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbZ2V0U2l6ZVRdKHB0ciwgdHJ1ZSkgYXMgbnVtYmVyOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBzZXRTaXplVCB9IGZyb20gXCIuL3NpemV0LmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTaXplVChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+LCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbc2V0U2l6ZVRdKHB0ciwgdmFsdWUgYXMgbmV2ZXIsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDE2KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0VWludDE2KHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDMyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0VWludDMyKHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDgoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50OChwdHIsIHZhbHVlKTsgfVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRTaXplVCB9IGZyb20gXCIuLi8uLi91dGlsL3JlYWQtc2l6ZXQuanNcIjtcclxuaW1wb3J0IHsgZ2V0U2l6ZVRTaXplIH0gZnJvbSBcIi4uLy4uL3V0aWwvc2l6ZXQuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVTaXplVCB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXNpemV0LmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDE2IH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtdWludDE2LmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDggfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50OC5qc1wiO1xyXG5pbXBvcnQgeyBzdHJpbmdUb1V0ZjE2LCBzdHJpbmdUb1V0ZjMyLCBzdHJpbmdUb1V0ZjgsIHV0ZjE2VG9TdHJpbmdMLCB1dGYzMlRvU3RyaW5nTCwgdXRmOFRvU3RyaW5nTCB9IGZyb20gXCIuLi9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4vZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IFdpcmVDb252ZXJzaW9uUmVzdWx0IH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8vIFNoYXJlZCBiZXR3ZWVuIHN0ZDo6c3RyaW5nIGFuZCBzdGQ6OndzdHJpbmdcclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgY2hhcldpZHRoOiAxIHwgMiB8IDQsIG5hbWVQdHI6IG51bWJlcik6IHZvaWQge1xyXG5cclxuICAgIGNvbnN0IHV0ZlRvU3RyaW5nTCA9IChjaGFyV2lkdGggPT0gMSkgPyB1dGY4VG9TdHJpbmdMIDogKGNoYXJXaWR0aCA9PSAyKSA/IHV0ZjE2VG9TdHJpbmdMIDogdXRmMzJUb1N0cmluZ0w7XHJcbiAgICBjb25zdCBzdHJpbmdUb1V0ZiA9IChjaGFyV2lkdGggPT0gMSkgPyBzdHJpbmdUb1V0ZjggOiAoY2hhcldpZHRoID09IDIpID8gc3RyaW5nVG9VdGYxNiA6IHN0cmluZ1RvVXRmMzI7XHJcbiAgICBjb25zdCBVaW50QXJyYXkgPSAoY2hhcldpZHRoID09IDEpID8gVWludDhBcnJheSA6IChjaGFyV2lkdGggPT0gMikgPyBVaW50MTZBcnJheSA6IFVpbnQzMkFycmF5O1xyXG4gICAgY29uc3Qgd3JpdGVVaW50ID0gKGNoYXJXaWR0aCA9PSAxKSA/IHdyaXRlVWludDggOiAoY2hhcldpZHRoID09IDIpID8gd3JpdGVVaW50MTYgOiB3cml0ZVVpbnQzMjtcclxuXHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3RlcihpbXBsLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBmcm9tV2lyZVR5cGUgPSAocHRyOiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgLy8gVGhlIHdpcmUgdHlwZSBpcyBhIHBvaW50ZXIgdG8gYSBcInN0cnVjdFwiIChub3QgcmVhbGx5IGEgc3RydWN0IGluIHRoZSB1c3VhbCBzZW5zZS4uLlxyXG4gICAgICAgICAgICAvLyBleGNlcHQgbWF5YmUgaW4gbmV3ZXIgQyB2ZXJzaW9ucyBJIGd1ZXNzKSB3aGVyZSBcclxuICAgICAgICAgICAgLy8gdGhlIGZpcnN0IGZpZWxkIGlzIGEgc2l6ZV90IHJlcHJlc2VudGluZyB0aGUgbGVuZ3RoLFxyXG4gICAgICAgICAgICAvLyBBbmQgdGhlIHNlY29uZCBcImZpZWxkXCIgaXMgdGhlIHN0cmluZyBkYXRhIGl0c2VsZixcclxuICAgICAgICAgICAgLy8gZmluYWxseSBhbGwgZW5kZWQgd2l0aCBhbiBleHRyYSBudWxsIGJ5dGUuXHJcbiAgICAgICAgICAgIGxldCBsZW5ndGggPSByZWFkU2l6ZVQoaW1wbCwgcHRyKTtcclxuICAgICAgICAgICAgbGV0IHBheWxvYWQgPSBwdHIgKyBnZXRTaXplVFNpemUoaW1wbCk7XHJcbiAgICAgICAgICAgIGxldCBzdHI6IHN0cmluZyA9IFwiXCI7XHJcbiAgICAgICAgICAgIGxldCBkZWNvZGVTdGFydFB0ciA9IHBheWxvYWQ7XHJcbiAgICAgICAgICAgIHN0ciA9IHV0ZlRvU3RyaW5nTChpbXBsLCBkZWNvZGVTdGFydFB0ciwgbGVuZ3RoKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBzdHIsXHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgY2FsbCB0byBfZnJlZSBoYXBwZW5zIGJlY2F1c2UgRW1iaW5kIGNhbGxzIG1hbGxvYyBkdXJpbmcgaXRzIHRvV2lyZVR5cGUgZnVuY3Rpb24uXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU3VyZWx5IHRoZXJlJ3MgYSB3YXkgdG8gYXZvaWQgdGhpcyBjb3B5IG9mIGEgY29weSBvZiBhIGNvcHkgdGhvdWdoLCByaWdodD8gUmlnaHQ/XHJcbiAgICAgICAgICAgICAgICAgICAgaW1wbC5leHBvcnRzLmZyZWUocHRyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCB0b1dpcmVUeXBlID0gKHN0cjogc3RyaW5nKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBzdHJpbmc+ID0+IHtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlQXNBcnJheUJ1ZmZlckluSlMgPSBuZXcgVWludEFycmF5KHN0cmluZ1RvVXRmKHN0cikpO1xyXG5cclxuICAgICAgICAgICAgLy8gSXMgaXQgbW9yZSBvciBsZXNzIGNsZWFyIHdpdGggYWxsIHRoZXNlIHZhcmlhYmxlcyBleHBsaWNpdGx5IG5hbWVkP1xyXG4gICAgICAgICAgICAvLyBIb3BlZnVsbHkgbW9yZSwgYXQgbGVhc3Qgc2xpZ2h0bHkuXHJcbiAgICAgICAgICAgIGNvbnN0IGNoYXJDb3VudFdpdGhvdXROdWxsID0gdmFsdWVBc0FycmF5QnVmZmVySW5KUy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGNoYXJDb3VudFdpdGhOdWxsID0gY2hhckNvdW50V2l0aG91dE51bGwgKyAxO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYnl0ZUNvdW50V2l0aG91dE51bGwgPSBjaGFyQ291bnRXaXRob3V0TnVsbCAqIGNoYXJXaWR0aDtcclxuICAgICAgICAgICAgY29uc3QgYnl0ZUNvdW50V2l0aE51bGwgPSBjaGFyQ291bnRXaXRoTnVsbCAqIGNoYXJXaWR0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIDEuIChtKWFsbG9jYXRlIHNwYWNlIGZvciB0aGUgc3RydWN0IGFib3ZlXHJcbiAgICAgICAgICAgIGNvbnN0IHdhc21TdHJpbmdTdHJ1Y3QgPSBpbXBsLmV4cG9ydHMubWFsbG9jKGdldFNpemVUU2l6ZShpbXBsKSArIGJ5dGVDb3VudFdpdGhOdWxsKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDIuIFdyaXRlIHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZyB0byB0aGUgc3RydWN0XHJcbiAgICAgICAgICAgIGNvbnN0IHN0cmluZ1N0YXJ0ID0gd2FzbVN0cmluZ1N0cnVjdCArIGdldFNpemVUU2l6ZShpbXBsKTtcclxuICAgICAgICAgICAgd3JpdGVTaXplVChpbXBsLCB3YXNtU3RyaW5nU3RydWN0LCBjaGFyQ291bnRXaXRob3V0TnVsbCk7XHJcblxyXG4gICAgICAgICAgICAvLyAzLiBXcml0ZSB0aGUgc3RyaW5nIGRhdGEgdG8gdGhlIHN0cnVjdFxyXG4gICAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvbiA9IG5ldyBVaW50QXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHN0cmluZ1N0YXJ0LCBieXRlQ291bnRXaXRob3V0TnVsbCk7XHJcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLnNldCh2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDQuIFdyaXRlIGEgbnVsbCBieXRlXHJcbiAgICAgICAgICAgIHdyaXRlVWludChpbXBsLCBzdHJpbmdTdGFydCArIGJ5dGVDb3VudFdpdGhvdXROdWxsLCAwKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IGltcGwuZXhwb3J0cy5mcmVlKHdhc21TdHJpbmdTdHJ1Y3QpLFxyXG4gICAgICAgICAgICAgICAgd2lyZVZhbHVlOiB3YXNtU3RyaW5nU3RydWN0LFxyXG4gICAgICAgICAgICAgICAganNWYWx1ZTogc3RyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlKGltcGwsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGUsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICByZXR1cm4gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSh0aGlzLCB0eXBlUHRyLCAxLCBuYW1lUHRyKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCB0eXBlUHRyOiBudW1iZXIsIGNoYXJXaWR0aDogMiB8IDQsIG5hbWVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgcmV0dXJuIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkodGhpcywgdHlwZVB0ciwgY2hhcldpZHRoLCBuYW1lUHRyKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCAuLi5hcmdzOiBudW1iZXJbXSk6IHZvaWQge1xyXG4gICAgZGVidWdnZXI7XHJcbiAgICAvLyBUT0RPLi4uXHJcbn0iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4vZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4vZ2V0LXR5cGUtaW5mby5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVDb252ZXJzaW9uUmVzdWx0LCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXVD4gPSAoZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBwdHI6IG51bWJlcikgPT4gV1Q7XHJcbmV4cG9ydCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V1Q+ID0gKHNldHRlckNvbnRleHQ6IG51bWJlciwgcHRyOiBudW1iZXIsIHdpcmVUeXBlOiBXVCkgPT4gdm9pZDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbyB7XHJcbiAgICBuYW1lUHRyOiBudW1iZXI7XHJcbiAgICBfY29uc3RydWN0b3IoKTogbnVtYmVyO1xyXG4gICAgX2Rlc3RydWN0b3IocHRyOiBXaXJlVHlwZXMpOiB2b2lkO1xyXG4gICAgZWxlbWVudHM6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPGFueSwgYW55PltdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiB7XHJcblxyXG4gICAgLyoqIFRoZSBcInJhd1wiIGdldHRlciwgZXhwb3J0ZWQgZnJvbSBFbWJpbmQuIE5lZWRzIGNvbnZlcnNpb24gYmV0d2VlbiB0eXBlcy4gKi9cclxuICAgIHdhc21HZXR0ZXI6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8V1Q+O1xyXG5cclxuICAgIC8qKiBUaGUgXCJyYXdcIiBzZXR0ZXIsIGV4cG9ydGVkIGZyb20gRW1iaW5kLiBOZWVkcyBjb252ZXJzaW9uIGJldHdlZW4gdHlwZXMuICovXHJcbiAgICB3YXNtU2V0dGVyOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFdUPjtcclxuXHJcbiAgICAvKiogVGhlIG51bWVyaWMgdHlwZSBJRCBvZiB0aGUgdHlwZSB0aGUgZ2V0dGVyIHJldHVybnMgKi9cclxuICAgIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBUaGUgbnVtZXJpYyB0eXBlIElEIG9mIHRoZSB0eXBlIHRoZSBzZXR0ZXIgYWNjZXB0cyAqL1xyXG4gICAgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlcjtcclxuXHJcbiAgICAvKiogVW5rbm93bjsgdXNlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgZW1iaW5kIGdldHRlciAqL1xyXG4gICAgZ2V0dGVyQ29udGV4dDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBVbmtub3duOyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBlbWJpbmQgc2V0dGVyICovXHJcbiAgICBzZXR0ZXJDb250ZXh0OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiB7XHJcbiAgICAvKiogQSB2ZXJzaW9uIG9mIGB3YXNtR2V0dGVyYCB0aGF0IGhhbmRsZXMgdHlwZSBjb252ZXJzaW9uICovXHJcbiAgICByZWFkKHB0cjogV1QpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxXVCwgVD47XHJcblxyXG4gICAgLyoqIEEgdmVyc2lvbiBvZiBgd2FzbVNldHRlcmAgdGhhdCBoYW5kbGVzIHR5cGUgY29udmVyc2lvbiAqL1xyXG4gICAgd3JpdGUocHRyOiBudW1iZXIsIHZhbHVlOiBUKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8V1QsIFQ+O1xyXG5cclxuICAgIC8qKiBgZ2V0dGVyUmV0dXJuVHlwZUlkLCBidXQgcmVzb2x2ZWQgdG8gdGhlIHBhcnNlZCB0eXBlIGluZm8gKi9cclxuICAgIGdldHRlclJldHVyblR5cGU6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD47XHJcblxyXG4gICAgLyoqIGBzZXR0ZXJSZXR1cm5UeXBlSWQsIGJ1dCByZXNvbHZlZCB0byB0aGUgcGFyc2VkIHR5cGUgaW5mbyAqL1xyXG4gICAgc2V0dGVyQXJndW1lbnRUeXBlOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+O1xyXG59XHJcblxyXG4vLyBUZW1wb3Jhcnkgc2NyYXRjaCBtZW1vcnkgdG8gY29tbXVuaWNhdGUgYmV0d2VlbiByZWdpc3RyYXRpb24gY2FsbHMuXHJcbmV4cG9ydCBjb25zdCBjb21wb3NpdGVSZWdpc3RyYXRpb25zOiBSZWNvcmQ8bnVtYmVyLCBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvPiA9IHt9O1xyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfY29tcG9zaXRlPFQ+KGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgY29uc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3Q29uc3RydWN0b3I6IG51bWJlciwgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdEZXN0cnVjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl0gPSB7XHJcbiAgICAgICAgbmFtZVB0cixcclxuICAgICAgICBfY29uc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb24oaW1wbCwgY29uc3RydWN0b3JTaWduYXR1cmUsIHJhd0NvbnN0cnVjdG9yKSxcclxuICAgICAgICBfZGVzdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbihpbXBsLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yKSxcclxuICAgICAgICBlbGVtZW50czogW10sXHJcbiAgICB9O1xyXG5cclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHM8SSBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxhbnksIGFueT4+KGVsZW1lbnRzOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxhbnksIGFueT5bXSk6IFByb21pc2U8SVtdPiB7XHJcbiAgICBjb25zdCBkZXBlbmRlbmN5SWRzID0gWy4uLmVsZW1lbnRzLm1hcCgoZWx0KSA9PiBlbHQuZ2V0dGVyUmV0dXJuVHlwZUlkKSwgLi4uZWxlbWVudHMubWFwKChlbHQpID0+IGVsdC5zZXR0ZXJBcmd1bWVudFR5cGVJZCldO1xyXG5cclxuICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IGF3YWl0IGdldFR5cGVJbmZvKC4uLmRlcGVuZGVuY3lJZHMpO1xyXG4gICAgY29uc29sZS5hc3NlcnQoZGVwZW5kZW5jaWVzLmxlbmd0aCA9PSBlbGVtZW50cy5sZW5ndGggKiAyKTtcclxuXHJcbiAgICBjb25zdCBmaWVsZFJlY29yZHMgPSBlbGVtZW50cy5tYXAoKGZpZWxkLCBpKTogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPGFueSwgYW55PiA9PiB7XHJcbiAgICAgICAgY29uc3QgZ2V0dGVyUmV0dXJuVHlwZSA9IGRlcGVuZGVuY2llc1tpXSE7XHJcbiAgICAgICAgY29uc3Qgc2V0dGVyQXJndW1lbnRUeXBlID0gZGVwZW5kZW5jaWVzW2kgKyBlbGVtZW50cy5sZW5ndGhdITtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZChwdHI6IG51bWJlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gZ2V0dGVyUmV0dXJuVHlwZS5mcm9tV2lyZVR5cGUoZmllbGQud2FzbUdldHRlcihmaWVsZC5nZXR0ZXJDb250ZXh0LCBwdHIpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGUocHRyOiBudW1iZXIsIG86IGFueSkge1xyXG4gICAgICAgICAgICBjb25zdCByZXQgPSBzZXR0ZXJBcmd1bWVudFR5cGUudG9XaXJlVHlwZShvKTtcclxuICAgICAgICAgICAgZmllbGQud2FzbVNldHRlcihmaWVsZC5zZXR0ZXJDb250ZXh0LCBwdHIsIHJldC53aXJlVmFsdWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZ2V0dGVyUmV0dXJuVHlwZSxcclxuICAgICAgICAgICAgc2V0dGVyQXJndW1lbnRUeXBlLFxyXG4gICAgICAgICAgICByZWFkLFxyXG4gICAgICAgICAgICB3cml0ZSxcclxuICAgICAgICAgICAgLi4uZmllbGRcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZmllbGRSZWNvcmRzIGFzIElbXTtcclxufSIsICJpbXBvcnQgeyBydW5EZXN0cnVjdG9ycyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZGVzdHJ1Y3RvcnMuanNcIjtcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHMsIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfY29tcG9zaXRlLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbywgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyLCBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvLCBjb21wb3NpdGVSZWdpc3RyYXRpb25zIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1jb21wb3NpdGUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5cclxuXHJcbmludGVyZmFjZSBBcnJheVJlZ2lzdHJhdGlvbkluZm8gZXh0ZW5kcyBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvIHsgfVxyXG5pbnRlcmZhY2UgQXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4geyB9XHJcbmludGVyZmFjZSBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdULCBUPiB7IH1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXk8VD4odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGU8VD4odGhpcywgcmF3VHlwZVB0ciwgbmFtZVB0ciwgY29uc3RydWN0b3JTaWduYXR1cmUsIHJhd0NvbnN0cnVjdG9yLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yKTtcclxuXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheV9lbGVtZW50PFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUdXBsZVR5cGU6IG51bWJlciwgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsIGdldHRlclNpZ25hdHVyZTogbnVtYmVyLCBnZXR0ZXI6IG51bWJlciwgZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLCBzZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgc2V0dGVyOiBudW1iZXIsIHNldHRlckNvbnRleHQ6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUdXBsZVR5cGVdLmVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgIGdldHRlckNvbnRleHQsXHJcbiAgICAgICAgc2V0dGVyQ29udGV4dCxcclxuICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgc2V0dGVyQXJndW1lbnRUeXBlSWQsXHJcbiAgICAgICAgd2FzbUdldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFQ+Pih0aGlzLCBnZXR0ZXJTaWduYXR1cmUsIGdldHRlciksXHJcbiAgICAgICAgd2FzbVNldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFQ+Pih0aGlzLCBzZXR0ZXJTaWduYXR1cmUsIHNldHRlcilcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9hcnJheTxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb25zdCByZWcgPSBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdO1xyXG4gICAgZGVsZXRlIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCByZWcubmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZmllbGRSZWNvcmRzID0gYXdhaXQgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHM8QXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8YW55LCBUPj4ocmVnLmVsZW1lbnRzKTtcclxuXHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxhbnksIHVua25vd25bXT4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHB0cikgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmV0OiAoYW55W10gJiBEaXNwb3NhYmxlKSA9IFtdIGFzIGFueTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlZy5lbGVtZW50cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkID0gZmllbGRSZWNvcmRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IGZpZWxkUmVjb3Jkc1tpXS5yZWFkKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0W2ldID0ganNWYWx1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldFtTeW1ib2wuZGlzcG9zZV0gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIE9iamVjdC5mcmVlemUocmV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IHJldCxcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHJldFtTeW1ib2wuZGlzcG9zZV0oKVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKG8pID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50RGVzdHJ1Y3RvcnM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cclxuICAgICAgICAgICAgICAgIGNvbnN0IHB0ciA9IHJlZy5fY29uc3RydWN0b3IoKTtcclxuICAgICAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGZpZWxkIG9mIGZpZWxkUmVjb3Jkcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IGZpZWxkLndyaXRlKHB0ciwgb1tpXSBhcyBhbnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICsraTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IG8sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkRlc3RydWN0b3JzKGVsZW1lbnREZXN0cnVjdG9ycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50cywgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlciwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm8sIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRSwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlciwgQ29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbywgY29tcG9zaXRlUmVnaXN0cmF0aW9ucyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IFdpcmVUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgcmVhZExhdGluMVN0cmluZyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuaW50ZXJmYWNlIFN0cnVjdFJlZ2lzdHJhdGlvbkluZm8gZXh0ZW5kcyBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvIHtcclxuICAgIGVsZW1lbnRzOiBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88YW55LCBhbnk+W107XHJcbn1cclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+IHtcclxuICAgIC8qKiBUaGUgbmFtZSBvZiB0aGlzIGZpZWxkICovXHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4sIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCwgVD4geyB9XHJcblxyXG4vKipcclxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgZmlyc3QsIHRvIHN0YXJ0IHRoZSByZWdpc3RyYXRpb24gb2YgYSBzdHJ1Y3QgYW5kIGFsbCBpdHMgZmllbGRzLiBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZTogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0NvbnN0cnVjdG9yOiBudW1iZXIsIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3RGVzdHJ1Y3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVdID0ge1xyXG4gICAgICAgIG5hbWVQdHIsXHJcbiAgICAgICAgX2NvbnN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPCgpID0+IG51bWJlcj4odGhpcywgY29uc3RydWN0b3JTaWduYXR1cmUsIHJhd0NvbnN0cnVjdG9yKSxcclxuICAgICAgICBfZGVzdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbjwoKSA9PiB2b2lkPih0aGlzLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yKSxcclxuICAgICAgICBlbGVtZW50czogW10sXHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBwZXIgZmllbGQsIGFmdGVyIGBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdGAgYW5kIGJlZm9yZSBgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3RgLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0X2ZpZWxkPFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlUHRyOiBudW1iZXIsIGZpZWxkTmFtZTogbnVtYmVyLCBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlciwgZ2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIGdldHRlcjogbnVtYmVyLCBnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsIHNldHRlclNpZ25hdHVyZTogbnVtYmVyLCBzZXR0ZXI6IG51bWJlciwgc2V0dGVyQ29udGV4dDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAoY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXSBhcyBTdHJ1Y3RSZWdpc3RyYXRpb25JbmZvKS5lbGVtZW50cy5wdXNoKHtcclxuICAgICAgICBuYW1lOiByZWFkTGF0aW4xU3RyaW5nKHRoaXMsIGZpZWxkTmFtZSksXHJcbiAgICAgICAgZ2V0dGVyQ29udGV4dCxcclxuICAgICAgICBzZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIGdldHRlclJldHVyblR5cGVJZCxcclxuICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZCxcclxuICAgICAgICB3YXNtR2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8VD4+KHRoaXMsIGdldHRlclNpZ25hdHVyZSwgZ2V0dGVyKSxcclxuICAgICAgICB3YXNtU2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8VD4+KHRoaXMsIHNldHRlclNpZ25hdHVyZSwgc2V0dGVyKSxcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsbGVkIGFmdGVyIGFsbCBvdGhlciBvYmplY3QgcmVnaXN0cmF0aW9uIGZ1bmN0aW9ucyBhcmUgY2FsbGVkOyB0aGlzIGNvbnRhaW5zIHRoZSBhY3R1YWwgcmVnaXN0cmF0aW9uIGNvZGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3Q8VD4odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29uc3QgcmVnID0gY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXTtcclxuICAgIGRlbGV0ZSBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgcmVnLm5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGF3YWl0IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzPFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mb0U8YW55LCBUPj4ocmVnLmVsZW1lbnRzKTtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlKHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6IChwdHIpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50RGVzdHJ1Y3RvcnM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJldDogRGlzcG9zYWJsZSA9IHt9IGFzIGFueTtcclxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIFN5bWJvbC5kaXNwb3NlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnLmVsZW1lbnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmllbGQgPSBmaWVsZFJlY29yZHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGRSZWNvcmRzW2ldLnJlYWQocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocmV0LCBmaWVsZC5uYW1lLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBqc1ZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBPYmplY3QuZnJlZXplKHJldCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiByZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldFtTeW1ib2wuZGlzcG9zZV0oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHRyID0gcmVnLl9jb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZmllbGQgb2YgZmllbGRSZWNvcmRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGQud3JpdGUocHRyLCBvW2ZpZWxkLm5hbWUgYXMgbmV2ZXJdKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogbyxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIG5hbWUgPT4ge1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIHVuZGVmaW5lZD4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKCkgPT4gKHsganNWYWx1ZTogdW5kZWZpbmVkISwgd2lyZVZhbHVlOiB1bmRlZmluZWQhIH0pLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoKSA9PiAoeyBqc1ZhbHVlOiB1bmRlZmluZWQhLCB3aXJlVmFsdWU6IHVuZGVmaW5lZCEgfSlcclxuICAgICAgICB9KTtcclxuICAgIH0pXHJcblxyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWVtb3J5R3Jvd3RoRXZlbnREZXRhaWwgeyBpbmRleDogbnVtYmVyIH1cclxuXHJcbmV4cG9ydCBjbGFzcyBNZW1vcnlHcm93dGhFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PE1lbW9yeUdyb3d0aEV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKFwiTWVtb3J5R3Jvd3RoRXZlbnRcIiwgeyBjYW5jZWxhYmxlOiBmYWxzZSwgZGV0YWlsOiB7IGluZGV4IH0gfSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGluZGV4OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHRoaXMuY2FjaGVkTWVtb3J5VmlldyA9IG5ldyBEYXRhVmlldyh0aGlzLmV4cG9ydHMubWVtb3J5LmJ1ZmZlcik7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IE1lbW9yeUdyb3d0aEV2ZW50KHRoaXMsIGluZGV4KSk7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTZWdmYXVsdEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoXCJTZWdtZW50YXRpb24gZmF1bHRcIik7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIFVzZWQgYnkgU0FGRV9IRUFQXHJcbmV4cG9ydCBmdW5jdGlvbiBzZWdmYXVsdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9Pik6IG5ldmVyIHtcclxuICAgIHRocm93IG5ldyBTZWdmYXVsdEVycm9yKCk7XHJcbn1cclxuIiwgImltcG9ydCB7IEVtc2NyaXB0ZW5FeGNlcHRpb24gfSBmcm9tIFwiLi4vZW52L3Rocm93X2V4Y2VwdGlvbl93aXRoX3N0YWNrX3RyYWNlLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgZ2V0UG9pbnRlclNpemUgfSBmcm9tIFwiLi4vdXRpbC9wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRQb2ludGVyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHV0ZjhUb1N0cmluZ1ogfSBmcm9tIFwiLi9zdHJpbmcuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhjZXB0aW9uTWVzc2FnZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgZXg6IEVtc2NyaXB0ZW5FeGNlcHRpb24pOiBbc3RyaW5nLCBzdHJpbmddIHtcclxuICAgIHZhciBwdHIgPSBnZXRDcHBFeGNlcHRpb25UaHJvd25PYmplY3RGcm9tV2ViQXNzZW1ibHlFeGNlcHRpb24oaW1wbCwgZXgpO1xyXG4gICAgcmV0dXJuIGdldEV4Y2VwdGlvbk1lc3NhZ2VDb21tb24oaW1wbCwgcHRyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q3BwRXhjZXB0aW9uVGhyb3duT2JqZWN0RnJvbVdlYkFzc2VtYmx5RXhjZXB0aW9uKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBleDogRW1zY3JpcHRlbkV4Y2VwdGlvbikge1xyXG4gICAgLy8gSW4gV2FzbSBFSCwgdGhlIHZhbHVlIGV4dHJhY3RlZCBmcm9tIFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiBpcyBhIHBvaW50ZXJcclxuICAgIC8vIHRvIHRoZSB1bndpbmQgaGVhZGVyLiBDb252ZXJ0IGl0IHRvIHRoZSBhY3R1YWwgdGhyb3duIHZhbHVlLlxyXG4gICAgY29uc3QgdW53aW5kX2hlYWRlcjogbnVtYmVyID0gZXguZ2V0QXJnKChpbXBsLmV4cG9ydHMpLl9fY3BwX2V4Y2VwdGlvbiwgMCk7XHJcbiAgICByZXR1cm4gKGltcGwuZXhwb3J0cykuX190aHJvd25fb2JqZWN0X2Zyb21fdW53aW5kX2V4Y2VwdGlvbih1bndpbmRfaGVhZGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3RhY2tTYXZlKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+KSB7XHJcbiAgICByZXR1cm4gaW1wbC5leHBvcnRzLmVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2N1cnJlbnQoKTtcclxufVxyXG5mdW5jdGlvbiBzdGFja0FsbG9jKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBzaXplOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBpbXBsLmV4cG9ydHMuX2Vtc2NyaXB0ZW5fc3RhY2tfYWxsb2Moc2l6ZSk7XHJcbn1cclxuZnVuY3Rpb24gc3RhY2tSZXN0b3JlKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBzdGFja1BvaW50ZXI6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGltcGwuZXhwb3J0cy5fZW1zY3JpcHRlbl9zdGFja19yZXN0b3JlKHN0YWNrUG9pbnRlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEV4Y2VwdGlvbk1lc3NhZ2VDb21tb24oaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyKTogW3N0cmluZywgc3RyaW5nXSB7XHJcbiAgICBjb25zdCBzcCA9IHN0YWNrU2F2ZShpbXBsKTtcclxuICAgIGNvbnN0IHR5cGVfYWRkcl9hZGRyID0gc3RhY2tBbGxvYyhpbXBsLCBnZXRQb2ludGVyU2l6ZShpbXBsKSk7XHJcbiAgICBjb25zdCBtZXNzYWdlX2FkZHJfYWRkciA9IHN0YWNrQWxsb2MoaW1wbCwgZ2V0UG9pbnRlclNpemUoaW1wbCkpO1xyXG4gICAgaW1wbC5leHBvcnRzLl9fZ2V0X2V4Y2VwdGlvbl9tZXNzYWdlKHB0ciwgdHlwZV9hZGRyX2FkZHIsIG1lc3NhZ2VfYWRkcl9hZGRyKTtcclxuICAgIGNvbnN0IHR5cGVfYWRkciA9IHJlYWRQb2ludGVyKGltcGwsIHR5cGVfYWRkcl9hZGRyKTtcclxuICAgIGNvbnN0IG1lc3NhZ2VfYWRkciA9IHJlYWRQb2ludGVyKGltcGwsIG1lc3NhZ2VfYWRkcl9hZGRyKTtcclxuICAgIGNvbnN0IHR5cGUgPSB1dGY4VG9TdHJpbmdaKGltcGwsIHR5cGVfYWRkcik7XHJcbiAgICBpbXBsLmV4cG9ydHMuZnJlZSh0eXBlX2FkZHIpO1xyXG4gICAgbGV0IG1lc3NhZ2UgPSBcIlwiO1xyXG4gICAgaWYgKG1lc3NhZ2VfYWRkcikge1xyXG4gICAgICAgIG1lc3NhZ2UgPSB1dGY4VG9TdHJpbmdaKGltcGwsIG1lc3NhZ2VfYWRkcik7XHJcbiAgICAgICAgaW1wbC5leHBvcnRzLmZyZWUobWVzc2FnZV9hZGRyKTtcclxuICAgIH1cclxuICAgIHN0YWNrUmVzdG9yZShpbXBsLCBzcCk7XHJcbiAgICByZXR1cm4gW3R5cGUsIG1lc3NhZ2VdO1xyXG59XHJcblxyXG4iLCAiaW1wb3J0IHsgZ2V0RXhjZXB0aW9uTWVzc2FnZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9leGNlcHRpb24uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYkFzc2VtYmx5RXhjZXB0aW9uRXZlbnREZXRhaWwgeyBleGNlcHRpb246IFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiB9XHJcblxyXG5kZWNsYXJlIG5hbWVzcGFjZSBXZWJBc3NlbWJseSB7XHJcbiAgICBjbGFzcyBFeGNlcHRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHRhZzogbnVtYmVyLCBwYXlsb2FkOiBudW1iZXJbXSwgb3B0aW9ucz86IHsgdHJhY2VTdGFjaz86IGJvb2xlYW4gfSk7XHJcbiAgICAgICAgZ2V0QXJnKGV4Y2VwdGlvblRhZzogbnVtYmVyLCBpbmRleDogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVtc2NyaXB0ZW5FeGNlcHRpb24gZXh0ZW5kcyBXZWJBc3NlbWJseS5FeGNlcHRpb24ge1xyXG4gICAgbWVzc2FnZTogW3N0cmluZywgc3RyaW5nXTtcclxufVxyXG4vKlxyXG5leHBvcnQgY2xhc3MgV2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PFdlYkFzc2VtYmx5RXhjZXB0aW9uRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBleGNlcHRpb246IFdlYkFzc2VtYmx5LkV4Y2VwdGlvbikge1xyXG4gICAgICAgIHN1cGVyKFwiV2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudFwiLCB7IGNhbmNlbGFibGU6IHRydWUsIGRldGFpbDogeyBleGNlcHRpb24gfSB9KVxyXG4gICAgfVxyXG59XHJcbiovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Rocm93X2V4Y2VwdGlvbl93aXRoX3N0YWNrX3RyYWNlKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBleDogYW55KTogdm9pZCB7XHJcbiAgICBjb25zdCB0ID0gbmV3IFdlYkFzc2VtYmx5LkV4Y2VwdGlvbigodGhpcy5leHBvcnRzKS5fX2NwcF9leGNlcHRpb24sIFtleF0sIHsgdHJhY2VTdGFjazogdHJ1ZSB9KSBhcyBFbXNjcmlwdGVuRXhjZXB0aW9uO1xyXG4gICAgdC5tZXNzYWdlID0gZ2V0RXhjZXB0aW9uTWVzc2FnZSh0aGlzLCB0KTtcclxuICAgIHRocm93IHQ7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX3R6c2V0X2pzKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LHRpbWV6b25lOiBudW1iZXIsIGRheWxpZ2h0OiBudW1iZXIsIHN0ZF9uYW1lOiBudW1iZXIsIGRzdF9uYW1lOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGRlYnVnZ2VyO1xyXG4gICAgLy8gVE9ET1xyXG4gIH0iLCAiaW1wb3J0IHsgRW1ib3VuZFR5cGVzIH0gZnJvbSBcIi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRXZlbnRUeXBlc01hcCB9IGZyb20gXCIuL19wcml2YXRlL2V2ZW50LXR5cGVzLW1hcC5qc1wiO1xyXG5pbXBvcnQgeyBLbm93bkluc3RhbmNlRXhwb3J0czIgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuaW50ZXJmYWNlIEluc3RhbnRpYXRlZFdhc2lFdmVudFRhcmdldCBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXI8SyBleHRlbmRzIGtleW9mIEV2ZW50VHlwZXNNYXA+KHR5cGU6IEssIGxpc3RlbmVyOiAodGhpczogRmlsZVJlYWRlciwgZXY6IEV2ZW50VHlwZXNNYXBbS10pID0+IGFueSwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHZvaWQ7XHJcbiAgICBhZGRFdmVudExpc3RlbmVyKHR5cGU6IHN0cmluZywgY2FsbGJhY2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgfCBudWxsLCBvcHRpb25zPzogRXZlbnRMaXN0ZW5lck9wdGlvbnMgfCBib29sZWFuKTogdm9pZDtcclxufVxyXG5cclxuXHJcbi8vICBUaGlzIHJlYXNzaWdubWVudCBpcyBhIFR5cGVzY3JpcHQgaGFjayB0byBhZGQgY3VzdG9tIHR5cGVzIHRvIGFkZEV2ZW50TGlzdGVuZXIuLi5cclxuY29uc3QgSW5zdGFudGlhdGVkV2FzaUV2ZW50VGFyZ2V0ID0gRXZlbnRUYXJnZXQgYXMge25ldygpOiBJbnN0YW50aWF0ZWRXYXNpRXZlbnRUYXJnZXQ7IHByb3RvdHlwZTogSW5zdGFudGlhdGVkV2FzaUV2ZW50VGFyZ2V0fTtcclxuXHJcbi8qKlxyXG4gKiBFeHRlbnNpb24gb2YgYFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlYCB0aGF0IGlzIGFsc28gYW4gYEV2ZW50VGFyZ2V0YCBmb3IgYWxsIFdBU0kgXCJldmVudFwicy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBJbnN0YW50aWF0ZWRXYXNpPEUgZXh0ZW5kcyB7fT4gZXh0ZW5kcyBJbnN0YW50aWF0ZWRXYXNpRXZlbnRUYXJnZXQgaW1wbGVtZW50cyBXZWJBc3NlbWJseS5XZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZSB7XHJcbiAgICAvKiogVGhlIGBXZWJBc3NlbWJseS5Nb2R1bGVgIHRoaXMgaW5zdGFuY2Ugd2FzIGJ1aWx0IGZyb20uIFJhcmVseSB1c2VmdWwgYnkgaXRzZWxmLiAqL1xyXG4gICAgcHVibGljIG1vZHVsZTogV2ViQXNzZW1ibHkuTW9kdWxlO1xyXG4gICAgLyoqIFRoZSBgV2ViQXNzZW1ibHkuTW9kdWxlYCB0aGlzIGluc3RhbmNlIHdhcyBidWlsdCBmcm9tLiBSYXJlbHkgdXNlZnVsIGJ5IGl0c2VsZi4gKi9cclxuICAgIHB1YmxpYyBpbnN0YW5jZTogV2ViQXNzZW1ibHkuSW5zdGFuY2U7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb250YWlucyBldmVyeXRoaW5nIGV4cG9ydGVkIHVzaW5nIGVtYmluZC5cclxuICAgICAqIFxyXG4gICAgICogVGhlc2UgYXJlIHNlcGFyYXRlIGZyb20gcmVndWxhciBleHBvcnRzIG9uIGBpbnN0YW5jZS5leHBvcnRgLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgZW1iaW5kOiBFbWJvdW5kVHlwZXM7XHJcblxyXG4gICAgLyoqIFxyXG4gICAgICogVGhlIFwicmF3XCIgV0FTTSBleHBvcnRzLiBOb25lIGFyZSBwcmVmaXhlZCB3aXRoIFwiX1wiLlxyXG4gICAgICogXHJcbiAgICAgKiBObyBjb252ZXJzaW9uIGlzIHBlcmZvcm1lZCBvbiB0aGUgdHlwZXMgaGVyZTsgZXZlcnl0aGluZyB0YWtlcyBvciByZXR1cm5zIGEgbnVtYmVyLlxyXG4gICAgICogXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBleHBvcnRzOiBFICYgS25vd25JbnN0YW5jZUV4cG9ydHMyO1xyXG4gICAgcHVibGljIGNhY2hlZE1lbW9yeVZpZXc6IERhdGFWaWV3O1xyXG5cclxuICAgIC8qKiBOb3QgaW50ZW5kZWQgdG8gYmUgY2FsbGVkIGRpcmVjdGx5LiBVc2UgdGhlIGBpbnN0YW50aWF0ZWAgZnVuY3Rpb24gaW5zdGVhZCwgd2hpY2ggcmV0dXJucyBvbmUgb2YgdGhlc2UuICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMubW9kdWxlID0gdGhpcy5pbnN0YW5jZSA9IHRoaXMuZXhwb3J0cyA9IHRoaXMuY2FjaGVkTWVtb3J5VmlldyA9IG51bGwhXHJcbiAgICAgICAgdGhpcy5lbWJpbmQgPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIF9pbml0KG1vZHVsZTogV2ViQXNzZW1ibHkuTW9kdWxlLCBpbnN0YW5jZTogV2ViQXNzZW1ibHkuSW5zdGFuY2UpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLm1vZHVsZSA9IG1vZHVsZTtcclxuICAgICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICAgICAgdGhpcy5leHBvcnRzID0gaW5zdGFuY2UuZXhwb3J0cyBhcyBFIGFzIEUgJiBLbm93bkluc3RhbmNlRXhwb3J0czI7XHJcbiAgICAgICAgdGhpcy5jYWNoZWRNZW1vcnlWaWV3ID0gbmV3IERhdGFWaWV3KHRoaXMuZXhwb3J0cy5tZW1vcnkuYnVmZmVyKTtcclxuICAgIH1cclxufVxyXG5cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbnRpcmVQdWJsaWNJbnRlcmZhY2UgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuXHJcblxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2FzaVJldHVybjxFIGV4dGVuZHMge30sIEkgZXh0ZW5kcyBFbnRpcmVQdWJsaWNJbnRlcmZhY2U+IHtcclxuICAgIGltcG9ydHM6IEk7XHJcbiAgICB3YXNpUmVhZHk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj47XHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG4vKipcclxuICogSW5zdGFudGlhdGUgdGhlIFdBU0kgaW50ZXJmYWNlLCBiaW5kaW5nIGFsbCBpdHMgZnVuY3Rpb25zIHRvIHRoZSBXQVNNIGluc3RhbmNlIGl0c2VsZi5cclxuICogXHJcbiAqIE11c3QgYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoLCBlLmcuLCBgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVgLiBCZWNhdXNlIHRoYXQgYW5kIHRoaXMgYm90aCByZXF1aXJlIGVhY2ggb3RoZXIgY2lyY3VsYXJseSwgXHJcbiAqIGBpbnN0YW50aWF0ZVN0cmVhbWluZ1dpdGhXYXNpYCBhbmQgYGluc3RhbnRpYXRlV2l0aFdhc2lgIGFyZSBjb252ZW5pZW5jZSBmdW5jdGlvbnMgdGhhdCBkbyBib3RoIGF0IG9uY2UuXHJcbiAqIFxyXG4gKiBUaGUgV0FTSSBpbnRlcmZhY2UgZnVuY3Rpb25zIGNhbid0IGJlIHVzZWQgYWxvbmUgLS0gdGhleSBuZWVkIGNvbnRleHQgbGlrZSAod2hhdCBtZW1vcnkgaXMgdGhpcyBhIHBvaW50ZXIgaW4pIGFuZCBzdWNoLlxyXG4gKiBcclxuICogVGhpcyBmdW5jdGlvbiBwcm92aWRlcyB0aGF0IGNvbnRleHQgdG8gYW4gaW1wb3J0IGJlZm9yZSBpdCdzIHBhc3NlZCB0byBhbiBgSW5zdGFuY2VgIGZvciBjb25zdHJ1Y3Rpb24uXHJcbiAqIFxyXG4gKiBAcmVtYXJrcyBJbnRlbmRlZCB1c2FnZTpcclxuICogXHJcbiAqIGBgYHR5cGVzY3JpcHRcclxuICogaW1wb3J0IHsgZmRfd3JpdGUsIHByb2NfZXhpdCB9IGZyb20gXCJiYXNpYy1ldmVudC13YXNpXCIgXHJcbiAqIC8vIFdhaXRpbmcgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS90YzM5L3Byb3Bvc2FsLXByb21pc2Utd2l0aC1yZXNvbHZlcnMuLi5cclxuICogbGV0IHJlc29sdmU6IChpbmZvOiBXZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZSkgPT4gdm9pZDtcclxuICogbGV0IHJlamVjdDogKGVycm9yOiBhbnkpID0+IHZvaWQ7XHJcbiAqIGxldCBwcm9taXNlID0gbmV3IFByb21pc2U8V2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2U+KChyZXMsIHJlaikgPT4ge1xyXG4gKiAgICAgcmVzb2x2ZSA9IHJlcztcclxuICogICAgIHJlamVjdCA9IHJlajtcclxuICogfSk7XHJcbiAqIFxyXG4gKiBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZyhzb3VyY2UsIHsgLi4ubWFrZVdhc2lJbnRlcmZhY2UocHJvbWlzZS50aGVuKHMgPT4gcy5pbnN0YW5jZSksIHsgZmRfd3JpdGUsIHByb2NfZXhpdCB9KSB9KTtcclxuICogYGBgXHJcbiAqIChbUGxlYXNlIHBsZWFzZSBwbGVhc2UgcGxlYXNlIHBsZWFzZV0oaHR0cHM6Ly9naXRodWIuY29tL3RjMzkvcHJvcG9zYWwtcHJvbWlzZS13aXRoLXJlc29sdmVycykpXHJcbiAqIFxyXG4gKiBAcGFyYW0gd2FzbUluc3RhbmNlIFxyXG4gKiBAcGFyYW0gdW5ib3VuZEltcG9ydHMgXHJcbiAqIEByZXR1cm5zIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbnRpYXRlV2FzaTxFIGV4dGVuZHMge30sIEkgZXh0ZW5kcyBFbnRpcmVQdWJsaWNJbnRlcmZhY2U+KHdhc21JbnN0YW5jZTogUHJvbWlzZTxXZWJBc3NlbWJseS5XZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZT4sIHVuYm91bmRJbXBvcnRzOiBJLCB7IGRpc3BhdGNoRXZlbnQgfTogeyBkaXNwYXRjaEV2ZW50PyhldmVudDogRXZlbnQpOiBib29sZWFuIH0gPSB7fSk6IFdhc2lSZXR1cm48RSwgST4ge1xyXG4gICAgbGV0IHJlc29sdmUhOiAodmFsdWU6IEluc3RhbnRpYXRlZFdhc2k8RT4pID0+IHZvaWQ7XHJcbiAgICBsZXQgcmV0ID0gbmV3IEluc3RhbnRpYXRlZFdhc2k8RT4oKTtcclxuICAgIHdhc21JbnN0YW5jZS50aGVuKChvKSA9PiB7XHJcbiAgICAgICAgY29uc3QgeyBpbnN0YW5jZSwgbW9kdWxlIH0gPSBvO1xyXG5cclxuICAgICAgICAvLyBOZWVkcyB0byBjb21lIGJlZm9yZSBfaW5pdGlhbGl6ZSgpIG9yIF9zdGFydCgpLlxyXG4gICAgICAgIChyZXQgYXMgYW55KS5faW5pdChtb2R1bGUsIGluc3RhbmNlKTtcclxuXHJcbiAgICAgICAgY29uc29sZS5hc3NlcnQoKFwiX2luaXRpYWxpemVcIiBpbiBpbnN0YW5jZS5leHBvcnRzKSAhPSBcIl9zdGFydFwiIGluIGluc3RhbmNlLmV4cG9ydHMsIGBFeHBlY3RlZCBlaXRoZXIgX2luaXRpYWxpemUgWE9SIF9zdGFydCB0byBiZSBleHBvcnRlZCBmcm9tIHRoaXMgV0FTTS5gKTtcclxuICAgICAgICBpZiAoXCJfaW5pdGlhbGl6ZVwiIGluIGluc3RhbmNlLmV4cG9ydHMpIHtcclxuICAgICAgICAgICAgKGluc3RhbmNlLmV4cG9ydHMgYXMgYW55KS5faW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChcIl9zdGFydFwiIGluIGluc3RhbmNlLmV4cG9ydHMpIHtcclxuICAgICAgICAgICAgKGluc3RhbmNlLmV4cG9ydHMgYXMgYW55KS5fc3RhcnQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVzb2x2ZShyZXQpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsIHRoZSBmdW5jdGlvbnMgd2UndmUgYmVlbiBwYXNzZWQgd2VyZSBpbXBvcnRlZCBhbmQgaGF2ZW4ndCBiZWVuIGJvdW5kIHlldC5cclxuICAgIC8vIFJldHVybiBhIG5ldyBvYmplY3Qgd2l0aCBlYWNoIG1lbWJlciBib3VuZCB0byB0aGUgcHJpdmF0ZSBpbmZvcm1hdGlvbiB3ZSBwYXNzIGFyb3VuZC5cclxuXHJcbiAgICBjb25zdCB3YXNpX3NuYXBzaG90X3ByZXZpZXcxID0gYmluZEFsbEZ1bmNzKHJldCwgdW5ib3VuZEltcG9ydHMud2FzaV9zbmFwc2hvdF9wcmV2aWV3MSk7XHJcbiAgICBjb25zdCBlbnYgPSBiaW5kQWxsRnVuY3MocmV0LCB1bmJvdW5kSW1wb3J0cy5lbnYpO1xyXG5cclxuICAgIGNvbnN0IGJvdW5kSW1wb3J0cyA9IHsgd2FzaV9zbmFwc2hvdF9wcmV2aWV3MSwgZW52IH0gYXMgSTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaW1wb3J0czogYm91bmRJbXBvcnRzLFxyXG4gICAgICAgIC8vIFVudGlsIHRoaXMgcmVzb2x2ZXMsIG5vIFdBU0kgZnVuY3Rpb25zIGNhbiBiZSBjYWxsZWQgKGFuZCBieSBleHRlbnNpb24gbm8gd2FzbSBleHBvcnRzIGNhbiBiZSBjYWxsZWQpXHJcbiAgICAgICAgLy8gSXQgcmVzb2x2ZXMgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGlucHV0IHByb21pc2UgdG8gdGhlIGluc3RhbmNlJm1vZHVsZSByZXNvbHZlc1xyXG4gICAgICAgIHdhc2lSZWFkeTogbmV3IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj4oKHJlcykgPT4geyByZXNvbHZlISA9IHJlcyB9KVxyXG4gICAgfTtcclxufVxyXG5cclxuXHJcbi8vIEdpdmVuIGFuIG9iamVjdCwgYmluZHMgZWFjaCBmdW5jdGlvbiBpbiB0aGF0IG9iamVjdCB0byBwIChzaGFsbG93bHkpLlxyXG5mdW5jdGlvbiBiaW5kQWxsRnVuY3M8UiBleHRlbmRzIHt9PihwOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcjogUik6IFIge1xyXG4gICAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhPYmplY3QuZW50cmllcyhyKS5tYXAoKFtrZXksIGZ1bmNdKSA9PiB7IHJldHVybiBba2V5LCAodHlwZW9mIGZ1bmMgPT0gXCJmdW5jdGlvblwiID8gZnVuYy5iaW5kKHApIDogZnVuYyldIGFzIGNvbnN0OyB9KSkgYXMgUjtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW50aXJlUHVibGljSW50ZXJmYWNlIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IGF3YWl0QWxsRW1iaW5kIH0gZnJvbSBcIi4vZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IGluc3RhbnRpYXRlV2FzaSB9IGZyb20gXCIuL2luc3RhbnRpYXRlLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCB0eXBlIFJvbGx1cFdhc21Qcm9taXNlPEkgZXh0ZW5kcyBFbnRpcmVQdWJsaWNJbnRlcmZhY2UgPSBFbnRpcmVQdWJsaWNJbnRlcmZhY2U+ID0gKGltcG9ydHM/OiBJKSA9PiBQcm9taXNlPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPjtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZVdhc21HZW5lcmljPEUgZXh0ZW5kcyB7fSwgSSBleHRlbmRzIEVudGlyZVB1YmxpY0ludGVyZmFjZSA9IEVudGlyZVB1YmxpY0ludGVyZmFjZT4oaW5zdGFudGlhdGVXYXNtOiAoYm91bmRJbXBvcnRzOiBJKSA9PiBQcm9taXNlPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPiwgdW5ib3VuZEltcG9ydHM6IEkpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8RT4+IHtcclxuXHJcbiAgICAvLyBUaGVyZSdzIGEgYml0IG9mIHNvbmcgYW5kIGRhbmNlIHRvIGdldCBhcm91bmQgdGhlIGZhY3QgdGhhdDpcclxuICAgIC8vIDEuIFdBU00gbmVlZHMgaXRzIFdBU0kgaW1wb3J0cyBpbW1lZGlhdGVseSB1cG9uIGluc3RhbnRpYXRpb24uXHJcbiAgICAvLyAyLiBXQVNJIG5lZWRzIGl0cyBXQVNNIEluc3RhbmNlIGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi5cclxuICAgIC8vIFNvIHdlIHVzZSBwcm9taXNlcyB0byBub3RpZnkgZWFjaCB0aGF0IHRoZSBvdGhlcidzIGJlZW4gY3JlYXRlZC5cclxuXHJcbiAgICBjb25zdCB7IHByb21pc2U6IHdhc21SZWFkeSwgcmVzb2x2ZTogcmVzb2x2ZVdhc20gfSA9IFByb21pc2Uud2l0aFJlc29sdmVyczxXZWJBc3NlbWJseS5XZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZT4oKTtcclxuICAgIGNvbnN0IHsgaW1wb3J0cywgd2FzaVJlYWR5IH0gPSBpbnN0YW50aWF0ZVdhc2k8RSwgST4od2FzbVJlYWR5LCB1bmJvdW5kSW1wb3J0cyk7XHJcbiAgICByZXNvbHZlV2FzbShhd2FpdCBpbnN0YW50aWF0ZVdhc20oeyAuLi5pbXBvcnRzIH0pKTtcclxuICAgIGNvbnN0IHJldCA9IGF3YWl0IHdhc2lSZWFkeTtcclxuXHJcbiAgICBhd2FpdCBhd2FpdEFsbEVtYmluZCgpO1xyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUiLCAiaW1wb3J0IHsgdHlwZSBSb2xsdXBXYXNtUHJvbWlzZSwgaW5zdGFudGlhdGVXYXNtR2VuZXJpYyB9IGZyb20gXCIuL19wcml2YXRlL2luc3RhbnRpYXRlLXdhc20uanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IEVudGlyZVB1YmxpY0ludGVyZmFjZSB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vKipcclxuICogSW5zdGFudGlhdGVzIGEgV0FTTSBtb2R1bGUgd2l0aCB0aGUgc3BlY2lmaWVkIFdBU0kgaW1wb3J0cy5cclxuICogXHJcbiAqIGBpbnB1dGAgY2FuIGJlIGFueSBvbmUgb2Y6XHJcbiAqIFxyXG4gKiAqIGBSZXNwb25zZWAgb3IgYFByb21pc2U8UmVzcG9uc2U+YCAoZnJvbSBlLmcuIGBmZXRjaGApLiBVc2VzIGBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZ2AuXHJcbiAqICogYEFycmF5QnVmZmVyYCByZXByZXNlbnRpbmcgdGhlIFdBU00gaW4gYmluYXJ5IGZvcm0sIG9yIGEgYFdlYkFzc2VtYmx5Lk1vZHVsZWAuIFxyXG4gKiAqIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyAxIGFyZ3VtZW50IG9mIHR5cGUgYFdlYkFzc2VtYmx5LkltcG9ydHNgIGFuZCByZXR1cm5zIGEgYFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlYC4gVGhpcyBpcyB0aGUgdHlwZSB0aGF0IGBAcm9sbHVwL3BsdWdpbi13YXNtYCByZXR1cm5zIHdoZW4gYnVuZGxpbmcgYSBwcmUtYnVpbHQgV0FTTSBiaW5hcnkuXHJcbiAqIFxyXG4gKiBAcGFyYW0gd2FzbUZldGNoUHJvbWlzZSBcclxuICogQHBhcmFtIHVuYm91bmRJbXBvcnRzIFxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlPEUgZXh0ZW5kcyB7fT4od2FzbUZldGNoUHJvbWlzZTogUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4sIHVuYm91bmRJbXBvcnRzOiBFbnRpcmVQdWJsaWNJbnRlcmZhY2UpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8RT4+O1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFudGlhdGU8RSBleHRlbmRzIHt9Pihtb2R1bGVCeXRlczogV2ViQXNzZW1ibHkuTW9kdWxlIHwgQnVmZmVyU291cmNlLCB1bmJvdW5kSW1wb3J0czogRW50aXJlUHVibGljSW50ZXJmYWNlKTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNpPEU+PjtcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlPEUgZXh0ZW5kcyB7fT4od2FzbUluc3RhbnRpYXRvcjogUm9sbHVwV2FzbVByb21pc2UsIHVuYm91bmRJbXBvcnRzOiBFbnRpcmVQdWJsaWNJbnRlcmZhY2UpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8RT4+O1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFudGlhdGU8RSBleHRlbmRzIHt9Pih3YXNtOiBSb2xsdXBXYXNtUHJvbWlzZSB8IFdlYkFzc2VtYmx5Lk1vZHVsZSB8IEJ1ZmZlclNvdXJjZSB8IFJlc3BvbnNlIHwgUHJvbWlzZUxpa2U8UmVzcG9uc2U+LCB1bmJvdW5kSW1wb3J0czogRW50aXJlUHVibGljSW50ZXJmYWNlKTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNpPEU+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgaW5zdGFudGlhdGVXYXNtR2VuZXJpYzxFPihhc3luYyAoY29tYmluZWRJbXBvcnRzKSA9PiB7XHJcbiAgICAgICAgaWYgKHdhc20gaW5zdGFuY2VvZiBXZWJBc3NlbWJseS5Nb2R1bGUpXHJcbiAgICAgICAgICAgIHJldHVybiAoeyBtb2R1bGU6IHdhc20sIGluc3RhbmNlOiBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSh3YXNtLCB7IC4uLmNvbWJpbmVkSW1wb3J0cyB9KSB9KTtcclxuICAgICAgICBlbHNlIGlmICh3YXNtIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHwgQXJyYXlCdWZmZXIuaXNWaWV3KHdhc20pKVxyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUod2FzbSwgeyAuLi5jb21iaW5lZEltcG9ydHMgfSk7XHJcbiAgICAgICAgZWxzZSBpZiAoXCJ0aGVuXCIgaW4gd2FzbSB8fCAoXCJSZXNwb25zZVwiIGluIGdsb2JhbFRoaXMgJiYgd2FzbSBpbnN0YW5jZW9mIFJlc3BvbnNlKSlcclxuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKHdhc20sIHsgLi4uY29tYmluZWRJbXBvcnRzIH0pO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGF3YWl0ICh3YXNtIGFzIFJvbGx1cFdhc21Qcm9taXNlKShjb21iaW5lZEltcG9ydHMpO1xyXG5cclxuICAgIH0sIHVuYm91bmRJbXBvcnRzKVxyXG59XHJcblxyXG5cclxuIiwgIlxyXG4vLyBUaGVzZSBjb25zdGFudHMgYXJlbid0IGRvbmUgYXMgYW4gZW51bSBiZWNhdXNlIDk1JSBvZiB0aGVtIGFyZSBuZXZlciByZWZlcmVuY2VkLFxyXG4vLyBidXQgdGhleSdkIGFsbW9zdCBjZXJ0YWlubHkgbmV2ZXIgYmUgdHJlZS1zaGFrZW4gb3V0LlxyXG5cclxuLyoqIE5vIGVycm9yIG9jY3VycmVkLiBTeXN0ZW0gY2FsbCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiAqLyAgIGV4cG9ydCBjb25zdCBFU1VDQ0VTUyA9ICAgICAgICAgMDtcclxuLyoqIEFyZ3VtZW50IGxpc3QgdG9vIGxvbmcuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFMkJJRyA9ICAgICAgICAgICAgMTtcclxuLyoqIFBlcm1pc3Npb24gZGVuaWVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUNDRVMgPSAgICAgICAgICAgMjtcclxuLyoqIEFkZHJlc3MgaW4gdXNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUREUklOVVNFID0gICAgICAgMztcclxuLyoqIEFkZHJlc3Mgbm90IGF2YWlsYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUREUk5PVEFWQUlMID0gICAgNDtcclxuLyoqIEFkZHJlc3MgZmFtaWx5IG5vdCBzdXBwb3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUZOT1NVUFBPUlQgPSAgICAgNTtcclxuLyoqIFJlc291cmNlIHVuYXZhaWxhYmxlLCBvciBvcGVyYXRpb24gd291bGQgYmxvY2suICovICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUdBSU4gPSAgICAgICAgICAgNjtcclxuLyoqIENvbm5lY3Rpb24gYWxyZWFkeSBpbiBwcm9ncmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUxSRUFEWSA9ICAgICAgICAgNztcclxuLyoqIEJhZCBmaWxlIGRlc2NyaXB0b3IuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQkFERiA9ICAgICAgICAgICAgODtcclxuLyoqIEJhZCBtZXNzYWdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQkFETVNHID0gICAgICAgICAgOTtcclxuLyoqIERldmljZSBvciByZXNvdXJjZSBidXN5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQlVTWSA9ICAgICAgICAgICAgMTA7XHJcbi8qKiBPcGVyYXRpb24gY2FuY2VsZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNBTkNFTEVEID0gICAgICAgIDExO1xyXG4vKiogTm8gY2hpbGQgcHJvY2Vzc2VzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDSElMRCA9ICAgICAgICAgICAxMjtcclxuLyoqIENvbm5lY3Rpb24gYWJvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ09OTkFCT1JURUQgPSAgICAgMTM7XHJcbi8qKiBDb25uZWN0aW9uIHJlZnVzZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5SRUZVU0VEID0gICAgIDE0O1xyXG4vKiogQ29ubmVjdGlvbiByZXNldC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDT05OUkVTRVQgPSAgICAgICAxNTtcclxuLyoqIFJlc291cmNlIGRlYWRsb2NrIHdvdWxkIG9jY3VyLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFREVBRExLID0gICAgICAgICAgMTY7XHJcbi8qKiBEZXN0aW5hdGlvbiBhZGRyZXNzIHJlcXVpcmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRURFU1RBRERSUkVRID0gICAgIDE3O1xyXG4vKiogTWF0aGVtYXRpY3MgYXJndW1lbnQgb3V0IG9mIGRvbWFpbiBvZiBmdW5jdGlvbi4gKi8gICAgICAgICAgZXhwb3J0IGNvbnN0IEVET00gPSAgICAgICAgICAgICAxODtcclxuLyoqIFJlc2VydmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRFFVT1QgPSAgICAgICAgICAgMTk7XHJcbi8qKiBGaWxlIGV4aXN0cy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUVYSVNUID0gICAgICAgICAgIDIwO1xyXG4vKiogQmFkIGFkZHJlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVGQVVMVCA9ICAgICAgICAgICAyMTtcclxuLyoqIEZpbGUgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRkJJRyA9ICAgICAgICAgICAgMjI7XHJcbi8qKiBIb3N0IGlzIHVucmVhY2hhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUhPU1RVTlJFQUNIID0gICAgIDIzO1xyXG4vKiogSWRlbnRpZmllciByZW1vdmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJRFJNID0gICAgICAgICAgICAyNDtcclxuLyoqIElsbGVnYWwgYnl0ZSBzZXF1ZW5jZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSUxTRVEgPSAgICAgICAgICAgMjU7XHJcbi8qKiBPcGVyYXRpb24gaW4gcHJvZ3Jlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlOUFJPR1JFU1MgPSAgICAgIDI2O1xyXG4vKiogSW50ZXJydXB0ZWQgZnVuY3Rpb24uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTlRSID0gICAgICAgICAgICAyNztcclxuLyoqIEludmFsaWQgYXJndW1lbnQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU5WQUwgPSAgICAgICAgICAgMjg7XHJcbi8qKiBJL08gZXJyb3IuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlPID0gICAgICAgICAgICAgIDI5O1xyXG4vKiogU29ja2V0IGlzIGNvbm5lY3RlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJU0NPTk4gPSAgICAgICAgICAzMDtcclxuLyoqIElzIGEgZGlyZWN0b3J5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSVNESVIgPSAgICAgICAgICAgMzE7XHJcbi8qKiBUb28gbWFueSBsZXZlbHMgb2Ygc3ltYm9saWMgbGlua3MuICovICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUxPT1AgPSAgICAgICAgICAgIDMyO1xyXG4vKiogRmlsZSBkZXNjcmlwdG9yIHZhbHVlIHRvbyBsYXJnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNRklMRSA9ICAgICAgICAgICAzMztcclxuLyoqIFRvbyBtYW55IGxpbmtzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTUxJTksgPSAgICAgICAgICAgMzQ7XHJcbi8qKiBNZXNzYWdlIHRvbyBsYXJnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1TR1NJWkUgPSAgICAgICAgIDM1O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNVUxUSUhPUCA9ICAgICAgICAzNjtcclxuLyoqIEZpbGVuYW1lIHRvbyBsb25nLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkFNRVRPT0xPTkcgPSAgICAgMzc7XHJcbi8qKiBOZXR3b3JrIGlzIGRvd24uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVERPV04gPSAgICAgICAgIDM4O1xyXG4vKiogQ29ubmVjdGlvbiBhYm9ydGVkIGJ5IG5ldHdvcmsuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORVRSRVNFVCA9ICAgICAgICAzOTtcclxuLyoqIE5ldHdvcmsgdW5yZWFjaGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkVUVU5SRUFDSCA9ICAgICAgNDA7XHJcbi8qKiBUb28gbWFueSBmaWxlcyBvcGVuIGluIHN5c3RlbS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5GSUxFID0gICAgICAgICAgIDQxO1xyXG4vKiogTm8gYnVmZmVyIHNwYWNlIGF2YWlsYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0JVRlMgPSAgICAgICAgICA0MjtcclxuLyoqIE5vIHN1Y2ggZGV2aWNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9ERVYgPSAgICAgICAgICAgNDM7XHJcbi8qKiBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PRU5UID0gICAgICAgICAgIDQ0O1xyXG4vKiogRXhlY3V0YWJsZSBmaWxlIGZvcm1hdCBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0VYRUMgPSAgICAgICAgICA0NTtcclxuLyoqIE5vIGxvY2tzIGF2YWlsYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9MQ0sgPSAgICAgICAgICAgNDY7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PTElOSyA9ICAgICAgICAgIDQ3O1xyXG4vKiogTm90IGVub3VnaCBzcGFjZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT01FTSA9ICAgICAgICAgICA0ODtcclxuLyoqIE5vIG1lc3NhZ2Ugb2YgdGhlIGRlc2lyZWQgdHlwZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9NU0cgPSAgICAgICAgICAgNDk7XHJcbi8qKiBQcm90b2NvbCBub3QgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PUFJPVE9PUFQgPSAgICAgIDUwO1xyXG4vKiogTm8gc3BhY2UgbGVmdCBvbiBkZXZpY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1NQQyA9ICAgICAgICAgICA1MTtcclxuLyoqIEZ1bmN0aW9uIG5vdCBzdXBwb3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9TWVMgPSAgICAgICAgICAgNTI7XHJcbi8qKiBUaGUgc29ja2V0IGlzIG5vdCBjb25uZWN0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVENPTk4gPSAgICAgICAgIDUzO1xyXG4vKiogTm90IGEgZGlyZWN0b3J5IG9yIGEgc3ltYm9saWMgbGluayB0byBhIGRpcmVjdG9yeS4gKi8gICAgICAgZXhwb3J0IGNvbnN0IEVOT1RESVIgPSAgICAgICAgICA1NDtcclxuLyoqIERpcmVjdG9yeSBub3QgZW1wdHkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9URU1QVFkgPSAgICAgICAgNTU7XHJcbi8qKiBTdGF0ZSBub3QgcmVjb3ZlcmFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVFJFQ09WRVJBQkxFID0gIDU2O1xyXG4vKiogTm90IGEgc29ja2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RTT0NLID0gICAgICAgICA1NztcclxuLyoqIE5vdCBzdXBwb3J0ZWQsIG9yIG9wZXJhdGlvbiBub3Qgc3VwcG9ydGVkIG9uIHNvY2tldC4gKi8gICAgIGV4cG9ydCBjb25zdCBFTk9UU1VQID0gICAgICAgICAgNTg7XHJcbi8qKiBJbmFwcHJvcHJpYXRlIEkvTyBjb250cm9sIG9wZXJhdGlvbi4gKi8gICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVFRZID0gICAgICAgICAgIDU5O1xyXG4vKiogTm8gc3VjaCBkZXZpY2Ugb3IgYWRkcmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOWElPID0gICAgICAgICAgICA2MDtcclxuLyoqIFZhbHVlIHRvbyBsYXJnZSB0byBiZSBzdG9yZWQgaW4gZGF0YSB0eXBlLiAqLyAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFT1ZFUkZMT1cgPSAgICAgICAgNjE7XHJcbi8qKiBQcmV2aW91cyBvd25lciBkaWVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU9XTkVSREVBRCA9ICAgICAgIDYyO1xyXG4vKiogT3BlcmF0aW9uIG5vdCBwZXJtaXR0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQRVJNID0gICAgICAgICAgICA2MztcclxuLyoqIEJyb2tlbiBwaXBlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUElQRSA9ICAgICAgICAgICAgNjQ7XHJcbi8qKiBQcm90b2NvbCBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBST1RPID0gICAgICAgICAgIDY1O1xyXG4vKiogUHJvdG9jb2wgbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQUk9UT05PU1VQUE9SVCA9ICA2NjtcclxuLyoqIFByb3RvY29sIHdyb25nIHR5cGUgZm9yIHNvY2tldC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE9UWVBFID0gICAgICAgNjc7XHJcbi8qKiBSZXN1bHQgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVJBTkdFID0gICAgICAgICAgIDY4O1xyXG4vKiogUmVhZC1vbmx5IGZpbGUgc3lzdGVtLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVST0ZTID0gICAgICAgICAgICA2OTtcclxuLyoqIEludmFsaWQgc2Vlay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1BJUEUgPSAgICAgICAgICAgNzA7XHJcbi8qKiBObyBzdWNoIHByb2Nlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVNSQ0ggPSAgICAgICAgICAgIDcxO1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVTVEFMRSA9ICAgICAgICAgICA3MjtcclxuLyoqIENvbm5lY3Rpb24gdGltZWQgb3V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFVElNRURPVVQgPSAgICAgICAgNzM7XHJcbi8qKiBUZXh0IGZpbGUgYnVzeS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVRYVEJTWSA9ICAgICAgICAgIDc0O1xyXG4vKiogQ3Jvc3MtZGV2aWNlIGxpbmsuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVYREVWID0gICAgICAgICAgICA3NTtcclxuLyoqIEV4dGVuc2lvbjogQ2FwYWJpbGl0aWVzIGluc3VmZmljaWVudC4gKi8gICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UQ0FQQUJMRSA9ICAgICAgNzY7IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50NjQoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IGJpZ2ludCk6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRCaWdVaW50NjQocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEVJTlZBTCwgRU5PU1lTLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDY0IH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDY0LmpzXCI7XHJcblxyXG5leHBvcnQgZW51bSBDbG9ja0lkIHtcclxuICAgIFJFQUxUSU1FID0gMCxcclxuICAgIE1PTk9UT05JQyA9IDEsXHJcbiAgICBQUk9DRVNTX0NQVVRJTUVfSUQgPSAyLFxyXG4gICAgVEhSRUFEX0NQVVRJTUVfSUQgPSAzXHJcbn1cclxuXHJcbmNvbnN0IHAgPSAoZ2xvYmFsVGhpcy5wZXJmb3JtYW5jZSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2xvY2tfdGltZV9nZXQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGNsa19pZDogbnVtYmVyLCBfcHJlY2lzaW9uOiBudW1iZXIsIG91dFB0cjogbnVtYmVyKTogbnVtYmVyIHtcclxuXHJcbiAgICBsZXQgbm93TXM6IG51bWJlcjtcclxuICAgIHN3aXRjaCAoY2xrX2lkKSB7XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLlJFQUxUSU1FOlxyXG4gICAgICAgICAgICBub3dNcyA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgQ2xvY2tJZC5NT05PVE9OSUM6XHJcbiAgICAgICAgICAgIGlmIChwID09IG51bGwpIHJldHVybiBFTk9TWVM7ICAgLy8gVE9ETzogUG9zc2libGUgdG8gYmUgbnVsbCBpbiBXb3JrbGV0cz9cclxuICAgICAgICAgICAgbm93TXMgPSBwLm5vdygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIENsb2NrSWQuUFJPQ0VTU19DUFVUSU1FX0lEOlxyXG4gICAgICAgIGNhc2UgQ2xvY2tJZC5USFJFQURfQ1BVVElNRV9JRDpcclxuICAgICAgICAgICAgcmV0dXJuIEVOT1NZUztcclxuICAgICAgICBkZWZhdWx0OiByZXR1cm4gRUlOVkFMO1xyXG4gICAgfVxyXG4gICAgY29uc3Qgbm93TnMgPSBCaWdJbnQoTWF0aC5yb3VuZChub3dNcyAqIDEwMDAgKiAxMDAwKSk7XHJcbiAgICB3cml0ZVVpbnQ2NCh0aGlzLCBvdXRQdHIsIG5vd05zKTtcclxuXHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn0iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVudmlyb25fZ2V0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBlbnZpcm9uQ291bnRPdXRwdXQ6IFBvaW50ZXI8UG9pbnRlcjxudW1iZXI+PiwgZW52aXJvblNpemVPdXRwdXQ6IFBvaW50ZXI8bnVtYmVyPikge1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvbkNvdW50T3V0cHV0LCAwKTtcclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25TaXplT3V0cHV0LCAwKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVudmlyb25fc2l6ZXNfZ2V0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBlbnZpcm9uQ291bnRPdXRwdXQ6IFBvaW50ZXI8UG9pbnRlcjxudW1iZXI+PiwgZW52aXJvblNpemVPdXRwdXQ6IFBvaW50ZXI8bnVtYmVyPikge1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvbkNvdW50T3V0cHV0LCAwKTtcclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25TaXplT3V0cHV0LCAwKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yQ2xvc2VFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqIFxyXG4gICAgICogSXQncyBtb3JlLW9yLWxlc3MgW3VuaXZlcnNhbGx5IGV4cGVjdGVkXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdGFuZGFyZF9zdHJlYW0pIHRoYXQgMCBpcyBmb3IgaW5wdXQsIDEgZm9yIG91dHB1dCwgYW5kIDIgZm9yIGVycm9ycyxcclxuICAgICAqIHNvIHlvdSBjYW4gbWFwIDEgdG8gYGNvbnNvbGUubG9nYCBhbmQgMiB0byBgY29uc29sZS5lcnJvcmAuIFxyXG4gICAgICovXHJcbiAgICBmaWxlRGVzY3JpcHRvcjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9jbG9zZVwiLCB7IGNhbmNlbGFibGU6IHRydWUsIGRldGFpbDogeyBmaWxlRGVzY3JpcHRvciB9IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogUE9TSVggY2xvc2UgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX2Nsb3NlKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBmZDogRmlsZURlc2NyaXB0b3IpOiB2b2lkIHtcclxuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEZpbGVEZXNjcmlwdG9yQ2xvc2VFdmVudChmZCk7XHJcbiAgICBpZiAodGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KSkge1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgZ2V0UG9pbnRlclNpemUgfSBmcm9tIFwiLi4vdXRpbC9wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRQb2ludGVyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQzMi5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJb3ZlYyB7XHJcbiAgICBidWZmZXJTdGFydDogbnVtYmVyO1xyXG4gICAgYnVmZmVyTGVuZ3RoOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShpbmZvOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBJb3ZlYyB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJ1ZmZlclN0YXJ0OiByZWFkUG9pbnRlcihpbmZvLCBwdHIpLFxyXG4gICAgICAgIGJ1ZmZlckxlbmd0aDogcmVhZFVpbnQzMihpbmZvLCBwdHIgKyBnZXRQb2ludGVyU2l6ZShpbmZvKSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uKiBwYXJzZUFycmF5KGluZm86IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IG51bWJlciwgY291bnQ6IG51bWJlcik6IEdlbmVyYXRvcjxJb3ZlYywgdm9pZCwgdm9pZD4ge1xyXG4gICAgY29uc3Qgc2l6ZW9mU3RydWN0ID0gZ2V0UG9pbnRlclNpemUoaW5mbykgKyA0O1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XHJcbiAgICAgICAgeWllbGQgcGFyc2UoaW5mbywgcHRyICsgKGkgKiBzaXplb2ZTdHJ1Y3QpKVxyXG4gICAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyB0eXBlIElvdmVjLCBwYXJzZUFycmF5IH0gZnJvbSBcIi4uL19wcml2YXRlL2lvdmVjLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDggfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50OC5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGVzY3JpcHRvclJlYWRFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqIFxyXG4gICAgICogSXQncyBtb3JlLW9yLWxlc3MgW3VuaXZlcnNhbGx5IGV4cGVjdGVkXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdGFuZGFyZF9zdHJlYW0pIHRoYXQgMCBpcyBmb3IgaW5wdXQsIDEgZm9yIG91dHB1dCwgYW5kIDIgZm9yIGVycm9ycyxcclxuICAgICAqIHNvIHlvdSBjYW4gbWFwIDEgdG8gYGNvbnNvbGUubG9nYCBhbmQgMiB0byBgY29uc29sZS5lcnJvcmAsIHdpdGggb3RoZXJzIGhhbmRsZWQgd2l0aCB0aGUgdmFyaW91cyBmaWxlLW9wZW5pbmcgY2FsbHMuIFxyXG4gICAgICovXHJcbiAgICBmaWxlRGVzY3JpcHRvcjogbnVtYmVyO1xyXG5cclxuICAgIHJlcXVlc3RlZEJ1ZmZlcnM6IElvdmVjW107XHJcblxyXG4gICAgcmVhZEludG9NZW1vcnkoYnVmZmVyczogKFVpbnQ4QXJyYXkpW10pOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZURlc2NyaXB0b3JSZWFkRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvclJlYWRFdmVudERldGFpbD4ge1xyXG4gICAgcHJpdmF0ZSBfYnl0ZXNXcml0dGVuID0gMDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgZmlsZURlc2NyaXB0b3I6IG51bWJlciwgcmVxdWVzdGVkQnVmZmVySW5mbzogSW92ZWNbXSkge1xyXG4gICAgICAgIHN1cGVyKFwiZmRfcmVhZFwiLCB7XHJcbiAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICBkZXRhaWw6IHtcclxuICAgICAgICAgICAgICAgIGZpbGVEZXNjcmlwdG9yLFxyXG4gICAgICAgICAgICAgICAgcmVxdWVzdGVkQnVmZmVyczogcmVxdWVzdGVkQnVmZmVySW5mbyxcclxuICAgICAgICAgICAgICAgIHJlYWRJbnRvTWVtb3J5OiAoaW5wdXRCdWZmZXJzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gMTAwJSB1bnRlc3RlZCwgcHJvYmFibHkgZG9lc24ndCB3b3JrIGlmIEknbSBiZWluZyBob25lc3RcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlcXVlc3RlZEJ1ZmZlckluZm8ubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPj0gaW5wdXRCdWZmZXJzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBpbnB1dEJ1ZmZlcnNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgTWF0aC5taW4oYnVmZmVyLmJ5dGVMZW5ndGgsIGlucHV0QnVmZmVyc1tqXS5ieXRlTGVuZ3RoKTsgKytqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZVVpbnQ4KGltcGwsIHJlcXVlc3RlZEJ1ZmZlckluZm9baV0uYnVmZmVyU3RhcnQgKyBqLCBidWZmZXJbal0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKyt0aGlzLl9ieXRlc1dyaXR0ZW47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGJ5dGVzV3JpdHRlbigpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9ieXRlc1dyaXR0ZW47XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVbmhhbmRsZWRGaWxlUmVhZEV2ZW50IGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoZmQ6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKGBVbmhhbmRsZWQgcmVhZCB0byBmaWxlIGRlc2NyaXB0b3IgIyR7ZmR9LmApO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqIFBPU0lYIHJlYWR2ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmZF9yZWFkKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBmZDogRmlsZURlc2NyaXB0b3IsIGlvdjogbnVtYmVyLCBpb3ZjbnQ6IG51bWJlciwgcG51bTogbnVtYmVyKSB7XHJcblxyXG4gICAgbGV0IG5Xcml0dGVuID0gMDtcclxuICAgIGNvbnN0IGdlbiA9IHBhcnNlQXJyYXkodGhpcywgaW92LCBpb3ZjbnQpO1xyXG5cclxuICAgIC8vIEdldCBhbGwgdGhlIGRhdGEgdG8gcmVhZCBpbiBpdHMgc2VwYXJhdGUgYnVmZmVyc1xyXG4gICAgLy9jb25zdCBhc1R5cGVkQXJyYXlzID0gWy4uLmdlbl0ubWFwKCh7IGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGggfSkgPT4geyBuV3JpdHRlbiArPSBidWZmZXJMZW5ndGg7IHJldHVybiBuZXcgVWludDhBcnJheSh0aGlzLmdldE1lbW9yeSgpLmJ1ZmZlciwgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCkgfSk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JSZWFkRXZlbnQodGhpcywgZmQsIFsuLi5nZW5dKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgbldyaXR0ZW4gPSAwO1xyXG4gICAgICAgIC8qaWYgKGZkID09IDApIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGVycm9ybm8uYmFkZjsqL1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbldyaXR0ZW4gPSBldmVudC5ieXRlc1dyaXR0ZW4oKTtcclxuICAgIH1cclxuXHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBwbnVtLCBuV3JpdHRlbik7XHJcblxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5jb25zdCB0ZXh0RGVjb2RlcnMgPSBuZXcgTWFwPHN0cmluZywgVGV4dERlY29kZXI+KCk7XHJcbmZ1bmN0aW9uIGdldFRleHREZWNvZGVyKGxhYmVsOiBzdHJpbmcpIHtcclxuICAgIGxldCByZXQ6IFRleHREZWNvZGVyIHwgdW5kZWZpbmVkID0gdGV4dERlY29kZXJzLmdldChsYWJlbCk7XHJcbiAgICBpZiAoIXJldCkge1xyXG4gICAgICAgIHJldCA9IG5ldyBUZXh0RGVjb2RlcihsYWJlbCk7XHJcbiAgICAgICAgdGV4dERlY29kZXJzLnNldChsYWJlbCwgcmV0KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0O1xyXG59IiwgImltcG9ydCB7IEVCQURGLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciwgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGVzY3JpcHRvclNlZWtFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqIFxyXG4gICAgICogSXQncyBtb3JlLW9yLWxlc3MgW3VuaXZlcnNhbGx5IGV4cGVjdGVkXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdGFuZGFyZF9zdHJlYW0pIHRoYXQgMCBpcyBmb3IgaW5wdXQsIDEgZm9yIG91dHB1dCwgYW5kIDIgZm9yIGVycm9ycyxcclxuICAgICAqIHNvIHlvdSBjYW4gbWFwIDEgdG8gYGNvbnNvbGUubG9nYCBhbmQgMiB0byBgY29uc29sZS5lcnJvcmAuIFxyXG4gICAgICovXHJcbiAgICBmaWxlRGVzY3JpcHRvcjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZURlc2NyaXB0b3JTZWVrRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvclNlZWtFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoZmlsZURlc2NyaXB0b3I6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKFwiZmRfc2Vla1wiLCB7IGNhbmNlbGFibGU6IHRydWUsIGRldGFpbDogeyBmaWxlRGVzY3JpcHRvciB9IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogUE9TSVggbHNlZWsgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX3NlZWsodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGZkOiBGaWxlRGVzY3JpcHRvciwgb2Zmc2V0OiBudW1iZXIsIHdoZW5jZTogbnVtYmVyLCBvZmZzZXRPdXQ6IFBvaW50ZXI8bnVtYmVyPik6IHR5cGVvZiBFQkFERiB8IHR5cGVvZiBFU1VDQ0VTUyB7XHJcbiAgICBpZiAodGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBGaWxlRGVzY3JpcHRvclNlZWtFdmVudChmZCkpKSB7XHJcbiAgICAgICAgc3dpdGNoIChmZCkge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIEVCQURGO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufVxyXG4iLCAiaW1wb3J0IHsgcGFyc2VBcnJheSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9pb3ZlYy5qc1wiO1xyXG5pbXBvcnQgeyBFQkFERiwgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JXcml0ZUV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYCwgd2l0aCBvdGhlcnMgaGFuZGxlZCB3aXRoIHRoZSB2YXJpb3VzIGZpbGUtb3BlbmluZyBjYWxscy4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbiAgICBkYXRhOiBVaW50OEFycmF5W107XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIsIGRhdGE6IFVpbnQ4QXJyYXlbXSkge1xyXG4gICAgICAgIHN1cGVyKFwiZmRfd3JpdGVcIiwgeyBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGRhdGEsIGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbiAgICBhc1N0cmluZyhsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kZXRhaWwuZGF0YS5tYXAoKGQsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBkZWNvZGVkID0gZ2V0VGV4dERlY29kZXIobGFiZWwpLmRlY29kZShkKTtcclxuICAgICAgICAgICAgaWYgKGRlY29kZWQgPT0gXCJcXDBcIiAmJiBpbmRleCA9PSB0aGlzLmRldGFpbC5kYXRhLmxlbmd0aCAtIDEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgcmV0dXJuIGRlY29kZWQ7XHJcbiAgICAgICAgfSkuam9pbihcIlwiKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVuaGFuZGxlZEZpbGVXcml0ZUV2ZW50IGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoZmQ6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKGBVbmhhbmRsZWQgd3JpdGUgdG8gZmlsZSBkZXNjcmlwdG9yICMke2ZkfS5gKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbi8qKiBQT1NJWCB3cml0ZXYgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX3dyaXRlKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBmZDogRmlsZURlc2NyaXB0b3IsIGlvdjogbnVtYmVyLCBpb3ZjbnQ6IG51bWJlciwgcG51bTogbnVtYmVyKTogdHlwZW9mIEVTVUNDRVNTIHwgdHlwZW9mIEVCQURGIHtcclxuXHJcbiAgICBsZXQgbldyaXR0ZW4gPSAwO1xyXG4gICAgY29uc3QgZ2VuID0gcGFyc2VBcnJheSh0aGlzLCBpb3YsIGlvdmNudCk7XHJcblxyXG4gICAgLy8gR2V0IGFsbCB0aGUgZGF0YSB0byB3cml0ZSBpbiBpdHMgc2VwYXJhdGUgYnVmZmVyc1xyXG4gICAgY29uc3QgYXNUeXBlZEFycmF5cyA9IFsuLi5nZW5dLm1hcCgoeyBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoIH0pID0+IHsgbldyaXR0ZW4gKz0gYnVmZmVyTGVuZ3RoOyByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodGhpcy5jYWNoZWRNZW1vcnlWaWV3LmJ1ZmZlciwgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCkgfSk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JXcml0ZUV2ZW50KGZkLCBhc1R5cGVkQXJyYXlzKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgY29uc3Qgc3RyID0gZXZlbnQuYXNTdHJpbmcoXCJ1dGYtOFwiKTtcclxuICAgICAgICBpZiAoZmQgPT0gMSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coc3RyKTtcclxuICAgICAgICBlbHNlIGlmIChmZCA9PSAyKVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHN0cik7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gRUJBREY7XHJcbiAgICB9XHJcblxyXG4gICAgd3JpdGVVaW50MzIodGhpcywgcG51bSwgbldyaXR0ZW4pO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufVxyXG5cclxuXHJcbmNvbnN0IHRleHREZWNvZGVycyA9IG5ldyBNYXA8c3RyaW5nLCBUZXh0RGVjb2Rlcj4oKTtcclxuZnVuY3Rpb24gZ2V0VGV4dERlY29kZXIobGFiZWw6IHN0cmluZykge1xyXG4gICAgbGV0IHJldDogVGV4dERlY29kZXIgfCB1bmRlZmluZWQgPSB0ZXh0RGVjb2RlcnMuZ2V0KGxhYmVsKTtcclxuICAgIGlmICghcmV0KSB7XHJcbiAgICAgICAgcmV0ID0gbmV3IFRleHREZWNvZGVyKGxhYmVsKTtcclxuICAgICAgICB0ZXh0RGVjb2RlcnMuc2V0KGxhYmVsLCByZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbn0iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFib3J0RXZlbnREZXRhaWwge1xyXG4gICAgY29kZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQWJvcnRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEFib3J0RXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjb2RlOm51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKFwicHJvY19leGl0XCIsIHsgYnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHsgY29kZSB9IH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBYm9ydEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoY29kZTogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYGFib3J0KCR7Y29kZX0pIHdhcyBjYWxsZWRgKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByb2NfZXhpdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgY29kZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEFib3J0RXZlbnQoY29kZSkpO1xyXG4gICAgdGhyb3cgbmV3IEFib3J0RXJyb3IoY29kZSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGFsaWduZmF1bHQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvYWxpZ25mYXVsdC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfYm9vbC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLCBfZW12YWxfZGVjcmVmLCBfZW12YWxfdGFrZV92YWx1ZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZW12YWwuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9lbnVtLCBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUsIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9lbnVtLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlciB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlci5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZyB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX2FycmF5LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfdmFsdWVfb2JqZWN0LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCwgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZvaWQuanNcIjtcclxuaW1wb3J0IHsgZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoLmpzXCI7XHJcbmltcG9ydCB7IHNlZ2ZhdWx0IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L3NlZ2ZhdWx0LmpzXCI7XHJcbmltcG9ydCB7IF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UuanNcIjtcclxuaW1wb3J0IHsgX3R6c2V0X2pzIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L3R6c2V0X2pzLmpzXCI7XHJcbmltcG9ydCB7IGluc3RhbnRpYXRlIGFzIGkgfSBmcm9tIFwiLi4vLi4vZGlzdC9pbnN0YW50aWF0ZS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vZGlzdC9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBjbG9ja190aW1lX2dldCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvY2xvY2tfdGltZV9nZXQuanNcIjtcclxuaW1wb3J0IHsgZW52aXJvbl9nZXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fZ2V0LmpzXCI7XHJcbmltcG9ydCB7IGVudmlyb25fc2l6ZXNfZ2V0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX3NpemVzX2dldC5qc1wiO1xyXG5pbXBvcnQgeyBmZF9jbG9zZSB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfY2xvc2UuanNcIjtcclxuaW1wb3J0IHsgZmRfcmVhZCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfcmVhZC5qc1wiO1xyXG5pbXBvcnQgeyBmZF9zZWVrIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9zZWVrLmpzXCI7XHJcbmltcG9ydCB7IGZkX3dyaXRlIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF93cml0ZS5qc1wiO1xyXG5pbXBvcnQgeyBwcm9jX2V4aXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL3Byb2NfZXhpdC5qc1wiO1xyXG5cclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEtub3duSW5zdGFuY2VFeHBvcnRzIHtcclxuICAgIHByaW50VGVzdCgpOiBudW1iZXI7XHJcbiAgICByZXZlcnNlSW5wdXQoKTogbnVtYmVyO1xyXG4gICAgZ2V0UmFuZG9tTnVtYmVyKCk6IG51bWJlcjtcclxuICAgIGdldEtleSgpOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZSh3aGVyZTogc3RyaW5nLCB1bmluc3RhbnRpYXRlZD86IEFycmF5QnVmZmVyKTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNpPEtub3duSW5zdGFuY2VFeHBvcnRzPj4ge1xyXG5cclxuICAgIGxldCB3YXNtID0gYXdhaXQgaTxLbm93bkluc3RhbmNlRXhwb3J0cz4odW5pbnN0YW50aWF0ZWQgPz8gZmV0Y2gobmV3IFVSTChcIndhc20ud2FzbVwiLCBpbXBvcnQubWV0YS51cmwpKSwge1xyXG4gICAgICAgIGVudjoge1xyXG4gICAgICAgICAgICBfX3Rocm93X2V4Y2VwdGlvbl93aXRoX3N0YWNrX3RyYWNlLFxyXG4gICAgICAgICAgICBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfZmluYWxpemVfdmFsdWVfYXJyYXksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0X2ZpZWxkLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCxcclxuICAgICAgICAgICAgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZW51bSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlLFxyXG4gICAgICAgICAgICBfZW12YWxfdGFrZV92YWx1ZSxcclxuICAgICAgICAgICAgX2VtdmFsX2RlY3JlZixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUsXHJcbiAgICAgICAgICAgIF90enNldF9qcyxcclxuICAgICAgICAgICAgc2VnZmF1bHQsXHJcbiAgICAgICAgICAgIGFsaWduZmF1bHQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB3YXNpX3NuYXBzaG90X3ByZXZpZXcxOiB7XHJcbiAgICAgICAgICAgIGZkX2Nsb3NlLFxyXG4gICAgICAgICAgICBmZF9yZWFkLFxyXG4gICAgICAgICAgICBmZF9zZWVrLFxyXG4gICAgICAgICAgICBmZF93cml0ZSxcclxuICAgICAgICAgICAgZW52aXJvbl9nZXQsXHJcbiAgICAgICAgICAgIGVudmlyb25fc2l6ZXNfZ2V0LFxyXG4gICAgICAgICAgICBwcm9jX2V4aXQsXHJcbiAgICAgICAgICAgIGNsb2NrX3RpbWVfZ2V0XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgd2FzbS5hZGRFdmVudExpc3RlbmVyKFwiZmRfd3JpdGVcIiwgZSA9PiB7XHJcbiAgICAgICAgaWYgKGUuZGV0YWlsLmZpbGVEZXNjcmlwdG9yID09IDEpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGUuYXNTdHJpbmcoXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYCR7d2hlcmV9OiAke3ZhbHVlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB3YXNtO1xyXG59XHJcbiIsICIvL2ltcG9ydCBcImNvcmUtanNcIjtcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBDb21saW5rIGZyb20gXCJjb21saW5rXCI7XHJcbmltcG9ydCB7IGluc3RhbnRpYXRlIH0gZnJvbSBcIi4vaW5zdGFudGlhdGUuanNcIjtcclxuXHJcbmNvbnN0IHdhc20gPSBhd2FpdCBpbnN0YW50aWF0ZShcIldvcmtlclwiKTtcclxuQ29tbGluay5leHBvc2Uoe1xyXG4gICAgZXhlY3V0ZShzdHI6IHN0cmluZykge1xyXG4gICAgICAgIHJldHVybiAobmV3IEZ1bmN0aW9uKFwid2FzbVwiLCBzdHIpKSh3YXNtKTtcclxuICAgIH1cclxufSk7XHJcblxyXG4iXSwKICAibWFwcGluZ3Mi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RyxLQUFLO0FBQUEsTUFDRDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNKO0FBQUEsSUFDQSx3QkFBd0I7QUFBQSxNQUNwQjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNKO0FBQUEsRUFDSixDQUFDO0FBRUQsRUFBQUEsTUFBSyxpQkFBaUIsWUFBWSxPQUFLO0FBQ25DLFFBQUksRUFBRSxPQUFPLGtCQUFrQixHQUFHO0FBQzlCLFFBQUUsZUFBZTtBQUNqQixZQUFNLFFBQVEsRUFBRSxTQUFTLE9BQU87QUFDaEMsY0FBUSxJQUFJLEdBQUcsS0FBSyxLQUFLLEtBQUssRUFBRTtBQUFBLElBQ3BDO0FBQUEsRUFDSixDQUFDO0FBRUQsU0FBT0E7QUFDWDs7O0FDakdBLElBQU0sT0FBTyxNQUFNQyxhQUFZLFFBQVE7QUFDL0IsT0FBTztBQUFBLEVBQ1gsUUFBUSxLQUFhO0FBQ2pCLFdBQVEsSUFBSSxTQUFTLFFBQVEsR0FBRyxFQUFHLElBQUk7QUFBQSxFQUMzQztBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbIm9iaiIsICJyZXR1cm5WYWx1ZSIsICJwcm94eSIsICJwIiwgImpzVmFsdWUiLCAid2lyZVZhbHVlIiwgInN0YWNrRGVzdHJ1Y3RvciIsICJwIiwgIndhc20iLCAiQ2xvY2tJZCIsICJpbnN0YW50aWF0ZSIsICJ3YXNtIiwgImluc3RhbnRpYXRlIl0KfQo=
