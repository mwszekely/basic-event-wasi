// ../dist/polyfill/event.js
var Event2 = class _Event {
  constructor(type_, eventInitDict) {
    this.bubbles = eventInitDict?.bubbles || false;
    this.cancelBubble = false;
    this.cancelable = eventInitDict?.cancelable || false;
    this.composed = eventInitDict?.composed || false;
    this.currentTarget = null;
    this.defaultPrevented = false;
    this.eventPhase = _Event.NONE;
    this.isTrusted = true;
    this.returnValue = false;
    this.srcElement = null;
    this.target = null;
    this.timeStamp = 0;
    this.type = type_;
  }
  static NONE = 0;
  static CAPTURING_PHASE = 1;
  static AT_TARGET = 2;
  static BUBBLING_PHASE = 3;
  bubbles;
  cancelBubble;
  cancelable;
  composed;
  currentTarget;
  defaultPrevented;
  eventPhase;
  isTrusted;
  returnValue;
  srcElement;
  target;
  timeStamp;
  type;
  composedPath() {
    return [];
  }
  initEvent(type_, bubbles, cancelable) {
    this.type = type_;
    this.bubbles = bubbles || this.bubbles;
    this.cancelable = cancelable || this.cancelable;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopImmediatePropagation() {
  }
  stopPropagation() {
  }
};
globalThis.Event ?? (() => {
  console.info(`This environment does not define Event; using a polyfill.`);
  return Event2;
})();

// ../dist/polyfill/custom-event.js
var CustomEvent2 = class extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }
  detail;
  initCustomEvent(_type, _bubbles, _cancelable, detail) {
    this.detail = detail ?? this.detail;
  }
};
globalThis.CustomEvent ??= (() => {
  console.info(`This environment does not define CustomEvent; using a polyfill`);
  return CustomEvent2;
})();

// ../dist/polyfill/text-decoder.js
globalThis.TextDecoder ??= class TD {
  encoding = "utf8";
  fatal = false;
  ignoreBOM = false;
  decode(input, options) {
    let i = 0;
    if (!input)
      return "";
    let input2 = new Uint8Array(input instanceof ArrayBuffer ? input : input.buffer);
    let ret = "";
    while (i < input.byteLength) {
      const byte = input2[i];
      if (byte < 128)
        ret += String.fromCharCode(byte);
      else
        throw new Error("Not implemented: non-ASCII characters in Worklets");
      ++i;
    }
    return ret;
  }
};

// ../dist/polyfill/text-encoder.js
globalThis.TextEncoder ??= class TD2 {
  encoding = "utf8";
  encodeInto(source, destination) {
    let read = 0;
    let written = 0;
    let byteIndex = 0;
    for (const ch of source) {
      if (ch.codePointAt(0) >= 128)
        throw new Error("Not implemented: non-ASCII characters in Worklets");
      destination[byteIndex++] = ch.codePointAt(0);
      ++read;
      ++written;
    }
    return {
      read,
      written
    };
  }
  encode(input) {
    if (!input)
      return new Uint8Array();
    let b = new Uint8Array(new ArrayBuffer(input.length));
    for (let i = 0; i < input.length; ++i) {
      if (input[i].charCodeAt(0) < 128)
        b[i] = input[i].charCodeAt(0);
    }
    return b;
  }
};

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

// stage/worklet.ts
var { promise: uninstantiatedWasm, resolve: resolveUninstantiatedWasm } = Promise.withResolvers();
var wasm = null;
uninstantiatedWasm.then((binary) => instantiate2("Worklet", binary).then((w) => wasm = w));
var RandomNoiseProcessor = class extends AudioWorkletProcessor {
  constructor() {
    super();
    expose({
      provideWasm(data) {
        resolveUninstantiatedWasm(data);
      },
      execute(str) {
        return new Function("wasm", str)(wasm);
      }
    }, this.port);
  }
  process(inputs, outputs, parameters) {
    if (wasm) {
      outputs[0].forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {
          channel[i] = (wasm.exports.getRandomNumber() * 2 - 1) / 1e3;
        }
      });
    }
    return true;
  }
};
registerProcessor("random-noise-processor", RandomNoiseProcessor);
/*! Bundled license information:

comlink/dist/esm/comlink.mjs:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc3JjL3BvbHlmaWxsL2V2ZW50LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9wb2x5ZmlsbC9jdXN0b20tZXZlbnQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3BvbHlmaWxsL3RleHQtZGVjb2Rlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvcG9seWZpbGwvdGV4dC1lbmNvZGVyLnRzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9jb21saW5rQDQuNC4xL25vZGVfbW9kdWxlcy9jb21saW5rL3NyYy9jb21saW5rLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvYWxpZ25mYXVsdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2dldC10eXBlLWluZm8udHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXVpbnQzMi50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXVpbnQ4LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9zdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfYm9vbC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1uYW1lZC1mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9nZXQtdGFibGUtZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL2lzLTY0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3BvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC1wb2ludGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9lbXZhbC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9lbnVtLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvc2l6ZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC1zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS1zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50MTYudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDMyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQ4LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3QudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfdm9pZC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9zZWdmYXVsdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZXhjZXB0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi90enNldF9qcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvaW5zdGFudGlhdGVkLXdhc2kudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2luc3RhbnRpYXRlLXdhc2kudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2luc3RhbnRpYXRlLXdhc20udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2luc3RhbnRpYXRlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lcnJuby50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50NjQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvY2xvY2tfdGltZV9nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9zaXplc19nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfY2xvc2UudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2lvdmVjLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3JlYWQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfc2Vlay50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF93cml0ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9wcm9jX2V4aXQudHMiLCAiLi4vLi4vaW5zdGFudGlhdGUudHMiLCAiLi4vLi4vd29ya2xldC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiXHJcbi8vIFBvbHlmaWxsIGZvciBleHRyZW1lbHkgbGltaXRlZCBlbnZpcm9ubWVudHMsIGxpa2UgV29ya2xldHMuXHJcbi8vIFRoaXMgc2VlbXMgdG8gZXhpc3QgaW4gQ2hyb21lIGJ1dCBub3QsIGUuZy4sIEZpcmVmb3gsIHBvc3NpYmx5IFNhZmFyaVxyXG4vLyBUT0RPOiBUaGlzIGlzIHRpbnksIGJ1dCBhIHdheSB0byBvcHRpbWl6ZSBpdCBvdXQgZm9yIGVudmlyb25tZW50cyB0aGF0ICpkbyogaGF2ZSBgRXZlbnRgIHdvdWxkIGJlIG5pY2UuLi5cclxuIGNsYXNzIEV2ZW50IHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlXzogc3RyaW5nLCBldmVudEluaXREaWN0PzogRXZlbnRJbml0KSB7ICAgXHJcbiAgICAgICAgdGhpcy5idWJibGVzID0gZXZlbnRJbml0RGljdD8uYnViYmxlcyB8fCBmYWxzZTtcclxuICAgICAgICB0aGlzLmNhbmNlbEJ1YmJsZSA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY2FuY2VsYWJsZSA9IGV2ZW50SW5pdERpY3Q/LmNhbmNlbGFibGUgfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5jb21wb3NlZCA9IGV2ZW50SW5pdERpY3Q/LmNvbXBvc2VkIHx8IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFRhcmdldCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5kZWZhdWx0UHJldmVudGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5ldmVudFBoYXNlID0gRXZlbnQuTk9ORTtcclxuICAgICAgICB0aGlzLmlzVHJ1c3RlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc3JjRWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMudGltZVN0YW1wID0gMDtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlXztcclxuICAgICB9XHJcblxyXG4gICAgc3RhdGljIE5PTkUgPSAwO1xyXG4gICAgc3RhdGljIENBUFRVUklOR19QSEFTRSA9IDE7XHJcbiAgICBzdGF0aWMgQVRfVEFSR0VUID0gMjtcclxuICAgIHN0YXRpYyBCVUJCTElOR19QSEFTRSA9IDM7XHJcblxyXG4gICAgYnViYmxlczogYm9vbGVhbjtcclxuICAgIGNhbmNlbEJ1YmJsZTogYm9vbGVhbjtcclxuICAgIGNhbmNlbGFibGU6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBjb21wb3NlZDogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IGN1cnJlbnRUYXJnZXQ6IEV2ZW50VGFyZ2V0IHwgbnVsbDtcclxuICAgIGRlZmF1bHRQcmV2ZW50ZWQ6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBldmVudFBoYXNlOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBpc1RydXN0ZWQ6IGJvb2xlYW47XHJcbiAgICByZXR1cm5WYWx1ZTogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IHNyY0VsZW1lbnQ6IEV2ZW50VGFyZ2V0IHwgbnVsbDtcclxuICAgIHJlYWRvbmx5IHRhcmdldDogRXZlbnRUYXJnZXQgfCBudWxsO1xyXG4gICAgcmVhZG9ubHkgdGltZVN0YW1wOiBET01IaWdoUmVzVGltZVN0YW1wO1xyXG4gICAgdHlwZTogc3RyaW5nO1xyXG4gICAgY29tcG9zZWRQYXRoKCk6IEV2ZW50VGFyZ2V0W10geyByZXR1cm4gW119XHJcbiAgICBpbml0RXZlbnQodHlwZV86IHN0cmluZywgYnViYmxlcz86IGJvb2xlYW4sIGNhbmNlbGFibGU/OiBib29sZWFuKTogdm9pZCB7IHRoaXMudHlwZSA9IHR5cGVfOyB0aGlzLmJ1YmJsZXMgPSBidWJibGVzIHx8IHRoaXMuYnViYmxlczsgdGhpcy5jYW5jZWxhYmxlID0gY2FuY2VsYWJsZSB8fCB0aGlzLmNhbmNlbGFibGU7IH1cclxuICAgIHByZXZlbnREZWZhdWx0KCk6IHZvaWQgeyB0aGlzLmRlZmF1bHRQcmV2ZW50ZWQgPSB0cnVlOyB9XHJcbiAgICBzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTogdm9pZCB7IH1cclxuICAgIHN0b3BQcm9wYWdhdGlvbigpOiB2b2lkIHsgfVxyXG4gICAgXHJcbn07XHJcblxyXG4oZ2xvYmFsVGhpcy5FdmVudCBhcyBhbnkpID8/ICgoKSA9PiB7XHJcbiAgICBjb25zb2xlLmluZm8oYFRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3QgZGVmaW5lIEV2ZW50OyB1c2luZyBhIHBvbHlmaWxsLmApXHJcbiAgICByZXR1cm4gRXZlbnQ7XHJcbn0pKClcclxuIiwgImltcG9ydCB0eXBlIHsgRXZlbnRUeXBlc01hcCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9ldmVudC10eXBlcy1tYXAuanNcIjtcclxuXHJcbi8vIFdvcmtsZXRzIGRvbid0IGRlZmluZSBgQ3VzdG9tRXZlbnRgLCBldmVuIHdoZW4gdGhleSBkbyBkZWZpbmUgYEV2ZW50YCBpdHNlbGYuLi5cclxuY2xhc3MgQ3VzdG9tRXZlbnQ8VCA9IGFueT4gZXh0ZW5kcyBFdmVudCB7XHJcblxyXG4gICAgY29uc3RydWN0b3IodHlwZToga2V5b2YgRXZlbnRUeXBlc01hcCwgZXZlbnRJbml0RGljdD86IEN1c3RvbUV2ZW50SW5pdDxUPikge1xyXG4gICAgICAgIHN1cGVyKHR5cGUsIGV2ZW50SW5pdERpY3QpO1xyXG4gICAgICAgIHRoaXMuZGV0YWlsID0gZXZlbnRJbml0RGljdD8uZGV0YWlsITtcclxuICAgIH1cclxuXHJcbiAgICBkZXRhaWw6IFQ7XHJcblxyXG4gICAgaW5pdEN1c3RvbUV2ZW50KF90eXBlOiBzdHJpbmcsIF9idWJibGVzPzogYm9vbGVhbiwgX2NhbmNlbGFibGU/OiBib29sZWFuLCBkZXRhaWw/OiBUKTogdm9pZCB7XHJcbiAgICAgICAgLy8gdGhpcy50eXBlLCB0aGlzLmJ1YmJsZXMsIGFuZCB0aGlzLmNhbmNlbGFibGUgYXJlIGFsbCByZWFkb25seS4uLlxyXG4gICAgICAgIHRoaXMuZGV0YWlsID0gKGRldGFpbCA/PyB0aGlzLmRldGFpbCkhO1xyXG4gICAgfVxyXG59XHJcblxyXG4oZ2xvYmFsVGhpcy5DdXN0b21FdmVudCBhcyBhbnkpID8/PSAoKCkgPT4ge1xyXG4gICAgY29uc29sZS5pbmZvKGBUaGlzIGVudmlyb25tZW50IGRvZXMgbm90IGRlZmluZSBDdXN0b21FdmVudDsgdXNpbmcgYSBwb2x5ZmlsbGApO1xyXG4gICAgcmV0dXJuIEN1c3RvbUV2ZW50O1xyXG59KSgpXHJcbiIsICJcclxuZ2xvYmFsVGhpcy5UZXh0RGVjb2RlciA/Pz0gY2xhc3MgVEQgaW1wbGVtZW50cyBUZXh0RGVjb2RlckNvbW1vbiB7XHJcbiAgICBlbmNvZGluZyA9ICd1dGY4JztcclxuICAgIGZhdGFsID0gZmFsc2U7XHJcbiAgICBpZ25vcmVCT00gPSBmYWxzZTtcclxuICAgIGRlY29kZShpbnB1dD86IEFsbG93U2hhcmVkQnVmZmVyU291cmNlLCBvcHRpb25zPzogVGV4dERlY29kZU9wdGlvbnMpOiBzdHJpbmcge1xyXG4gICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICBpZiAoIWlucHV0KVxyXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuXHJcbiAgICAgICAgbGV0IGlucHV0MiA9IG5ldyBVaW50OEFycmF5KChpbnB1dCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSA/IGlucHV0IDogaW5wdXQuYnVmZmVyKTtcclxuXHJcbiAgICAgICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICAgICAgd2hpbGUgKGkgPCBpbnB1dC5ieXRlTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ5dGUgPSBpbnB1dDJbaV07XHJcbiAgICAgICAgICAgIGlmIChieXRlIDwgMHg4MClcclxuICAgICAgICAgICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGUpO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IG5vbi1BU0NJSSBjaGFyYWN0ZXJzIGluIFdvcmtsZXRzXCIpXHJcbiAgICAgICAgICAgICsraTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcbn1cclxuXHJcbiIsICJcclxuZ2xvYmFsVGhpcy5UZXh0RW5jb2RlciA/Pz0gY2xhc3MgVEQgaW1wbGVtZW50cyBUZXh0RW5jb2RlckNvbW1vbiB7XHJcbiAgICBlbmNvZGluZyA9ICd1dGY4JztcclxuICAgIGVuY29kZUludG8oc291cmNlOiBzdHJpbmcsIGRlc3RpbmF0aW9uOiBVaW50OEFycmF5KTogVGV4dEVuY29kZXJFbmNvZGVJbnRvUmVzdWx0IHtcclxuXHJcbiAgICAgICAgbGV0IHJlYWQgPSAwO1xyXG4gICAgICAgIGxldCB3cml0dGVuID0gMDtcclxuXHJcbiAgICAgICAgbGV0IGJ5dGVJbmRleCA9IDA7XHJcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBzb3VyY2UpIHtcclxuICAgICAgICAgICAgaWYgKGNoLmNvZGVQb2ludEF0KDApISA+PSAweDgwKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBub24tQVNDSUkgY2hhcmFjdGVycyBpbiBXb3JrbGV0c1wiKTtcclxuICAgICAgICAgICAgZGVzdGluYXRpb25bYnl0ZUluZGV4KytdID0gY2guY29kZVBvaW50QXQoMCkhO1xyXG4gICAgICAgICAgICArK3JlYWQ7XHJcbiAgICAgICAgICAgICsrd3JpdHRlbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlYWQsXHJcbiAgICAgICAgICAgIHdyaXR0ZW5cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbmNvZGUoaW5wdXQ/OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcclxuICAgICAgICBpZiAoIWlucHV0KVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoKTtcclxuXHJcbiAgICAgICAgbGV0IGIgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIoaW5wdXQubGVuZ3RoKSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBpZiAoaW5wdXRbaV0uY2hhckNvZGVBdCgwKSEgPCAweDgwKVxyXG4gICAgICAgICAgICAgICAgYltpXSA9IGlucHV0W2ldLmNoYXJDb2RlQXQoMCkhXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG59XHJcblxyXG4iLCAiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcbiAqL1xuXG5pbXBvcnQge1xuICBFbmRwb2ludCxcbiAgRXZlbnRTb3VyY2UsXG4gIE1lc3NhZ2UsXG4gIE1lc3NhZ2VUeXBlLFxuICBQb3N0TWVzc2FnZVdpdGhPcmlnaW4sXG4gIFdpcmVWYWx1ZSxcbiAgV2lyZVZhbHVlVHlwZSxcbn0gZnJvbSBcIi4vcHJvdG9jb2xcIjtcbmV4cG9ydCB0eXBlIHsgRW5kcG9pbnQgfTtcblxuZXhwb3J0IGNvbnN0IHByb3h5TWFya2VyID0gU3ltYm9sKFwiQ29tbGluay5wcm94eVwiKTtcbmV4cG9ydCBjb25zdCBjcmVhdGVFbmRwb2ludCA9IFN5bWJvbChcIkNvbWxpbmsuZW5kcG9pbnRcIik7XG5leHBvcnQgY29uc3QgcmVsZWFzZVByb3h5ID0gU3ltYm9sKFwiQ29tbGluay5yZWxlYXNlUHJveHlcIik7XG5leHBvcnQgY29uc3QgZmluYWxpemVyID0gU3ltYm9sKFwiQ29tbGluay5maW5hbGl6ZXJcIik7XG5cbmNvbnN0IHRocm93TWFya2VyID0gU3ltYm9sKFwiQ29tbGluay50aHJvd25cIik7XG5cbi8qKlxuICogSW50ZXJmYWNlIG9mIHZhbHVlcyB0aGF0IHdlcmUgbWFya2VkIHRvIGJlIHByb3hpZWQgd2l0aCBgY29tbGluay5wcm94eSgpYC5cbiAqIENhbiBhbHNvIGJlIGltcGxlbWVudGVkIGJ5IGNsYXNzZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJveHlNYXJrZWQge1xuICBbcHJveHlNYXJrZXJdOiB0cnVlO1xufVxuXG4vKipcbiAqIFRha2VzIGEgdHlwZSBhbmQgd3JhcHMgaXQgaW4gYSBQcm9taXNlLCBpZiBpdCBub3QgYWxyZWFkeSBpcyBvbmUuXG4gKiBUaGlzIGlzIHRvIGF2b2lkIGBQcm9taXNlPFByb21pc2U8VD4+YC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnZlcnNlIG9mIGBVbnByb21pc2lmeTxUPmAuXG4gKi9cbnR5cGUgUHJvbWlzaWZ5PFQ+ID0gVCBleHRlbmRzIFByb21pc2U8dW5rbm93bj4gPyBUIDogUHJvbWlzZTxUPjtcbi8qKlxuICogVGFrZXMgYSB0eXBlIHRoYXQgbWF5IGJlIFByb21pc2UgYW5kIHVud3JhcHMgdGhlIFByb21pc2UgdHlwZS5cbiAqIElmIGBQYCBpcyBub3QgYSBQcm9taXNlLCBpdCByZXR1cm5zIGBQYC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnZlcnNlIG9mIGBQcm9taXNpZnk8VD5gLlxuICovXG50eXBlIFVucHJvbWlzaWZ5PFA+ID0gUCBleHRlbmRzIFByb21pc2U8aW5mZXIgVD4gPyBUIDogUDtcblxuLyoqXG4gKiBUYWtlcyB0aGUgcmF3IHR5cGUgb2YgYSByZW1vdGUgcHJvcGVydHkgYW5kIHJldHVybnMgdGhlIHR5cGUgdGhhdCBpcyB2aXNpYmxlIHRvIHRoZSBsb2NhbCB0aHJlYWQgb24gdGhlIHByb3h5LlxuICpcbiAqIE5vdGU6IFRoaXMgbmVlZHMgdG8gYmUgaXRzIG93biB0eXBlIGFsaWFzLCBvdGhlcndpc2UgaXQgd2lsbCBub3QgZGlzdHJpYnV0ZSBvdmVyIHVuaW9ucy5cbiAqIFNlZSBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9hZHZhbmNlZC10eXBlcy5odG1sI2Rpc3RyaWJ1dGl2ZS1jb25kaXRpb25hbC10eXBlc1xuICovXG50eXBlIFJlbW90ZVByb3BlcnR5PFQ+ID1cbiAgLy8gSWYgdGhlIHZhbHVlIGlzIGEgbWV0aG9kLCBjb21saW5rIHdpbGwgcHJveHkgaXQgYXV0b21hdGljYWxseS5cbiAgLy8gT2JqZWN0cyBhcmUgb25seSBwcm94aWVkIGlmIHRoZXkgYXJlIG1hcmtlZCB0byBiZSBwcm94aWVkLlxuICAvLyBPdGhlcndpc2UsIHRoZSBwcm9wZXJ0eSBpcyBjb252ZXJ0ZWQgdG8gYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdGhlIGNsb25lZCB2YWx1ZS5cbiAgVCBleHRlbmRzIEZ1bmN0aW9uIHwgUHJveHlNYXJrZWQgPyBSZW1vdGU8VD4gOiBQcm9taXNpZnk8VD47XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcHJvcGVydHkgYXMgYSByZW1vdGUgdGhyZWFkIHdvdWxkIHNlZSBpdCB0aHJvdWdoIGEgcHJveHkgKGUuZy4gd2hlbiBwYXNzZWQgaW4gYXMgYSBmdW5jdGlvblxuICogYXJndW1lbnQpIGFuZCByZXR1cm5zIHRoZSB0eXBlIHRoYXQgdGhlIGxvY2FsIHRocmVhZCBoYXMgdG8gc3VwcGx5LlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFJlbW90ZVByb3BlcnR5PFQ+YC5cbiAqXG4gKiBOb3RlOiBUaGlzIG5lZWRzIHRvIGJlIGl0cyBvd24gdHlwZSBhbGlhcywgb3RoZXJ3aXNlIGl0IHdpbGwgbm90IGRpc3RyaWJ1dGUgb3ZlciB1bmlvbnMuIFNlZVxuICogaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svYWR2YW5jZWQtdHlwZXMuaHRtbCNkaXN0cmlidXRpdmUtY29uZGl0aW9uYWwtdHlwZXNcbiAqL1xudHlwZSBMb2NhbFByb3BlcnR5PFQ+ID0gVCBleHRlbmRzIEZ1bmN0aW9uIHwgUHJveHlNYXJrZWRcbiAgPyBMb2NhbDxUPlxuICA6IFVucHJvbWlzaWZ5PFQ+O1xuXG4vKipcbiAqIFByb3hpZXMgYFRgIGlmIGl0IGlzIGEgYFByb3h5TWFya2VkYCwgY2xvbmVzIGl0IG90aGVyd2lzZSAoYXMgaGFuZGxlZCBieSBzdHJ1Y3R1cmVkIGNsb25pbmcgYW5kIHRyYW5zZmVyIGhhbmRsZXJzKS5cbiAqL1xuZXhwb3J0IHR5cGUgUHJveHlPckNsb25lPFQ+ID0gVCBleHRlbmRzIFByb3h5TWFya2VkID8gUmVtb3RlPFQ+IDogVDtcbi8qKlxuICogSW52ZXJzZSBvZiBgUHJveHlPckNsb25lPFQ+YC5cbiAqL1xuZXhwb3J0IHR5cGUgVW5wcm94eU9yQ2xvbmU8VD4gPSBUIGV4dGVuZHMgUmVtb3RlT2JqZWN0PFByb3h5TWFya2VkPlxuICA/IExvY2FsPFQ+XG4gIDogVDtcblxuLyoqXG4gKiBUYWtlcyB0aGUgcmF3IHR5cGUgb2YgYSByZW1vdGUgb2JqZWN0IGluIHRoZSBvdGhlciB0aHJlYWQgYW5kIHJldHVybnMgdGhlIHR5cGUgYXMgaXQgaXMgdmlzaWJsZSB0byB0aGUgbG9jYWwgdGhyZWFkXG4gKiB3aGVuIHByb3hpZWQgd2l0aCBgQ29tbGluay5wcm94eSgpYC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IGhhbmRsZSBjYWxsIHNpZ25hdHVyZXMsIHdoaWNoIGlzIGhhbmRsZWQgYnkgdGhlIG1vcmUgZ2VuZXJhbCBgUmVtb3RlPFQ+YCB0eXBlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIFRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBvYmplY3QgYXMgc2VlbiBpbiB0aGUgb3RoZXIgdGhyZWFkLlxuICovXG5leHBvcnQgdHlwZSBSZW1vdGVPYmplY3Q8VD4gPSB7IFtQIGluIGtleW9mIFRdOiBSZW1vdGVQcm9wZXJ0eTxUW1BdPiB9O1xuLyoqXG4gKiBUYWtlcyB0aGUgdHlwZSBvZiBhbiBvYmplY3QgYXMgYSByZW1vdGUgdGhyZWFkIHdvdWxkIHNlZSBpdCB0aHJvdWdoIGEgcHJveHkgKGUuZy4gd2hlbiBwYXNzZWQgaW4gYXMgYSBmdW5jdGlvblxuICogYXJndW1lbnQpIGFuZCByZXR1cm5zIHRoZSB0eXBlIHRoYXQgdGhlIGxvY2FsIHRocmVhZCBoYXMgdG8gc3VwcGx5LlxuICpcbiAqIFRoaXMgZG9lcyBub3QgaGFuZGxlIGNhbGwgc2lnbmF0dXJlcywgd2hpY2ggaXMgaGFuZGxlZCBieSB0aGUgbW9yZSBnZW5lcmFsIGBMb2NhbDxUPmAgdHlwZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnZlcnNlIG9mIGBSZW1vdGVPYmplY3Q8VD5gLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIFRoZSB0eXBlIG9mIGEgcHJveGllZCBvYmplY3QuXG4gKi9cbmV4cG9ydCB0eXBlIExvY2FsT2JqZWN0PFQ+ID0geyBbUCBpbiBrZXlvZiBUXTogTG9jYWxQcm9wZXJ0eTxUW1BdPiB9O1xuXG4vKipcbiAqIEFkZGl0aW9uYWwgc3BlY2lhbCBjb21saW5rIG1ldGhvZHMgYXZhaWxhYmxlIG9uIGVhY2ggcHJveHkgcmV0dXJuZWQgYnkgYENvbWxpbmsud3JhcCgpYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcm94eU1ldGhvZHMge1xuICBbY3JlYXRlRW5kcG9pbnRdOiAoKSA9PiBQcm9taXNlPE1lc3NhZ2VQb3J0PjtcbiAgW3JlbGVhc2VQcm94eV06ICgpID0+IHZvaWQ7XG59XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIG9iamVjdCwgZnVuY3Rpb24gb3IgY2xhc3MgaW4gdGhlIG90aGVyIHRocmVhZCBhbmQgcmV0dXJucyB0aGUgdHlwZSBhcyBpdCBpcyB2aXNpYmxlIHRvXG4gKiB0aGUgbG9jYWwgdGhyZWFkIGZyb20gdGhlIHByb3h5IHJldHVybiB2YWx1ZSBvZiBgQ29tbGluay53cmFwKClgIG9yIGBDb21saW5rLnByb3h5KClgLlxuICovXG5leHBvcnQgdHlwZSBSZW1vdGU8VD4gPVxuICAvLyBIYW5kbGUgcHJvcGVydGllc1xuICBSZW1vdGVPYmplY3Q8VD4gJlxuICAgIC8vIEhhbmRsZSBjYWxsIHNpZ25hdHVyZSAoaWYgcHJlc2VudClcbiAgICAoVCBleHRlbmRzICguLi5hcmdzOiBpbmZlciBUQXJndW1lbnRzKSA9PiBpbmZlciBUUmV0dXJuXG4gICAgICA/IChcbiAgICAgICAgICAuLi5hcmdzOiB7IFtJIGluIGtleW9mIFRBcmd1bWVudHNdOiBVbnByb3h5T3JDbG9uZTxUQXJndW1lbnRzW0ldPiB9XG4gICAgICAgICkgPT4gUHJvbWlzaWZ5PFByb3h5T3JDbG9uZTxVbnByb21pc2lmeTxUUmV0dXJuPj4+XG4gICAgICA6IHVua25vd24pICZcbiAgICAvLyBIYW5kbGUgY29uc3RydWN0IHNpZ25hdHVyZSAoaWYgcHJlc2VudClcbiAgICAvLyBUaGUgcmV0dXJuIG9mIGNvbnN0cnVjdCBzaWduYXR1cmVzIGlzIGFsd2F5cyBwcm94aWVkICh3aGV0aGVyIG1hcmtlZCBvciBub3QpXG4gICAgKFQgZXh0ZW5kcyB7IG5ldyAoLi4uYXJnczogaW5mZXIgVEFyZ3VtZW50cyk6IGluZmVyIFRJbnN0YW5jZSB9XG4gICAgICA/IHtcbiAgICAgICAgICBuZXcgKFxuICAgICAgICAgICAgLi4uYXJnczoge1xuICAgICAgICAgICAgICBbSSBpbiBrZXlvZiBUQXJndW1lbnRzXTogVW5wcm94eU9yQ2xvbmU8VEFyZ3VtZW50c1tJXT47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTogUHJvbWlzaWZ5PFJlbW90ZTxUSW5zdGFuY2U+PjtcbiAgICAgICAgfVxuICAgICAgOiB1bmtub3duKSAmXG4gICAgLy8gSW5jbHVkZSBhZGRpdGlvbmFsIHNwZWNpYWwgY29tbGluayBtZXRob2RzIGF2YWlsYWJsZSBvbiB0aGUgcHJveHkuXG4gICAgUHJveHlNZXRob2RzO1xuXG4vKipcbiAqIEV4cHJlc3NlcyB0aGF0IGEgdHlwZSBjYW4gYmUgZWl0aGVyIGEgc3luYyBvciBhc3luYy5cbiAqL1xudHlwZSBNYXliZVByb21pc2U8VD4gPSBQcm9taXNlPFQ+IHwgVDtcblxuLyoqXG4gKiBUYWtlcyB0aGUgcmF3IHR5cGUgb2YgYSByZW1vdGUgb2JqZWN0LCBmdW5jdGlvbiBvciBjbGFzcyBhcyBhIHJlbW90ZSB0aHJlYWQgd291bGQgc2VlIGl0IHRocm91Z2ggYSBwcm94eSAoZS5nLiB3aGVuXG4gKiBwYXNzZWQgaW4gYXMgYSBmdW5jdGlvbiBhcmd1bWVudCkgYW5kIHJldHVybnMgdGhlIHR5cGUgdGhlIGxvY2FsIHRocmVhZCBoYXMgdG8gc3VwcGx5LlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFJlbW90ZTxUPmAuIEl0IHRha2VzIGEgYFJlbW90ZTxUPmAgYW5kIHJldHVybnMgaXRzIG9yaWdpbmFsIGlucHV0IGBUYC5cbiAqL1xuZXhwb3J0IHR5cGUgTG9jYWw8VD4gPVxuICAvLyBPbWl0IHRoZSBzcGVjaWFsIHByb3h5IG1ldGhvZHMgKHRoZXkgZG9uJ3QgbmVlZCB0byBiZSBzdXBwbGllZCwgY29tbGluayBhZGRzIHRoZW0pXG4gIE9taXQ8TG9jYWxPYmplY3Q8VD4sIGtleW9mIFByb3h5TWV0aG9kcz4gJlxuICAgIC8vIEhhbmRsZSBjYWxsIHNpZ25hdHVyZXMgKGlmIHByZXNlbnQpXG4gICAgKFQgZXh0ZW5kcyAoLi4uYXJnczogaW5mZXIgVEFyZ3VtZW50cykgPT4gaW5mZXIgVFJldHVyblxuICAgICAgPyAoXG4gICAgICAgICAgLi4uYXJnczogeyBbSSBpbiBrZXlvZiBUQXJndW1lbnRzXTogUHJveHlPckNsb25lPFRBcmd1bWVudHNbSV0+IH1cbiAgICAgICAgKSA9PiAvLyBUaGUgcmF3IGZ1bmN0aW9uIGNvdWxkIGVpdGhlciBiZSBzeW5jIG9yIGFzeW5jLCBidXQgaXMgYWx3YXlzIHByb3hpZWQgYXV0b21hdGljYWxseVxuICAgICAgICBNYXliZVByb21pc2U8VW5wcm94eU9yQ2xvbmU8VW5wcm9taXNpZnk8VFJldHVybj4+PlxuICAgICAgOiB1bmtub3duKSAmXG4gICAgLy8gSGFuZGxlIGNvbnN0cnVjdCBzaWduYXR1cmUgKGlmIHByZXNlbnQpXG4gICAgLy8gVGhlIHJldHVybiBvZiBjb25zdHJ1Y3Qgc2lnbmF0dXJlcyBpcyBhbHdheXMgcHJveGllZCAod2hldGhlciBtYXJrZWQgb3Igbm90KVxuICAgIChUIGV4dGVuZHMgeyBuZXcgKC4uLmFyZ3M6IGluZmVyIFRBcmd1bWVudHMpOiBpbmZlciBUSW5zdGFuY2UgfVxuICAgICAgPyB7XG4gICAgICAgICAgbmV3IChcbiAgICAgICAgICAgIC4uLmFyZ3M6IHtcbiAgICAgICAgICAgICAgW0kgaW4ga2V5b2YgVEFyZ3VtZW50c106IFByb3h5T3JDbG9uZTxUQXJndW1lbnRzW0ldPjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApOiAvLyBUaGUgcmF3IGNvbnN0cnVjdG9yIGNvdWxkIGVpdGhlciBiZSBzeW5jIG9yIGFzeW5jLCBidXQgaXMgYWx3YXlzIHByb3hpZWQgYXV0b21hdGljYWxseVxuICAgICAgICAgIE1heWJlUHJvbWlzZTxMb2NhbDxVbnByb21pc2lmeTxUSW5zdGFuY2U+Pj47XG4gICAgICAgIH1cbiAgICAgIDogdW5rbm93bik7XG5cbmNvbnN0IGlzT2JqZWN0ID0gKHZhbDogdW5rbm93bik6IHZhbCBpcyBvYmplY3QgPT5cbiAgKHR5cGVvZiB2YWwgPT09IFwib2JqZWN0XCIgJiYgdmFsICE9PSBudWxsKSB8fCB0eXBlb2YgdmFsID09PSBcImZ1bmN0aW9uXCI7XG5cbi8qKlxuICogQ3VzdG9taXplcyB0aGUgc2VyaWFsaXphdGlvbiBvZiBjZXJ0YWluIHZhbHVlcyBhcyBkZXRlcm1pbmVkIGJ5IGBjYW5IYW5kbGUoKWAuXG4gKlxuICogQHRlbXBsYXRlIFQgVGhlIGlucHV0IHR5cGUgYmVpbmcgaGFuZGxlZCBieSB0aGlzIHRyYW5zZmVyIGhhbmRsZXIuXG4gKiBAdGVtcGxhdGUgUyBUaGUgc2VyaWFsaXplZCB0eXBlIHNlbnQgb3ZlciB0aGUgd2lyZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc2ZlckhhbmRsZXI8VCwgUz4ge1xuICAvKipcbiAgICogR2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IHZhbHVlIHRvIGRldGVybWluZSB3aGV0aGVyIHRoaXMgdHJhbnNmZXIgaGFuZGxlclxuICAgKiBzaG91bGQgc2VyaWFsaXplIHRoZSB2YWx1ZSwgd2hpY2ggaW5jbHVkZXMgY2hlY2tpbmcgdGhhdCBpdCBpcyBvZiB0aGUgcmlnaHRcbiAgICogdHlwZSAoYnV0IGNhbiBwZXJmb3JtIGNoZWNrcyBiZXlvbmQgdGhhdCBhcyB3ZWxsKS5cbiAgICovXG4gIGNhbkhhbmRsZSh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFQ7XG5cbiAgLyoqXG4gICAqIEdldHMgY2FsbGVkIHdpdGggdGhlIHZhbHVlIGlmIGBjYW5IYW5kbGUoKWAgcmV0dXJuZWQgYHRydWVgIHRvIHByb2R1Y2UgYVxuICAgKiB2YWx1ZSB0aGF0IGNhbiBiZSBzZW50IGluIGEgbWVzc2FnZSwgY29uc2lzdGluZyBvZiBzdHJ1Y3R1cmVkLWNsb25lYWJsZVxuICAgKiB2YWx1ZXMgYW5kL29yIHRyYW5zZmVycmFibGUgb2JqZWN0cy5cbiAgICovXG4gIHNlcmlhbGl6ZSh2YWx1ZTogVCk6IFtTLCBUcmFuc2ZlcmFibGVbXV07XG5cbiAgLyoqXG4gICAqIEdldHMgY2FsbGVkIHRvIGRlc2VyaWFsaXplIGFuIGluY29taW5nIHZhbHVlIHRoYXQgd2FzIHNlcmlhbGl6ZWQgaW4gdGhlXG4gICAqIG90aGVyIHRocmVhZCB3aXRoIHRoaXMgdHJhbnNmZXIgaGFuZGxlciAoa25vd24gdGhyb3VnaCB0aGUgbmFtZSBpdCB3YXNcbiAgICogcmVnaXN0ZXJlZCB1bmRlcikuXG4gICAqL1xuICBkZXNlcmlhbGl6ZSh2YWx1ZTogUyk6IFQ7XG59XG5cbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlIHRvIGhhbmRsZSBvYmplY3RzIG1hcmtlZCB0byBwcm94eS5cbiAqL1xuY29uc3QgcHJveHlUcmFuc2ZlckhhbmRsZXI6IFRyYW5zZmVySGFuZGxlcjxvYmplY3QsIE1lc3NhZ2VQb3J0PiA9IHtcbiAgY2FuSGFuZGxlOiAodmFsKTogdmFsIGlzIFByb3h5TWFya2VkID0+XG4gICAgaXNPYmplY3QodmFsKSAmJiAodmFsIGFzIFByb3h5TWFya2VkKVtwcm94eU1hcmtlcl0sXG4gIHNlcmlhbGl6ZShvYmopIHtcbiAgICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgZXhwb3NlKG9iaiwgcG9ydDEpO1xuICAgIHJldHVybiBbcG9ydDIsIFtwb3J0Ml1dO1xuICB9LFxuICBkZXNlcmlhbGl6ZShwb3J0KSB7XG4gICAgcG9ydC5zdGFydCgpO1xuICAgIHJldHVybiB3cmFwKHBvcnQpO1xuICB9LFxufTtcblxuaW50ZXJmYWNlIFRocm93blZhbHVlIHtcbiAgW3Rocm93TWFya2VyXTogdW5rbm93bjsgLy8ganVzdCBuZWVkcyB0byBiZSBwcmVzZW50XG4gIHZhbHVlOiB1bmtub3duO1xufVxudHlwZSBTZXJpYWxpemVkVGhyb3duVmFsdWUgPVxuICB8IHsgaXNFcnJvcjogdHJ1ZTsgdmFsdWU6IEVycm9yIH1cbiAgfCB7IGlzRXJyb3I6IGZhbHNlOyB2YWx1ZTogdW5rbm93biB9O1xuXG4vKipcbiAqIEludGVybmFsIHRyYW5zZmVyIGhhbmRsZXIgdG8gaGFuZGxlIHRocm93biBleGNlcHRpb25zLlxuICovXG5jb25zdCB0aHJvd1RyYW5zZmVySGFuZGxlcjogVHJhbnNmZXJIYW5kbGVyPFxuICBUaHJvd25WYWx1ZSxcbiAgU2VyaWFsaXplZFRocm93blZhbHVlXG4+ID0ge1xuICBjYW5IYW5kbGU6ICh2YWx1ZSk6IHZhbHVlIGlzIFRocm93blZhbHVlID0+XG4gICAgaXNPYmplY3QodmFsdWUpICYmIHRocm93TWFya2VyIGluIHZhbHVlLFxuICBzZXJpYWxpemUoeyB2YWx1ZSB9KSB7XG4gICAgbGV0IHNlcmlhbGl6ZWQ6IFNlcmlhbGl6ZWRUaHJvd25WYWx1ZTtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgc2VyaWFsaXplZCA9IHtcbiAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICBtZXNzYWdlOiB2YWx1ZS5tZXNzYWdlLFxuICAgICAgICAgIG5hbWU6IHZhbHVlLm5hbWUsXG4gICAgICAgICAgc3RhY2s6IHZhbHVlLnN0YWNrLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VyaWFsaXplZCA9IHsgaXNFcnJvcjogZmFsc2UsIHZhbHVlIH07XG4gICAgfVxuICAgIHJldHVybiBbc2VyaWFsaXplZCwgW11dO1xuICB9LFxuICBkZXNlcmlhbGl6ZShzZXJpYWxpemVkKSB7XG4gICAgaWYgKHNlcmlhbGl6ZWQuaXNFcnJvcikge1xuICAgICAgdGhyb3cgT2JqZWN0LmFzc2lnbihcbiAgICAgICAgbmV3IEVycm9yKHNlcmlhbGl6ZWQudmFsdWUubWVzc2FnZSksXG4gICAgICAgIHNlcmlhbGl6ZWQudmFsdWVcbiAgICAgICk7XG4gICAgfVxuICAgIHRocm93IHNlcmlhbGl6ZWQudmFsdWU7XG4gIH0sXG59O1xuXG4vKipcbiAqIEFsbG93cyBjdXN0b21pemluZyB0aGUgc2VyaWFsaXphdGlvbiBvZiBjZXJ0YWluIHZhbHVlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHRyYW5zZmVySGFuZGxlcnMgPSBuZXcgTWFwPFxuICBzdHJpbmcsXG4gIFRyYW5zZmVySGFuZGxlcjx1bmtub3duLCB1bmtub3duPlxuPihbXG4gIFtcInByb3h5XCIsIHByb3h5VHJhbnNmZXJIYW5kbGVyXSxcbiAgW1widGhyb3dcIiwgdGhyb3dUcmFuc2ZlckhhbmRsZXJdLFxuXSk7XG5cbmZ1bmN0aW9uIGlzQWxsb3dlZE9yaWdpbihcbiAgYWxsb3dlZE9yaWdpbnM6IChzdHJpbmcgfCBSZWdFeHApW10sXG4gIG9yaWdpbjogc3RyaW5nXG4pOiBib29sZWFuIHtcbiAgZm9yIChjb25zdCBhbGxvd2VkT3JpZ2luIG9mIGFsbG93ZWRPcmlnaW5zKSB7XG4gICAgaWYgKG9yaWdpbiA9PT0gYWxsb3dlZE9yaWdpbiB8fCBhbGxvd2VkT3JpZ2luID09PSBcIipcIikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChhbGxvd2VkT3JpZ2luIGluc3RhbmNlb2YgUmVnRXhwICYmIGFsbG93ZWRPcmlnaW4udGVzdChvcmlnaW4pKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhwb3NlKFxuICBvYmo6IGFueSxcbiAgZXA6IEVuZHBvaW50ID0gZ2xvYmFsVGhpcyBhcyBhbnksXG4gIGFsbG93ZWRPcmlnaW5zOiAoc3RyaW5nIHwgUmVnRXhwKVtdID0gW1wiKlwiXVxuKSB7XG4gIGVwLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIGNhbGxiYWNrKGV2OiBNZXNzYWdlRXZlbnQpIHtcbiAgICBpZiAoIWV2IHx8ICFldi5kYXRhKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghaXNBbGxvd2VkT3JpZ2luKGFsbG93ZWRPcmlnaW5zLCBldi5vcmlnaW4pKSB7XG4gICAgICBjb25zb2xlLndhcm4oYEludmFsaWQgb3JpZ2luICcke2V2Lm9yaWdpbn0nIGZvciBjb21saW5rIHByb3h5YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHsgaWQsIHR5cGUsIHBhdGggfSA9IHtcbiAgICAgIHBhdGg6IFtdIGFzIHN0cmluZ1tdLFxuICAgICAgLi4uKGV2LmRhdGEgYXMgTWVzc2FnZSksXG4gICAgfTtcbiAgICBjb25zdCBhcmd1bWVudExpc3QgPSAoZXYuZGF0YS5hcmd1bWVudExpc3QgfHwgW10pLm1hcChmcm9tV2lyZVZhbHVlKTtcbiAgICBsZXQgcmV0dXJuVmFsdWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGguc2xpY2UoMCwgLTEpLnJlZHVjZSgob2JqLCBwcm9wKSA9PiBvYmpbcHJvcF0sIG9iaik7XG4gICAgICBjb25zdCByYXdWYWx1ZSA9IHBhdGgucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLkdFVDpcbiAgICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHJhd1ZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5TRVQ6XG4gICAgICAgICAge1xuICAgICAgICAgICAgcGFyZW50W3BhdGguc2xpY2UoLTEpWzBdXSA9IGZyb21XaXJlVmFsdWUoZXYuZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLkFQUExZOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gcmF3VmFsdWUuYXBwbHkocGFyZW50LCBhcmd1bWVudExpc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5DT05TVFJVQ1Q6XG4gICAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgcmF3VmFsdWUoLi4uYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gcHJveHkodmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5FTkRQT0lOVDpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgICAgICBleHBvc2Uob2JqLCBwb3J0Mik7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHRyYW5zZmVyKHBvcnQxLCBbcG9ydDFdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuUkVMRUFTRTpcbiAgICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKHZhbHVlKSB7XG4gICAgICByZXR1cm5WYWx1ZSA9IHsgdmFsdWUsIFt0aHJvd01hcmtlcl06IDAgfTtcbiAgICB9XG4gICAgUHJvbWlzZS5yZXNvbHZlKHJldHVyblZhbHVlKVxuICAgICAgLmNhdGNoKCh2YWx1ZSkgPT4ge1xuICAgICAgICByZXR1cm4geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgICAgfSlcbiAgICAgIC50aGVuKChyZXR1cm5WYWx1ZSkgPT4ge1xuICAgICAgICBjb25zdCBbd2lyZVZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHJldHVyblZhbHVlKTtcbiAgICAgICAgZXAucG9zdE1lc3NhZ2UoeyAuLi53aXJlVmFsdWUsIGlkIH0sIHRyYW5zZmVyYWJsZXMpO1xuICAgICAgICBpZiAodHlwZSA9PT0gTWVzc2FnZVR5cGUuUkVMRUFTRSkge1xuICAgICAgICAgIC8vIGRldGFjaCBhbmQgZGVhY3RpdmUgYWZ0ZXIgc2VuZGluZyByZWxlYXNlIHJlc3BvbnNlIGFib3ZlLlxuICAgICAgICAgIGVwLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNhbGxiYWNrIGFzIGFueSk7XG4gICAgICAgICAgY2xvc2VFbmRQb2ludChlcCk7XG4gICAgICAgICAgaWYgKGZpbmFsaXplciBpbiBvYmogJiYgdHlwZW9mIG9ialtmaW5hbGl6ZXJdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9ialtmaW5hbGl6ZXJdKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAvLyBTZW5kIFNlcmlhbGl6YXRpb24gRXJyb3IgVG8gQ2FsbGVyXG4gICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUoe1xuICAgICAgICAgIHZhbHVlOiBuZXcgVHlwZUVycm9yKFwiVW5zZXJpYWxpemFibGUgcmV0dXJuIHZhbHVlXCIpLFxuICAgICAgICAgIFt0aHJvd01hcmtlcl06IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBlcC5wb3N0TWVzc2FnZSh7IC4uLndpcmVWYWx1ZSwgaWQgfSwgdHJhbnNmZXJhYmxlcyk7XG4gICAgICB9KTtcbiAgfSBhcyBhbnkpO1xuICBpZiAoZXAuc3RhcnQpIHtcbiAgICBlcC5zdGFydCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQ6IEVuZHBvaW50KTogZW5kcG9pbnQgaXMgTWVzc2FnZVBvcnQge1xuICByZXR1cm4gZW5kcG9pbnQuY29uc3RydWN0b3IubmFtZSA9PT0gXCJNZXNzYWdlUG9ydFwiO1xufVxuXG5mdW5jdGlvbiBjbG9zZUVuZFBvaW50KGVuZHBvaW50OiBFbmRwb2ludCkge1xuICBpZiAoaXNNZXNzYWdlUG9ydChlbmRwb2ludCkpIGVuZHBvaW50LmNsb3NlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cmFwPFQ+KGVwOiBFbmRwb2ludCwgdGFyZ2V0PzogYW55KTogUmVtb3RlPFQ+IHtcbiAgcmV0dXJuIGNyZWF0ZVByb3h5PFQ+KGVwLCBbXSwgdGFyZ2V0KSBhcyBhbnk7XG59XG5cbmZ1bmN0aW9uIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUmVsZWFzZWQ6IGJvb2xlYW4pIHtcbiAgaWYgKGlzUmVsZWFzZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm94eSBoYXMgYmVlbiByZWxlYXNlZCBhbmQgaXMgbm90IHVzZWFibGVcIik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVsZWFzZUVuZHBvaW50KGVwOiBFbmRwb2ludCkge1xuICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgIHR5cGU6IE1lc3NhZ2VUeXBlLlJFTEVBU0UsXG4gIH0pLnRoZW4oKCkgPT4ge1xuICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICB9KTtcbn1cblxuaW50ZXJmYWNlIEZpbmFsaXphdGlvblJlZ2lzdHJ5PFQ+IHtcbiAgbmV3IChjYjogKGhlbGRWYWx1ZTogVCkgPT4gdm9pZCk6IEZpbmFsaXphdGlvblJlZ2lzdHJ5PFQ+O1xuICByZWdpc3RlcihcbiAgICB3ZWFrSXRlbTogb2JqZWN0LFxuICAgIGhlbGRWYWx1ZTogVCxcbiAgICB1bnJlZ2lzdGVyVG9rZW4/OiBvYmplY3QgfCB1bmRlZmluZWRcbiAgKTogdm9pZDtcbiAgdW5yZWdpc3Rlcih1bnJlZ2lzdGVyVG9rZW46IG9iamVjdCk6IHZvaWQ7XG59XG5kZWNsYXJlIHZhciBGaW5hbGl6YXRpb25SZWdpc3RyeTogRmluYWxpemF0aW9uUmVnaXN0cnk8RW5kcG9pbnQ+O1xuXG5jb25zdCBwcm94eUNvdW50ZXIgPSBuZXcgV2Vha01hcDxFbmRwb2ludCwgbnVtYmVyPigpO1xuY29uc3QgcHJveHlGaW5hbGl6ZXJzID1cbiAgXCJGaW5hbGl6YXRpb25SZWdpc3RyeVwiIGluIGdsb2JhbFRoaXMgJiZcbiAgbmV3IEZpbmFsaXphdGlvblJlZ2lzdHJ5KChlcDogRW5kcG9pbnQpID0+IHtcbiAgICBjb25zdCBuZXdDb3VudCA9IChwcm94eUNvdW50ZXIuZ2V0KGVwKSB8fCAwKSAtIDE7XG4gICAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICAgIGlmIChuZXdDb3VudCA9PT0gMCkge1xuICAgICAgcmVsZWFzZUVuZHBvaW50KGVwKTtcbiAgICB9XG4gIH0pO1xuXG5mdW5jdGlvbiByZWdpc3RlclByb3h5KHByb3h5OiBvYmplY3QsIGVwOiBFbmRwb2ludCkge1xuICBjb25zdCBuZXdDb3VudCA9IChwcm94eUNvdW50ZXIuZ2V0KGVwKSB8fCAwKSArIDE7XG4gIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgaWYgKHByb3h5RmluYWxpemVycykge1xuICAgIHByb3h5RmluYWxpemVycy5yZWdpc3Rlcihwcm94eSwgZXAsIHByb3h5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyUHJveHkocHJveHk6IG9iamVjdCkge1xuICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgcHJveHlGaW5hbGl6ZXJzLnVucmVnaXN0ZXIocHJveHkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVByb3h5PFQ+KFxuICBlcDogRW5kcG9pbnQsXG4gIHBhdGg6IChzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wpW10gPSBbXSxcbiAgdGFyZ2V0OiBvYmplY3QgPSBmdW5jdGlvbiAoKSB7fVxuKTogUmVtb3RlPFQ+IHtcbiAgbGV0IGlzUHJveHlSZWxlYXNlZCA9IGZhbHNlO1xuICBjb25zdCBwcm94eSA9IG5ldyBQcm94eSh0YXJnZXQsIHtcbiAgICBnZXQoX3RhcmdldCwgcHJvcCkge1xuICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgIGlmIChwcm9wID09PSByZWxlYXNlUHJveHkpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICB1bnJlZ2lzdGVyUHJveHkocHJveHkpO1xuICAgICAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgICAgICAgaXNQcm94eVJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wID09PSBcInRoZW5cIikge1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm4geyB0aGVuOiAoKSA9PiBwcm94eSB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHIgPSByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuR0VULFxuICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICByZXR1cm4gci50aGVuLmJpbmQocik7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIFsuLi5wYXRoLCBwcm9wXSk7XG4gICAgfSxcbiAgICBzZXQoX3RhcmdldCwgcHJvcCwgcmF3VmFsdWUpIHtcbiAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAvLyBGSVhNRTogRVM2IFByb3h5IEhhbmRsZXIgYHNldGAgbWV0aG9kcyBhcmUgc3VwcG9zZWQgdG8gcmV0dXJuIGFcbiAgICAgIC8vIGJvb2xlYW4uIFRvIHNob3cgZ29vZCB3aWxsLCB3ZSByZXR1cm4gdHJ1ZSBhc3luY2hyb25vdXNseSBcdTAwQUZcXF8oXHUzMEM0KV8vXHUwMEFGXG4gICAgICBjb25zdCBbdmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmF3VmFsdWUpO1xuICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoXG4gICAgICAgIGVwLFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuU0VULFxuICAgICAgICAgIHBhdGg6IFsuLi5wYXRoLCBwcm9wXS5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyYWJsZXNcbiAgICAgICkudGhlbihmcm9tV2lyZVZhbHVlKSBhcyBhbnk7XG4gICAgfSxcbiAgICBhcHBseShfdGFyZ2V0LCBfdGhpc0FyZywgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgY29uc3QgbGFzdCA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgICAgIGlmICgobGFzdCBhcyBhbnkpID09PSBjcmVhdGVFbmRwb2ludCkge1xuICAgICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLkVORFBPSU5ULFxuICAgICAgICB9KS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gV2UganVzdCBwcmV0ZW5kIHRoYXQgYGJpbmQoKWAgZGlkblx1MjAxOXQgaGFwcGVuLlxuICAgICAgaWYgKGxhc3QgPT09IFwiYmluZFwiKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgcGF0aC5zbGljZSgwLCAtMSkpO1xuICAgICAgfVxuICAgICAgY29uc3QgW2FyZ3VtZW50TGlzdCwgdHJhbnNmZXJhYmxlc10gPSBwcm9jZXNzQXJndW1lbnRzKHJhd0FyZ3VtZW50TGlzdCk7XG4gICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShcbiAgICAgICAgZXAsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5BUFBMWSxcbiAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICBhcmd1bWVudExpc3QsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyYWJsZXNcbiAgICAgICkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICB9LFxuICAgIGNvbnN0cnVjdChfdGFyZ2V0LCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKFxuICAgICAgICBlcCxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLkNPTlNUUlVDVCxcbiAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICBhcmd1bWVudExpc3QsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyYWJsZXNcbiAgICAgICkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICB9LFxuICB9KTtcbiAgcmVnaXN0ZXJQcm94eShwcm94eSwgZXApO1xuICByZXR1cm4gcHJveHkgYXMgYW55O1xufVxuXG5mdW5jdGlvbiBteUZsYXQ8VD4oYXJyOiAoVCB8IFRbXSlbXSk6IFRbXSB7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBhcnIpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzQXJndW1lbnRzKGFyZ3VtZW50TGlzdDogYW55W10pOiBbV2lyZVZhbHVlW10sIFRyYW5zZmVyYWJsZVtdXSB7XG4gIGNvbnN0IHByb2Nlc3NlZCA9IGFyZ3VtZW50TGlzdC5tYXAodG9XaXJlVmFsdWUpO1xuICByZXR1cm4gW3Byb2Nlc3NlZC5tYXAoKHYpID0+IHZbMF0pLCBteUZsYXQocHJvY2Vzc2VkLm1hcCgodikgPT4gdlsxXSkpXTtcbn1cblxuY29uc3QgdHJhbnNmZXJDYWNoZSA9IG5ldyBXZWFrTWFwPGFueSwgVHJhbnNmZXJhYmxlW10+KCk7XG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmZXI8VD4ob2JqOiBULCB0cmFuc2ZlcnM6IFRyYW5zZmVyYWJsZVtdKTogVCB7XG4gIHRyYW5zZmVyQ2FjaGUuc2V0KG9iaiwgdHJhbnNmZXJzKTtcbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3h5PFQgZXh0ZW5kcyB7fT4ob2JqOiBUKTogVCAmIFByb3h5TWFya2VkIHtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqLCB7IFtwcm94eU1hcmtlcl06IHRydWUgfSkgYXMgYW55O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2luZG93RW5kcG9pbnQoXG4gIHc6IFBvc3RNZXNzYWdlV2l0aE9yaWdpbixcbiAgY29udGV4dDogRXZlbnRTb3VyY2UgPSBnbG9iYWxUaGlzLFxuICB0YXJnZXRPcmlnaW4gPSBcIipcIlxuKTogRW5kcG9pbnQge1xuICByZXR1cm4ge1xuICAgIHBvc3RNZXNzYWdlOiAobXNnOiBhbnksIHRyYW5zZmVyYWJsZXM6IFRyYW5zZmVyYWJsZVtdKSA9PlxuICAgICAgdy5wb3N0TWVzc2FnZShtc2csIHRhcmdldE9yaWdpbiwgdHJhbnNmZXJhYmxlcyksXG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogY29udGV4dC5hZGRFdmVudExpc3RlbmVyLmJpbmQoY29udGV4dCksXG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogY29udGV4dC5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQoY29udGV4dCksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHRvV2lyZVZhbHVlKHZhbHVlOiBhbnkpOiBbV2lyZVZhbHVlLCBUcmFuc2ZlcmFibGVbXV0ge1xuICBmb3IgKGNvbnN0IFtuYW1lLCBoYW5kbGVyXSBvZiB0cmFuc2ZlckhhbmRsZXJzKSB7XG4gICAgaWYgKGhhbmRsZXIuY2FuSGFuZGxlKHZhbHVlKSkge1xuICAgICAgY29uc3QgW3NlcmlhbGl6ZWRWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSBoYW5kbGVyLnNlcmlhbGl6ZSh2YWx1ZSk7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogV2lyZVZhbHVlVHlwZS5IQU5ETEVSLFxuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgdmFsdWU6IHNlcmlhbGl6ZWRWYWx1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJhYmxlcyxcbiAgICAgIF07XG4gICAgfVxuICB9XG4gIHJldHVybiBbXG4gICAge1xuICAgICAgdHlwZTogV2lyZVZhbHVlVHlwZS5SQVcsXG4gICAgICB2YWx1ZSxcbiAgICB9LFxuICAgIHRyYW5zZmVyQ2FjaGUuZ2V0KHZhbHVlKSB8fCBbXSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gZnJvbVdpcmVWYWx1ZSh2YWx1ZTogV2lyZVZhbHVlKTogYW55IHtcbiAgc3dpdGNoICh2YWx1ZS50eXBlKSB7XG4gICAgY2FzZSBXaXJlVmFsdWVUeXBlLkhBTkRMRVI6XG4gICAgICByZXR1cm4gdHJhbnNmZXJIYW5kbGVycy5nZXQodmFsdWUubmFtZSkhLmRlc2VyaWFsaXplKHZhbHVlLnZhbHVlKTtcbiAgICBjYXNlIFdpcmVWYWx1ZVR5cGUuUkFXOlxuICAgICAgcmV0dXJuIHZhbHVlLnZhbHVlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoXG4gIGVwOiBFbmRwb2ludCxcbiAgbXNnOiBNZXNzYWdlLFxuICB0cmFuc2ZlcnM/OiBUcmFuc2ZlcmFibGVbXVxuKTogUHJvbWlzZTxXaXJlVmFsdWU+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgaWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBsKGV2OiBNZXNzYWdlRXZlbnQpIHtcbiAgICAgIGlmICghZXYuZGF0YSB8fCAhZXYuZGF0YS5pZCB8fCBldi5kYXRhLmlkICE9PSBpZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlcC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBsIGFzIGFueSk7XG4gICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgIH0gYXMgYW55KTtcbiAgICBpZiAoZXAuc3RhcnQpIHtcbiAgICAgIGVwLnN0YXJ0KCk7XG4gICAgfVxuICAgIGVwLnBvc3RNZXNzYWdlKHsgaWQsIC4uLm1zZyB9LCB0cmFuc2ZlcnMpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCk6IHN0cmluZyB7XG4gIHJldHVybiBuZXcgQXJyYXkoNClcbiAgICAuZmlsbCgwKVxuICAgIC5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpLnRvU3RyaW5nKDE2KSlcbiAgICAuam9pbihcIi1cIik7XG59XG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFsaWduZmF1bHRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKFwiQWxpZ25tZW50IGZhdWx0XCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBVc2VkIGJ5IFNBRkVfSEVBUFxyXG5leHBvcnQgZnVuY3Rpb24gYWxpZ25mYXVsdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9Pik6IG5ldmVyIHtcclxuICAgIHRocm93IG5ldyBBbGlnbmZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBUeXBlSUQgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPFQ+IGV4dGVuZHMgUHJvbWlzZVdpdGhSZXNvbHZlcnM8VD4ge1xyXG4gICAgcmVzb2x2ZWRWYWx1ZTogVDtcclxufVxyXG5jb25zdCBEZXBlbmRlbmNpZXNUb1dhaXRGb3I6IE1hcDxUeXBlSUQsIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4+ID0gbmV3IE1hcDxUeXBlSUQsIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55Pj4+KCk7XHJcblxyXG4vKipcclxuICogUmV0dXJucyB0aGUgcGFyc2VkIHR5cGUgaW5mbywgY29udmVydGVycywgZXRjLiBmb3IgdGhlIGdpdmVuIEMrKyBSVFRJIFR5cGVJRCBwb2ludGVyLlxyXG4gKlxyXG4gKiBQYXNzaW5nIGEgbnVsbCB0eXBlIElEIGlzIGZpbmUgYW5kIHdpbGwganVzdCByZXN1bHQgaW4gYSBgbnVsbGAgYXQgdGhhdCBzcG90IGluIHRoZSByZXR1cm5lZCBhcnJheS5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRUeXBlSW5mbzxFIGV4dGVuZHMgKEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4gfCBudWxsIHwgdW5kZWZpbmVkKVtdPiguLi50eXBlSWRzOiBudW1iZXJbXSk6IFByb21pc2U8RT4ge1xyXG5cclxuICAgIHJldHVybiBhd2FpdCBQcm9taXNlLmFsbDxOb25OdWxsYWJsZTxFW251bWJlcl0+Pih0eXBlSWRzLm1hcChhc3luYyAodHlwZUlkKTogUHJvbWlzZTxOb25OdWxsYWJsZTxFW251bWJlcl0+PiA9PiB7XHJcbiAgICAgICAgaWYgKCF0eXBlSWQpXHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCEpO1xyXG5cclxuICAgICAgICBsZXQgd2l0aFJlc29sdmVycyA9IGdldERlcGVuZGVuY3lSZXNvbHZlcnModHlwZUlkKTtcclxuICAgICAgICByZXR1cm4gYXdhaXQgKHdpdGhSZXNvbHZlcnMucHJvbWlzZSBhcyBQcm9taXNlPE5vbk51bGxhYmxlPEVbbnVtYmVyXT4+KTtcclxuICAgIH0pKSBhcyBhbnk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREZXBlbmRlbmN5UmVzb2x2ZXJzKHR5cGVJZDogbnVtYmVyKTogUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+PiB7XHJcbiAgICBsZXQgd2l0aFJlc29sdmVycyA9IERlcGVuZGVuY2llc1RvV2FpdEZvci5nZXQodHlwZUlkKTtcclxuICAgIGlmICh3aXRoUmVzb2x2ZXJzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgRGVwZW5kZW5jaWVzVG9XYWl0Rm9yLnNldCh0eXBlSWQsIHdpdGhSZXNvbHZlcnMgPSB7IHJlc29sdmVkVmFsdWU6IHVuZGVmaW5lZCEsIC4uLlByb21pc2Uud2l0aFJlc29sdmVyczxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+PigpIH0pO1xyXG4gICAgcmV0dXJuIHdpdGhSZXNvbHZlcnM7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgZ2V0RGVwZW5kZW5jeVJlc29sdmVycyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNldCBhIHZhbHVlIG9uIHRoZSBgZW1iaW5kYCBvYmplY3QuICBOb3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IHRvIGNhbGwuXHJcbiAqIEBwYXJhbSBpbXBsIFxyXG4gKiBAcGFyYW0gbmFtZSBcclxuICogQHBhcmFtIHZhbHVlIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRW1ib3VuZDxUPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgbmFtZTogc3RyaW5nLCB2YWx1ZTogVCk6IHZvaWQge1xyXG4gICAgKGltcGwuZW1iaW5kIGFzIGFueSlbbmFtZV0gPSB2YWx1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGwgd2hlbiBhIHR5cGUgaXMgcmVhZHkgdG8gYmUgdXNlZCBieSBvdGhlciB0eXBlcy5cclxuICogXHJcbiAqIEZvciB0aGluZ3MgbGlrZSBgaW50YCBvciBgYm9vbGAsIHRoaXMgY2FuIGp1c3QgYmUgY2FsbGVkIGltbWVkaWF0ZWx5IHVwb24gcmVnaXN0cmF0aW9uLlxyXG4gKiBAcGFyYW0gaW5mbyBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5hbGl6ZVR5cGU8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+KGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBuYW1lOiBzdHJpbmcsIHBhcnNlZFR5cGVJbmZvOiBPbWl0PEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD4sIFwibmFtZVwiPik6IHZvaWQge1xyXG4gICAgY29uc3QgaW5mbyA9IHsgbmFtZSwgLi4ucGFyc2VkVHlwZUluZm8gfTtcclxuICAgIGxldCB3aXRoUmVzb2x2ZXJzID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVycyhpbmZvLnR5cGVJZCk7XHJcbiAgICB3aXRoUmVzb2x2ZXJzLnJlc29sdmUod2l0aFJlc29sdmVycy5yZXNvbHZlZFZhbHVlID0gaW5mbyk7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFVpbnQzMihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+KTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuZ2V0VWludDMyKHB0ciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFVpbnQ4KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5nZXRVaW50OChwdHIpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50MTYgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQxNi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQ4IH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50OC5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFRPRE86IENhbid0IEMrKyBpZGVudGlmaWVycyBpbmNsdWRlIG5vbi1BU0NJSSBjaGFyYWN0ZXJzPyBcclxuICogV2h5IGRvIGFsbCB0aGUgdHlwZSBkZWNvZGluZyBmdW5jdGlvbnMgdXNlIHRoaXM/XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZExhdGluMVN0cmluZyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICBsZXQgbmV4dEJ5dGU6IG51bWJlclxyXG4gICAgd2hpbGUgKG5leHRCeXRlID0gcmVhZFVpbnQ4KGltcGwsIHB0cisrKSkge1xyXG4gICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHRCeXRlKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbi8vIE5vdGU6IEluIFdvcmtsZXRzLCBgVGV4dERlY29kZXJgIGFuZCBgVGV4dEVuY29kZXJgIG5lZWQgYSBwb2x5ZmlsbC5cclxubGV0IHV0ZjhEZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLThcIik7XHJcbmxldCB1dGYxNkRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtMTZsZVwiKTtcclxubGV0IHV0ZjhFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG51bGwtdGVybWluYXRlZCBVVEYtOCBzdHJpbmcuIElmIHlvdSBrbm93IHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgeW91IGNhbiBzYXZlIHRpbWUgYnkgdXNpbmcgYHV0ZjhUb1N0cmluZ0xgIGluc3RlYWQuXHJcbiAqIFxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIHB0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdXRmOFRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50OChpbXBsLCBlbmQrKykgIT0gMCk7XHJcblxyXG4gICAgcmV0dXJuIHV0ZjhUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYxNlRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50MTYoaW1wbCwgZW5kKSAhPSAwKSB7IGVuZCArPSAyO31cclxuXHJcbiAgICByZXR1cm4gdXRmMTZUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjMyVG9TdHJpbmdaKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzdGFydCA9IHB0cjtcclxuICAgIGxldCBlbmQgPSBzdGFydDtcclxuXHJcbiAgICB3aGlsZSAocmVhZFVpbnQzMihpbXBsLCBlbmQpICE9IDApIHsgZW5kICs9IDQ7fVxyXG5cclxuICAgIHJldHVybiB1dGYzMlRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyLCBieXRlQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdXRmOERlY29kZXIuZGVjb2RlKG5ldyBVaW50OEFycmF5KGltcGwuZXhwb3J0cy5tZW1vcnkuYnVmZmVyLCBwdHIsIGJ5dGVDb3VudCkpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYxNlRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdXRmMTZEZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCB3Y2hhckNvdW50ICogMikpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYzMlRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBjaGFycyA9IChuZXcgVWludDMyQXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgd2NoYXJDb3VudCkpO1xyXG4gICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICBmb3IgKGxldCBjaCBvZiBjaGFycykge1xyXG4gICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1V0Zjgoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICByZXR1cm4gdXRmOEVuY29kZXIuZW5jb2RlKHN0cmluZykuYnVmZmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nVG9VdGYxNihzdHJpbmc6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcclxuICAgIGxldCByZXQgPSBuZXcgVWludDE2QXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGgpKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmV0Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgcmV0W2ldID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0LmJ1ZmZlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmMzIoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICBsZXQgdHJ1ZUxlbmd0aCA9IDA7XHJcbiAgICAvLyBUaGUgd29yc3QtY2FzZSBzY2VuYXJpbyBpcyBhIHN0cmluZyBvZiBhbGwgc3Vycm9nYXRlLXBhaXJzLCBzbyBhbGxvY2F0ZSB0aGF0LlxyXG4gICAgLy8gV2UnbGwgc2hyaW5rIGl0IHRvIHRoZSBhY3R1YWwgc2l6ZSBhZnRlcndhcmRzLlxyXG4gICAgbGV0IHRlbXAgPSBuZXcgVWludDMyQXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGggKiA0ICogMikpO1xyXG4gICAgZm9yIChjb25zdCBjaCBvZiBzdHJpbmcpIHtcclxuICAgICAgICB0ZW1wW3RydWVMZW5ndGhdID0gY2guY29kZVBvaW50QXQoMCkhO1xyXG4gICAgICAgICsrdHJ1ZUxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGVtcC5idWZmZXIuc2xpY2UoMCwgdHJ1ZUxlbmd0aCAqIDQpO1xyXG59XHJcblxyXG4vKipcclxuICogVXNlZCB3aGVuIHNlbmRpbmcgc3RyaW5ncyBmcm9tIEpTIHRvIFdBU00uXHJcbiAqIFxyXG4gKiBcclxuICogQHBhcmFtIHN0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEY4KHN0cjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGxldCBsZW4gPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBsZXQgYyA9IHN0ci5jb2RlUG9pbnRBdChpKSE7XHJcbiAgICAgICAgaWYgKGMgPD0gMHg3RilcclxuICAgICAgICAgICAgbGVuKys7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8PSAweDdGRilcclxuICAgICAgICAgICAgbGVuICs9IDI7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8PSAweDdGRkYpXHJcbiAgICAgICAgICAgIGxlbiArPSAzO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBsZW4gKz0gNDtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBsZW47XHJcbn0iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyByZWFkTGF0aW4xU3RyaW5nIH0gZnJvbSBcIi4uL3N0cmluZy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVyaW5nIGEgdHlwZSBpcyBhbiBhc3luYyBmdW5jdGlvbiBjYWxsZWQgYnkgYSBzeW5jIGZ1bmN0aW9uLiBUaGlzIGhhbmRsZXMgdGhlIGNvbnZlcnNpb24sIGFkZGluZyB0aGUgcHJvbWlzZSB0byBgQWxsRW1iaW5kUHJvbWlzZXNgLlxyXG4gKiBcclxuICogQWxzbywgYmVjYXVzZSBldmVyeSBzaW5nbGUgcmVnaXN0cmF0aW9uIGNvbWVzIHdpdGggYSBuYW1lIHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkLCB0aGlzIGFsc28gcGFyc2VzIHRoYXQgbmFtZSBmb3IgeW91LlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXIoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIG5hbWVQdHI6IG51bWJlciwgZnVuYzogKG5hbWU6IHN0cmluZykgPT4gKHZvaWQgfCBQcm9taXNlPHZvaWQ+KSk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKGltcGwsIHJlYWRMYXRpbjFTdHJpbmcoaW1wbCwgbmFtZVB0ciksIGZ1bmMpO1xyXG59XHJcblxyXG4vKiogXHJcbiAqIFNhbWUgYXMgYF9lbWJpbmRfcmVnaXN0ZXJgLCBidXQgZm9yIGtub3duIChvciBzeW50aGV0aWMpIG5hbWVzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgbmFtZTogc3RyaW5nLCBmdW5jOiAobmFtZTogc3RyaW5nKSA9PiAodm9pZCB8IFByb21pc2U8dm9pZD4pKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgcHJvbWlzZTogUHJvbWlzZTx2b2lkPiA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgbGV0IGhhbmRsZSA9IDA7XHJcbiAgICAgICAgLy8gRnVuIGZhY3Q6IHNldFRpbWVvdXQgZG9lc24ndCBleGlzdCBpbiBXb3JrbGV0cyEgXHJcbiAgICAgICAgLy8gSSBndWVzcyBpdCB2YWd1ZWx5IG1ha2VzIHNlbnNlIGluIGEgXCJkZXRlcm1pbmlzbSBpcyBnb29kXCIgd2F5LCBcclxuICAgICAgICAvLyBidXQgaXQgYWxzbyBzZWVtcyBnZW5lcmFsbHkgdXNlZnVsIHRoZXJlP1xyXG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJylcclxuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiB7IGNvbnNvbGUud2FybihgVGhlIGZ1bmN0aW9uIFwiJHtuYW1lfVwiIHVzZXMgYW4gdW5zdXBwb3J0ZWQgYXJndW1lbnQgb3IgcmV0dXJuIHR5cGUsIGFzIGl0cyBkZXBlbmRlbmNpZXMgYXJlIG5vdCByZXNvbHZpbmcuIEl0J3MgdW5saWtlbHkgdGhlIGVtYmluZCBwcm9taXNlIHdpbGwgcmVzb2x2ZS5gKTsgfSwgMTAwMCkgYXMgYW55O1xyXG4gICAgICAgIGF3YWl0IGZ1bmMobmFtZSk7XHJcbiAgICAgICAgaWYgKGhhbmRsZSlcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIEFsbEVtYmluZFByb21pc2VzLnB1c2gocHJvbWlzZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhd2FpdEFsbEVtYmluZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKEFsbEVtYmluZFByb21pc2VzKTtcclxufVxyXG5cclxuY29uc3QgQWxsRW1iaW5kUHJvbWlzZXMgPSBuZXcgQXJyYXk8UHJvbWlzZTx2b2lkPj4oKTtcclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIHNpemU6IG51bWJlciwgbWluUmFuZ2U6IGJpZ2ludCwgbWF4UmFuZ2U6IGJpZ2ludCk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkID0gKG1pblJhbmdlID09PSAwbik7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZCA/IGZyb21XaXJlVHlwZVVuc2lnbmVkIDogZnJvbVdpcmVUeXBlU2lnbmVkO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8YmlnaW50LCBiaWdpbnQ+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IHZhbHVlID0+ICh7IHdpcmVWYWx1ZTogdmFsdWUsIGpzVmFsdWU6IHZhbHVlIH0pLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVNpZ25lZCh3aXJlVmFsdWU6IGJpZ2ludCkgeyByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6IEJpZ0ludCh3aXJlVmFsdWUpIH07IH1cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlVW5zaWduZWQod2lyZVZhbHVlOiBiaWdpbnQpIHsgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiBCaWdJbnQod2lyZVZhbHVlKSAmIDB4RkZGRl9GRkZGX0ZGRkZfRkZGRm4gfSB9IiwgIlxyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Jvb2wodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCB0cnVlVmFsdWU6IDEsIGZhbHNlVmFsdWU6IDApOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgbmFtZSA9PiB7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIgfCBib29sZWFuLCBib29sZWFuPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAod2lyZVZhbHVlKSA9PiB7IHJldHVybiB7IGpzVmFsdWU6ICEhd2lyZVZhbHVlLCB3aXJlVmFsdWUgfTsgfSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKG8pID0+IHsgcmV0dXJuIHsgd2lyZVZhbHVlOiBvID8gdHJ1ZVZhbHVlIDogZmFsc2VWYWx1ZSwganNWYWx1ZTogbyB9OyB9LFxyXG4gICAgICAgIH0pXHJcbiAgICB9KVxyXG59XHJcbiIsICJcclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmFtZUZ1bmN0aW9uPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpIHwgRnVuY3Rpb24+KG5hbWU6IHN0cmluZywgYm9keTogVCk6IFQge1xyXG4gICAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShib2R5LCAnbmFtZScsIHsgdmFsdWU6IG5hbWUgfSk7XHJcbn1cclxuIiwgIi8vIFRoZXNlIGFyZSBhbGwgdGhlIGNsYXNzZXMgdGhhdCBoYXZlIGJlZW4gcmVnaXN0ZXJlZCwgYWNjZXNzZWQgYnkgdGhlaXIgUlRUSSBUeXBlSWRcclxuLy8gSXQncyBvZmYgaW4gaXRzIG93biBmaWxlIHRvIGtlZXAgaXQgcHJpdmF0ZS5cclxuZXhwb3J0IGNvbnN0IEVtYm91bmRDbGFzc2VzOiBSZWNvcmQ8bnVtYmVyLCB0eXBlb2YgRW1ib3VuZENsYXNzPiA9IHt9O1xyXG5cclxuXHJcbi8vIFRoaXMgaXMgYSBydW5uaW5nIGxpc3Qgb2YgYWxsIHRoZSBpbnN0YW50aWF0ZWQgY2xhc3NlcywgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbmNvbnN0IGluc3RhbnRpYXRlZENsYXNzZXMgPSBuZXcgTWFwPG51bWJlciwgV2Vha1JlZjxFbWJvdW5kQ2xhc3M+PigpO1xyXG5cclxuLy8gVGhpcyBrZWVwcyB0cmFjayBvZiBhbGwgZGVzdHJ1Y3RvcnMgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbi8vIFVzZWQgZm9yIEZpbmFsaXphdGlvblJlZ2lzdHJ5IGFuZCB0aGUgZGVzdHJ1Y3RvciBpdHNlbGYuXHJcbmNvbnN0IGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZCA9IG5ldyBNYXA8bnVtYmVyLCAoKSA9PiB2b2lkPigpO1xyXG5cclxuLy8gVXNlZCB0byBlbnN1cmUgbm8gb25lIGJ1dCB0aGUgdHlwZSBjb252ZXJ0ZXJzIGNhbiB1c2UgdGhlIHNlY3JldCBwb2ludGVyIGNvbnN0cnVjdG9yLlxyXG5leHBvcnQgY29uc3QgU2VjcmV0OiBTeW1ib2wgPSBTeW1ib2woKTtcclxuZXhwb3J0IGNvbnN0IFNlY3JldE5vRGlzcG9zZTogU3ltYm9sID0gU3ltYm9sKCk7XHJcblxyXG4vLyBUT0RPOiBUaGlzIG5lZWRzIHByb3BlciB0ZXN0aW5nLCBvciBwb3NzaWJseSBldmVuIGp1c3RpZmljYXRpb24gZm9yIGl0cyBleGlzdGVuY2UuXHJcbi8vIEknbSBwcmV0dHkgc3VyZSBvbmx5IEpTIGhlYXAgcHJlc3N1cmUgd2lsbCBpbnZva2UgYSBjYWxsYmFjaywgbWFraW5nIGl0IGtpbmQgb2YgXHJcbi8vIHBvaW50bGVzcyBmb3IgQysrIGNsZWFudXAsIHdoaWNoIGhhcyBubyBpbnRlcmFjdGlvbiB3aXRoIHRoZSBKUyBoZWFwLlxyXG5jb25zdCByZWdpc3RyeSA9IG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoX3RoaXM6IG51bWJlcikgPT4ge1xyXG4gICAgY29uc29sZS53YXJuKGBXQVNNIGNsYXNzIGF0IGFkZHJlc3MgJHtfdGhpc30gd2FzIG5vdCBwcm9wZXJseSBkaXNwb3NlZC5gKTtcclxuICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQoX3RoaXMpPy4oKTtcclxufSk7XHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgYWxsIEVtYmluZC1lbmFibGVkIGNsYXNzZXMuXHJcbiAqXHJcbiAqIEluIGdlbmVyYWwsIGlmIHR3byAocXVvdGUtdW5xdW90ZSkgXCJpbnN0YW5jZXNcIiBvZiB0aGlzIGNsYXNzIGhhdmUgdGhlIHNhbWUgYF90aGlzYCBwb2ludGVyLFxyXG4gKiB0aGVuIHRoZXkgd2lsbCBjb21wYXJlIGVxdWFsbHkgd2l0aCBgPT1gLCBhcyBpZiBjb21wYXJpbmcgYWRkcmVzc2VzIGluIEMrKy5cclxuICovXHJcblxyXG5leHBvcnQgY2xhc3MgRW1ib3VuZENsYXNzIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB0cmFuc2Zvcm1lZCBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0aGF0IHRha2VzIEpTIGFyZ3VtZW50cyBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfY29uc3RydWN0b3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gRW1ib3VuZENsYXNzO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXNzaWduZWQgYnkgdGhlIGRlcml2ZWQgY2xhc3Mgd2hlbiB0aGF0IGNsYXNzIGlzIHJlZ2lzdGVyZWQuXHJcbiAgICAgKlxyXG4gICAgICogVGhpcyBvbmUgaXMgbm90IHRyYW5zZm9ybWVkIGJlY2F1c2UgaXQgb25seSB0YWtlcyBhIHBvaW50ZXIgYW5kIHJldHVybnMgbm90aGluZy5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9kZXN0cnVjdG9yOiAoX3RoaXM6IG51bWJlcikgPT4gdm9pZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwb2ludGVyIHRvIHRoZSBjbGFzcyBpbiBXQVNNIG1lbW9yeTsgdGhlIHNhbWUgYXMgdGhlIEMrKyBgdGhpc2AgcG9pbnRlci5cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIF90aGlzITogbnVtYmVyO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IGFueVtdKSB7XHJcbiAgICAgICAgY29uc3QgQ3JlYXRlZEZyb21XYXNtID0gKGFyZ3MubGVuZ3RoID09PSAyICYmIChhcmdzWzBdID09PSBTZWNyZXQgfHwgYXJnc1swXSA9PSBTZWNyZXROb0Rpc3Bvc2UpICYmIHR5cGVvZiBhcmdzWzFdID09PSAnbnVtYmVyJyk7XHJcblxyXG4gICAgICAgIGlmICghQ3JlYXRlZEZyb21XYXNtKSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGEgY2FsbCB0byBjcmVhdGUgdGhpcyBjbGFzcyBmcm9tIEpTLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBVbmxpa2UgYSBub3JtYWwgY29uc3RydWN0b3IsIHdlIGRlbGVnYXRlIHRoZSBjbGFzcyBjcmVhdGlvbiB0b1xyXG4gICAgICAgICAgICAgKiBhIGNvbWJpbmF0aW9uIG9mIF9jb25zdHJ1Y3RvciBhbmQgYGZyb21XaXJlVHlwZWAuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIGBfY29uc3RydWN0b3JgIHdpbGwgY2FsbCB0aGUgQysrIGNvZGUgdGhhdCBhbGxvY2F0ZXMgbWVtb3J5LFxyXG4gICAgICAgICAgICAgKiBpbml0aWFsaXplcyB0aGUgY2xhc3MsIGFuZCByZXR1cm5zIGl0cyBgdGhpc2AgcG9pbnRlcixcclxuICAgICAgICAgICAgICogd2hpbGUgYGZyb21XaXJlVHlwZWAsIGNhbGxlZCBhcyBwYXJ0IG9mIHRoZSBnbHVlLWNvZGUgcHJvY2VzcyxcclxuICAgICAgICAgICAgICogd2lsbCBhY3R1YWxseSBpbnN0YW50aWF0ZSB0aGlzIGNsYXNzLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiAoSW4gb3RoZXIgd29yZHMsIHRoaXMgcGFydCBydW5zIGZpcnN0LCB0aGVuIHRoZSBgZWxzZWAgYmVsb3cgcnVucylcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgRW1ib3VuZENsYXNzKS5fY29uc3RydWN0b3IoLi4uYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBDKysuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFdlIGdldCBoZXJlIHZpYSBgZnJvbVdpcmVUeXBlYCwgbWVhbmluZyB0aGF0IHRoZVxyXG4gICAgICAgICAgICAgKiBjbGFzcyBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZCBpbiBDKyssIGFuZCB3ZVxyXG4gICAgICAgICAgICAgKiBqdXN0IG5lZWQgb3VyIFwiaGFuZGxlXCIgdG8gaXQgaW4gSlMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IGFyZ3NbMV07XHJcblxyXG4gICAgICAgICAgICAvLyBGaXJzdCwgbWFrZSBzdXJlIHdlIGhhdmVuJ3QgaW5zdGFudGlhdGVkIHRoaXMgY2xhc3MgeWV0LlxyXG4gICAgICAgICAgICAvLyBXZSB3YW50IGFsbCBjbGFzc2VzIHdpdGggdGhlIHNhbWUgYHRoaXNgIHBvaW50ZXIgdG8gXHJcbiAgICAgICAgICAgIC8vIGFjdHVhbGx5ICpiZSogdGhlIHNhbWUuXHJcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gaW5zdGFudGlhdGVkQ2xhc3Nlcy5nZXQoX3RoaXMpPy5kZXJlZigpO1xyXG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpc3Rpbmc7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB3ZSBnb3QgaGVyZSwgdGhlbiBjb25ncmF0dWxhdGlvbnMsIHRoaXMtaW5zdGFudGlhdGlvbi1vZi10aGlzLWNsYXNzLCBcclxuICAgICAgICAgICAgLy8geW91J3JlIGFjdHVhbGx5IHRoZSBvbmUgdG8gYmUgaW5zdGFudGlhdGVkLiBObyBtb3JlIGhhY2t5IGNvbnN0cnVjdG9yIHJldHVybnMuXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vIENvbnNpZGVyIHRoaXMgdGhlIFwiYWN0dWFsXCIgY29uc3RydWN0b3IgY29kZSwgSSBzdXBwb3NlLlxyXG4gICAgICAgICAgICB0aGlzLl90aGlzID0gX3RoaXM7XHJcbiAgICAgICAgICAgIGluc3RhbnRpYXRlZENsYXNzZXMuc2V0KF90aGlzLCBuZXcgV2Vha1JlZih0aGlzKSk7XHJcbiAgICAgICAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMsIF90aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChhcmdzWzBdICE9IFNlY3JldE5vRGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBFbWJvdW5kQ2xhc3MpLl9kZXN0cnVjdG9yO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5zZXQoX3RoaXMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0cnVjdG9yKF90aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLmRlbGV0ZShfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgW1N5bWJvbC5kaXNwb3NlXSgpOiB2b2lkIHtcclxuICAgICAgICAvLyBPbmx5IHJ1biB0aGUgZGVzdHJ1Y3RvciBpZiB3ZSBvdXJzZWx2ZXMgY29uc3RydWN0ZWQgdGhpcyBjbGFzcyAoYXMgb3Bwb3NlZCB0byBgaW5zcGVjdGBpbmcgaXQpXHJcbiAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9IGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgaWYgKGRlc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKT8uKCk7XHJcbiAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5kZWxldGUodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIFxyXG4gKiBJbnN0ZWFkIG9mIGluc3RhbnRpYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgXHJcbiAqIHlvdSBjYW4gaW5zcGVjdCBhbiBleGlzdGluZyBwb2ludGVyIGluc3RlYWQuXHJcbiAqXHJcbiAqIFRoaXMgaXMgbWFpbmx5IGludGVuZGVkIGZvciBzaXR1YXRpb25zIHRoYXQgRW1iaW5kIGRvZXNuJ3Qgc3VwcG9ydCxcclxuICogbGlrZSBhcnJheS1vZi1zdHJ1Y3RzLWFzLWEtcG9pbnRlci5cclxuICogXHJcbiAqIEJlIGF3YXJlIHRoYXQgdGhlcmUncyBubyBsaWZldGltZSB0cmFja2luZyBpbnZvbHZlZCwgc29cclxuICogbWFrZSBzdXJlIHlvdSBkb24ndCBrZWVwIHRoaXMgdmFsdWUgYXJvdW5kIGFmdGVyIHRoZVxyXG4gKiBwb2ludGVyJ3MgYmVlbiBpbnZhbGlkYXRlZC4gXHJcbiAqIFxyXG4gKiAqKkRvIG5vdCBjYWxsIFtTeW1ib2wuZGlzcG9zZV0qKiBvbiBhbiBpbnNwZWN0ZWQgY2xhc3MsXHJcbiAqIHNpbmNlIHRoZSBhc3N1bXB0aW9uIGlzIHRoYXQgdGhlIEMrKyBjb2RlIG93bnMgdGhhdCBwb2ludGVyXHJcbiAqIGFuZCB3ZSdyZSBqdXN0IGxvb2tpbmcgYXQgaXQsIHNvIGRlc3Ryb3lpbmcgaXQgd291bGQgYmUgcnVkZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNwZWN0Q2xhc3NCeVBvaW50ZXI8VD4ocG9pbnRlcjogbnVtYmVyKTogVCB7XHJcbiAgICByZXR1cm4gbmV3IEVtYm91bmRDbGFzcyhTZWNyZXROb0Rpc3Bvc2UsIHBvaW50ZXIpIGFzIFQ7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFRhYmxlRnVuY3Rpb248VCBleHRlbmRzIEZ1bmN0aW9uPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9Piwgc2lnbmF0dXJlUHRyOiBudW1iZXIsIGZ1bmN0aW9uSW5kZXg6IG51bWJlcik6IFQge1xyXG4gICAgY29uc3QgZnAgPSBpbXBsLmV4cG9ydHMuX19pbmRpcmVjdF9mdW5jdGlvbl90YWJsZS5nZXQoZnVuY3Rpb25JbmRleCk7XHJcbiAgICBjb25zb2xlLmFzc2VydCh0eXBlb2YgZnAgPT0gXCJmdW5jdGlvblwiKTtcclxuICAgIHJldHVybiBmcCBhcyBUO1xyXG59IiwgImltcG9ydCB7IHJlbmFtZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtbmFtZWQtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzLCBFbWJvdW5kQ2xhc3NlcywgU2VjcmV0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IFdpcmVDb252ZXJzaW9uUmVzdWx0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmV4cG9ydCB7IGluc3BlY3RDbGFzc0J5UG9pbnRlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzKFxyXG4gICAgdGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICByYXdUeXBlOiBudW1iZXIsXHJcbiAgICByYXdQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgcmF3Q29uc3RQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgYmFzZUNsYXNzUmF3VHlwZTogbnVtYmVyLFxyXG4gICAgZ2V0QWN0dWFsVHlwZVNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgZ2V0QWN0dWFsVHlwZVB0cjogbnVtYmVyLFxyXG4gICAgdXBjYXN0U2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICB1cGNhc3RQdHI6IG51bWJlcixcclxuICAgIGRvd25jYXN0U2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBkb3duY2FzdFB0cjogbnVtYmVyLFxyXG4gICAgbmFtZVB0cjogbnVtYmVyLFxyXG4gICAgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgcmF3RGVzdHJ1Y3RvclB0cjogbnVtYmVyKTogdm9pZCB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBOb3RlOiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzIGRvZXNuJ3QgaGF2ZSBhIGNvcnJlc3BvbmRpbmcgYGZpbmFsaXplYCB2ZXJzaW9uLFxyXG4gICAgICogbGlrZSB2YWx1ZV9hcnJheSBhbmQgdmFsdWVfb2JqZWN0IGhhdmUsIHdoaWNoIGlzIGZpbmUgSSBndWVzcz9cclxuICAgICAqIFxyXG4gICAgICogQnV0IGl0IG1lYW5zIHRoYXQgd2UgY2FuJ3QganVzdCBjcmVhdGUgYSBjbGFzcyBwcmUtaW5zdGFsbGVkIHdpdGggZXZlcnl0aGluZyBpdCBuZWVkcy0tXHJcbiAgICAgKiB3ZSBuZWVkIHRvIGFkZCBtZW1iZXIgZnVuY3Rpb25zIGFuZCBwcm9wZXJ0aWVzIGFuZCBzdWNoIGFzIHdlIGdldCB0aGVtLCBhbmQgd2VcclxuICAgICAqIG5ldmVyIHJlYWxseSBrbm93IHdoZW4gd2UncmUgZG9uZS5cclxuICAgICAqL1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICBjb25zdCByYXdEZXN0cnVjdG9ySW52b2tlciA9IGdldFRhYmxlRnVuY3Rpb248KF90aGlzOiBudW1iZXIpID0+IHZvaWQ+KHRoaXMsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3JQdHIpO1xyXG5cclxuICAgICAgICAvLyBUT0RPKD8pIEl0J3MgcHJvYmFibHkgbm90IG5lY2Vzc2FyeSB0byBoYXZlIEVtYm91bmRDbGFzc2VzIGFuZCB0aGlzLmVtYmluZCBiYXNpY2FsbHkgYmUgdGhlIHNhbWUgZXhhY3QgdGhpbmcuXHJcbiAgICAgICAgRW1ib3VuZENsYXNzZXNbcmF3VHlwZV0gPSAodGhpcy5lbWJpbmQgYXMgYW55KVtuYW1lXSA9IHJlbmFtZUZ1bmN0aW9uKG5hbWUsXHJcbiAgICAgICAgICAgIC8vIFVubGlrZSB0aGUgY29uc3RydWN0b3IsIHRoZSBkZXN0cnVjdG9yIGlzIGtub3duIGVhcmx5IGVub3VnaCB0byBhc3NpZ24gbm93LlxyXG4gICAgICAgICAgICAvLyBQcm9iYWJseSBiZWNhdXNlIGRlc3RydWN0b3JzIGNhbid0IGJlIG92ZXJsb2FkZWQgYnkgYW55dGhpbmcgc28gdGhlcmUncyBvbmx5IGV2ZXIgb25lLlxyXG4gICAgICAgICAgICAvLyBBbnl3YXksIGFzc2lnbiBpdCB0byB0aGlzIG5ldyBjbGFzcy5cclxuICAgICAgICAgICAgY2xhc3MgZXh0ZW5kcyBFbWJvdW5kQ2xhc3Mge1xyXG4gICAgICAgICAgICAgICAgc3RhdGljIF9kZXN0cnVjdG9yID0gcmF3RGVzdHJ1Y3Rvckludm9rZXI7XHJcbiAgICAgICAgICAgIH0gYXMgYW55KTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZnJvbVdpcmVUeXBlKF90aGlzOiBudW1iZXIpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIEVtYm91bmRDbGFzcz4geyBjb25zdCBqc1ZhbHVlID0gbmV3IEVtYm91bmRDbGFzc2VzW3Jhd1R5cGVdKFNlY3JldCwgX3RoaXMpOyByZXR1cm4geyB3aXJlVmFsdWU6IF90aGlzLCBqc1ZhbHVlLCBzdGFja0Rlc3RydWN0b3I6ICgpID0+IGpzVmFsdWVbU3ltYm9sLmRpc3Bvc2VdKCkgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gdG9XaXJlVHlwZShqc09iamVjdDogRW1ib3VuZENsYXNzKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogKGpzT2JqZWN0IGFzIGFueSkuX3RoaXMsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBqc09iamVjdCxcclxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IG5vIGRlc3RydWN0b3JzIGZvciBhbnkgb2YgdGhlc2UsXHJcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIHRoZXkncmUganVzdCBmb3IgdmFsdWUtdHlwZXMtYXMtb2JqZWN0LXR5cGVzLlxyXG4gICAgICAgICAgICAgICAgLy8gQWRkaW5nIGl0IGhlcmUgd291bGRuJ3Qgd29yayBwcm9wZXJseSwgYmVjYXVzZSBpdCBhc3N1bWVzXHJcbiAgICAgICAgICAgICAgICAvLyB3ZSBvd24gdGhlIG9iamVjdCAod2hlbiBjb252ZXJ0aW5nIGZyb20gYSBKUyBzdHJpbmcgdG8gc3RkOjpzdHJpbmcsIHdlIGVmZmVjdGl2ZWx5IGRvLCBidXQgbm90IGhlcmUpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBXaXNoIG90aGVyIHR5cGVzIGluY2x1ZGVkIHBvaW50ZXIgVHlwZUlEcyB3aXRoIHRoZW0gdG9vLi4uXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBuYW1lLCB7IHR5cGVJZDogcmF3VHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgYCR7bmFtZX0qYCwgeyB0eXBlSWQ6IHJhd1BvaW50ZXJUeXBlLCBmcm9tV2lyZVR5cGUsIHRvV2lyZVR5cGUgfSk7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBgJHtuYW1lfSBjb25zdCpgLCB7IHR5cGVJZDogcmF3Q29uc3RQb2ludGVyVHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgIlxyXG5leHBvcnQgZnVuY3Rpb24gcnVuRGVzdHJ1Y3RvcnMoZGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdKTogdm9pZCB7XHJcbiAgICB3aGlsZSAoZGVzdHJ1Y3RvcnMubGVuZ3RoKSB7XHJcbiAgICAgICAgZGVzdHJ1Y3RvcnMucG9wKCkhKCk7XHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgcmVuYW1lRnVuY3Rpb24gfSBmcm9tIFwiLi9jcmVhdGUtbmFtZWQtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kQ2xhc3MgfSBmcm9tIFwiLi9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZVR5cGVzIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgSlMgZnVuY3Rpb24gdGhhdCBjYWxscyBhIEMrKyBmdW5jdGlvbiwgYWNjb3VudGluZyBmb3IgYHRoaXNgIHR5cGVzIGFuZCBjb250ZXh0LlxyXG4gKiBcclxuICogSXQgY29udmVydHMgYWxsIGFyZ3VtZW50cyBiZWZvcmUgcGFzc2luZyB0aGVtLCBhbmQgY29udmVydHMgdGhlIHJldHVybiB0eXBlIGJlZm9yZSByZXR1cm5pbmcuXHJcbiAqIFxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIGFyZ1R5cGVJZHMgQWxsIFJUVEkgVHlwZUlkcywgaW4gdGhlIG9yZGVyIG9mIFtSZXRUeXBlLCBUaGlzVHlwZSwgLi4uQXJnVHlwZXNdLiBUaGlzVHlwZSBjYW4gYmUgbnVsbCBmb3Igc3RhbmRhbG9uZSBmdW5jdGlvbnMuXHJcbiAqIEBwYXJhbSBpbnZva2VyU2lnbmF0dXJlIEEgcG9pbnRlciB0byB0aGUgc2lnbmF0dXJlIHN0cmluZy5cclxuICogQHBhcmFtIGludm9rZXJJbmRleCBUaGUgaW5kZXggdG8gdGhlIGludm9rZXIgZnVuY3Rpb24gaW4gdGhlIGBXZWJBc3NlbWJseS5UYWJsZWAuXHJcbiAqIEBwYXJhbSBpbnZva2VyQ29udGV4dCBUaGUgY29udGV4dCBwb2ludGVyIHRvIHVzZSwgaWYgYW55LlxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVHbHVlRnVuY3Rpb248RiBleHRlbmRzICgoLi4uYXJnczogYW55W10pID0+IGFueSkgfCBGdW5jdGlvbj4oXHJcbiAgICBpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PixcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHJldHVyblR5cGVJZDogbnVtYmVyLFxyXG4gICAgYXJnVHlwZUlkczogbnVtYmVyW10sXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIgfCBudWxsXHJcbik6IFByb21pc2U8Rj4ge1xyXG5cclxuICAgIHR5cGUgUiA9IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIGFueT47XHJcbiAgICAvL3R5cGUgVGhpc1R5cGUgPSBudWxsIHwgdW5kZWZpbmVkIHwgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdpcmVUeXBlcywgYW55PjtcclxuICAgIHR5cGUgQXJnVHlwZXMgPSBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V2lyZVR5cGVzLCBhbnk+W107XHJcblxyXG5cclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlLCAuLi5hcmdUeXBlc10gPSBhd2FpdCBnZXRUeXBlSW5mbzxbUiwgLi4uQXJnVHlwZXNdPihyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHMpO1xyXG4gICAgY29uc3QgcmF3SW52b2tlciA9IGdldFRhYmxlRnVuY3Rpb248KC4uLmFyZ3M6IFdpcmVUeXBlc1tdKSA9PiBhbnk+KGltcGwsIGludm9rZXJTaWduYXR1cmUsIGludm9rZXJJbmRleCk7XHJcblxyXG5cclxuICAgIHJldHVybiByZW5hbWVGdW5jdGlvbihuYW1lLCBmdW5jdGlvbiAodGhpczogRW1ib3VuZENsYXNzLCAuLi5qc0FyZ3M6IGFueVtdKSB7XHJcbiAgICAgICAgY29uc3Qgd2lyZWRUaGlzID0gdGhpcyA/IHRoaXMuX3RoaXMgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgY29uc3Qgd2lyZWRBcmdzOiBXaXJlVHlwZXNbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHN0YWNrQmFzZWREZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10gPSBbXTsgICAvLyBVc2VkIHRvIHByZXRlbmQgbGlrZSB3ZSdyZSBhIHBhcnQgb2YgdGhlIFdBU00gc3RhY2ssIHdoaWNoIHdvdWxkIGRlc3Ryb3kgdGhlc2Ugb2JqZWN0cyBhZnRlcndhcmRzLlxyXG5cclxuICAgICAgICBpZiAoaW52b2tlckNvbnRleHQpXHJcbiAgICAgICAgICAgIHdpcmVkQXJncy5wdXNoKGludm9rZXJDb250ZXh0KTtcclxuICAgICAgICBpZiAod2lyZWRUaGlzKVxyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaCh3aXJlZFRoaXMpO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IGVhY2ggSlMgYXJndW1lbnQgdG8gaXRzIFdBU00gZXF1aXZhbGVudCAoZ2VuZXJhbGx5IGEgcG9pbnRlciwgb3IgaW50L2Zsb2F0KVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnVHlwZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGFyZ1R5cGVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBhcmcgPSBqc0FyZ3NbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IHR5cGUudG9XaXJlVHlwZShhcmcpO1xyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaCh3aXJlVmFsdWUpO1xyXG4gICAgICAgICAgICBpZiAoc3RhY2tEZXN0cnVjdG9yKVxyXG4gICAgICAgICAgICAgICAgc3RhY2tCYXNlZERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmluYWxseSwgY2FsbCB0aGUgXCJyYXdcIiBXQVNNIGZ1bmN0aW9uXHJcbiAgICAgICAgbGV0IHdpcmVkUmV0dXJuOiBXaXJlVHlwZXMgPSByYXdJbnZva2VyKC4uLndpcmVkQXJncyk7XHJcblxyXG4gICAgICAgIC8vIFN0aWxsIHByZXRlbmRpbmcgd2UncmUgYSBwYXJ0IG9mIHRoZSBzdGFjaywgXHJcbiAgICAgICAgLy8gbm93IGRlc3RydWN0IGV2ZXJ5dGhpbmcgd2UgXCJwdXNoZWRcIiBvbnRvIGl0LlxyXG4gICAgICAgIHJ1bkRlc3RydWN0b3JzKHN0YWNrQmFzZWREZXN0cnVjdG9ycyk7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgd2hhdGV2ZXIgdGhlIFdBU00gZnVuY3Rpb24gcmV0dXJuZWQgdG8gYSBKUyByZXByZXNlbnRhdGlvblxyXG4gICAgICAgIC8vIElmIHRoZSBvYmplY3QgcmV0dXJuZWQgaXMgRGlzcG9zYWJsZSwgdGhlbiB3ZSBsZXQgdGhlIHVzZXIgZGlzcG9zZSBvZiBpdFxyXG4gICAgICAgIC8vIHdoZW4gcmVhZHkuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBPdGhlcndpc2UgKG5hbWVseSBzdHJpbmdzKSwgZGlzcG9zZSBpdHMgb3JpZ2luYWwgcmVwcmVzZW50YXRpb24gbm93LlxyXG4gICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IHJldHVyblR5cGU/LmZyb21XaXJlVHlwZSh3aXJlZFJldHVybik7XHJcbiAgICAgICAgaWYgKHN0YWNrRGVzdHJ1Y3RvciAmJiAhKGpzVmFsdWUgJiYgdHlwZW9mIGpzVmFsdWUgPT0gXCJvYmplY3RcIiAmJiAoU3ltYm9sLmRpc3Bvc2UgaW4ganNWYWx1ZSkpKVxyXG4gICAgICAgICAgICBzdGFja0Rlc3RydWN0b3IoanNWYWx1ZSwgd2lyZVZhbHVlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGpzVmFsdWU7XHJcblxyXG4gICAgfSBhcyBGKTtcclxufVxyXG4iLCAiXHJcbmV4cG9ydCB0eXBlIElzNjQgPSBmYWxzZTtcclxuZXhwb3J0IGNvbnN0IElzNjQgPSBmYWxzZTtcclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBJczY0IH0gZnJvbSBcIi4vaXMtNjQuanNcIjtcclxuXHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IFBvaW50ZXJTaXplOiA0IHwgOCA9IChJczY0ID8gOCA6IDQpO1xyXG5leHBvcnQgY29uc3QgZ2V0UG9pbnRlcjogXCJnZXRCaWdVaW50NjRcIiB8IFwiZ2V0VWludDMyXCIgPSAoSXM2NCA/IFwiZ2V0QmlnVWludDY0XCIgOiBcImdldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBjb25zdCBzZXRQb2ludGVyOiBcInNldEJpZ1VpbnQ2NFwiIHwgXCJzZXRVaW50MzJcIiA9IChJczY0ID8gXCJzZXRCaWdVaW50NjRcIiA6IFwic2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQb2ludGVyU2l6ZShfaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+KTogNCB7IHJldHVybiBQb2ludGVyU2l6ZSBhcyA0OyB9IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IGdldFBvaW50ZXIgfSBmcm9tIFwiLi9wb2ludGVyLmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgYHJlYWRVaW50MzJgLCBidXQgdHlwZWQgZm9yIHBvaW50ZXJzLCBhbmQgZnV0dXJlLXByb29mcyBhZ2FpbnN0IDY0LWJpdCBhcmNoaXRlY3R1cmVzLlxyXG4gKiBcclxuICogVGhpcyBpcyAqbm90KiB0aGUgc2FtZSBhcyBkZXJlZmVyZW5jaW5nIGEgcG9pbnRlci4gVGhpcyBpcyBhYm91dCByZWFkaW5nIHRoZSBudW1lcmljYWwgdmFsdWUgYXQgYSBnaXZlbiBhZGRyZXNzIHRoYXQgaXMsIGl0c2VsZiwgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgYSBwb2ludGVyLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRQb2ludGVyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tnZXRQb2ludGVyXShwdHIsIHRydWUpIGFzIG51bWJlcjsgfVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uLy4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkUG9pbnRlciB9IGZyb20gXCIuLi8uLi91dGlsL3JlYWQtcG9pbnRlci5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYWxseSwgRW1iaW5kIGZ1bmN0aW9ucyBpbmNsdWRlIGFuIGFycmF5IG9mIFJUVEkgVHlwZUlkcyBpbiB0aGUgZm9ybSBvZlxyXG4gKiBbUmV0VHlwZSwgVGhpc1R5cGU/LCAuLi5BcmdUeXBlc11cclxuICogXHJcbiAqIFRoaXMgcmV0dXJucyB0aGF0IGFycmF5IG9mIHR5cGVJZHMgZm9yIGEgZ2l2ZW4gZnVuY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFycmF5T2ZUeXBlcyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgY291bnQ6IG51bWJlciwgcmF3QXJnVHlwZXNQdHI6IG51bWJlcik6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHJldDogbnVtYmVyW10gPSBbXTtcclxuICAgIGNvbnN0IHBvaW50ZXJTaXplID0gZ2V0UG9pbnRlclNpemUoaW1wbCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XHJcbiAgICAgICAgcmV0LnB1c2gocmVhZFBvaW50ZXIoaW1wbCwgcmF3QXJnVHlwZXNQdHIgKyBpICogcG9pbnRlclNpemUpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgbWV0aG9kTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBpc0FzeW5jOiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbWV0aG9kTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICAoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpKVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvcih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLCBcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsIFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlciwgXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsIFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsIFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKHRoaXMsIFwiPGNvbnN0cnVjdG9yPlwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgKChFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0gYXMgYW55KSkuX2NvbnN0cnVjdG9yID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIFwiPGNvbnN0cnVjdG9yPlwiLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sICBcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBtZXRob2ROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlciwgLy8gW1JldHVyblR5cGUsIFRoaXNUeXBlLCBBcmdzLi4uXVxyXG4gICAgaW52b2tlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyLFxyXG4gICAgaXNQdXJlVmlydHVhbDogbnVtYmVyLFxyXG4gICAgaXNBc3luYzogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgdGhpc1R5cGVJZCwgLi4uYXJnVHlwZUlkc10gPSByZWFkQXJyYXlPZlR5cGVzKHRoaXMsIGFyZ0NvdW50LCByYXdBcmdUeXBlc1B0cik7XHJcbiAgICAvL2NvbnNvbGUuYXNzZXJ0KHRoaXNUeXBlSWQgIT0gcmF3Q2xhc3NUeXBlSWQsYEludGVybmFsIGVycm9yOyBleHBlY3RlZCB0aGUgUlRUSSBwb2ludGVycyBmb3IgdGhlIGNsYXNzIHR5cGUgYW5kIGl0cyBwb2ludGVyIHR5cGUgdG8gYmUgZGlmZmVyZW50LmApO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBtZXRob2ROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICAoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpLnByb3RvdHlwZSBhcyBhbnkpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICByZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgICAgIGFyZ1R5cGVJZHMsXHJcbiAgICAgICAgICAgIGludm9rZXJTaWduYXR1cmVQdHIsXHJcbiAgICAgICAgICAgIGludm9rZXJJbmRleCxcclxuICAgICAgICAgICAgaW52b2tlckNvbnRleHRcclxuICAgICAgICApO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5KFxyXG4gICAgdGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgZmllbGROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlcixcclxuICAgIGdldHRlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgZ2V0dGVySW5kZXg6IG51bWJlcixcclxuICAgIGdldHRlckNvbnRleHQ6IG51bWJlcixcclxuICAgIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsXHJcbiAgICBzZXR0ZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIHNldHRlckluZGV4OiBudW1iZXIsXHJcbiAgICBzZXR0ZXJDb250ZXh0OiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgZmllbGROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBnZXQgPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb248KCkgPT4gYW55Pih0aGlzLCBgJHtuYW1lfV9nZXR0ZXJgLCBnZXR0ZXJSZXR1cm5UeXBlSWQsIFtdLCBnZXR0ZXJTaWduYXR1cmVQdHIsIGdldHRlckluZGV4LCBnZXR0ZXJDb250ZXh0KTtcclxuICAgICAgICBjb25zdCBzZXQgPSBzZXR0ZXJJbmRleD8gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uPCh2YWx1ZTogYW55KSA9PiB2b2lkPih0aGlzLCBgJHtuYW1lfV9zZXR0ZXJgLCAwLCBbc2V0dGVyQXJndW1lbnRUeXBlSWRdLCBzZXR0ZXJTaWduYXR1cmVQdHIsIHNldHRlckluZGV4LCBzZXR0ZXJDb250ZXh0KSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkucHJvdG90eXBlIGFzIGFueSksIG5hbWUsIHtcclxuICAgICAgICAgICAgZ2V0LFxyXG4gICAgICAgICAgICBzZXQsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiXHJcbmltcG9ydCB7IHJlZ2lzdGVyRW1ib3VuZCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50PFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgbmFtZVB0cjogbnVtYmVyLCB0eXBlUHRyOiBudW1iZXIsIHZhbHVlQXNXaXJlVHlwZTogV1QpOiB2b2lkIHtcclxuXHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAoY29uc3ROYW1lKSA9PiB7XHJcbiAgICAgICAgLy8gV2FpdCB1bnRpbCB3ZSBrbm93IGhvdyB0byBwYXJzZSB0aGUgdHlwZSB0aGlzIGNvbnN0YW50IHJlZmVyZW5jZXMuXHJcbiAgICAgICAgY29uc3QgW3R5cGVdID0gYXdhaXQgZ2V0VHlwZUluZm88W0VtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD5dPih0eXBlUHRyKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB0aGUgY29uc3RhbnQgZnJvbSBpdHMgd2lyZSByZXByZXNlbnRhdGlvbiB0byBpdHMgSlMgcmVwcmVzZW50YXRpb24uXHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0eXBlLmZyb21XaXJlVHlwZSh2YWx1ZUFzV2lyZVR5cGUpO1xyXG5cclxuICAgICAgICAvLyBBZGQgdGhpcyBjb25zdGFudCB2YWx1ZSB0byB0aGUgYGVtYmluZGAgb2JqZWN0LlxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZDxUPih0aGlzLCBjb25zdE5hbWUsIHZhbHVlLmpzVmFsdWUpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgLy8gVE9ETy4uLlxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtdmFsX3Rha2VfdmFsdWUodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgcHRyOiBudW1iZXIpOiBhbnkge1xyXG4gICAgLy8gVE9ETy4uLlxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbXZhbF9kZWNyZWYodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGhhbmRsZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIC8vIFRPRE8uLi5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUsIHJlZ2lzdGVyRW1ib3VuZCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5jb25zdCBBbGxFbnVtczogUmVjb3JkPG51bWJlciwgUmVjb3JkPHN0cmluZywgbnVtYmVyPj4gPSB7fTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2VudW0odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBzaXplOiBudW1iZXIsIGlzU2lnbmVkOiBib29sZWFuKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZW51bSBvYmplY3QgdGhhdCB0aGUgdXNlciB3aWxsIGluc3BlY3QgdG8gbG9vayBmb3IgZW51bSB2YWx1ZXNcclxuICAgICAgICBBbGxFbnVtc1t0eXBlUHRyXSA9IHt9O1xyXG5cclxuICAgICAgICAvLyBNYXJrIHRoaXMgdHlwZSBhcyByZWFkeSB0byBiZSB1c2VkIGJ5IG90aGVyIHR5cGVzIFxyXG4gICAgICAgIC8vIChldmVuIGlmIHdlIGRvbid0IGhhdmUgdGhlIGVudW0gdmFsdWVzIHlldCwgZW51bSB2YWx1ZXNcclxuICAgICAgICAvLyB0aGVtc2VsdmVzIGFyZW4ndCB1c2VkIGJ5IGFueSByZWdpc3RyYXRpb24gZnVuY3Rpb25zLilcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh3aXJlVmFsdWUpID0+IHsgcmV0dXJuIHt3aXJlVmFsdWUsIGpzVmFsdWU6IHdpcmVWYWx1ZX07IH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChqc1ZhbHVlKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZToganNWYWx1ZSwganNWYWx1ZSB9IH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gTWFrZSB0aGlzIHR5cGUgYXZhaWxhYmxlIGZvciB0aGUgdXNlclxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZCh0aGlzLCBuYW1lIGFzIG5ldmVyLCBBbGxFbnVtc1t0eXBlUHRyIGFzIGFueV0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlKHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdFbnVtVHlwZTogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGVudW1WYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgLy8gSnVzdCBhZGQgdGhpcyBuYW1lJ3MgdmFsdWUgdG8gdGhlIGV4aXN0aW5nIGVudW0gdHlwZS5cclxuICAgICAgICBBbGxFbnVtc1tyYXdFbnVtVHlwZV1bbmFtZV0gPSBlbnVtVmFsdWU7XHJcbiAgICB9KVxyXG59IiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBieXRlV2lkdGg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHZhbHVlKSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZX0pLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAodmFsdWUpID0+ICh7IHdpcmVWYWx1ZTogdmFsdWUsIGpzVmFsdWU6IHZhbHVlfSksXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkQXJyYXlPZlR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBcclxuICogQHBhcmFtIG5hbWVQdHIgQSBwb2ludGVyIHRvIHRoZSBudWxsLXRlcm1pbmF0ZWQgbmFtZSBvZiB0aGlzIGV4cG9ydC5cclxuICogQHBhcmFtIGFyZ0NvdW50IFRoZSBudW1iZXIgb2YgYXJndW1lbnRzIHRoZSBXQVNNIGZ1bmN0aW9uIHRha2VzXHJcbiAqIEBwYXJhbSByYXdBcmdUeXBlc1B0ciBBIHBvaW50ZXIgdG8gYW4gYXJyYXkgb2YgbnVtYmVycywgZWFjaCByZXByZXNlbnRpbmcgYSBUeXBlSUQuIFRoZSAwdGggdmFsdWUgaXMgdGhlIHJldHVybiB0eXBlLCB0aGUgcmVzdCBhcmUgdGhlIGFyZ3VtZW50cyB0aGVtc2VsdmVzLlxyXG4gKiBAcGFyYW0gc2lnbmF0dXJlIEEgcG9pbnRlciB0byBhIG51bGwtdGVybWluYXRlZCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBXQVNNIHNpZ25hdHVyZSBvZiB0aGUgZnVuY3Rpb247IGUuZy4gXCJgcGBcIiwgXCJgZnBwYFwiLCBcImB2cGBcIiwgXCJgZnBmZmZgXCIsIGV0Yy5cclxuICogQHBhcmFtIHJhd0ludm9rZXJQdHIgVGhlIHBvaW50ZXIgdG8gdGhlIGZ1bmN0aW9uIGluIFdBU00uXHJcbiAqIEBwYXJhbSBmdW5jdGlvbkluZGV4IFRoZSBpbmRleCBvZiB0aGUgZnVuY3Rpb24gaW4gdGhlIGBXZWJBc3NlbWJseS5UYWJsZWAgdGhhdCdzIGV4cG9ydGVkLlxyXG4gKiBAcGFyYW0gaXNBc3luYyBVbnVzZWQuLi5wcm9iYWJseVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24oXHJcbiAgICB0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PixcclxuICAgIG5hbWVQdHI6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLFxyXG4gICAgc2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICByYXdJbnZva2VyUHRyOiBudW1iZXIsXHJcbiAgICBmdW5jdGlvbkluZGV4OiBudW1iZXIsXHJcbiAgICBpc0FzeW5jOiBib29sZWFuXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgLi4uYXJnVHlwZUlkc10gPSByZWFkQXJyYXlPZlR5cGVzKHRoaXMsIGFyZ0NvdW50LCByYXdBcmdUeXBlc1B0cik7XHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgICh0aGlzLmVtYmluZCBhcyBhbnkpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIG5hbWUsIHJldHVyblR5cGVJZCwgYXJnVHlwZUlkcywgc2lnbmF0dXJlLCByYXdJbnZva2VyUHRyLCBmdW5jdGlvbkluZGV4KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBieXRlV2lkdGg6IG51bWJlciwgbWluVmFsdWU6IG51bWJlciwgbWF4VmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkVHlwZSA9IChtaW5WYWx1ZSA9PT0gMCk7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZFR5cGUgPyBmcm9tV2lyZVR5cGVVKGJ5dGVXaWR0aCkgOiBmcm9tV2lyZVR5cGVTKGJ5dGVXaWR0aCk7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IG1pbi9tYXhWYWx1ZSBhcmVuJ3QgdXNlZCBmb3IgYm91bmRzIGNoZWNraW5nLFxyXG4gICAgICAgIC8vIGJ1dCBpZiB0aGV5IGFyZSwgbWFrZSBzdXJlIHRvIGFkanVzdCBtYXhWYWx1ZSBmb3IgdGhlIHNhbWUgc2lnbmVkL3Vuc2lnbmVkIHR5cGUgaXNzdWVcclxuICAgICAgICAvLyBvbiAzMi1iaXQgc2lnbmVkIGludCB0eXBlczpcclxuICAgICAgICAvLyBtYXhWYWx1ZSA9IGZyb21XaXJlVHlwZShtYXhWYWx1ZSk7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKGpzVmFsdWU6IG51bWJlcikgPT4gKHsgd2lyZVZhbHVlOiBqc1ZhbHVlLCBqc1ZhbHVlIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbi8vIFdlIG5lZWQgYSBzZXBhcmF0ZSBmdW5jdGlvbiBmb3IgdW5zaWduZWQgY29udmVyc2lvbiBiZWNhdXNlIFdBU00gb25seSBoYXMgc2lnbmVkIHR5cGVzLCBcclxuLy8gZXZlbiB3aGVuIGxhbmd1YWdlcyBoYXZlIHVuc2lnbmVkIHR5cGVzLCBhbmQgaXQgZXhwZWN0cyB0aGUgY2xpZW50IHRvIG1hbmFnZSB0aGUgdHJhbnNpdGlvbi5cclxuLy8gU28gdGhpcyBpcyB1cywgbWFuYWdpbmcgdGhlIHRyYW5zaXRpb24uXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVUoYnl0ZVdpZHRoOiBudW1iZXIpOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8bnVtYmVyLCBudW1iZXI+W1wiZnJvbVdpcmVUeXBlXCJdIHtcclxuICAgIC8vIFNoaWZ0IG91dCBhbGwgdGhlIGJpdHMgaGlnaGVyIHRoYW4gd2hhdCB3b3VsZCBmaXQgaW4gdGhpcyBpbnRlZ2VyIHR5cGUsXHJcbiAgICAvLyBidXQgaW4gcGFydGljdWxhciBtYWtlIHN1cmUgdGhlIG5lZ2F0aXZlIGJpdCBnZXRzIGNsZWFyZWQgb3V0IGJ5IHRoZSA+Pj4gYXQgdGhlIGVuZC5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+Pj4gb3ZlcmZsb3dCaXRDb3VudCkgfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlUyhieXRlV2lkdGg6IG51bWJlcik6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxudW1iZXIsIG51bWJlcj5bXCJmcm9tV2lyZVR5cGVcIl0ge1xyXG4gICAgLy8gU2hpZnQgb3V0IGFsbCB0aGUgYml0cyBoaWdoZXIgdGhhbiB3aGF0IHdvdWxkIGZpdCBpbiB0aGlzIGludGVnZXIgdHlwZS5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+PiBvdmVyZmxvd0JpdENvdW50KSB9O1xyXG4gICAgfVxyXG59IiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBleDogYW55KTogdm9pZCB7XHJcbiAgICAvLyBUT0RPXHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBJczY0IH0gZnJvbSBcIi4vaXMtNjQuanNcIjtcclxuaW1wb3J0IHsgUG9pbnRlclNpemUgfSBmcm9tIFwiLi9wb2ludGVyLmpzXCI7XHJcblxyXG5jb25zdCBTaXplVFNpemU6IDQgfCA4ID0gUG9pbnRlclNpemU7XHJcbmV4cG9ydCBjb25zdCBzZXRTaXplVDogXCJzZXRCaWdVaW50NjRcIiB8IFwic2V0VWludDMyXCIgPSAoSXM2NCA/IFwic2V0QmlnVWludDY0XCIgOiBcInNldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBjb25zdCBnZXRTaXplVDogXCJnZXRCaWdVaW50NjRcIiB8IFwiZ2V0VWludDMyXCIgPSAoSXM2NCA/IFwiZ2V0QmlnVWludDY0XCIgOiBcImdldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRTaXplVFNpemUoX2luc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9Pik6IDQgeyByZXR1cm4gU2l6ZVRTaXplIGFzIDQ7IH1cclxuXHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBnZXRTaXplVCB9IGZyb20gXCIuL3NpemV0LmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgYHJlYWRVaW50MzJgLCBidXQgdHlwZWQgZm9yIHNpemVfdCB2YWx1ZXMsIGFuZCBmdXR1cmUtcHJvb2ZzIGFnYWluc3QgNjQtYml0IGFyY2hpdGVjdHVyZXMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNpemVUKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tnZXRTaXplVF0ocHRyLCB0cnVlKSBhcyBudW1iZXI7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHNldFNpemVUIH0gZnJvbSBcIi4vc2l6ZXQuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVNpemVUKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tzZXRTaXplVF0ocHRyLCB2YWx1ZSBhcyBuZXZlciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50MTYoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50MTYocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50MzIoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IFBvaW50ZXI8bnVtYmVyPiwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50MzIocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50OChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+LCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LnNldFVpbnQ4KHB0ciwgdmFsdWUpOyB9XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgcmVhZFNpemVUIH0gZnJvbSBcIi4uLy4uL3V0aWwvcmVhZC1zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyBnZXRTaXplVFNpemUgfSBmcm9tIFwiLi4vLi4vdXRpbC9zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVNpemVUIH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtc2l6ZXQuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MTYgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50MTYuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50OCB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQ4LmpzXCI7XHJcbmltcG9ydCB7IHN0cmluZ1RvVXRmMTYsIHN0cmluZ1RvVXRmMzIsIHN0cmluZ1RvVXRmOCwgdXRmMTZUb1N0cmluZ0wsIHV0ZjMyVG9TdHJpbmdMLCB1dGY4VG9TdHJpbmdMIH0gZnJvbSBcIi4uL3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4vcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgV2lyZUNvbnZlcnNpb25SZXN1bHQgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLy8gU2hhcmVkIGJldHdlZW4gc3RkOjpzdHJpbmcgYW5kIHN0ZDo6d3N0cmluZ1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueShpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgdHlwZVB0cjogbnVtYmVyLCBjaGFyV2lkdGg6IDEgfCAyIHwgNCwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgdXRmVG9TdHJpbmdMID0gKGNoYXJXaWR0aCA9PSAxKSA/IHV0ZjhUb1N0cmluZ0wgOiAoY2hhcldpZHRoID09IDIpID8gdXRmMTZUb1N0cmluZ0wgOiB1dGYzMlRvU3RyaW5nTDtcclxuICAgIGNvbnN0IHN0cmluZ1RvVXRmID0gKGNoYXJXaWR0aCA9PSAxKSA/IHN0cmluZ1RvVXRmOCA6IChjaGFyV2lkdGggPT0gMikgPyBzdHJpbmdUb1V0ZjE2IDogc3RyaW5nVG9VdGYzMjtcclxuICAgIGNvbnN0IFVpbnRBcnJheSA9IChjaGFyV2lkdGggPT0gMSkgPyBVaW50OEFycmF5IDogKGNoYXJXaWR0aCA9PSAyKSA/IFVpbnQxNkFycmF5IDogVWludDMyQXJyYXk7XHJcbiAgICBjb25zdCB3cml0ZVVpbnQgPSAoY2hhcldpZHRoID09IDEpID8gd3JpdGVVaW50OCA6IChjaGFyV2lkdGggPT0gMikgPyB3cml0ZVVpbnQxNiA6IHdyaXRlVWludDMyO1xyXG5cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKGltcGwsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IChwdHI6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAvLyBUaGUgd2lyZSB0eXBlIGlzIGEgcG9pbnRlciB0byBhIFwic3RydWN0XCIgKG5vdCByZWFsbHkgYSBzdHJ1Y3QgaW4gdGhlIHVzdWFsIHNlbnNlLi4uXHJcbiAgICAgICAgICAgIC8vIGV4Y2VwdCBtYXliZSBpbiBuZXdlciBDIHZlcnNpb25zIEkgZ3Vlc3MpIHdoZXJlIFxyXG4gICAgICAgICAgICAvLyB0aGUgZmlyc3QgZmllbGQgaXMgYSBzaXplX3QgcmVwcmVzZW50aW5nIHRoZSBsZW5ndGgsXHJcbiAgICAgICAgICAgIC8vIEFuZCB0aGUgc2Vjb25kIFwiZmllbGRcIiBpcyB0aGUgc3RyaW5nIGRhdGEgaXRzZWxmLFxyXG4gICAgICAgICAgICAvLyBmaW5hbGx5IGFsbCBlbmRlZCB3aXRoIGFuIGV4dHJhIG51bGwgYnl0ZS5cclxuICAgICAgICAgICAgbGV0IGxlbmd0aCA9IHJlYWRTaXplVChpbXBsLCBwdHIpO1xyXG4gICAgICAgICAgICBsZXQgcGF5bG9hZCA9IHB0ciArIGdldFNpemVUU2l6ZShpbXBsKTtcclxuICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gXCJcIjtcclxuICAgICAgICAgICAgbGV0IGRlY29kZVN0YXJ0UHRyID0gcGF5bG9hZDtcclxuICAgICAgICAgICAgc3RyID0gdXRmVG9TdHJpbmdMKGltcGwsIGRlY29kZVN0YXJ0UHRyLCBsZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGpzVmFsdWU6IHN0cixcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBjYWxsIHRvIF9mcmVlIGhhcHBlbnMgYmVjYXVzZSBFbWJpbmQgY2FsbHMgbWFsbG9jIGR1cmluZyBpdHMgdG9XaXJlVHlwZSBmdW5jdGlvbi5cclxuICAgICAgICAgICAgICAgICAgICAvLyBTdXJlbHkgdGhlcmUncyBhIHdheSB0byBhdm9pZCB0aGlzIGNvcHkgb2YgYSBjb3B5IG9mIGEgY29weSB0aG91Z2gsIHJpZ2h0PyBSaWdodD9cclxuICAgICAgICAgICAgICAgICAgICBpbXBsLmV4cG9ydHMuZnJlZShwdHIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHRvV2lyZVR5cGUgPSAoc3RyOiBzdHJpbmcpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIHN0cmluZz4gPT4ge1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFsdWVBc0FycmF5QnVmZmVySW5KUyA9IG5ldyBVaW50QXJyYXkoc3RyaW5nVG9VdGYoc3RyKSk7XHJcblxyXG4gICAgICAgICAgICAvLyBJcyBpdCBtb3JlIG9yIGxlc3MgY2xlYXIgd2l0aCBhbGwgdGhlc2UgdmFyaWFibGVzIGV4cGxpY2l0bHkgbmFtZWQ/XHJcbiAgICAgICAgICAgIC8vIEhvcGVmdWxseSBtb3JlLCBhdCBsZWFzdCBzbGlnaHRseS5cclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aG91dE51bGwgPSB2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aE51bGwgPSBjaGFyQ291bnRXaXRob3V0TnVsbCArIDE7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRob3V0TnVsbCA9IGNoYXJDb3VudFdpdGhvdXROdWxsICogY2hhcldpZHRoO1xyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRoTnVsbCA9IGNoYXJDb3VudFdpdGhOdWxsICogY2hhcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgLy8gMS4gKG0pYWxsb2NhdGUgc3BhY2UgZm9yIHRoZSBzdHJ1Y3QgYWJvdmVcclxuICAgICAgICAgICAgY29uc3Qgd2FzbVN0cmluZ1N0cnVjdCA9IGltcGwuZXhwb3J0cy5tYWxsb2MoZ2V0U2l6ZVRTaXplKGltcGwpICsgYnl0ZUNvdW50V2l0aE51bGwpO1xyXG5cclxuICAgICAgICAgICAgLy8gMi4gV3JpdGUgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nIHRvIHRoZSBzdHJ1Y3RcclxuICAgICAgICAgICAgY29uc3Qgc3RyaW5nU3RhcnQgPSB3YXNtU3RyaW5nU3RydWN0ICsgZ2V0U2l6ZVRTaXplKGltcGwpO1xyXG4gICAgICAgICAgICB3cml0ZVNpemVUKGltcGwsIHdhc21TdHJpbmdTdHJ1Y3QsIGNoYXJDb3VudFdpdGhvdXROdWxsKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDMuIFdyaXRlIHRoZSBzdHJpbmcgZGF0YSB0byB0aGUgc3RydWN0XHJcbiAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gbmV3IFVpbnRBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgc3RyaW5nU3RhcnQsIGJ5dGVDb3VudFdpdGhvdXROdWxsKTtcclxuICAgICAgICAgICAgZGVzdGluYXRpb24uc2V0KHZhbHVlQXNBcnJheUJ1ZmZlckluSlMpO1xyXG5cclxuICAgICAgICAgICAgLy8gNC4gV3JpdGUgYSBudWxsIGJ5dGVcclxuICAgICAgICAgICAgd3JpdGVVaW50KGltcGwsIHN0cmluZ1N0YXJ0ICsgYnl0ZUNvdW50V2l0aG91dE51bGwsIDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4gaW1wbC5leHBvcnRzLmZyZWUod2FzbVN0cmluZ1N0cnVjdCksXHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHdhc21TdHJpbmdTdHJ1Y3QsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBzdHJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGUoaW1wbCwgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHJldHVybiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55KHRoaXMsIHR5cGVQdHIsIDEsIG5hbWVQdHIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHR5cGVQdHI6IG51bWJlciwgY2hhcldpZHRoOiAyIHwgNCwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICByZXR1cm4gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSh0aGlzLCB0eXBlUHRyLCBjaGFyV2lkdGgsIG5hbWVQdHIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIC4uLmFyZ3M6IG51bWJlcltdKTogdm9pZCB7XHJcbiAgICBkZWJ1Z2dlcjtcclxuICAgIC8vIFRPRE8uLi5cclxufSIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZUNvbnZlcnNpb25SZXN1bHQsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFdUPiA9IChnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHB0cjogbnVtYmVyKSA9PiBXVDtcclxuZXhwb3J0IHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxXVD4gPSAoc2V0dGVyQ29udGV4dDogbnVtYmVyLCBwdHI6IG51bWJlciwgd2lyZVR5cGU6IFdUKSA9PiB2b2lkO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvIHtcclxuICAgIG5hbWVQdHI6IG51bWJlcjtcclxuICAgIF9jb25zdHJ1Y3RvcigpOiBudW1iZXI7XHJcbiAgICBfZGVzdHJ1Y3RvcihwdHI6IFdpcmVUeXBlcyk6IHZvaWQ7XHJcbiAgICBlbGVtZW50czogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88YW55LCBhbnk+W107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IHtcclxuXHJcbiAgICAvKiogVGhlIFwicmF3XCIgZ2V0dGVyLCBleHBvcnRlZCBmcm9tIEVtYmluZC4gTmVlZHMgY29udmVyc2lvbiBiZXR3ZWVuIHR5cGVzLiAqL1xyXG4gICAgd2FzbUdldHRlcjogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXVD47XHJcblxyXG4gICAgLyoqIFRoZSBcInJhd1wiIHNldHRlciwgZXhwb3J0ZWQgZnJvbSBFbWJpbmQuIE5lZWRzIGNvbnZlcnNpb24gYmV0d2VlbiB0eXBlcy4gKi9cclxuICAgIHdhc21TZXR0ZXI6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V1Q+O1xyXG5cclxuICAgIC8qKiBUaGUgbnVtZXJpYyB0eXBlIElEIG9mIHRoZSB0eXBlIHRoZSBnZXR0ZXIgcmV0dXJucyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFRoZSBudW1lcmljIHR5cGUgSUQgb2YgdGhlIHR5cGUgdGhlIHNldHRlciBhY2NlcHRzICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBVbmtub3duOyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBlbWJpbmQgZ2V0dGVyICovXHJcbiAgICBnZXR0ZXJDb250ZXh0OiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFVua25vd247IHVzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIGVtYmluZCBzZXR0ZXIgKi9cclxuICAgIHNldHRlckNvbnRleHQ6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+IHtcclxuICAgIC8qKiBBIHZlcnNpb24gb2YgYHdhc21HZXR0ZXJgIHRoYXQgaGFuZGxlcyB0eXBlIGNvbnZlcnNpb24gKi9cclxuICAgIHJlYWQocHRyOiBXVCk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PFdULCBUPjtcclxuXHJcbiAgICAvKiogQSB2ZXJzaW9uIG9mIGB3YXNtU2V0dGVyYCB0aGF0IGhhbmRsZXMgdHlwZSBjb252ZXJzaW9uICovXHJcbiAgICB3cml0ZShwdHI6IG51bWJlciwgdmFsdWU6IFQpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxXVCwgVD47XHJcblxyXG4gICAgLyoqIGBnZXR0ZXJSZXR1cm5UeXBlSWQsIGJ1dCByZXNvbHZlZCB0byB0aGUgcGFyc2VkIHR5cGUgaW5mbyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdULCBUPjtcclxuXHJcbiAgICAvKiogYHNldHRlclJldHVyblR5cGVJZCwgYnV0IHJlc29sdmVkIHRvIHRoZSBwYXJzZWQgdHlwZSBpbmZvICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGU6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD47XHJcbn1cclxuXHJcbi8vIFRlbXBvcmFyeSBzY3JhdGNoIG1lbW9yeSB0byBjb21tdW5pY2F0ZSBiZXR3ZWVuIHJlZ2lzdHJhdGlvbiBjYWxscy5cclxuZXhwb3J0IGNvbnN0IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnM6IFJlY29yZDxudW1iZXIsIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8+ID0ge307XHJcblxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGU8VD4oaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXSA9IHtcclxuICAgICAgICBuYW1lUHRyLFxyXG4gICAgICAgIF9jb25zdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbihpbXBsLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uKGltcGwsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpLFxyXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcclxuICAgIH07XHJcblxyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxJIGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPGFueSwgYW55Pj4oZWxlbWVudHM6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPGFueSwgYW55PltdKTogUHJvbWlzZTxJW10+IHtcclxuICAgIGNvbnN0IGRlcGVuZGVuY3lJZHMgPSBbLi4uZWxlbWVudHMubWFwKChlbHQpID0+IGVsdC5nZXR0ZXJSZXR1cm5UeXBlSWQpLCAuLi5lbGVtZW50cy5tYXAoKGVsdCkgPT4gZWx0LnNldHRlckFyZ3VtZW50VHlwZUlkKV07XHJcblxyXG4gICAgY29uc3QgZGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0VHlwZUluZm8oLi4uZGVwZW5kZW5jeUlkcyk7XHJcbiAgICBjb25zb2xlLmFzc2VydChkZXBlbmRlbmNpZXMubGVuZ3RoID09IGVsZW1lbnRzLmxlbmd0aCAqIDIpO1xyXG5cclxuICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGVsZW1lbnRzLm1hcCgoZmllbGQsIGkpOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8YW55LCBhbnk+ID0+IHtcclxuICAgICAgICBjb25zdCBnZXR0ZXJSZXR1cm5UeXBlID0gZGVwZW5kZW5jaWVzW2ldITtcclxuICAgICAgICBjb25zdCBzZXR0ZXJBcmd1bWVudFR5cGUgPSBkZXBlbmRlbmNpZXNbaSArIGVsZW1lbnRzLmxlbmd0aF0hO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkKHB0cjogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXR0ZXJSZXR1cm5UeXBlLmZyb21XaXJlVHlwZShmaWVsZC53YXNtR2V0dGVyKGZpZWxkLmdldHRlckNvbnRleHQsIHB0cikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZShwdHI6IG51bWJlciwgbzogYW55KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IHNldHRlckFyZ3VtZW50VHlwZS50b1dpcmVUeXBlKG8pO1xyXG4gICAgICAgICAgICBmaWVsZC53YXNtU2V0dGVyKGZpZWxkLnNldHRlckNvbnRleHQsIHB0ciwgcmV0LndpcmVWYWx1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlLFxyXG4gICAgICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGUsXHJcbiAgICAgICAgICAgIHJlYWQsXHJcbiAgICAgICAgICAgIHdyaXRlLFxyXG4gICAgICAgICAgICAuLi5maWVsZFxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBmaWVsZFJlY29yZHMgYXMgSVtdO1xyXG59IiwgImltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50cywgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGUsIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXIsIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0UsIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXIsIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8sIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcblxyXG5cclxuaW50ZXJmYWNlIEFycmF5UmVnaXN0cmF0aW9uSW5mbyBleHRlbmRzIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8geyB9XHJcbmludGVyZmFjZSBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiB7IH1cclxuaW50ZXJmYWNlIEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+LCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QsIFQ+IHsgfVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheTxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0NvbnN0cnVjdG9yOiBudW1iZXIsIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3RGVzdHJ1Y3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2NvbXBvc2l0ZTxUPih0aGlzLCByYXdUeXBlUHRyLCBuYW1lUHRyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpO1xyXG5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQ8VD4odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R1cGxlVHlwZTogbnVtYmVyLCBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlciwgZ2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIGdldHRlcjogbnVtYmVyLCBnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsIHNldHRlclNpZ25hdHVyZTogbnVtYmVyLCBzZXR0ZXI6IG51bWJlciwgc2V0dGVyQ29udGV4dDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R1cGxlVHlwZV0uZWxlbWVudHMucHVzaCh7XHJcbiAgICAgICAgZ2V0dGVyQ29udGV4dCxcclxuICAgICAgICBzZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIGdldHRlclJldHVyblR5cGVJZCxcclxuICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZCxcclxuICAgICAgICB3YXNtR2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8VD4+KHRoaXMsIGdldHRlclNpZ25hdHVyZSwgZ2V0dGVyKSxcclxuICAgICAgICB3YXNtU2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8VD4+KHRoaXMsIHNldHRlclNpZ25hdHVyZSwgc2V0dGVyKVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX2FycmF5PFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbnN0IHJlZyA9IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcbiAgICBkZWxldGUgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXTtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIHJlZy5uYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBmaWVsZFJlY29yZHMgPSBhd2FpdCBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxhbnksIFQ+PihyZWcuZWxlbWVudHMpO1xyXG5cclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPGFueSwgdW5rbm93bltdPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAocHRyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXQ6IChhbnlbXSAmIERpc3Bvc2FibGUpID0gW10gYXMgYW55O1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnLmVsZW1lbnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmllbGQgPSBmaWVsZFJlY29yZHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGRSZWNvcmRzW2ldLnJlYWQocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBqc1ZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0W1N5bWJvbC5kaXNwb3NlXSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogcmV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4gcmV0W1N5bWJvbC5kaXNwb3NlXSgpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHRyID0gcmVnLl9jb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZmllbGQgb2YgZmllbGRSZWNvcmRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGQud3JpdGUocHRyLCBvW2ldIGFzIGFueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogbyxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbywgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FLCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyLCBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvLCBjb21wb3NpdGVSZWdpc3RyYXRpb25zIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1jb21wb3NpdGUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyByZWFkTGF0aW4xU3RyaW5nIH0gZnJvbSBcIi4uL19wcml2YXRlL3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0UmVnaXN0cmF0aW9uSW5mbyBleHRlbmRzIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8ge1xyXG4gICAgZWxlbWVudHM6IFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxhbnksIGFueT5bXTtcclxufVxyXG5cclxuaW50ZXJmYWNlIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4ge1xyXG4gICAgLyoqIFRoZSBuYW1lIG9mIHRoaXMgZmllbGQgKi9cclxuICAgIG5hbWU6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdULCBUPiB7IH1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmaXJzdCwgdG8gc3RhcnQgdGhlIHJlZ2lzdHJhdGlvbiBvZiBhIHN0cnVjdCBhbmQgYWxsIGl0cyBmaWVsZHMuIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByYXdUeXBlOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgY29uc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3Q29uc3RydWN0b3I6IG51bWJlciwgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdEZXN0cnVjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZV0gPSB7XHJcbiAgICAgICAgbmFtZVB0cixcclxuICAgICAgICBfY29uc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb248KCkgPT4gbnVtYmVyPih0aGlzLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPCgpID0+IHZvaWQ+KHRoaXMsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpLFxyXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcclxuICAgIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIHBlciBmaWVsZCwgYWZ0ZXIgYF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0YCBhbmQgYmVmb3JlIGBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdGAuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQ8VD4odGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHJhd1R5cGVQdHI6IG51bWJlciwgZmllbGROYW1lOiBudW1iZXIsIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyLCBnZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgZ2V0dGVyOiBudW1iZXIsIGdldHRlckNvbnRleHQ6IG51bWJlciwgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlciwgc2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIHNldHRlcjogbnVtYmVyLCBzZXR0ZXJDb250ZXh0OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIChjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdIGFzIFN0cnVjdFJlZ2lzdHJhdGlvbkluZm8pLmVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgIG5hbWU6IHJlYWRMYXRpbjFTdHJpbmcodGhpcywgZmllbGROYW1lKSxcclxuICAgICAgICBnZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIHNldHRlckNvbnRleHQsXHJcbiAgICAgICAgZ2V0dGVyUmV0dXJuVHlwZUlkLFxyXG4gICAgICAgIHNldHRlckFyZ3VtZW50VHlwZUlkLFxyXG4gICAgICAgIHdhc21HZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxUPj4odGhpcywgZ2V0dGVyU2lnbmF0dXJlLCBnZXR0ZXIpLFxyXG4gICAgICAgIHdhc21TZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxUPj4odGhpcywgc2V0dGVyU2lnbmF0dXJlLCBzZXR0ZXIpLFxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgYWZ0ZXIgYWxsIG90aGVyIG9iamVjdCByZWdpc3RyYXRpb24gZnVuY3Rpb25zIGFyZSBjYWxsZWQ7IHRoaXMgY29udGFpbnMgdGhlIGFjdHVhbCByZWdpc3RyYXRpb24gY29kZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdDxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb25zdCByZWcgPSBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdO1xyXG4gICAgZGVsZXRlIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCByZWcubmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZmllbGRSZWNvcmRzID0gYXdhaXQgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHM8U3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvRTxhbnksIFQ+PihyZWcuZWxlbWVudHMpO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGUodGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHB0cikgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmV0OiBEaXNwb3NhYmxlID0ge30gYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJldCwgU3ltYm9sLmRpc3Bvc2UsIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWcuZWxlbWVudHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZCA9IGZpZWxkUmVjb3Jkc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZFJlY29yZHNbaV0ucmVhZChwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIGZpZWxkLm5hbWUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGpzVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIE9iamVjdC5mcmVlemUocmV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IHJldCxcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0W1N5bWJvbC5kaXNwb3NlXSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdHIgPSByZWcuX2NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmaWVsZCBvZiBmaWVsZFJlY29yZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZC53cml0ZShwdHIsIG9bZmllbGQubmFtZSBhcyBuZXZlcl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiBvLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxufVxyXG5cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgbmFtZSA9PiB7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgdW5kZWZpbmVkPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAoKSA9PiAoeyBqc1ZhbHVlOiB1bmRlZmluZWQhLCB3aXJlVmFsdWU6IHVuZGVmaW5lZCEgfSksXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6ICgpID0+ICh7IGpzVmFsdWU6IHVuZGVmaW5lZCEsIHdpcmVWYWx1ZTogdW5kZWZpbmVkISB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSlcclxuXHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZW1vcnlHcm93dGhFdmVudERldGFpbCB7IGluZGV4OiBudW1iZXIgfVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lbW9yeUdyb3d0aEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8TWVtb3J5R3Jvd3RoRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJNZW1vcnlHcm93dGhFdmVudFwiLCB7IGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHsgaW5kZXggfSB9KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgaW5kZXg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgdGhpcy5jYWNoZWRNZW1vcnlWaWV3ID0gbmV3IERhdGFWaWV3KHRoaXMuZXhwb3J0cy5tZW1vcnkuYnVmZmVyKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgTWVtb3J5R3Jvd3RoRXZlbnQodGhpcywgaW5kZXgpKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNlZ2ZhdWx0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcihcIlNlZ21lbnRhdGlvbiBmYXVsdFwiKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gVXNlZCBieSBTQUZFX0hFQVBcclxuZXhwb3J0IGZ1bmN0aW9uIHNlZ2ZhdWx0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+KTogbmV2ZXIge1xyXG4gICAgdGhyb3cgbmV3IFNlZ2ZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgRW1zY3JpcHRlbkV4Y2VwdGlvbiB9IGZyb20gXCIuLi9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgdXRmOFRvU3RyaW5nWiB9IGZyb20gXCIuL3N0cmluZy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGNlcHRpb25NZXNzYWdlKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBleDogRW1zY3JpcHRlbkV4Y2VwdGlvbik6IFtzdHJpbmcsIHN0cmluZ10ge1xyXG4gICAgdmFyIHB0ciA9IGdldENwcEV4Y2VwdGlvblRocm93bk9iamVjdEZyb21XZWJBc3NlbWJseUV4Y2VwdGlvbihpbXBsLCBleCk7XHJcbiAgICByZXR1cm4gZ2V0RXhjZXB0aW9uTWVzc2FnZUNvbW1vbihpbXBsLCBwdHIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDcHBFeGNlcHRpb25UaHJvd25PYmplY3RGcm9tV2ViQXNzZW1ibHlFeGNlcHRpb24oaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGV4OiBFbXNjcmlwdGVuRXhjZXB0aW9uKSB7XHJcbiAgICAvLyBJbiBXYXNtIEVILCB0aGUgdmFsdWUgZXh0cmFjdGVkIGZyb20gV2ViQXNzZW1ibHkuRXhjZXB0aW9uIGlzIGEgcG9pbnRlclxyXG4gICAgLy8gdG8gdGhlIHVud2luZCBoZWFkZXIuIENvbnZlcnQgaXQgdG8gdGhlIGFjdHVhbCB0aHJvd24gdmFsdWUuXHJcbiAgICBjb25zdCB1bndpbmRfaGVhZGVyOiBudW1iZXIgPSBleC5nZXRBcmcoKGltcGwuZXhwb3J0cykuX19jcHBfZXhjZXB0aW9uLCAwKTtcclxuICAgIHJldHVybiAoaW1wbC5leHBvcnRzKS5fX3Rocm93bl9vYmplY3RfZnJvbV91bndpbmRfZXhjZXB0aW9uKHVud2luZF9oZWFkZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdGFja1NhdmUoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4pIHtcclxuICAgIHJldHVybiBpbXBsLmV4cG9ydHMuZW1zY3JpcHRlbl9zdGFja19nZXRfY3VycmVudCgpO1xyXG59XHJcbmZ1bmN0aW9uIHN0YWNrQWxsb2MoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHNpemU6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGltcGwuZXhwb3J0cy5fZW1zY3JpcHRlbl9zdGFja19hbGxvYyhzaXplKTtcclxufVxyXG5mdW5jdGlvbiBzdGFja1Jlc3RvcmUoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHN0YWNrUG9pbnRlcjogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gaW1wbC5leHBvcnRzLl9lbXNjcmlwdGVuX3N0YWNrX3Jlc3RvcmUoc3RhY2tQb2ludGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RXhjZXB0aW9uTWVzc2FnZUNvbW1vbihpbXBsOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgcHRyOiBudW1iZXIpOiBbc3RyaW5nLCBzdHJpbmddIHtcclxuICAgIGNvbnN0IHNwID0gc3RhY2tTYXZlKGltcGwpO1xyXG4gICAgY29uc3QgdHlwZV9hZGRyX2FkZHIgPSBzdGFja0FsbG9jKGltcGwsIGdldFBvaW50ZXJTaXplKGltcGwpKTtcclxuICAgIGNvbnN0IG1lc3NhZ2VfYWRkcl9hZGRyID0gc3RhY2tBbGxvYyhpbXBsLCBnZXRQb2ludGVyU2l6ZShpbXBsKSk7XHJcbiAgICBpbXBsLmV4cG9ydHMuX19nZXRfZXhjZXB0aW9uX21lc3NhZ2UocHRyLCB0eXBlX2FkZHJfYWRkciwgbWVzc2FnZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgdHlwZV9hZGRyID0gcmVhZFBvaW50ZXIoaW1wbCwgdHlwZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgbWVzc2FnZV9hZGRyID0gcmVhZFBvaW50ZXIoaW1wbCwgbWVzc2FnZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgdHlwZSA9IHV0ZjhUb1N0cmluZ1ooaW1wbCwgdHlwZV9hZGRyKTtcclxuICAgIGltcGwuZXhwb3J0cy5mcmVlKHR5cGVfYWRkcik7XHJcbiAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XHJcbiAgICBpZiAobWVzc2FnZV9hZGRyKSB7XHJcbiAgICAgICAgbWVzc2FnZSA9IHV0ZjhUb1N0cmluZ1ooaW1wbCwgbWVzc2FnZV9hZGRyKTtcclxuICAgICAgICBpbXBsLmV4cG9ydHMuZnJlZShtZXNzYWdlX2FkZHIpO1xyXG4gICAgfVxyXG4gICAgc3RhY2tSZXN0b3JlKGltcGwsIHNwKTtcclxuICAgIHJldHVybiBbdHlwZSwgbWVzc2FnZV07XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBnZXRFeGNlcHRpb25NZXNzYWdlIH0gZnJvbSBcIi4uL19wcml2YXRlL2V4Y2VwdGlvbi5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudERldGFpbCB7IGV4Y2VwdGlvbjogV2ViQXNzZW1ibHkuRXhjZXB0aW9uIH1cclxuXHJcbmRlY2xhcmUgbmFtZXNwYWNlIFdlYkFzc2VtYmx5IHtcclxuICAgIGNsYXNzIEV4Y2VwdGlvbiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IodGFnOiBudW1iZXIsIHBheWxvYWQ6IG51bWJlcltdLCBvcHRpb25zPzogeyB0cmFjZVN0YWNrPzogYm9vbGVhbiB9KTtcclxuICAgICAgICBnZXRBcmcoZXhjZXB0aW9uVGFnOiBudW1iZXIsIGluZGV4OiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1zY3JpcHRlbkV4Y2VwdGlvbiBleHRlbmRzIFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiB7XHJcbiAgICBtZXNzYWdlOiBbc3RyaW5nLCBzdHJpbmddO1xyXG59XHJcbi8qXHJcbmV4cG9ydCBjbGFzcyBXZWJBc3NlbWJseUV4Y2VwdGlvbkV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8V2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoaW1wbDogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGV4Y2VwdGlvbjogV2ViQXNzZW1ibHkuRXhjZXB0aW9uKSB7XHJcbiAgICAgICAgc3VwZXIoXCJXZWJBc3NlbWJseUV4Y2VwdGlvbkV2ZW50XCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGV4Y2VwdGlvbiB9IH0pXHJcbiAgICB9XHJcbn1cclxuKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGV4OiBhbnkpOiB2b2lkIHtcclxuICAgIGNvbnN0IHQgPSBuZXcgV2ViQXNzZW1ibHkuRXhjZXB0aW9uKCh0aGlzLmV4cG9ydHMpLl9fY3BwX2V4Y2VwdGlvbiwgW2V4XSwgeyB0cmFjZVN0YWNrOiB0cnVlIH0pIGFzIEVtc2NyaXB0ZW5FeGNlcHRpb247XHJcbiAgICB0Lm1lc3NhZ2UgPSBnZXRFeGNlcHRpb25NZXNzYWdlKHRoaXMsIHQpO1xyXG4gICAgdGhyb3cgdDtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfdHpzZXRfanModGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sdGltZXpvbmU6IG51bWJlciwgZGF5bGlnaHQ6IG51bWJlciwgc3RkX25hbWU6IG51bWJlciwgZHN0X25hbWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgZGVidWdnZXI7XHJcbiAgICAvLyBUT0RPXHJcbiAgfSIsICJpbXBvcnQgeyBFbWJvdW5kVHlwZXMgfSBmcm9tIFwiLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFdmVudFR5cGVzTWFwIH0gZnJvbSBcIi4vX3ByaXZhdGUvZXZlbnQtdHlwZXMtbWFwLmpzXCI7XHJcbmltcG9ydCB7IEtub3duSW5zdGFuY2VFeHBvcnRzMiB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgSW5zdGFudGlhdGVkV2FzaUV2ZW50VGFyZ2V0IGV4dGVuZHMgRXZlbnRUYXJnZXQge1xyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcjxLIGV4dGVuZHMga2V5b2YgRXZlbnRUeXBlc01hcD4odHlwZTogSywgbGlzdGVuZXI6ICh0aGlzOiBGaWxlUmVhZGVyLCBldjogRXZlbnRUeXBlc01hcFtLXSkgPT4gYW55LCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdm9pZDtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXIodHlwZTogc3RyaW5nLCBjYWxsYmFjazogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsIG9wdGlvbnM/OiBFdmVudExpc3RlbmVyT3B0aW9ucyB8IGJvb2xlYW4pOiB2b2lkO1xyXG59XHJcblxyXG5cclxuLy8gIFRoaXMgcmVhc3NpZ25tZW50IGlzIGEgVHlwZXNjcmlwdCBoYWNrIHRvIGFkZCBjdXN0b20gdHlwZXMgdG8gYWRkRXZlbnRMaXN0ZW5lci4uLlxyXG5jb25zdCBJbnN0YW50aWF0ZWRXYXNpRXZlbnRUYXJnZXQgPSBFdmVudFRhcmdldCBhcyB7bmV3KCk6IEluc3RhbnRpYXRlZFdhc2lFdmVudFRhcmdldDsgcHJvdG90eXBlOiBJbnN0YW50aWF0ZWRXYXNpRXZlbnRUYXJnZXR9O1xyXG5cclxuLyoqXHJcbiAqIEV4dGVuc2lvbiBvZiBgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2VgIHRoYXQgaXMgYWxzbyBhbiBgRXZlbnRUYXJnZXRgIGZvciBhbGwgV0FTSSBcImV2ZW50XCJzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEluc3RhbnRpYXRlZFdhc2k8RSBleHRlbmRzIHt9PiBleHRlbmRzIEluc3RhbnRpYXRlZFdhc2lFdmVudFRhcmdldCBpbXBsZW1lbnRzIFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlIHtcclxuICAgIC8qKiBUaGUgYFdlYkFzc2VtYmx5Lk1vZHVsZWAgdGhpcyBpbnN0YW5jZSB3YXMgYnVpbHQgZnJvbS4gUmFyZWx5IHVzZWZ1bCBieSBpdHNlbGYuICovXHJcbiAgICBwdWJsaWMgbW9kdWxlOiBXZWJBc3NlbWJseS5Nb2R1bGU7XHJcbiAgICAvKiogVGhlIGBXZWJBc3NlbWJseS5Nb2R1bGVgIHRoaXMgaW5zdGFuY2Ugd2FzIGJ1aWx0IGZyb20uIFJhcmVseSB1c2VmdWwgYnkgaXRzZWxmLiAqL1xyXG4gICAgcHVibGljIGluc3RhbmNlOiBXZWJBc3NlbWJseS5JbnN0YW5jZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnRhaW5zIGV2ZXJ5dGhpbmcgZXhwb3J0ZWQgdXNpbmcgZW1iaW5kLlxyXG4gICAgICogXHJcbiAgICAgKiBUaGVzZSBhcmUgc2VwYXJhdGUgZnJvbSByZWd1bGFyIGV4cG9ydHMgb24gYGluc3RhbmNlLmV4cG9ydGAuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBlbWJpbmQ6IEVtYm91bmRUeXBlcztcclxuXHJcbiAgICAvKiogXHJcbiAgICAgKiBUaGUgXCJyYXdcIiBXQVNNIGV4cG9ydHMuIE5vbmUgYXJlIHByZWZpeGVkIHdpdGggXCJfXCIuXHJcbiAgICAgKiBcclxuICAgICAqIE5vIGNvbnZlcnNpb24gaXMgcGVyZm9ybWVkIG9uIHRoZSB0eXBlcyBoZXJlOyBldmVyeXRoaW5nIHRha2VzIG9yIHJldHVybnMgYSBudW1iZXIuXHJcbiAgICAgKiBcclxuICAgICAqL1xyXG4gICAgcHVibGljIGV4cG9ydHM6IEUgJiBLbm93bkluc3RhbmNlRXhwb3J0czI7XHJcbiAgICBwdWJsaWMgY2FjaGVkTWVtb3J5VmlldzogRGF0YVZpZXc7XHJcblxyXG4gICAgLyoqIE5vdCBpbnRlbmRlZCB0byBiZSBjYWxsZWQgZGlyZWN0bHkuIFVzZSB0aGUgYGluc3RhbnRpYXRlYCBmdW5jdGlvbiBpbnN0ZWFkLCB3aGljaCByZXR1cm5zIG9uZSBvZiB0aGVzZS4gKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5tb2R1bGUgPSB0aGlzLmluc3RhbmNlID0gdGhpcy5leHBvcnRzID0gdGhpcy5jYWNoZWRNZW1vcnlWaWV3ID0gbnVsbCFcclxuICAgICAgICB0aGlzLmVtYmluZCA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgX2luaXQobW9kdWxlOiBXZWJBc3NlbWJseS5Nb2R1bGUsIGluc3RhbmNlOiBXZWJBc3NlbWJseS5JbnN0YW5jZSk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMubW9kdWxlID0gbW9kdWxlO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgICB0aGlzLmV4cG9ydHMgPSBpbnN0YW5jZS5leHBvcnRzIGFzIEUgYXMgRSAmIEtub3duSW5zdGFuY2VFeHBvcnRzMjtcclxuICAgICAgICB0aGlzLmNhY2hlZE1lbW9yeVZpZXcgPSBuZXcgRGF0YVZpZXcodGhpcy5leHBvcnRzLm1lbW9yeS5idWZmZXIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVudGlyZVB1YmxpY0ludGVyZmFjZSB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXYXNpUmV0dXJuPEUgZXh0ZW5kcyB7fSwgSSBleHRlbmRzIEVudGlyZVB1YmxpY0ludGVyZmFjZT4ge1xyXG4gICAgaW1wb3J0czogSTtcclxuICAgIHdhc2lSZWFkeTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNpPEU+PjtcclxufVxyXG5cclxuXHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBJbnN0YW50aWF0ZSB0aGUgV0FTSSBpbnRlcmZhY2UsIGJpbmRpbmcgYWxsIGl0cyBmdW5jdGlvbnMgdG8gdGhlIFdBU00gaW5zdGFuY2UgaXRzZWxmLlxyXG4gKiBcclxuICogTXVzdCBiZSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGgsIGUuZy4sIGBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZWAuIEJlY2F1c2UgdGhhdCBhbmQgdGhpcyBib3RoIHJlcXVpcmUgZWFjaCBvdGhlciBjaXJjdWxhcmx5LCBcclxuICogYGluc3RhbnRpYXRlU3RyZWFtaW5nV2l0aFdhc2lgIGFuZCBgaW5zdGFudGlhdGVXaXRoV2FzaWAgYXJlIGNvbnZlbmllbmNlIGZ1bmN0aW9ucyB0aGF0IGRvIGJvdGggYXQgb25jZS5cclxuICogXHJcbiAqIFRoZSBXQVNJIGludGVyZmFjZSBmdW5jdGlvbnMgY2FuJ3QgYmUgdXNlZCBhbG9uZSAtLSB0aGV5IG5lZWQgY29udGV4dCBsaWtlICh3aGF0IG1lbW9yeSBpcyB0aGlzIGEgcG9pbnRlciBpbikgYW5kIHN1Y2guXHJcbiAqIFxyXG4gKiBUaGlzIGZ1bmN0aW9uIHByb3ZpZGVzIHRoYXQgY29udGV4dCB0byBhbiBpbXBvcnQgYmVmb3JlIGl0J3MgcGFzc2VkIHRvIGFuIGBJbnN0YW5jZWAgZm9yIGNvbnN0cnVjdGlvbi5cclxuICogXHJcbiAqIEByZW1hcmtzIEludGVuZGVkIHVzYWdlOlxyXG4gKiBcclxuICogYGBgdHlwZXNjcmlwdFxyXG4gKiBpbXBvcnQgeyBmZF93cml0ZSwgcHJvY19leGl0IH0gZnJvbSBcImJhc2ljLWV2ZW50LXdhc2lcIiBcclxuICogLy8gV2FpdGluZyBmb3IgaHR0cHM6Ly9naXRodWIuY29tL3RjMzkvcHJvcG9zYWwtcHJvbWlzZS13aXRoLXJlc29sdmVycy4uLlxyXG4gKiBsZXQgcmVzb2x2ZTogKGluZm86IFdlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlKSA9PiB2b2lkO1xyXG4gKiBsZXQgcmVqZWN0OiAoZXJyb3I6IGFueSkgPT4gdm9pZDtcclxuICogbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZTxXZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZT4oKHJlcywgcmVqKSA9PiB7XHJcbiAqICAgICByZXNvbHZlID0gcmVzO1xyXG4gKiAgICAgcmVqZWN0ID0gcmVqO1xyXG4gKiB9KTtcclxuICogXHJcbiAqIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKHNvdXJjZSwgeyAuLi5tYWtlV2FzaUludGVyZmFjZShwcm9taXNlLnRoZW4ocyA9PiBzLmluc3RhbmNlKSwgeyBmZF93cml0ZSwgcHJvY19leGl0IH0pIH0pO1xyXG4gKiBgYGBcclxuICogKFtQbGVhc2UgcGxlYXNlIHBsZWFzZSBwbGVhc2UgcGxlYXNlXShodHRwczovL2dpdGh1Yi5jb20vdGMzOS9wcm9wb3NhbC1wcm9taXNlLXdpdGgtcmVzb2x2ZXJzKSlcclxuICogXHJcbiAqIEBwYXJhbSB3YXNtSW5zdGFuY2UgXHJcbiAqIEBwYXJhbSB1bmJvdW5kSW1wb3J0cyBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFudGlhdGVXYXNpPEUgZXh0ZW5kcyB7fSwgSSBleHRlbmRzIEVudGlyZVB1YmxpY0ludGVyZmFjZT4od2FzbUluc3RhbmNlOiBQcm9taXNlPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPiwgdW5ib3VuZEltcG9ydHM6IEksIHsgZGlzcGF0Y2hFdmVudCB9OiB7IGRpc3BhdGNoRXZlbnQ/KGV2ZW50OiBFdmVudCk6IGJvb2xlYW4gfSA9IHt9KTogV2FzaVJldHVybjxFLCBJPiB7XHJcbiAgICBsZXQgcmVzb2x2ZSE6ICh2YWx1ZTogSW5zdGFudGlhdGVkV2FzaTxFPikgPT4gdm9pZDtcclxuICAgIGxldCByZXQgPSBuZXcgSW5zdGFudGlhdGVkV2FzaTxFPigpO1xyXG4gICAgd2FzbUluc3RhbmNlLnRoZW4oKG8pID0+IHtcclxuICAgICAgICBjb25zdCB7IGluc3RhbmNlLCBtb2R1bGUgfSA9IG87XHJcblxyXG4gICAgICAgIC8vIE5lZWRzIHRvIGNvbWUgYmVmb3JlIF9pbml0aWFsaXplKCkgb3IgX3N0YXJ0KCkuXHJcbiAgICAgICAgKHJldCBhcyBhbnkpLl9pbml0KG1vZHVsZSwgaW5zdGFuY2UpO1xyXG5cclxuICAgICAgICBjb25zb2xlLmFzc2VydCgoXCJfaW5pdGlhbGl6ZVwiIGluIGluc3RhbmNlLmV4cG9ydHMpICE9IFwiX3N0YXJ0XCIgaW4gaW5zdGFuY2UuZXhwb3J0cywgYEV4cGVjdGVkIGVpdGhlciBfaW5pdGlhbGl6ZSBYT1IgX3N0YXJ0IHRvIGJlIGV4cG9ydGVkIGZyb20gdGhpcyBXQVNNLmApO1xyXG4gICAgICAgIGlmIChcIl9pbml0aWFsaXplXCIgaW4gaW5zdGFuY2UuZXhwb3J0cykge1xyXG4gICAgICAgICAgICAoaW5zdGFuY2UuZXhwb3J0cyBhcyBhbnkpLl9pbml0aWFsaXplKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKFwiX3N0YXJ0XCIgaW4gaW5zdGFuY2UuZXhwb3J0cykge1xyXG4gICAgICAgICAgICAoaW5zdGFuY2UuZXhwb3J0cyBhcyBhbnkpLl9zdGFydCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXNvbHZlKHJldCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGwgdGhlIGZ1bmN0aW9ucyB3ZSd2ZSBiZWVuIHBhc3NlZCB3ZXJlIGltcG9ydGVkIGFuZCBoYXZlbid0IGJlZW4gYm91bmQgeWV0LlxyXG4gICAgLy8gUmV0dXJuIGEgbmV3IG9iamVjdCB3aXRoIGVhY2ggbWVtYmVyIGJvdW5kIHRvIHRoZSBwcml2YXRlIGluZm9ybWF0aW9uIHdlIHBhc3MgYXJvdW5kLlxyXG5cclxuICAgIGNvbnN0IHdhc2lfc25hcHNob3RfcHJldmlldzEgPSBiaW5kQWxsRnVuY3MocmV0LCB1bmJvdW5kSW1wb3J0cy53YXNpX3NuYXBzaG90X3ByZXZpZXcxKTtcclxuICAgIGNvbnN0IGVudiA9IGJpbmRBbGxGdW5jcyhyZXQsIHVuYm91bmRJbXBvcnRzLmVudik7XHJcblxyXG4gICAgY29uc3QgYm91bmRJbXBvcnRzID0geyB3YXNpX3NuYXBzaG90X3ByZXZpZXcxLCBlbnYgfSBhcyBJO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpbXBvcnRzOiBib3VuZEltcG9ydHMsXHJcbiAgICAgICAgLy8gVW50aWwgdGhpcyByZXNvbHZlcywgbm8gV0FTSSBmdW5jdGlvbnMgY2FuIGJlIGNhbGxlZCAoYW5kIGJ5IGV4dGVuc2lvbiBubyB3YXNtIGV4cG9ydHMgY2FuIGJlIGNhbGxlZClcclxuICAgICAgICAvLyBJdCByZXNvbHZlcyBpbW1lZGlhdGVseSBhZnRlciB0aGUgaW5wdXQgcHJvbWlzZSB0byB0aGUgaW5zdGFuY2UmbW9kdWxlIHJlc29sdmVzXHJcbiAgICAgICAgd2FzaVJlYWR5OiBuZXcgUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNpPEU+PigocmVzKSA9PiB7IHJlc29sdmUhID0gcmVzIH0pXHJcbiAgICB9O1xyXG59XHJcblxyXG5cclxuLy8gR2l2ZW4gYW4gb2JqZWN0LCBiaW5kcyBlYWNoIGZ1bmN0aW9uIGluIHRoYXQgb2JqZWN0IHRvIHAgKHNoYWxsb3dseSkuXHJcbmZ1bmN0aW9uIGJpbmRBbGxGdW5jczxSIGV4dGVuZHMge30+KHA6IEluc3RhbnRpYXRlZFdhc2k8e30+LCByOiBSKTogUiB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKE9iamVjdC5lbnRyaWVzKHIpLm1hcCgoW2tleSwgZnVuY10pID0+IHsgcmV0dXJuIFtrZXksICh0eXBlb2YgZnVuYyA9PSBcImZ1bmN0aW9uXCIgPyBmdW5jLmJpbmQocCkgOiBmdW5jKV0gYXMgY29uc3Q7IH0pKSBhcyBSO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbnRpcmVQdWJsaWNJbnRlcmZhY2UgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgYXdhaXRBbGxFbWJpbmQgfSBmcm9tIFwiLi9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgaW5zdGFudGlhdGVXYXNpIH0gZnJvbSBcIi4vaW5zdGFudGlhdGUtd2FzaS5qc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgUm9sbHVwV2FzbVByb21pc2U8SSBleHRlbmRzIEVudGlyZVB1YmxpY0ludGVyZmFjZSA9IEVudGlyZVB1YmxpY0ludGVyZmFjZT4gPSAoaW1wb3J0cz86IEkpID0+IFByb21pc2U8V2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2U+O1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlV2FzbUdlbmVyaWM8RSBleHRlbmRzIHt9LCBJIGV4dGVuZHMgRW50aXJlUHVibGljSW50ZXJmYWNlID0gRW50aXJlUHVibGljSW50ZXJmYWNlPihpbnN0YW50aWF0ZVdhc206IChib3VuZEltcG9ydHM6IEkpID0+IFByb21pc2U8V2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2U+LCB1bmJvdW5kSW1wb3J0czogSSk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj4ge1xyXG5cclxuICAgIC8vIFRoZXJlJ3MgYSBiaXQgb2Ygc29uZyBhbmQgZGFuY2UgdG8gZ2V0IGFyb3VuZCB0aGUgZmFjdCB0aGF0OlxyXG4gICAgLy8gMS4gV0FTTSBuZWVkcyBpdHMgV0FTSSBpbXBvcnRzIGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi5cclxuICAgIC8vIDIuIFdBU0kgbmVlZHMgaXRzIFdBU00gSW5zdGFuY2UgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLlxyXG4gICAgLy8gU28gd2UgdXNlIHByb21pc2VzIHRvIG5vdGlmeSBlYWNoIHRoYXQgdGhlIG90aGVyJ3MgYmVlbiBjcmVhdGVkLlxyXG5cclxuICAgIGNvbnN0IHsgcHJvbWlzZTogd2FzbVJlYWR5LCByZXNvbHZlOiByZXNvbHZlV2FzbSB9ID0gUHJvbWlzZS53aXRoUmVzb2x2ZXJzPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPigpO1xyXG4gICAgY29uc3QgeyBpbXBvcnRzLCB3YXNpUmVhZHkgfSA9IGluc3RhbnRpYXRlV2FzaTxFLCBJPih3YXNtUmVhZHksIHVuYm91bmRJbXBvcnRzKTtcclxuICAgIHJlc29sdmVXYXNtKGF3YWl0IGluc3RhbnRpYXRlV2FzbSh7IC4uLmltcG9ydHMgfSkpO1xyXG4gICAgY29uc3QgcmV0ID0gYXdhaXQgd2FzaVJlYWR5O1xyXG5cclxuICAgIGF3YWl0IGF3YWl0QWxsRW1iaW5kKCk7XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxufVxyXG5XZWJBc3NlbWJseS5pbnN0YW50aWF0ZSIsICJpbXBvcnQgeyB0eXBlIFJvbGx1cFdhc21Qcm9taXNlLCBpbnN0YW50aWF0ZVdhc21HZW5lcmljIH0gZnJvbSBcIi4vX3ByaXZhdGUvaW5zdGFudGlhdGUtd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgRW50aXJlUHVibGljSW50ZXJmYWNlIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW50aWF0ZXMgYSBXQVNNIG1vZHVsZSB3aXRoIHRoZSBzcGVjaWZpZWQgV0FTSSBpbXBvcnRzLlxyXG4gKiBcclxuICogYGlucHV0YCBjYW4gYmUgYW55IG9uZSBvZjpcclxuICogXHJcbiAqICogYFJlc3BvbnNlYCBvciBgUHJvbWlzZTxSZXNwb25zZT5gIChmcm9tIGUuZy4gYGZldGNoYCkuIFVzZXMgYFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nYC5cclxuICogKiBgQXJyYXlCdWZmZXJgIHJlcHJlc2VudGluZyB0aGUgV0FTTSBpbiBiaW5hcnkgZm9ybSwgb3IgYSBgV2ViQXNzZW1ibHkuTW9kdWxlYC4gXHJcbiAqICogQSBmdW5jdGlvbiB0aGF0IHRha2VzIDEgYXJndW1lbnQgb2YgdHlwZSBgV2ViQXNzZW1ibHkuSW1wb3J0c2AgYW5kIHJldHVybnMgYSBgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2VgLiBUaGlzIGlzIHRoZSB0eXBlIHRoYXQgYEByb2xsdXAvcGx1Z2luLXdhc21gIHJldHVybnMgd2hlbiBidW5kbGluZyBhIHByZS1idWlsdCBXQVNNIGJpbmFyeS5cclxuICogXHJcbiAqIEBwYXJhbSB3YXNtRmV0Y2hQcm9taXNlIFxyXG4gKiBAcGFyYW0gdW5ib3VuZEltcG9ydHMgXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFudGlhdGU8RSBleHRlbmRzIHt9Pih3YXNtRmV0Y2hQcm9taXNlOiBSZXNwb25zZSB8IFByb21pc2VMaWtlPFJlc3BvbnNlPiwgdW5ib3VuZEltcG9ydHM6IEVudGlyZVB1YmxpY0ludGVyZmFjZSk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj47XHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZTxFIGV4dGVuZHMge30+KG1vZHVsZUJ5dGVzOiBXZWJBc3NlbWJseS5Nb2R1bGUgfCBCdWZmZXJTb3VyY2UsIHVuYm91bmRJbXBvcnRzOiBFbnRpcmVQdWJsaWNJbnRlcmZhY2UpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8RT4+O1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFudGlhdGU8RSBleHRlbmRzIHt9Pih3YXNtSW5zdGFudGlhdG9yOiBSb2xsdXBXYXNtUHJvbWlzZSwgdW5ib3VuZEltcG9ydHM6IEVudGlyZVB1YmxpY0ludGVyZmFjZSk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzaTxFPj47XHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZTxFIGV4dGVuZHMge30+KHdhc206IFJvbGx1cFdhc21Qcm9taXNlIHwgV2ViQXNzZW1ibHkuTW9kdWxlIHwgQnVmZmVyU291cmNlIHwgUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4sIHVuYm91bmRJbXBvcnRzOiBFbnRpcmVQdWJsaWNJbnRlcmZhY2UpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8RT4+IHtcclxuICAgIHJldHVybiBhd2FpdCBpbnN0YW50aWF0ZVdhc21HZW5lcmljPEU+KGFzeW5jIChjb21iaW5lZEltcG9ydHMpID0+IHtcclxuICAgICAgICBpZiAod2FzbSBpbnN0YW5jZW9mIFdlYkFzc2VtYmx5Lk1vZHVsZSlcclxuICAgICAgICAgICAgcmV0dXJuICh7IG1vZHVsZTogd2FzbSwgaW5zdGFuY2U6IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKHdhc20sIHsgLi4uY29tYmluZWRJbXBvcnRzIH0pIH0pO1xyXG4gICAgICAgIGVsc2UgaWYgKHdhc20gaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fCBBcnJheUJ1ZmZlci5pc1ZpZXcod2FzbSkpXHJcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSh3YXNtLCB7IC4uLmNvbWJpbmVkSW1wb3J0cyB9KTtcclxuICAgICAgICBlbHNlIGlmIChcInRoZW5cIiBpbiB3YXNtIHx8IChcIlJlc3BvbnNlXCIgaW4gZ2xvYmFsVGhpcyAmJiB3YXNtIGluc3RhbmNlb2YgUmVzcG9uc2UpKVxyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmcod2FzbSwgeyAuLi5jb21iaW5lZEltcG9ydHMgfSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgKHdhc20gYXMgUm9sbHVwV2FzbVByb21pc2UpKGNvbWJpbmVkSW1wb3J0cyk7XHJcblxyXG4gICAgfSwgdW5ib3VuZEltcG9ydHMpXHJcbn1cclxuXHJcblxyXG4iLCAiXHJcbi8vIFRoZXNlIGNvbnN0YW50cyBhcmVuJ3QgZG9uZSBhcyBhbiBlbnVtIGJlY2F1c2UgOTUlIG9mIHRoZW0gYXJlIG5ldmVyIHJlZmVyZW5jZWQsXHJcbi8vIGJ1dCB0aGV5J2QgYWxtb3N0IGNlcnRhaW5seSBuZXZlciBiZSB0cmVlLXNoYWtlbiBvdXQuXHJcblxyXG4vKiogTm8gZXJyb3Igb2NjdXJyZWQuIFN5c3RlbSBjYWxsIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuICovICAgZXhwb3J0IGNvbnN0IEVTVUNDRVNTID0gICAgICAgICAwO1xyXG4vKiogQXJndW1lbnQgbGlzdCB0b28gbG9uZy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEUyQklHID0gICAgICAgICAgICAxO1xyXG4vKiogUGVybWlzc2lvbiBkZW5pZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBQ0NFUyA9ICAgICAgICAgICAyO1xyXG4vKiogQWRkcmVzcyBpbiB1c2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSSU5VU0UgPSAgICAgICAzO1xyXG4vKiogQWRkcmVzcyBub3QgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSTk9UQVZBSUwgPSAgICA0O1xyXG4vKiogQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRk5PU1VQUE9SVCA9ICAgICA1O1xyXG4vKiogUmVzb3VyY2UgdW5hdmFpbGFibGUsIG9yIG9wZXJhdGlvbiB3b3VsZCBibG9jay4gKi8gICAgICAgICAgZXhwb3J0IGNvbnN0IEVBR0FJTiA9ICAgICAgICAgICA2O1xyXG4vKiogQ29ubmVjdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBTFJFQURZID0gICAgICAgICA3O1xyXG4vKiogQmFkIGZpbGUgZGVzY3JpcHRvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCQURGID0gICAgICAgICAgICA4O1xyXG4vKiogQmFkIG1lc3NhZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCQURNU0cgPSAgICAgICAgICA5O1xyXG4vKiogRGV2aWNlIG9yIHJlc291cmNlIGJ1c3kuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCVVNZID0gICAgICAgICAgICAxMDtcclxuLyoqIE9wZXJhdGlvbiBjYW5jZWxlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ0FOQ0VMRUQgPSAgICAgICAgMTE7XHJcbi8qKiBObyBjaGlsZCBwcm9jZXNzZXMuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNISUxEID0gICAgICAgICAgIDEyO1xyXG4vKiogQ29ubmVjdGlvbiBhYm9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDT05OQUJPUlRFRCA9ICAgICAxMztcclxuLyoqIENvbm5lY3Rpb24gcmVmdXNlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQ09OTlJFRlVTRUQgPSAgICAgMTQ7XHJcbi8qKiBDb25uZWN0aW9uIHJlc2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5SRVNFVCA9ICAgICAgIDE1O1xyXG4vKiogUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVERUFETEsgPSAgICAgICAgICAxNjtcclxuLyoqIERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFREVTVEFERFJSRVEgPSAgICAgMTc7XHJcbi8qKiBNYXRoZW1hdGljcyBhcmd1bWVudCBvdXQgb2YgZG9tYWluIG9mIGZ1bmN0aW9uLiAqLyAgICAgICAgICBleHBvcnQgY29uc3QgRURPTSA9ICAgICAgICAgICAgIDE4O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVEUVVPVCA9ICAgICAgICAgICAxOTtcclxuLyoqIEZpbGUgZXhpc3RzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFRVhJU1QgPSAgICAgICAgICAgMjA7XHJcbi8qKiBCYWQgYWRkcmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUZBVUxUID0gICAgICAgICAgIDIxO1xyXG4vKiogRmlsZSB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVGQklHID0gICAgICAgICAgICAyMjtcclxuLyoqIEhvc3QgaXMgdW5yZWFjaGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSE9TVFVOUkVBQ0ggPSAgICAgMjM7XHJcbi8qKiBJZGVudGlmaWVyIHJlbW92ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlEUk0gPSAgICAgICAgICAgIDI0O1xyXG4vKiogSWxsZWdhbCBieXRlIHNlcXVlbmNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTFNFUSA9ICAgICAgICAgICAyNTtcclxuLyoqIE9wZXJhdGlvbiBpbiBwcm9ncmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU5QUk9HUkVTUyA9ICAgICAgMjY7XHJcbi8qKiBJbnRlcnJ1cHRlZCBmdW5jdGlvbi4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlOVFIgPSAgICAgICAgICAgIDI3O1xyXG4vKiogSW52YWxpZCBhcmd1bWVudC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTlZBTCA9ICAgICAgICAgICAyODtcclxuLyoqIEkvTyBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU8gPSAgICAgICAgICAgICAgMjk7XHJcbi8qKiBTb2NrZXQgaXMgY29ubmVjdGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlTQ09OTiA9ICAgICAgICAgIDMwO1xyXG4vKiogSXMgYSBkaXJlY3RvcnkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJU0RJUiA9ICAgICAgICAgICAzMTtcclxuLyoqIFRvbyBtYW55IGxldmVscyBvZiBzeW1ib2xpYyBsaW5rcy4gKi8gICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTE9PUCA9ICAgICAgICAgICAgMzI7XHJcbi8qKiBGaWxlIGRlc2NyaXB0b3IgdmFsdWUgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1GSUxFID0gICAgICAgICAgIDMzO1xyXG4vKiogVG9vIG1hbnkgbGlua3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNTElOSyA9ICAgICAgICAgICAzNDtcclxuLyoqIE1lc3NhZ2UgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTVNHU0laRSA9ICAgICAgICAgMzU7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1VTFRJSE9QID0gICAgICAgIDM2O1xyXG4vKiogRmlsZW5hbWUgdG9vIGxvbmcuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOQU1FVE9PTE9ORyA9ICAgICAzNztcclxuLyoqIE5ldHdvcmsgaXMgZG93bi4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkVURE9XTiA9ICAgICAgICAgMzg7XHJcbi8qKiBDb25uZWN0aW9uIGFib3J0ZWQgYnkgbmV0d29yay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVFJFU0VUID0gICAgICAgIDM5O1xyXG4vKiogTmV0d29yayB1bnJlYWNoYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORVRVTlJFQUNIID0gICAgICA0MDtcclxuLyoqIFRvbyBtYW55IGZpbGVzIG9wZW4gaW4gc3lzdGVtLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkZJTEUgPSAgICAgICAgICAgNDE7XHJcbi8qKiBObyBidWZmZXIgc3BhY2UgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PQlVGUyA9ICAgICAgICAgIDQyO1xyXG4vKiogTm8gc3VjaCBkZXZpY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0RFViA9ICAgICAgICAgICA0MztcclxuLyoqIE5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9FTlQgPSAgICAgICAgICAgNDQ7XHJcbi8qKiBFeGVjdXRhYmxlIGZpbGUgZm9ybWF0IGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PRVhFQyA9ICAgICAgICAgIDQ1O1xyXG4vKiogTm8gbG9ja3MgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0xDSyA9ICAgICAgICAgICA0NjtcclxuLyoqIFJlc2VydmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9MSU5LID0gICAgICAgICAgNDc7XHJcbi8qKiBOb3QgZW5vdWdoIHNwYWNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PTUVNID0gICAgICAgICAgIDQ4O1xyXG4vKiogTm8gbWVzc2FnZSBvZiB0aGUgZGVzaXJlZCB0eXBlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT01TRyA9ICAgICAgICAgICA0OTtcclxuLyoqIFByb3RvY29sIG5vdCBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9QUk9UT09QVCA9ICAgICAgNTA7XHJcbi8qKiBObyBzcGFjZSBsZWZ0IG9uIGRldmljZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PU1BDID0gICAgICAgICAgIDUxO1xyXG4vKiogRnVuY3Rpb24gbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1NZUyA9ICAgICAgICAgICA1MjtcclxuLyoqIFRoZSBzb2NrZXQgaXMgbm90IGNvbm5lY3RlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UQ09OTiA9ICAgICAgICAgNTM7XHJcbi8qKiBOb3QgYSBkaXJlY3Rvcnkgb3IgYSBzeW1ib2xpYyBsaW5rIHRvIGEgZGlyZWN0b3J5LiAqLyAgICAgICBleHBvcnQgY29uc3QgRU5PVERJUiA9ICAgICAgICAgIDU0O1xyXG4vKiogRGlyZWN0b3J5IG5vdCBlbXB0eS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RFTVBUWSA9ICAgICAgICA1NTtcclxuLyoqIFN0YXRlIG5vdCByZWNvdmVyYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UUkVDT1ZFUkFCTEUgPSAgNTY7XHJcbi8qKiBOb3QgYSBzb2NrZXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PVFNPQ0sgPSAgICAgICAgIDU3O1xyXG4vKiogTm90IHN1cHBvcnRlZCwgb3Igb3BlcmF0aW9uIG5vdCBzdXBwb3J0ZWQgb24gc29ja2V0LiAqLyAgICAgZXhwb3J0IGNvbnN0IEVOT1RTVVAgPSAgICAgICAgICA1ODtcclxuLyoqIEluYXBwcm9wcmlhdGUgSS9PIGNvbnRyb2wgb3BlcmF0aW9uLiAqLyAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UVFkgPSAgICAgICAgICAgNTk7XHJcbi8qKiBObyBzdWNoIGRldmljZSBvciBhZGRyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5YSU8gPSAgICAgICAgICAgIDYwO1xyXG4vKiogVmFsdWUgdG9vIGxhcmdlIHRvIGJlIHN0b3JlZCBpbiBkYXRhIHR5cGUuICovICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVPVkVSRkxPVyA9ICAgICAgICA2MTtcclxuLyoqIFByZXZpb3VzIG93bmVyIGRpZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFT1dORVJERUFEID0gICAgICAgNjI7XHJcbi8qKiBPcGVyYXRpb24gbm90IHBlcm1pdHRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBFUk0gPSAgICAgICAgICAgIDYzO1xyXG4vKiogQnJva2VuIHBpcGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQSVBFID0gICAgICAgICAgICA2NDtcclxuLyoqIFByb3RvY29sIGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE8gPSAgICAgICAgICAgNjU7XHJcbi8qKiBQcm90b2NvbCBub3Qgc3VwcG9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBST1RPTk9TVVBQT1JUID0gIDY2O1xyXG4vKiogUHJvdG9jb2wgd3JvbmcgdHlwZSBmb3Igc29ja2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQUk9UT1RZUEUgPSAgICAgICA2NztcclxuLyoqIFJlc3VsdCB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUkFOR0UgPSAgICAgICAgICAgNjg7XHJcbi8qKiBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVJPRlMgPSAgICAgICAgICAgIDY5O1xyXG4vKiogSW52YWxpZCBzZWVrLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVTUElQRSA9ICAgICAgICAgICA3MDtcclxuLyoqIE5vIHN1Y2ggcHJvY2Vzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1JDSCA9ICAgICAgICAgICAgNzE7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVNUQUxFID0gICAgICAgICAgIDcyO1xyXG4vKiogQ29ubmVjdGlvbiB0aW1lZCBvdXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVUSU1FRE9VVCA9ICAgICAgICA3MztcclxuLyoqIFRleHQgZmlsZSBidXN5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFVFhUQlNZID0gICAgICAgICAgNzQ7XHJcbi8qKiBDcm9zcy1kZXZpY2UgbGluay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVhERVYgPSAgICAgICAgICAgIDc1O1xyXG4vKiogRXh0ZW5zaW9uOiBDYXBhYmlsaXRpZXMgaW5zdWZmaWNpZW50LiAqLyAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RDQVBBQkxFID0gICAgICA3NjsiLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQ2NChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogUG9pbnRlcjxudW1iZXI+LCB2YWx1ZTogYmlnaW50KTogdm9pZCB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LnNldEJpZ1VpbnQ2NChwdHIsIHZhbHVlLCB0cnVlKTsgfVxyXG4iLCAiaW1wb3J0IHsgRUlOVkFMLCBFTk9TWVMsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50NjQgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50NjQuanNcIjtcclxuXHJcbmV4cG9ydCBlbnVtIENsb2NrSWQge1xyXG4gICAgUkVBTFRJTUUgPSAwLFxyXG4gICAgTU9OT1RPTklDID0gMSxcclxuICAgIFBST0NFU1NfQ1BVVElNRV9JRCA9IDIsXHJcbiAgICBUSFJFQURfQ1BVVElNRV9JRCA9IDNcclxufVxyXG5cclxuY29uc3QgcCA9IChnbG9iYWxUaGlzLnBlcmZvcm1hbmNlKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbG9ja190aW1lX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgY2xrX2lkOiBudW1iZXIsIF9wcmVjaXNpb246IG51bWJlciwgb3V0UHRyOiBudW1iZXIpOiBudW1iZXIge1xyXG5cclxuICAgIGxldCBub3dNczogbnVtYmVyO1xyXG4gICAgc3dpdGNoIChjbGtfaWQpIHtcclxuICAgICAgICBjYXNlIENsb2NrSWQuUkVBTFRJTUU6XHJcbiAgICAgICAgICAgIG5vd01zID0gRGF0ZS5ub3coKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLk1PTk9UT05JQzpcclxuICAgICAgICAgICAgaWYgKHAgPT0gbnVsbCkgcmV0dXJuIEVOT1NZUzsgICAvLyBUT0RPOiBQb3NzaWJsZSB0byBiZSBudWxsIGluIFdvcmtsZXRzP1xyXG4gICAgICAgICAgICBub3dNcyA9IHAubm93KCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgQ2xvY2tJZC5QUk9DRVNTX0NQVVRJTUVfSUQ6XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLlRIUkVBRF9DUFVUSU1FX0lEOlxyXG4gICAgICAgICAgICByZXR1cm4gRU5PU1lTO1xyXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBFSU5WQUw7XHJcbiAgICB9XHJcbiAgICBjb25zdCBub3dOcyA9IEJpZ0ludChNYXRoLnJvdW5kKG5vd01zICogMTAwMCAqIDEwMDApKTtcclxuICAgIHdyaXRlVWludDY0KHRoaXMsIG91dFB0ciwgbm93TnMpO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW52aXJvbl9nZXQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGVudmlyb25Db3VudE91dHB1dDogUG9pbnRlcjxQb2ludGVyPG51bWJlcj4+LCBlbnZpcm9uU2l6ZU91dHB1dDogUG9pbnRlcjxudW1iZXI+KSB7XHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBlbnZpcm9uQ291bnRPdXRwdXQsIDApO1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvblNpemVPdXRwdXQsIDApO1xyXG5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW52aXJvbl9zaXplc19nZXQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGVudmlyb25Db3VudE91dHB1dDogUG9pbnRlcjxQb2ludGVyPG51bWJlcj4+LCBlbnZpcm9uU2l6ZU91dHB1dDogUG9pbnRlcjxudW1iZXI+KSB7XHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBlbnZpcm9uQ291bnRPdXRwdXQsIDApO1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvblNpemVPdXRwdXQsIDApO1xyXG5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYC4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcImZkX2Nsb3NlXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQT1NJWCBjbG9zZSAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfY2xvc2UodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGZkOiBGaWxlRGVzY3JpcHRvcik6IHZvaWQge1xyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50KGZkKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDMyLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElvdmVjIHtcclxuICAgIGJ1ZmZlclN0YXJ0OiBudW1iZXI7XHJcbiAgICBidWZmZXJMZW5ndGg6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKGluZm86IEluc3RhbnRpYXRlZFdhc2k8e30+LCBwdHI6IG51bWJlcik6IElvdmVjIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYnVmZmVyU3RhcnQ6IHJlYWRQb2ludGVyKGluZm8sIHB0ciksXHJcbiAgICAgICAgYnVmZmVyTGVuZ3RoOiByZWFkVWludDMyKGluZm8sIHB0ciArIGdldFBvaW50ZXJTaXplKGluZm8pKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24qIHBhcnNlQXJyYXkoaW5mbzogSW5zdGFudGlhdGVkV2FzaTx7fT4sIHB0cjogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogR2VuZXJhdG9yPElvdmVjLCB2b2lkLCB2b2lkPiB7XHJcbiAgICBjb25zdCBzaXplb2ZTdHJ1Y3QgPSBnZXRQb2ludGVyU2l6ZShpbmZvKSArIDQ7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcclxuICAgICAgICB5aWVsZCBwYXJzZShpbmZvLCBwdHIgKyAoaSAqIHNpemVvZlN0cnVjdCkpXHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IHR5cGUgSW92ZWMsIHBhcnNlQXJyYXkgfSBmcm9tIFwiLi4vX3ByaXZhdGUvaW92ZWMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uL2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50OCB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQ4LmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYCwgd2l0aCBvdGhlcnMgaGFuZGxlZCB3aXRoIHRoZSB2YXJpb3VzIGZpbGUtb3BlbmluZyBjYWxscy4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcblxyXG4gICAgcmVxdWVzdGVkQnVmZmVyczogSW92ZWNbXTtcclxuXHJcbiAgICByZWFkSW50b01lbW9yeShidWZmZXJzOiAoVWludDhBcnJheSlbXSk6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50RGV0YWlsPiB7XHJcbiAgICBwcml2YXRlIF9ieXRlc1dyaXR0ZW4gPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGltcGw6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBmaWxlRGVzY3JpcHRvcjogbnVtYmVyLCByZXF1ZXN0ZWRCdWZmZXJJbmZvOiBJb3ZlY1tdKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9yZWFkXCIsIHtcclxuICAgICAgICAgICAgYnViYmxlczogZmFsc2UsXHJcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIGRldGFpbDoge1xyXG4gICAgICAgICAgICAgICAgZmlsZURlc2NyaXB0b3IsXHJcbiAgICAgICAgICAgICAgICByZXF1ZXN0ZWRCdWZmZXJzOiByZXF1ZXN0ZWRCdWZmZXJJbmZvLFxyXG4gICAgICAgICAgICAgICAgcmVhZEludG9NZW1vcnk6IChpbnB1dEJ1ZmZlcnMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAxMDAlIHVudGVzdGVkLCBwcm9iYWJseSBkb2Vzbid0IHdvcmsgaWYgSSdtIGJlaW5nIGhvbmVzdFxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVxdWVzdGVkQnVmZmVySW5mby5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA+PSBpbnB1dEJ1ZmZlcnMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGlucHV0QnVmZmVyc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBNYXRoLm1pbihidWZmZXIuYnl0ZUxlbmd0aCwgaW5wdXRCdWZmZXJzW2pdLmJ5dGVMZW5ndGgpOyArK2opIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlVWludDgoaW1wbCwgcmVxdWVzdGVkQnVmZmVySW5mb1tpXS5idWZmZXJTdGFydCArIGosIGJ1ZmZlcltqXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK3RoaXMuX2J5dGVzV3JpdHRlbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYnl0ZXNXcml0dGVuKCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J5dGVzV3JpdHRlbjtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVuaGFuZGxlZEZpbGVSZWFkRXZlbnQgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihmZDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYFVuaGFuZGxlZCByZWFkIHRvIGZpbGUgZGVzY3JpcHRvciAjJHtmZH0uYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG4vKiogUE9TSVggcmVhZHYgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX3JlYWQodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpIHtcclxuXHJcbiAgICBsZXQgbldyaXR0ZW4gPSAwO1xyXG4gICAgY29uc3QgZ2VuID0gcGFyc2VBcnJheSh0aGlzLCBpb3YsIGlvdmNudCk7XHJcblxyXG4gICAgLy8gR2V0IGFsbCB0aGUgZGF0YSB0byByZWFkIGluIGl0cyBzZXBhcmF0ZSBidWZmZXJzXHJcbiAgICAvL2NvbnN0IGFzVHlwZWRBcnJheXMgPSBbLi4uZ2VuXS5tYXAoKHsgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCB9KSA9PiB7IG5Xcml0dGVuICs9IGJ1ZmZlckxlbmd0aDsgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuZ2V0TWVtb3J5KCkuYnVmZmVyLCBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoKSB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudCh0aGlzLCBmZCwgWy4uLmdlbl0pO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBuV3JpdHRlbiA9IDA7XHJcbiAgICAgICAgLyppZiAoZmQgPT0gMCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gZXJyb3Juby5iYWRmOyovXHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBuV3JpdHRlbiA9IGV2ZW50LmJ5dGVzV3JpdHRlbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHdyaXRlVWludDMyKHRoaXMsIHBudW0sIG5Xcml0dGVuKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG5cclxuXHJcbmNvbnN0IHRleHREZWNvZGVycyA9IG5ldyBNYXA8c3RyaW5nLCBUZXh0RGVjb2Rlcj4oKTtcclxuZnVuY3Rpb24gZ2V0VGV4dERlY29kZXIobGFiZWw6IHN0cmluZykge1xyXG4gICAgbGV0IHJldDogVGV4dERlY29kZXIgfCB1bmRlZmluZWQgPSB0ZXh0RGVjb2RlcnMuZ2V0KGxhYmVsKTtcclxuICAgIGlmICghcmV0KSB7XHJcbiAgICAgICAgcmV0ID0gbmV3IFRleHREZWNvZGVyKGxhYmVsKTtcclxuICAgICAgICB0ZXh0RGVjb2RlcnMuc2V0KGxhYmVsLCByZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbn0iLCAiaW1wb3J0IHsgRUJBREYsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yLCBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYC4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclNlZWtFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9zZWVrXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQT1NJWCBsc2VlayAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfc2Vlayh0aGlzOiBJbnN0YW50aWF0ZWRXYXNpPHt9PiwgZmQ6IEZpbGVEZXNjcmlwdG9yLCBvZmZzZXQ6IG51bWJlciwgd2hlbmNlOiBudW1iZXIsIG9mZnNldE91dDogUG9pbnRlcjxudW1iZXI+KTogdHlwZW9mIEVCQURGIHwgdHlwZW9mIEVTVUNDRVNTIHtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50KGZkKSkpIHtcclxuICAgICAgICBzd2l0Y2ggKGZkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gRUJBREY7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIEVTVUNDRVNTO1xyXG59XHJcbiIsICJpbXBvcnQgeyBwYXJzZUFycmF5IH0gZnJvbSBcIi4uL19wcml2YXRlL2lvdmVjLmpzXCI7XHJcbmltcG9ydCB7IEVCQURGLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKiBcclxuICAgICAqIEl0J3MgbW9yZS1vci1sZXNzIFt1bml2ZXJzYWxseSBleHBlY3RlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3RhbmRhcmRfc3RyZWFtKSB0aGF0IDAgaXMgZm9yIGlucHV0LCAxIGZvciBvdXRwdXQsIGFuZCAyIGZvciBlcnJvcnMsXHJcbiAgICAgKiBzbyB5b3UgY2FuIG1hcCAxIHRvIGBjb25zb2xlLmxvZ2AgYW5kIDIgdG8gYGNvbnNvbGUuZXJyb3JgLCB3aXRoIG90aGVycyBoYW5kbGVkIHdpdGggdGhlIHZhcmlvdXMgZmlsZS1vcGVuaW5nIGNhbGxzLiBcclxuICAgICAqL1xyXG4gICAgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxuICAgIGRhdGE6IFVpbnQ4QXJyYXlbXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoZmlsZURlc2NyaXB0b3I6IG51bWJlciwgZGF0YTogVWludDhBcnJheVtdKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF93cml0ZVwiLCB7IGJ1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZGF0YSwgZmlsZURlc2NyaXB0b3IgfSB9KTtcclxuICAgIH1cclxuICAgIGFzU3RyaW5nKGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRldGFpbC5kYXRhLm1hcCgoZCwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGRlY29kZWQgPSBnZXRUZXh0RGVjb2RlcihsYWJlbCkuZGVjb2RlKGQpO1xyXG4gICAgICAgICAgICBpZiAoZGVjb2RlZCA9PSBcIlxcMFwiICYmIGluZGV4ID09IHRoaXMuZGV0YWlsLmRhdGEubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlZDtcclxuICAgICAgICB9KS5qb2luKFwiXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5oYW5kbGVkRmlsZVdyaXRlRXZlbnQgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihmZDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYFVuaGFuZGxlZCB3cml0ZSB0byBmaWxlIGRlc2NyaXB0b3IgIyR7ZmR9LmApO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqIFBPU0lYIHdyaXRldiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfd3JpdGUodGhpczogSW5zdGFudGlhdGVkV2FzaTx7fT4sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpOiB0eXBlb2YgRVNVQ0NFU1MgfCB0eXBlb2YgRUJBREYge1xyXG5cclxuICAgIGxldCBuV3JpdHRlbiA9IDA7XHJcbiAgICBjb25zdCBnZW4gPSBwYXJzZUFycmF5KHRoaXMsIGlvdiwgaW92Y250KTtcclxuXHJcbiAgICAvLyBHZXQgYWxsIHRoZSBkYXRhIHRvIHdyaXRlIGluIGl0cyBzZXBhcmF0ZSBidWZmZXJzXHJcbiAgICBjb25zdCBhc1R5cGVkQXJyYXlzID0gWy4uLmdlbl0ubWFwKCh7IGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGggfSkgPT4geyBuV3JpdHRlbiArPSBidWZmZXJMZW5ndGg7IHJldHVybiBuZXcgVWludDhBcnJheSh0aGlzLmNhY2hlZE1lbW9yeVZpZXcuYnVmZmVyLCBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoKSB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnQoZmQsIGFzVHlwZWRBcnJheXMpO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBjb25zdCBzdHIgPSBldmVudC5hc1N0cmluZyhcInV0Zi04XCIpO1xyXG4gICAgICAgIGlmIChmZCA9PSAxKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzdHIpO1xyXG4gICAgICAgIGVsc2UgaWYgKGZkID09IDIpXHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3Ioc3RyKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBFQkFERjtcclxuICAgIH1cclxuXHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBwbnVtLCBuV3JpdHRlbik7XHJcblxyXG4gICAgcmV0dXJuIEVTVUNDRVNTO1xyXG59XHJcblxyXG5cclxuY29uc3QgdGV4dERlY29kZXJzID0gbmV3IE1hcDxzdHJpbmcsIFRleHREZWNvZGVyPigpO1xyXG5mdW5jdGlvbiBnZXRUZXh0RGVjb2RlcihsYWJlbDogc3RyaW5nKSB7XHJcbiAgICBsZXQgcmV0OiBUZXh0RGVjb2RlciB8IHVuZGVmaW5lZCA9IHRleHREZWNvZGVycy5nZXQobGFiZWwpO1xyXG4gICAgaWYgKCFyZXQpIHtcclxuICAgICAgICByZXQgPSBuZXcgVGV4dERlY29kZXIobGFiZWwpO1xyXG4gICAgICAgIHRleHREZWNvZGVycy5zZXQobGFiZWwsIHJldCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc2kgfSBmcm9tIFwiLi4vaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQWJvcnRFdmVudERldGFpbCB7XHJcbiAgICBjb2RlOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBYm9ydEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8QWJvcnRFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIGNvZGU6bnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJwcm9jX2V4aXRcIiwgeyBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogeyBjb2RlIH0gfSk7XHJcbiAgICB9XHJcbiAgICBcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFib3J0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3Rvcihjb2RlOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihgYWJvcnQoJHtjb2RlfSkgd2FzIGNhbGxlZGApO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvY19leGl0KHRoaXM6IEluc3RhbnRpYXRlZFdhc2k8e30+LCBjb2RlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQWJvcnRFdmVudChjb2RlKSk7XHJcbiAgICB0aHJvdyBuZXcgQWJvcnRFcnJvcihjb2RlKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgYWxpZ25mYXVsdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9hbGlnbmZhdWx0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9ib29sIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHkgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsIF9lbXZhbF9kZWNyZWYsIF9lbXZhbF90YWtlX3ZhbHVlIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9lbXZhbC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2VudW0sIF9lbWJpbmRfcmVnaXN0ZXJfZW51bV92YWx1ZSwgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mdW5jdGlvbiB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXkuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QsIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdF9maWVsZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdm9pZC5qc1wiO1xyXG5pbXBvcnQgeyBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGguanNcIjtcclxuaW1wb3J0IHsgc2VnZmF1bHQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvc2VnZmF1bHQuanNcIjtcclxuaW1wb3J0IHsgX190aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS5qc1wiO1xyXG5pbXBvcnQgeyBfdHpzZXRfanMgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvdHpzZXRfanMuanNcIjtcclxuaW1wb3J0IHsgaW5zdGFudGlhdGUgYXMgaSB9IGZyb20gXCIuLi8uLi9kaXN0L2luc3RhbnRpYXRlLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzaSB9IGZyb20gXCIuLi8uLi9kaXN0L2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGNsb2NrX3RpbWVfZ2V0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9jbG9ja190aW1lX2dldC5qc1wiO1xyXG5pbXBvcnQgeyBlbnZpcm9uX2dldCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9nZXQuanNcIjtcclxuaW1wb3J0IHsgZW52aXJvbl9zaXplc19nZXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fc2l6ZXNfZ2V0LmpzXCI7XHJcbmltcG9ydCB7IGZkX2Nsb3NlIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9jbG9zZS5qc1wiO1xyXG5pbXBvcnQgeyBmZF9yZWFkIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9yZWFkLmpzXCI7XHJcbmltcG9ydCB7IGZkX3NlZWsgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3NlZWsuanNcIjtcclxuaW1wb3J0IHsgZmRfd3JpdGUgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3dyaXRlLmpzXCI7XHJcbmltcG9ydCB7IHByb2NfZXhpdCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvcHJvY19leGl0LmpzXCI7XHJcblxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgS25vd25JbnN0YW5jZUV4cG9ydHMge1xyXG4gICAgcHJpbnRUZXN0KCk6IG51bWJlcjtcclxuICAgIHJldmVyc2VJbnB1dCgpOiBudW1iZXI7XHJcbiAgICBnZXRSYW5kb21OdW1iZXIoKTogbnVtYmVyO1xyXG4gICAgZ2V0S2V5KCk6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlKHdoZXJlOiBzdHJpbmcsIHVuaW5zdGFudGlhdGVkPzogQXJyYXlCdWZmZXIpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc2k8S25vd25JbnN0YW5jZUV4cG9ydHM+PiB7XHJcblxyXG4gICAgbGV0IHdhc20gPSBhd2FpdCBpPEtub3duSW5zdGFuY2VFeHBvcnRzPih1bmluc3RhbnRpYXRlZCA/PyBmZXRjaChuZXcgVVJMKFwid2FzbS53YXNtXCIsIGltcG9ydC5tZXRhLnVybCkpLCB7XHJcbiAgICAgICAgZW52OiB7XHJcbiAgICAgICAgICAgIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UsXHJcbiAgICAgICAgICAgIGVtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9ib29sLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCxcclxuICAgICAgICAgICAgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9hcnJheSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9lbnVtLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUsXHJcbiAgICAgICAgICAgIF9lbXZhbF90YWtlX3ZhbHVlLFxyXG4gICAgICAgICAgICBfZW12YWxfZGVjcmVmLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSxcclxuICAgICAgICAgICAgX3R6c2V0X2pzLFxyXG4gICAgICAgICAgICBzZWdmYXVsdCxcclxuICAgICAgICAgICAgYWxpZ25mYXVsdCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdhc2lfc25hcHNob3RfcHJldmlldzE6IHtcclxuICAgICAgICAgICAgZmRfY2xvc2UsXHJcbiAgICAgICAgICAgIGZkX3JlYWQsXHJcbiAgICAgICAgICAgIGZkX3NlZWssXHJcbiAgICAgICAgICAgIGZkX3dyaXRlLFxyXG4gICAgICAgICAgICBlbnZpcm9uX2dldCxcclxuICAgICAgICAgICAgZW52aXJvbl9zaXplc19nZXQsXHJcbiAgICAgICAgICAgIHByb2NfZXhpdCxcclxuICAgICAgICAgICAgY2xvY2tfdGltZV9nZXRcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICB3YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJmZF93cml0ZVwiLCBlID0+IHtcclxuICAgICAgICBpZiAoZS5kZXRhaWwuZmlsZURlc2NyaXB0b3IgPT0gMSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZS5hc1N0cmluZyhcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJHt3aGVyZX06ICR7dmFsdWV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHdhc207XHJcbn1cclxuIiwgImltcG9ydCBcIi4vd29ya2xldC1wb2x5ZmlsbC5qc1wiO1xyXG5cclxuLy9pbXBvcnQgXCJjb3JlLWpzXCI7XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQ29tbGluayBmcm9tIFwiY29tbGlua1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNpIH0gZnJvbSBcIi4uLy4uL2Rpc3QvaW5zdGFudGlhdGVkLXdhc2kuanNcIjtcclxuaW1wb3J0IHsgaW5zdGFudGlhdGUsIEtub3duSW5zdGFuY2VFeHBvcnRzIH0gZnJvbSBcIi4vaW5zdGFudGlhdGUuanNcIjtcclxuXHJcblxyXG5cclxuLy8gVGVzdGluZyBhbiBhdWRpbyB3b3JrbGV0IGlzIGEgbGl0dGxlIHRvdWdoIGJlY2F1c2VcclxuLy8gdGhleSBkb24ndCBoYXZlIGBmZXRjaGAsIGRvbid0IGhhdmUgYEV2ZW50YCAoaW4gc29tZSBlbnZpcm9ubWVudHMpLCBldGMuLi5cclxuXHJcbmxldCB7IHByb21pc2U6IHVuaW5zdGFudGlhdGVkV2FzbSwgcmVzb2x2ZTogcmVzb2x2ZVVuaW5zdGFudGlhdGVkV2FzbSB9ID0gUHJvbWlzZS53aXRoUmVzb2x2ZXJzPEFycmF5QnVmZmVyPigpO1xyXG5cclxuXHJcblxyXG5sZXQgd2FzbTogSW5zdGFudGlhdGVkV2FzaTxLbm93bkluc3RhbmNlRXhwb3J0cz4gPSBudWxsITtcclxuXHJcbnVuaW5zdGFudGlhdGVkV2FzbS50aGVuKGJpbmFyeSA9PiBpbnN0YW50aWF0ZShcIldvcmtsZXRcIiwgYmluYXJ5KS50aGVuKHcgPT4gd2FzbSA9IHcpKTtcclxuXHJcbmNsYXNzIFJhbmRvbU5vaXNlUHJvY2Vzc29yIGV4dGVuZHMgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgQ29tbGluay5leHBvc2Uoe1xyXG4gICAgICAgICAgICBwcm92aWRlV2FzbShkYXRhOiBBcnJheUJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVVuaW5zdGFudGlhdGVkV2FzbShkYXRhKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXhlY3V0ZShzdHI6IHN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJ3YXNtXCIsIHN0cikpKHdhc20pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgdGhpcy5wb3J0KTtcclxuXHJcbiAgICB9XHJcbiAgICBwcm9jZXNzKGlucHV0czogRmxvYXQzMkFycmF5W11bXSwgb3V0cHV0czogRmxvYXQzMkFycmF5W11bXSwgcGFyYW1ldGVyczogUmVjb3JkPHN0cmluZywgRmxvYXQzMkFycmF5Pikge1xyXG4gICAgICAgIGlmICh3YXNtKSB7XHJcbiAgICAgICAgICAgIG91dHB1dHNbMF0uZm9yRWFjaCgoY2hhbm5lbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGFubmVsLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbFtpXSA9ICh3YXNtLmV4cG9ydHMuZ2V0UmFuZG9tTnVtYmVyKCkgKiAyIC0gMSkgLyAxMDAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5yZWdpc3RlclByb2Nlc3NvcihcInJhbmRvbS1ub2lzZS1wcm9jZXNzb3JcIiwgUmFuZG9tTm9pc2VQcm9jZXNzb3IpO1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuaW50ZXJmYWNlIEF1ZGlvV29ya2xldFByb2Nlc3NvciB7XHJcbiAgICByZWFkb25seSBwb3J0OiBNZXNzYWdlUG9ydDtcclxufVxyXG5cclxuaW50ZXJmYWNlIEF1ZGlvV29ya2xldFByb2Nlc3NvckltcGwgZXh0ZW5kcyBBdWRpb1dvcmtsZXRQcm9jZXNzb3Ige1xyXG4gICAgcHJvY2VzcyhcclxuICAgICAgICBpbnB1dHM6IEZsb2F0MzJBcnJheVtdW10sXHJcbiAgICAgICAgb3V0cHV0czogRmxvYXQzMkFycmF5W11bXSxcclxuICAgICAgICBwYXJhbWV0ZXJzOiBSZWNvcmQ8c3RyaW5nLCBGbG9hdDMyQXJyYXk+XHJcbiAgICApOiBib29sZWFuO1xyXG59XHJcblxyXG5kZWNsYXJlIHZhciBBdWRpb1dvcmtsZXRQcm9jZXNzb3I6IHtcclxuICAgIHByb3RvdHlwZTogQXVkaW9Xb3JrbGV0UHJvY2Vzc29yO1xyXG4gICAgbmV3KG9wdGlvbnM/OiBBdWRpb1dvcmtsZXROb2RlT3B0aW9ucyk6IEF1ZGlvV29ya2xldFByb2Nlc3NvcjtcclxufTtcclxuXHJcbnR5cGUgQXVkaW9QYXJhbURlc2NyaXB0b3IgPSB7XHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICBhdXRvbWF0aW9uUmF0ZTogQXV0b21hdGlvblJhdGUsXHJcbiAgICBtaW5WYWx1ZTogbnVtYmVyLFxyXG4gICAgbWF4VmFsdWU6IG51bWJlcixcclxuICAgIGRlZmF1bHRWYWx1ZTogbnVtYmVyXHJcbn1cclxuXHJcbmludGVyZmFjZSBBdWRpb1dvcmtsZXRQcm9jZXNzb3JDb25zdHJ1Y3RvciB7XHJcbiAgICBuZXcob3B0aW9ucz86IEF1ZGlvV29ya2xldE5vZGVPcHRpb25zKTogQXVkaW9Xb3JrbGV0UHJvY2Vzc29ySW1wbDtcclxuICAgIHBhcmFtZXRlckRlc2NyaXB0b3JzPzogQXVkaW9QYXJhbURlc2NyaXB0b3JbXTtcclxufVxyXG5cclxuZGVjbGFyZSBmdW5jdGlvbiByZWdpc3RlclByb2Nlc3NvcihcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHByb2Nlc3NvckN0b3I6IEF1ZGlvV29ya2xldFByb2Nlc3Nv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Q3JELGNBQWM7QUFDVixVQUFNO0FBQ04sSUFBUSxPQUFPO0FBQUEsTUFDWCxZQUFZLE1BQW1CO0FBQzNCLGtDQUEwQixJQUFJO0FBQUEsTUFDbEM7QUFBQSxNQUNBLFFBQVEsS0FBYTtBQUNqQixlQUFRLElBQUksU0FBUyxRQUFRLEdBQUcsRUFBRyxJQUFJO0FBQUEsTUFDM0M7QUFBQSxJQUNKLEdBQUcsS0FBSyxJQUFJO0FBQUEsRUFFaEI7QUFBQSxFQUNBLFFBQVEsUUFBMEIsU0FBMkIsWUFBMEM7QUFDbkcsUUFBSSxNQUFNO0FBQ04sY0FBUSxDQUFDLEVBQUUsUUFBUSxDQUFDLFlBQVk7QUFDNUIsaUJBQVMsSUFBSSxHQUFHLElBQUksUUFBUSxRQUFRLEtBQUs7QUFDckMsa0JBQVEsQ0FBQyxLQUFLLEtBQUssUUFBUSxnQkFBZ0IsSUFBSSxJQUFJLEtBQUs7QUFBQSxRQUM1RDtBQUFBLE1BQ0osQ0FBQztBQUFBLElBQ0w7QUFDQSxXQUFPO0FBQUEsRUFDWDtBQUNKO0FBR0Esa0JBQWtCLDBCQUEwQixvQkFBb0I7IiwKICAibmFtZXMiOiBbIkV2ZW50IiwgIkV2ZW50IiwgIkN1c3RvbUV2ZW50IiwgIlREIiwgIm9iaiIsICJyZXR1cm5WYWx1ZSIsICJwcm94eSIsICJwIiwgImpzVmFsdWUiLCAid2lyZVZhbHVlIiwgInN0YWNrRGVzdHJ1Y3RvciIsICJwIiwgIndhc20iLCAiQ2xvY2tJZCIsICJpbnN0YW50aWF0ZSIsICJ3YXNtIiwgImluc3RhbnRpYXRlIl0KfQo=
