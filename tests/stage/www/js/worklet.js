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
    let wasm2;
    let module;
    let instance;
    wasm2 = new _InstantiatedWasm();
    const imports = {
      wasi_snapshot_preview1: bindAllFuncs(wasm2, wasi_snapshot_preview1),
      env: bindAllFuncs(wasm2, env),
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
    wasm2.instance = instance;
    wasm2.module = module;
    wasm2.exports = wasm2.instance.exports;
    wasm2.cachedMemoryView = new DataView(wasm2.exports.memory.buffer);
    console.assert("_initialize" in wasm2.instance.exports != "_start" in wasm2.instance.exports, `Expected either _initialize XOR _start to be exported from this WASM.`);
    if ("_initialize" in wasm2.instance.exports)
      wasm2.instance.exports._initialize();
    else if ("_start" in wasm2.instance.exports)
      wasm2.instance.exports._start();
    await awaitAllEmbind();
    return wasm2;
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
  let wasm2 = await InstantiatedWasm.instantiate(uninstantiated ?? fetch(new URL("wasm.wasm", import.meta.url)), {
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
uninstantiatedWasm.then((binary) => instantiate("Worklet", binary).then((w) => wasm = w));
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc3JjL3BvbHlmaWxsL2V2ZW50LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9wb2x5ZmlsbC9jdXN0b20tZXZlbnQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3BvbHlmaWxsL3RleHQtZGVjb2Rlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvcG9seWZpbGwvdGV4dC1lbmNvZGVyLnRzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9jb21saW5rQDQuNC4xL25vZGVfbW9kdWxlcy9jb21saW5rL3NyYy9jb21saW5rLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDMyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL3N0cmluZy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNtLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvYWxpZ25mYXVsdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2dldC10eXBlLWluZm8udHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfYm9vbC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1uYW1lZC1mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9nZXQtdGFibGUtZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL2lzLTY0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3BvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC1wb2ludGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9lbXZhbC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9lbnVtLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvc2l6ZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC1zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS1zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50MTYudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDMyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQ4LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3QudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfdm9pZC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9zZWdmYXVsdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZXhjZXB0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi90enNldF9qcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZXJybm8udHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDY0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Nsb2NrX3RpbWVfZ2V0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fZ2V0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fc2l6ZXNfZ2V0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX2Nsb3NlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9pb3ZlYy50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9yZWFkLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3NlZWsudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfd3JpdGUudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvcHJvY19leGl0LnRzIiwgIi4uLy4uL2luc3RhbnRpYXRlLnRzIiwgIi4uLy4uL3dvcmtsZXQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIlxyXG4vLyBQb2x5ZmlsbCBmb3IgZXh0cmVtZWx5IGxpbWl0ZWQgZW52aXJvbm1lbnRzLCBsaWtlIFdvcmtsZXRzLlxyXG4vLyBUaGlzIHNlZW1zIHRvIGV4aXN0IGluIENocm9tZSBidXQgbm90LCBlLmcuLCBGaXJlZm94LCBwb3NzaWJseSBTYWZhcmlcclxuLy8gVE9ETzogVGhpcyBpcyB0aW55LCBidXQgYSB3YXkgdG8gb3B0aW1pemUgaXQgb3V0IGZvciBlbnZpcm9ubWVudHMgdGhhdCAqZG8qIGhhdmUgYEV2ZW50YCB3b3VsZCBiZSBuaWNlLi4uXHJcbmNsYXNzIEV2ZW50IHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlXzogc3RyaW5nLCBldmVudEluaXREaWN0PzogRXZlbnRJbml0KSB7XHJcbiAgICAgICAgdGhpcy5idWJibGVzID0gZXZlbnRJbml0RGljdD8uYnViYmxlcyB8fCBmYWxzZTtcclxuICAgICAgICB0aGlzLmNhbmNlbEJ1YmJsZSA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY2FuY2VsYWJsZSA9IGV2ZW50SW5pdERpY3Q/LmNhbmNlbGFibGUgfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5jb21wb3NlZCA9IGV2ZW50SW5pdERpY3Q/LmNvbXBvc2VkIHx8IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY3VycmVudFRhcmdldCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5kZWZhdWx0UHJldmVudGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5ldmVudFBoYXNlID0gRXZlbnQuTk9ORTtcclxuICAgICAgICB0aGlzLmlzVHJ1c3RlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc3JjRWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMudGltZVN0YW1wID0gMDtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlXztcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgTk9ORSA9IDA7XHJcbiAgICBzdGF0aWMgQ0FQVFVSSU5HX1BIQVNFID0gMTtcclxuICAgIHN0YXRpYyBBVF9UQVJHRVQgPSAyO1xyXG4gICAgc3RhdGljIEJVQkJMSU5HX1BIQVNFID0gMztcclxuXHJcbiAgICBidWJibGVzOiBib29sZWFuO1xyXG4gICAgY2FuY2VsQnViYmxlOiBib29sZWFuO1xyXG4gICAgY2FuY2VsYWJsZTogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IGNvbXBvc2VkOiBib29sZWFuO1xyXG4gICAgcmVhZG9ubHkgY3VycmVudFRhcmdldDogRXZlbnRUYXJnZXQgfCBudWxsO1xyXG4gICAgZGVmYXVsdFByZXZlbnRlZDogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IGV2ZW50UGhhc2U6IG51bWJlcjtcclxuICAgIHJlYWRvbmx5IGlzVHJ1c3RlZDogYm9vbGVhbjtcclxuICAgIHJldHVyblZhbHVlOiBib29sZWFuO1xyXG4gICAgcmVhZG9ubHkgc3JjRWxlbWVudDogRXZlbnRUYXJnZXQgfCBudWxsO1xyXG4gICAgcmVhZG9ubHkgdGFyZ2V0OiBFdmVudFRhcmdldCB8IG51bGw7XHJcbiAgICByZWFkb25seSB0aW1lU3RhbXA6IERPTUhpZ2hSZXNUaW1lU3RhbXA7XHJcbiAgICB0eXBlOiBzdHJpbmc7XHJcbiAgICBjb21wb3NlZFBhdGgoKTogRXZlbnRUYXJnZXRbXSB7IHJldHVybiBbXSB9XHJcbiAgICBpbml0RXZlbnQodHlwZV86IHN0cmluZywgYnViYmxlcz86IGJvb2xlYW4sIGNhbmNlbGFibGU/OiBib29sZWFuKTogdm9pZCB7IHRoaXMudHlwZSA9IHR5cGVfOyB0aGlzLmJ1YmJsZXMgPSBidWJibGVzIHx8IHRoaXMuYnViYmxlczsgdGhpcy5jYW5jZWxhYmxlID0gY2FuY2VsYWJsZSB8fCB0aGlzLmNhbmNlbGFibGU7IH1cclxuICAgIHByZXZlbnREZWZhdWx0KCk6IHZvaWQgeyB0aGlzLmRlZmF1bHRQcmV2ZW50ZWQgPSB0cnVlOyB9XHJcbiAgICBzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTogdm9pZCB7IH1cclxuICAgIHN0b3BQcm9wYWdhdGlvbigpOiB2b2lkIHsgfVxyXG5cclxufTtcclxuXHJcbihnbG9iYWxUaGlzLkV2ZW50IGFzIGFueSkgPz8gKCgpID0+IHtcclxuICAgIGNvbnNvbGUuaW5mbyhgVGhpcyBlbnZpcm9ubWVudCBkb2VzIG5vdCBkZWZpbmUgRXZlbnQ7IHVzaW5nIGEgcG9seWZpbGwuYClcclxuICAgIHJldHVybiBFdmVudDtcclxufSkoKVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBFdmVudFR5cGVzTWFwIH0gZnJvbSBcIi4uL19wcml2YXRlL2V2ZW50LXR5cGVzLW1hcC5qc1wiO1xyXG5cclxuLy8gV29ya2xldHMgZG9uJ3QgZGVmaW5lIGBDdXN0b21FdmVudGAsIGV2ZW4gd2hlbiB0aGV5IGRvIGRlZmluZSBgRXZlbnRgIGl0c2VsZi4uLlxyXG5jbGFzcyBDdXN0b21FdmVudDxUID0gYW55PiBleHRlbmRzIEV2ZW50IHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlOiBrZXlvZiBFdmVudFR5cGVzTWFwLCBldmVudEluaXREaWN0PzogQ3VzdG9tRXZlbnRJbml0PFQ+KSB7XHJcbiAgICAgICAgc3VwZXIodHlwZSwgZXZlbnRJbml0RGljdCk7XHJcbiAgICAgICAgdGhpcy5kZXRhaWwgPSBldmVudEluaXREaWN0Py5kZXRhaWwhO1xyXG4gICAgfVxyXG5cclxuICAgIGRldGFpbDogVDtcclxuXHJcbiAgICBpbml0Q3VzdG9tRXZlbnQoX3R5cGU6IHN0cmluZywgX2J1YmJsZXM/OiBib29sZWFuLCBfY2FuY2VsYWJsZT86IGJvb2xlYW4sIGRldGFpbD86IFQpOiB2b2lkIHtcclxuICAgICAgICAvLyB0aGlzLnR5cGUsIHRoaXMuYnViYmxlcywgYW5kIHRoaXMuY2FuY2VsYWJsZSBhcmUgYWxsIHJlYWRvbmx5Li4uXHJcbiAgICAgICAgdGhpcy5kZXRhaWwgPSAoZGV0YWlsID8/IHRoaXMuZGV0YWlsKSE7XHJcbiAgICB9XHJcbn1cclxuXHJcbihnbG9iYWxUaGlzLkN1c3RvbUV2ZW50IGFzIGFueSkgPz89ICgoKSA9PiB7XHJcbiAgICBjb25zb2xlLmluZm8oYFRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3QgZGVmaW5lIEN1c3RvbUV2ZW50OyB1c2luZyBhIHBvbHlmaWxsYCk7XHJcbiAgICByZXR1cm4gQ3VzdG9tRXZlbnQ7XHJcbn0pKClcclxuIiwgIlxyXG5nbG9iYWxUaGlzLlRleHREZWNvZGVyID8/PSBjbGFzcyBURCBpbXBsZW1lbnRzIFRleHREZWNvZGVyQ29tbW9uIHtcclxuICAgIGVuY29kaW5nID0gJ3V0ZjgnO1xyXG4gICAgZmF0YWwgPSBmYWxzZTtcclxuICAgIGlnbm9yZUJPTSA9IGZhbHNlO1xyXG4gICAgZGVjb2RlKGlucHV0PzogQWxsb3dTaGFyZWRCdWZmZXJTb3VyY2UsIG9wdGlvbnM/OiBUZXh0RGVjb2RlT3B0aW9ucyk6IHN0cmluZyB7XHJcbiAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgIGlmICghaW5wdXQpXHJcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG5cclxuICAgICAgICBsZXQgaW5wdXQyID0gbmV3IFVpbnQ4QXJyYXkoKGlucHV0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpID8gaW5wdXQgOiBpbnB1dC5idWZmZXIpO1xyXG5cclxuICAgICAgICBsZXQgcmV0ID0gXCJcIjtcclxuICAgICAgICB3aGlsZSAoaSA8IGlucHV0LmJ5dGVMZW5ndGgpIHtcclxuICAgICAgICAgICAgY29uc3QgYnl0ZSA9IGlucHV0MltpXTtcclxuICAgICAgICAgICAgaWYgKGJ5dGUgPCAweDgwKVxyXG4gICAgICAgICAgICAgICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogbm9uLUFTQ0lJIGNoYXJhY3RlcnMgaW4gV29ya2xldHNcIilcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgIH1cclxufVxyXG5cclxuIiwgIlxyXG5nbG9iYWxUaGlzLlRleHRFbmNvZGVyID8/PSBjbGFzcyBURCBpbXBsZW1lbnRzIFRleHRFbmNvZGVyQ29tbW9uIHtcclxuICAgIGVuY29kaW5nID0gJ3V0ZjgnO1xyXG4gICAgZW5jb2RlSW50byhzb3VyY2U6IHN0cmluZywgZGVzdGluYXRpb246IFVpbnQ4QXJyYXkpOiBUZXh0RW5jb2RlckVuY29kZUludG9SZXN1bHQge1xyXG5cclxuICAgICAgICBsZXQgcmVhZCA9IDA7XHJcbiAgICAgICAgbGV0IHdyaXR0ZW4gPSAwO1xyXG5cclxuICAgICAgICBsZXQgYnl0ZUluZGV4ID0gMDtcclxuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHNvdXJjZSkge1xyXG4gICAgICAgICAgICBpZiAoY2guY29kZVBvaW50QXQoMCkhID49IDB4ODApXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IG5vbi1BU0NJSSBjaGFyYWN0ZXJzIGluIFdvcmtsZXRzXCIpO1xyXG4gICAgICAgICAgICBkZXN0aW5hdGlvbltieXRlSW5kZXgrK10gPSBjaC5jb2RlUG9pbnRBdCgwKSE7XHJcbiAgICAgICAgICAgICsrcmVhZDtcclxuICAgICAgICAgICAgKyt3cml0dGVuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVhZCxcclxuICAgICAgICAgICAgd3JpdHRlblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVuY29kZShpbnB1dD86IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xyXG4gICAgICAgIGlmICghaW5wdXQpXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheSgpO1xyXG5cclxuICAgICAgICBsZXQgYiA9IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlcihpbnB1dC5sZW5ndGgpKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGlmIChpbnB1dFtpXS5jaGFyQ29kZUF0KDApISA8IDB4ODApXHJcbiAgICAgICAgICAgICAgICBiW2ldID0gaW5wdXRbaV0uY2hhckNvZGVBdCgwKSFcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcbn1cclxuXHJcbiIsICIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuICovXG5cbmltcG9ydCB7XG4gIEVuZHBvaW50LFxuICBFdmVudFNvdXJjZSxcbiAgTWVzc2FnZSxcbiAgTWVzc2FnZVR5cGUsXG4gIFBvc3RNZXNzYWdlV2l0aE9yaWdpbixcbiAgV2lyZVZhbHVlLFxuICBXaXJlVmFsdWVUeXBlLFxufSBmcm9tIFwiLi9wcm90b2NvbFwiO1xuZXhwb3J0IHR5cGUgeyBFbmRwb2ludCB9O1xuXG5leHBvcnQgY29uc3QgcHJveHlNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnByb3h5XCIpO1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUVuZHBvaW50ID0gU3ltYm9sKFwiQ29tbGluay5lbmRwb2ludFwiKTtcbmV4cG9ydCBjb25zdCByZWxlYXNlUHJveHkgPSBTeW1ib2woXCJDb21saW5rLnJlbGVhc2VQcm94eVwiKTtcbmV4cG9ydCBjb25zdCBmaW5hbGl6ZXIgPSBTeW1ib2woXCJDb21saW5rLmZpbmFsaXplclwiKTtcblxuY29uc3QgdGhyb3dNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnRocm93blwiKTtcblxuLyoqXG4gKiBJbnRlcmZhY2Ugb2YgdmFsdWVzIHRoYXQgd2VyZSBtYXJrZWQgdG8gYmUgcHJveGllZCB3aXRoIGBjb21saW5rLnByb3h5KClgLlxuICogQ2FuIGFsc28gYmUgaW1wbGVtZW50ZWQgYnkgY2xhc3Nlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcm94eU1hcmtlZCB7XG4gIFtwcm94eU1hcmtlcl06IHRydWU7XG59XG5cbi8qKlxuICogVGFrZXMgYSB0eXBlIGFuZCB3cmFwcyBpdCBpbiBhIFByb21pc2UsIGlmIGl0IG5vdCBhbHJlYWR5IGlzIG9uZS5cbiAqIFRoaXMgaXMgdG8gYXZvaWQgYFByb21pc2U8UHJvbWlzZTxUPj5gLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFVucHJvbWlzaWZ5PFQ+YC5cbiAqL1xudHlwZSBQcm9taXNpZnk8VD4gPSBUIGV4dGVuZHMgUHJvbWlzZTx1bmtub3duPiA/IFQgOiBQcm9taXNlPFQ+O1xuLyoqXG4gKiBUYWtlcyBhIHR5cGUgdGhhdCBtYXkgYmUgUHJvbWlzZSBhbmQgdW53cmFwcyB0aGUgUHJvbWlzZSB0eXBlLlxuICogSWYgYFBgIGlzIG5vdCBhIFByb21pc2UsIGl0IHJldHVybnMgYFBgLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFByb21pc2lmeTxUPmAuXG4gKi9cbnR5cGUgVW5wcm9taXNpZnk8UD4gPSBQIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiBQO1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBwcm9wZXJ0eSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGF0IGlzIHZpc2libGUgdG8gdGhlIGxvY2FsIHRocmVhZCBvbiB0aGUgcHJveHkuXG4gKlxuICogTm90ZTogVGhpcyBuZWVkcyB0byBiZSBpdHMgb3duIHR5cGUgYWxpYXMsIG90aGVyd2lzZSBpdCB3aWxsIG5vdCBkaXN0cmlidXRlIG92ZXIgdW5pb25zLlxuICogU2VlIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL2FkdmFuY2VkLXR5cGVzLmh0bWwjZGlzdHJpYnV0aXZlLWNvbmRpdGlvbmFsLXR5cGVzXG4gKi9cbnR5cGUgUmVtb3RlUHJvcGVydHk8VD4gPVxuICAvLyBJZiB0aGUgdmFsdWUgaXMgYSBtZXRob2QsIGNvbWxpbmsgd2lsbCBwcm94eSBpdCBhdXRvbWF0aWNhbGx5LlxuICAvLyBPYmplY3RzIGFyZSBvbmx5IHByb3hpZWQgaWYgdGhleSBhcmUgbWFya2VkIHRvIGJlIHByb3hpZWQuXG4gIC8vIE90aGVyd2lzZSwgdGhlIHByb3BlcnR5IGlzIGNvbnZlcnRlZCB0byBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB0aGUgY2xvbmVkIHZhbHVlLlxuICBUIGV4dGVuZHMgRnVuY3Rpb24gfCBQcm94eU1hcmtlZCA/IFJlbW90ZTxUPiA6IFByb21pc2lmeTxUPjtcblxuLyoqXG4gKiBUYWtlcyB0aGUgcmF3IHR5cGUgb2YgYSBwcm9wZXJ0eSBhcyBhIHJlbW90ZSB0aHJlYWQgd291bGQgc2VlIGl0IHRocm91Z2ggYSBwcm94eSAoZS5nLiB3aGVuIHBhc3NlZCBpbiBhcyBhIGZ1bmN0aW9uXG4gKiBhcmd1bWVudCkgYW5kIHJldHVybnMgdGhlIHR5cGUgdGhhdCB0aGUgbG9jYWwgdGhyZWFkIGhhcyB0byBzdXBwbHkuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUmVtb3RlUHJvcGVydHk8VD5gLlxuICpcbiAqIE5vdGU6IFRoaXMgbmVlZHMgdG8gYmUgaXRzIG93biB0eXBlIGFsaWFzLCBvdGhlcndpc2UgaXQgd2lsbCBub3QgZGlzdHJpYnV0ZSBvdmVyIHVuaW9ucy4gU2VlXG4gKiBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9hZHZhbmNlZC10eXBlcy5odG1sI2Rpc3RyaWJ1dGl2ZS1jb25kaXRpb25hbC10eXBlc1xuICovXG50eXBlIExvY2FsUHJvcGVydHk8VD4gPSBUIGV4dGVuZHMgRnVuY3Rpb24gfCBQcm94eU1hcmtlZFxuICA/IExvY2FsPFQ+XG4gIDogVW5wcm9taXNpZnk8VD47XG5cbi8qKlxuICogUHJveGllcyBgVGAgaWYgaXQgaXMgYSBgUHJveHlNYXJrZWRgLCBjbG9uZXMgaXQgb3RoZXJ3aXNlIChhcyBoYW5kbGVkIGJ5IHN0cnVjdHVyZWQgY2xvbmluZyBhbmQgdHJhbnNmZXIgaGFuZGxlcnMpLlxuICovXG5leHBvcnQgdHlwZSBQcm94eU9yQ2xvbmU8VD4gPSBUIGV4dGVuZHMgUHJveHlNYXJrZWQgPyBSZW1vdGU8VD4gOiBUO1xuLyoqXG4gKiBJbnZlcnNlIG9mIGBQcm94eU9yQ2xvbmU8VD5gLlxuICovXG5leHBvcnQgdHlwZSBVbnByb3h5T3JDbG9uZTxUPiA9IFQgZXh0ZW5kcyBSZW1vdGVPYmplY3Q8UHJveHlNYXJrZWQ+XG4gID8gTG9jYWw8VD5cbiAgOiBUO1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBvYmplY3QgaW4gdGhlIG90aGVyIHRocmVhZCBhbmQgcmV0dXJucyB0aGUgdHlwZSBhcyBpdCBpcyB2aXNpYmxlIHRvIHRoZSBsb2NhbCB0aHJlYWRcbiAqIHdoZW4gcHJveGllZCB3aXRoIGBDb21saW5rLnByb3h5KClgLlxuICpcbiAqIFRoaXMgZG9lcyBub3QgaGFuZGxlIGNhbGwgc2lnbmF0dXJlcywgd2hpY2ggaXMgaGFuZGxlZCBieSB0aGUgbW9yZSBnZW5lcmFsIGBSZW1vdGU8VD5gIHR5cGUuXG4gKlxuICogQHRlbXBsYXRlIFQgVGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIG9iamVjdCBhcyBzZWVuIGluIHRoZSBvdGhlciB0aHJlYWQuXG4gKi9cbmV4cG9ydCB0eXBlIFJlbW90ZU9iamVjdDxUPiA9IHsgW1AgaW4ga2V5b2YgVF06IFJlbW90ZVByb3BlcnR5PFRbUF0+IH07XG4vKipcbiAqIFRha2VzIHRoZSB0eXBlIG9mIGFuIG9iamVjdCBhcyBhIHJlbW90ZSB0aHJlYWQgd291bGQgc2VlIGl0IHRocm91Z2ggYSBwcm94eSAoZS5nLiB3aGVuIHBhc3NlZCBpbiBhcyBhIGZ1bmN0aW9uXG4gKiBhcmd1bWVudCkgYW5kIHJldHVybnMgdGhlIHR5cGUgdGhhdCB0aGUgbG9jYWwgdGhyZWFkIGhhcyB0byBzdXBwbHkuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBoYW5kbGUgY2FsbCBzaWduYXR1cmVzLCB3aGljaCBpcyBoYW5kbGVkIGJ5IHRoZSBtb3JlIGdlbmVyYWwgYExvY2FsPFQ+YCB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFJlbW90ZU9iamVjdDxUPmAuXG4gKlxuICogQHRlbXBsYXRlIFQgVGhlIHR5cGUgb2YgYSBwcm94aWVkIG9iamVjdC5cbiAqL1xuZXhwb3J0IHR5cGUgTG9jYWxPYmplY3Q8VD4gPSB7IFtQIGluIGtleW9mIFRdOiBMb2NhbFByb3BlcnR5PFRbUF0+IH07XG5cbi8qKlxuICogQWRkaXRpb25hbCBzcGVjaWFsIGNvbWxpbmsgbWV0aG9kcyBhdmFpbGFibGUgb24gZWFjaCBwcm94eSByZXR1cm5lZCBieSBgQ29tbGluay53cmFwKClgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb3h5TWV0aG9kcyB7XG4gIFtjcmVhdGVFbmRwb2ludF06ICgpID0+IFByb21pc2U8TWVzc2FnZVBvcnQ+O1xuICBbcmVsZWFzZVByb3h5XTogKCkgPT4gdm9pZDtcbn1cblxuLyoqXG4gKiBUYWtlcyB0aGUgcmF3IHR5cGUgb2YgYSByZW1vdGUgb2JqZWN0LCBmdW5jdGlvbiBvciBjbGFzcyBpbiB0aGUgb3RoZXIgdGhyZWFkIGFuZCByZXR1cm5zIHRoZSB0eXBlIGFzIGl0IGlzIHZpc2libGUgdG9cbiAqIHRoZSBsb2NhbCB0aHJlYWQgZnJvbSB0aGUgcHJveHkgcmV0dXJuIHZhbHVlIG9mIGBDb21saW5rLndyYXAoKWAgb3IgYENvbWxpbmsucHJveHkoKWAuXG4gKi9cbmV4cG9ydCB0eXBlIFJlbW90ZTxUPiA9XG4gIC8vIEhhbmRsZSBwcm9wZXJ0aWVzXG4gIFJlbW90ZU9iamVjdDxUPiAmXG4gICAgLy8gSGFuZGxlIGNhbGwgc2lnbmF0dXJlIChpZiBwcmVzZW50KVxuICAgIChUIGV4dGVuZHMgKC4uLmFyZ3M6IGluZmVyIFRBcmd1bWVudHMpID0+IGluZmVyIFRSZXR1cm5cbiAgICAgID8gKFxuICAgICAgICAgIC4uLmFyZ3M6IHsgW0kgaW4ga2V5b2YgVEFyZ3VtZW50c106IFVucHJveHlPckNsb25lPFRBcmd1bWVudHNbSV0+IH1cbiAgICAgICAgKSA9PiBQcm9taXNpZnk8UHJveHlPckNsb25lPFVucHJvbWlzaWZ5PFRSZXR1cm4+Pj5cbiAgICAgIDogdW5rbm93bikgJlxuICAgIC8vIEhhbmRsZSBjb25zdHJ1Y3Qgc2lnbmF0dXJlIChpZiBwcmVzZW50KVxuICAgIC8vIFRoZSByZXR1cm4gb2YgY29uc3RydWN0IHNpZ25hdHVyZXMgaXMgYWx3YXlzIHByb3hpZWQgKHdoZXRoZXIgbWFya2VkIG9yIG5vdClcbiAgICAoVCBleHRlbmRzIHsgbmV3ICguLi5hcmdzOiBpbmZlciBUQXJndW1lbnRzKTogaW5mZXIgVEluc3RhbmNlIH1cbiAgICAgID8ge1xuICAgICAgICAgIG5ldyAoXG4gICAgICAgICAgICAuLi5hcmdzOiB7XG4gICAgICAgICAgICAgIFtJIGluIGtleW9mIFRBcmd1bWVudHNdOiBVbnByb3h5T3JDbG9uZTxUQXJndW1lbnRzW0ldPjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApOiBQcm9taXNpZnk8UmVtb3RlPFRJbnN0YW5jZT4+O1xuICAgICAgICB9XG4gICAgICA6IHVua25vd24pICZcbiAgICAvLyBJbmNsdWRlIGFkZGl0aW9uYWwgc3BlY2lhbCBjb21saW5rIG1ldGhvZHMgYXZhaWxhYmxlIG9uIHRoZSBwcm94eS5cbiAgICBQcm94eU1ldGhvZHM7XG5cbi8qKlxuICogRXhwcmVzc2VzIHRoYXQgYSB0eXBlIGNhbiBiZSBlaXRoZXIgYSBzeW5jIG9yIGFzeW5jLlxuICovXG50eXBlIE1heWJlUHJvbWlzZTxUPiA9IFByb21pc2U8VD4gfCBUO1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBvYmplY3QsIGZ1bmN0aW9uIG9yIGNsYXNzIGFzIGEgcmVtb3RlIHRocmVhZCB3b3VsZCBzZWUgaXQgdGhyb3VnaCBhIHByb3h5IChlLmcuIHdoZW5cbiAqIHBhc3NlZCBpbiBhcyBhIGZ1bmN0aW9uIGFyZ3VtZW50KSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGUgbG9jYWwgdGhyZWFkIGhhcyB0byBzdXBwbHkuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUmVtb3RlPFQ+YC4gSXQgdGFrZXMgYSBgUmVtb3RlPFQ+YCBhbmQgcmV0dXJucyBpdHMgb3JpZ2luYWwgaW5wdXQgYFRgLlxuICovXG5leHBvcnQgdHlwZSBMb2NhbDxUPiA9XG4gIC8vIE9taXQgdGhlIHNwZWNpYWwgcHJveHkgbWV0aG9kcyAodGhleSBkb24ndCBuZWVkIHRvIGJlIHN1cHBsaWVkLCBjb21saW5rIGFkZHMgdGhlbSlcbiAgT21pdDxMb2NhbE9iamVjdDxUPiwga2V5b2YgUHJveHlNZXRob2RzPiAmXG4gICAgLy8gSGFuZGxlIGNhbGwgc2lnbmF0dXJlcyAoaWYgcHJlc2VudClcbiAgICAoVCBleHRlbmRzICguLi5hcmdzOiBpbmZlciBUQXJndW1lbnRzKSA9PiBpbmZlciBUUmV0dXJuXG4gICAgICA/IChcbiAgICAgICAgICAuLi5hcmdzOiB7IFtJIGluIGtleW9mIFRBcmd1bWVudHNdOiBQcm94eU9yQ2xvbmU8VEFyZ3VtZW50c1tJXT4gfVxuICAgICAgICApID0+IC8vIFRoZSByYXcgZnVuY3Rpb24gY291bGQgZWl0aGVyIGJlIHN5bmMgb3IgYXN5bmMsIGJ1dCBpcyBhbHdheXMgcHJveGllZCBhdXRvbWF0aWNhbGx5XG4gICAgICAgIE1heWJlUHJvbWlzZTxVbnByb3h5T3JDbG9uZTxVbnByb21pc2lmeTxUUmV0dXJuPj4+XG4gICAgICA6IHVua25vd24pICZcbiAgICAvLyBIYW5kbGUgY29uc3RydWN0IHNpZ25hdHVyZSAoaWYgcHJlc2VudClcbiAgICAvLyBUaGUgcmV0dXJuIG9mIGNvbnN0cnVjdCBzaWduYXR1cmVzIGlzIGFsd2F5cyBwcm94aWVkICh3aGV0aGVyIG1hcmtlZCBvciBub3QpXG4gICAgKFQgZXh0ZW5kcyB7IG5ldyAoLi4uYXJnczogaW5mZXIgVEFyZ3VtZW50cyk6IGluZmVyIFRJbnN0YW5jZSB9XG4gICAgICA/IHtcbiAgICAgICAgICBuZXcgKFxuICAgICAgICAgICAgLi4uYXJnczoge1xuICAgICAgICAgICAgICBbSSBpbiBrZXlvZiBUQXJndW1lbnRzXTogUHJveHlPckNsb25lPFRBcmd1bWVudHNbSV0+O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk6IC8vIFRoZSByYXcgY29uc3RydWN0b3IgY291bGQgZWl0aGVyIGJlIHN5bmMgb3IgYXN5bmMsIGJ1dCBpcyBhbHdheXMgcHJveGllZCBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgTWF5YmVQcm9taXNlPExvY2FsPFVucHJvbWlzaWZ5PFRJbnN0YW5jZT4+PjtcbiAgICAgICAgfVxuICAgICAgOiB1bmtub3duKTtcblxuY29uc3QgaXNPYmplY3QgPSAodmFsOiB1bmtub3duKTogdmFsIGlzIG9iamVjdCA9PlxuICAodHlwZW9mIHZhbCA9PT0gXCJvYmplY3RcIiAmJiB2YWwgIT09IG51bGwpIHx8IHR5cGVvZiB2YWwgPT09IFwiZnVuY3Rpb25cIjtcblxuLyoqXG4gKiBDdXN0b21pemVzIHRoZSBzZXJpYWxpemF0aW9uIG9mIGNlcnRhaW4gdmFsdWVzIGFzIGRldGVybWluZWQgYnkgYGNhbkhhbmRsZSgpYC5cbiAqXG4gKiBAdGVtcGxhdGUgVCBUaGUgaW5wdXQgdHlwZSBiZWluZyBoYW5kbGVkIGJ5IHRoaXMgdHJhbnNmZXIgaGFuZGxlci5cbiAqIEB0ZW1wbGF0ZSBTIFRoZSBzZXJpYWxpemVkIHR5cGUgc2VudCBvdmVyIHRoZSB3aXJlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zZmVySGFuZGxlcjxULCBTPiB7XG4gIC8qKlxuICAgKiBHZXRzIGNhbGxlZCBmb3IgZXZlcnkgdmFsdWUgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyB0cmFuc2ZlciBoYW5kbGVyXG4gICAqIHNob3VsZCBzZXJpYWxpemUgdGhlIHZhbHVlLCB3aGljaCBpbmNsdWRlcyBjaGVja2luZyB0aGF0IGl0IGlzIG9mIHRoZSByaWdodFxuICAgKiB0eXBlIChidXQgY2FuIHBlcmZvcm0gY2hlY2tzIGJleW9uZCB0aGF0IGFzIHdlbGwpLlxuICAgKi9cbiAgY2FuSGFuZGxlKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgVDtcblxuICAvKipcbiAgICogR2V0cyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUgaWYgYGNhbkhhbmRsZSgpYCByZXR1cm5lZCBgdHJ1ZWAgdG8gcHJvZHVjZSBhXG4gICAqIHZhbHVlIHRoYXQgY2FuIGJlIHNlbnQgaW4gYSBtZXNzYWdlLCBjb25zaXN0aW5nIG9mIHN0cnVjdHVyZWQtY2xvbmVhYmxlXG4gICAqIHZhbHVlcyBhbmQvb3IgdHJhbnNmZXJyYWJsZSBvYmplY3RzLlxuICAgKi9cbiAgc2VyaWFsaXplKHZhbHVlOiBUKTogW1MsIFRyYW5zZmVyYWJsZVtdXTtcblxuICAvKipcbiAgICogR2V0cyBjYWxsZWQgdG8gZGVzZXJpYWxpemUgYW4gaW5jb21pbmcgdmFsdWUgdGhhdCB3YXMgc2VyaWFsaXplZCBpbiB0aGVcbiAgICogb3RoZXIgdGhyZWFkIHdpdGggdGhpcyB0cmFuc2ZlciBoYW5kbGVyIChrbm93biB0aHJvdWdoIHRoZSBuYW1lIGl0IHdhc1xuICAgKiByZWdpc3RlcmVkIHVuZGVyKS5cbiAgICovXG4gIGRlc2VyaWFsaXplKHZhbHVlOiBTKTogVDtcbn1cblxuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGUgdG8gaGFuZGxlIG9iamVjdHMgbWFya2VkIHRvIHByb3h5LlxuICovXG5jb25zdCBwcm94eVRyYW5zZmVySGFuZGxlcjogVHJhbnNmZXJIYW5kbGVyPG9iamVjdCwgTWVzc2FnZVBvcnQ+ID0ge1xuICBjYW5IYW5kbGU6ICh2YWwpOiB2YWwgaXMgUHJveHlNYXJrZWQgPT5cbiAgICBpc09iamVjdCh2YWwpICYmICh2YWwgYXMgUHJveHlNYXJrZWQpW3Byb3h5TWFya2VyXSxcbiAgc2VyaWFsaXplKG9iaikge1xuICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBleHBvc2Uob2JqLCBwb3J0MSk7XG4gICAgcmV0dXJuIFtwb3J0MiwgW3BvcnQyXV07XG4gIH0sXG4gIGRlc2VyaWFsaXplKHBvcnQpIHtcbiAgICBwb3J0LnN0YXJ0KCk7XG4gICAgcmV0dXJuIHdyYXAocG9ydCk7XG4gIH0sXG59O1xuXG5pbnRlcmZhY2UgVGhyb3duVmFsdWUge1xuICBbdGhyb3dNYXJrZXJdOiB1bmtub3duOyAvLyBqdXN0IG5lZWRzIHRvIGJlIHByZXNlbnRcbiAgdmFsdWU6IHVua25vd247XG59XG50eXBlIFNlcmlhbGl6ZWRUaHJvd25WYWx1ZSA9XG4gIHwgeyBpc0Vycm9yOiB0cnVlOyB2YWx1ZTogRXJyb3IgfVxuICB8IHsgaXNFcnJvcjogZmFsc2U7IHZhbHVlOiB1bmtub3duIH07XG5cbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlciB0byBoYW5kbGUgdGhyb3duIGV4Y2VwdGlvbnMuXG4gKi9cbmNvbnN0IHRocm93VHJhbnNmZXJIYW5kbGVyOiBUcmFuc2ZlckhhbmRsZXI8XG4gIFRocm93blZhbHVlLFxuICBTZXJpYWxpemVkVGhyb3duVmFsdWVcbj4gPSB7XG4gIGNhbkhhbmRsZTogKHZhbHVlKTogdmFsdWUgaXMgVGhyb3duVmFsdWUgPT5cbiAgICBpc09iamVjdCh2YWx1ZSkgJiYgdGhyb3dNYXJrZXIgaW4gdmFsdWUsXG4gIHNlcmlhbGl6ZSh7IHZhbHVlIH0pIHtcbiAgICBsZXQgc2VyaWFsaXplZDogU2VyaWFsaXplZFRocm93blZhbHVlO1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBzZXJpYWxpemVkID0ge1xuICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgICB2YWx1ZToge1xuICAgICAgICAgIG1lc3NhZ2U6IHZhbHVlLm1lc3NhZ2UsXG4gICAgICAgICAgbmFtZTogdmFsdWUubmFtZSxcbiAgICAgICAgICBzdGFjazogdmFsdWUuc3RhY2ssXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXJpYWxpemVkID0geyBpc0Vycm9yOiBmYWxzZSwgdmFsdWUgfTtcbiAgICB9XG4gICAgcmV0dXJuIFtzZXJpYWxpemVkLCBbXV07XG4gIH0sXG4gIGRlc2VyaWFsaXplKHNlcmlhbGl6ZWQpIHtcbiAgICBpZiAoc2VyaWFsaXplZC5pc0Vycm9yKSB7XG4gICAgICB0aHJvdyBPYmplY3QuYXNzaWduKFxuICAgICAgICBuZXcgRXJyb3Ioc2VyaWFsaXplZC52YWx1ZS5tZXNzYWdlKSxcbiAgICAgICAgc2VyaWFsaXplZC52YWx1ZVxuICAgICAgKTtcbiAgICB9XG4gICAgdGhyb3cgc2VyaWFsaXplZC52YWx1ZTtcbiAgfSxcbn07XG5cbi8qKlxuICogQWxsb3dzIGN1c3RvbWl6aW5nIHRoZSBzZXJpYWxpemF0aW9uIG9mIGNlcnRhaW4gdmFsdWVzLlxuICovXG5leHBvcnQgY29uc3QgdHJhbnNmZXJIYW5kbGVycyA9IG5ldyBNYXA8XG4gIHN0cmluZyxcbiAgVHJhbnNmZXJIYW5kbGVyPHVua25vd24sIHVua25vd24+XG4+KFtcbiAgW1wicHJveHlcIiwgcHJveHlUcmFuc2ZlckhhbmRsZXJdLFxuICBbXCJ0aHJvd1wiLCB0aHJvd1RyYW5zZmVySGFuZGxlcl0sXG5dKTtcblxuZnVuY3Rpb24gaXNBbGxvd2VkT3JpZ2luKFxuICBhbGxvd2VkT3JpZ2luczogKHN0cmluZyB8IFJlZ0V4cClbXSxcbiAgb3JpZ2luOiBzdHJpbmdcbik6IGJvb2xlYW4ge1xuICBmb3IgKGNvbnN0IGFsbG93ZWRPcmlnaW4gb2YgYWxsb3dlZE9yaWdpbnMpIHtcbiAgICBpZiAob3JpZ2luID09PSBhbGxvd2VkT3JpZ2luIHx8IGFsbG93ZWRPcmlnaW4gPT09IFwiKlwiKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGFsbG93ZWRPcmlnaW4gaW5zdGFuY2VvZiBSZWdFeHAgJiYgYWxsb3dlZE9yaWdpbi50ZXN0KG9yaWdpbikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHBvc2UoXG4gIG9iajogYW55LFxuICBlcDogRW5kcG9pbnQgPSBnbG9iYWxUaGlzIGFzIGFueSxcbiAgYWxsb3dlZE9yaWdpbnM6IChzdHJpbmcgfCBSZWdFeHApW10gPSBbXCIqXCJdXG4pIHtcbiAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gY2FsbGJhY2soZXY6IE1lc3NhZ2VFdmVudCkge1xuICAgIGlmICghZXYgfHwgIWV2LmRhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFpc0FsbG93ZWRPcmlnaW4oYWxsb3dlZE9yaWdpbnMsIGV2Lm9yaWdpbikpIHtcbiAgICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBvcmlnaW4gJyR7ZXYub3JpZ2lufScgZm9yIGNvbWxpbmsgcHJveHlgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgeyBpZCwgdHlwZSwgcGF0aCB9ID0ge1xuICAgICAgcGF0aDogW10gYXMgc3RyaW5nW10sXG4gICAgICAuLi4oZXYuZGF0YSBhcyBNZXNzYWdlKSxcbiAgICB9O1xuICAgIGNvbnN0IGFyZ3VtZW50TGlzdCA9IChldi5kYXRhLmFyZ3VtZW50TGlzdCB8fCBbXSkubWFwKGZyb21XaXJlVmFsdWUpO1xuICAgIGxldCByZXR1cm5WYWx1ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFyZW50ID0gcGF0aC5zbGljZSgwLCAtMSkucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgIGNvbnN0IHJhd1ZhbHVlID0gcGF0aC5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuR0VUOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gcmF3VmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLlNFVDpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBwYXJlbnRbcGF0aC5zbGljZSgtMSlbMF1dID0gZnJvbVdpcmVWYWx1ZShldi5kYXRhLnZhbHVlKTtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuQVBQTFk6XG4gICAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZS5hcHBseShwYXJlbnQsIGFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLkNPTlNUUlVDVDpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG5ldyByYXdWYWx1ZSguLi5hcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBwcm94eSh2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLkVORFBPSU5UOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgICAgIGV4cG9zZShvYmosIHBvcnQyKTtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJhbnNmZXIocG9ydDEsIFtwb3J0MV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5SRUxFQVNFOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfSBjYXRjaCAodmFsdWUpIHtcbiAgICAgIHJldHVyblZhbHVlID0geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgIH1cbiAgICBQcm9taXNlLnJlc29sdmUocmV0dXJuVmFsdWUpXG4gICAgICAuY2F0Y2goKHZhbHVlKSA9PiB7XG4gICAgICAgIHJldHVybiB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgICB9KVxuICAgICAgLnRoZW4oKHJldHVyblZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmV0dXJuVmFsdWUpO1xuICAgICAgICBlcC5wb3N0TWVzc2FnZSh7IC4uLndpcmVWYWx1ZSwgaWQgfSwgdHJhbnNmZXJhYmxlcyk7XG4gICAgICAgIGlmICh0eXBlID09PSBNZXNzYWdlVHlwZS5SRUxFQVNFKSB7XG4gICAgICAgICAgLy8gZGV0YWNoIGFuZCBkZWFjdGl2ZSBhZnRlciBzZW5kaW5nIHJlbGVhc2UgcmVzcG9uc2UgYWJvdmUuXG4gICAgICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2FsbGJhY2sgYXMgYW55KTtcbiAgICAgICAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgICAgICAgICBpZiAoZmluYWxpemVyIGluIG9iaiAmJiB0eXBlb2Ygb2JqW2ZpbmFsaXplcl0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb2JqW2ZpbmFsaXplcl0oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIC8vIFNlbmQgU2VyaWFsaXphdGlvbiBFcnJvciBUbyBDYWxsZXJcbiAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZSh7XG4gICAgICAgICAgdmFsdWU6IG5ldyBUeXBlRXJyb3IoXCJVbnNlcmlhbGl6YWJsZSByZXR1cm4gdmFsdWVcIiksXG4gICAgICAgICAgW3Rocm93TWFya2VyXTogMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGVwLnBvc3RNZXNzYWdlKHsgLi4ud2lyZVZhbHVlLCBpZCB9LCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgIH0pO1xuICB9IGFzIGFueSk7XG4gIGlmIChlcC5zdGFydCkge1xuICAgIGVwLnN0YXJ0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNNZXNzYWdlUG9ydChlbmRwb2ludDogRW5kcG9pbnQpOiBlbmRwb2ludCBpcyBNZXNzYWdlUG9ydCB7XG4gIHJldHVybiBlbmRwb2ludC5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk1lc3NhZ2VQb3J0XCI7XG59XG5cbmZ1bmN0aW9uIGNsb3NlRW5kUG9pbnQoZW5kcG9pbnQ6IEVuZHBvaW50KSB7XG4gIGlmIChpc01lc3NhZ2VQb3J0KGVuZHBvaW50KSkgZW5kcG9pbnQuY2xvc2UoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXA8VD4oZXA6IEVuZHBvaW50LCB0YXJnZXQ/OiBhbnkpOiBSZW1vdGU8VD4ge1xuICByZXR1cm4gY3JlYXRlUHJveHk8VD4oZXAsIFtdLCB0YXJnZXQpIGFzIGFueTtcbn1cblxuZnVuY3Rpb24gdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNSZWxlYXNlZDogYm9vbGVhbikge1xuICBpZiAoaXNSZWxlYXNlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlByb3h5IGhhcyBiZWVuIHJlbGVhc2VkIGFuZCBpcyBub3QgdXNlYWJsZVwiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWxlYXNlRW5kcG9pbnQoZXA6IEVuZHBvaW50KSB7XG4gIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgdHlwZTogTWVzc2FnZVR5cGUuUkVMRUFTRSxcbiAgfSkudGhlbigoKSA9PiB7XG4gICAgY2xvc2VFbmRQb2ludChlcCk7XG4gIH0pO1xufVxuXG5pbnRlcmZhY2UgRmluYWxpemF0aW9uUmVnaXN0cnk8VD4ge1xuICBuZXcgKGNiOiAoaGVsZFZhbHVlOiBUKSA9PiB2b2lkKTogRmluYWxpemF0aW9uUmVnaXN0cnk8VD47XG4gIHJlZ2lzdGVyKFxuICAgIHdlYWtJdGVtOiBvYmplY3QsXG4gICAgaGVsZFZhbHVlOiBULFxuICAgIHVucmVnaXN0ZXJUb2tlbj86IG9iamVjdCB8IHVuZGVmaW5lZFxuICApOiB2b2lkO1xuICB1bnJlZ2lzdGVyKHVucmVnaXN0ZXJUb2tlbjogb2JqZWN0KTogdm9pZDtcbn1cbmRlY2xhcmUgdmFyIEZpbmFsaXphdGlvblJlZ2lzdHJ5OiBGaW5hbGl6YXRpb25SZWdpc3RyeTxFbmRwb2ludD47XG5cbmNvbnN0IHByb3h5Q291bnRlciA9IG5ldyBXZWFrTWFwPEVuZHBvaW50LCBudW1iZXI+KCk7XG5jb25zdCBwcm94eUZpbmFsaXplcnMgPVxuICBcIkZpbmFsaXphdGlvblJlZ2lzdHJ5XCIgaW4gZ2xvYmFsVGhpcyAmJlxuICBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKGVwOiBFbmRwb2ludCkgPT4ge1xuICAgIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApIC0gMTtcbiAgICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gICAgaWYgKG5ld0NvdW50ID09PSAwKSB7XG4gICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgIH1cbiAgfSk7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyUHJveHkocHJveHk6IG9iamVjdCwgZXA6IEVuZHBvaW50KSB7XG4gIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApICsgMTtcbiAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgcHJveHlGaW5hbGl6ZXJzLnJlZ2lzdGVyKHByb3h5LCBlcCwgcHJveHkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJQcm94eShwcm94eTogb2JqZWN0KSB7XG4gIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICBwcm94eUZpbmFsaXplcnMudW5yZWdpc3Rlcihwcm94eSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlUHJveHk8VD4oXG4gIGVwOiBFbmRwb2ludCxcbiAgcGF0aDogKHN0cmluZyB8IG51bWJlciB8IHN5bWJvbClbXSA9IFtdLFxuICB0YXJnZXQ6IG9iamVjdCA9IGZ1bmN0aW9uICgpIHt9XG4pOiBSZW1vdGU8VD4ge1xuICBsZXQgaXNQcm94eVJlbGVhc2VkID0gZmFsc2U7XG4gIGNvbnN0IHByb3h5ID0gbmV3IFByb3h5KHRhcmdldCwge1xuICAgIGdldChfdGFyZ2V0LCBwcm9wKSB7XG4gICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgaWYgKHByb3AgPT09IHJlbGVhc2VQcm94eSkge1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIHVucmVnaXN0ZXJQcm94eShwcm94eSk7XG4gICAgICAgICAgcmVsZWFzZUVuZHBvaW50KGVwKTtcbiAgICAgICAgICBpc1Byb3h5UmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHByb3AgPT09IFwidGhlblwiKSB7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiB7IHRoZW46ICgpID0+IHByb3h5IH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgciA9IHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5HRVQsXG4gICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIHJldHVybiByLnRoZW4uYmluZChyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgWy4uLnBhdGgsIHByb3BdKTtcbiAgICB9LFxuICAgIHNldChfdGFyZ2V0LCBwcm9wLCByYXdWYWx1ZSkge1xuICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgIC8vIEZJWE1FOiBFUzYgUHJveHkgSGFuZGxlciBgc2V0YCBtZXRob2RzIGFyZSBzdXBwb3NlZCB0byByZXR1cm4gYVxuICAgICAgLy8gYm9vbGVhbi4gVG8gc2hvdyBnb29kIHdpbGwsIHdlIHJldHVybiB0cnVlIGFzeW5jaHJvbm91c2x5IFx1MDBBRlxcXyhcdTMwQzQpXy9cdTAwQUZcbiAgICAgIGNvbnN0IFt2YWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyYXdWYWx1ZSk7XG4gICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShcbiAgICAgICAgZXAsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5TRVQsXG4gICAgICAgICAgcGF0aDogWy4uLnBhdGgsIHByb3BdLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJhYmxlc1xuICAgICAgKS50aGVuKGZyb21XaXJlVmFsdWUpIGFzIGFueTtcbiAgICB9LFxuICAgIGFwcGx5KF90YXJnZXQsIF90aGlzQXJnLCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICBjb25zdCBsYXN0ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKChsYXN0IGFzIGFueSkgPT09IGNyZWF0ZUVuZHBvaW50KSB7XG4gICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuRU5EUE9JTlQsXG4gICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICB9XG4gICAgICAvLyBXZSBqdXN0IHByZXRlbmQgdGhhdCBgYmluZCgpYCBkaWRuXHUyMDE5dCBoYXBwZW4uXG4gICAgICBpZiAobGFzdCA9PT0gXCJiaW5kXCIpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBwYXRoLnNsaWNlKDAsIC0xKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKFxuICAgICAgICBlcCxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLkFQUExZLFxuICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJhYmxlc1xuICAgICAgKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgIH0sXG4gICAgY29uc3RydWN0KF90YXJnZXQsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoXG4gICAgICAgIGVwLFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuQ09OU1RSVUNULFxuICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJhYmxlc1xuICAgICAgKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgIH0sXG4gIH0pO1xuICByZWdpc3RlclByb3h5KHByb3h5LCBlcCk7XG4gIHJldHVybiBwcm94eSBhcyBhbnk7XG59XG5cbmZ1bmN0aW9uIG15RmxhdDxUPihhcnI6IChUIHwgVFtdKVtdKTogVFtdIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGFycik7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NBcmd1bWVudHMoYXJndW1lbnRMaXN0OiBhbnlbXSk6IFtXaXJlVmFsdWVbXSwgVHJhbnNmZXJhYmxlW11dIHtcbiAgY29uc3QgcHJvY2Vzc2VkID0gYXJndW1lbnRMaXN0Lm1hcCh0b1dpcmVWYWx1ZSk7XG4gIHJldHVybiBbcHJvY2Vzc2VkLm1hcCgodikgPT4gdlswXSksIG15RmxhdChwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzFdKSldO1xufVxuXG5jb25zdCB0cmFuc2ZlckNhY2hlID0gbmV3IFdlYWtNYXA8YW55LCBUcmFuc2ZlcmFibGVbXT4oKTtcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2ZlcjxUPihvYmo6IFQsIHRyYW5zZmVyczogVHJhbnNmZXJhYmxlW10pOiBUIHtcbiAgdHJhbnNmZXJDYWNoZS5zZXQob2JqLCB0cmFuc2ZlcnMpO1xuICByZXR1cm4gb2JqO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJveHk8VCBleHRlbmRzIHt9PihvYmo6IFQpOiBUICYgUHJveHlNYXJrZWQge1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIHsgW3Byb3h5TWFya2VyXTogdHJ1ZSB9KSBhcyBhbnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aW5kb3dFbmRwb2ludChcbiAgdzogUG9zdE1lc3NhZ2VXaXRoT3JpZ2luLFxuICBjb250ZXh0OiBFdmVudFNvdXJjZSA9IGdsb2JhbFRoaXMsXG4gIHRhcmdldE9yaWdpbiA9IFwiKlwiXG4pOiBFbmRwb2ludCB7XG4gIHJldHVybiB7XG4gICAgcG9zdE1lc3NhZ2U6IChtc2c6IGFueSwgdHJhbnNmZXJhYmxlczogVHJhbnNmZXJhYmxlW10pID0+XG4gICAgICB3LnBvc3RNZXNzYWdlKG1zZywgdGFyZ2V0T3JpZ2luLCB0cmFuc2ZlcmFibGVzKSxcbiAgICBhZGRFdmVudExpc3RlbmVyOiBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBjb250ZXh0LnJlbW92ZUV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdG9XaXJlVmFsdWUodmFsdWU6IGFueSk6IFtXaXJlVmFsdWUsIFRyYW5zZmVyYWJsZVtdXSB7XG4gIGZvciAoY29uc3QgW25hbWUsIGhhbmRsZXJdIG9mIHRyYW5zZmVySGFuZGxlcnMpIHtcbiAgICBpZiAoaGFuZGxlci5jYW5IYW5kbGUodmFsdWUpKSB7XG4gICAgICBjb25zdCBbc2VyaWFsaXplZFZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IGhhbmRsZXIuc2VyaWFsaXplKHZhbHVlKTtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBXaXJlVmFsdWVUeXBlLkhBTkRMRVIsXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICB2YWx1ZTogc2VyaWFsaXplZFZhbHVlLFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzLFxuICAgICAgXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtcbiAgICB7XG4gICAgICB0eXBlOiBXaXJlVmFsdWVUeXBlLlJBVyxcbiAgICAgIHZhbHVlLFxuICAgIH0sXG4gICAgdHJhbnNmZXJDYWNoZS5nZXQodmFsdWUpIHx8IFtdLFxuICBdO1xufVxuXG5mdW5jdGlvbiBmcm9tV2lyZVZhbHVlKHZhbHVlOiBXaXJlVmFsdWUpOiBhbnkge1xuICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICBjYXNlIFdpcmVWYWx1ZVR5cGUuSEFORExFUjpcbiAgICAgIHJldHVybiB0cmFuc2ZlckhhbmRsZXJzLmdldCh2YWx1ZS5uYW1lKSEuZGVzZXJpYWxpemUodmFsdWUudmFsdWUpO1xuICAgIGNhc2UgV2lyZVZhbHVlVHlwZS5SQVc6XG4gICAgICByZXR1cm4gdmFsdWUudmFsdWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShcbiAgZXA6IEVuZHBvaW50LFxuICBtc2c6IE1lc3NhZ2UsXG4gIHRyYW5zZmVycz86IFRyYW5zZmVyYWJsZVtdXG4pOiBQcm9taXNlPFdpcmVWYWx1ZT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBpZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgIGVwLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIGwoZXY6IE1lc3NhZ2VFdmVudCkge1xuICAgICAgaWYgKCFldi5kYXRhIHx8ICFldi5kYXRhLmlkIHx8IGV2LmRhdGEuaWQgIT09IGlkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVwLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGwgYXMgYW55KTtcbiAgICAgIHJlc29sdmUoZXYuZGF0YSk7XG4gICAgfSBhcyBhbnkpO1xuICAgIGlmIChlcC5zdGFydCkge1xuICAgICAgZXAuc3RhcnQoKTtcbiAgICB9XG4gICAgZXAucG9zdE1lc3NhZ2UoeyBpZCwgLi4ubXNnIH0sIHRyYW5zZmVycyk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5ldyBBcnJheSg0KVxuICAgIC5maWxsKDApXG4gICAgLm1hcCgoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikudG9TdHJpbmcoMTYpKVxuICAgIC5qb2luKFwiLVwiKTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFVpbnQzMihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5nZXRVaW50MzIocHRyLCB0cnVlKTsgfVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRVaW50OChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4pOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5nZXRVaW50OChwdHIpOyB9XHJcbiIsICJpbXBvcnQgeyByZWFkVWludDE2IH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MTYuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDMyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50OCB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDguanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG4vKipcclxuICogVE9ETzogQ2FuJ3QgQysrIGlkZW50aWZpZXJzIGluY2x1ZGUgbm9uLUFTQ0lJIGNoYXJhY3RlcnM/IFxyXG4gKiBXaHkgZG8gYWxsIHRoZSB0eXBlIGRlY29kaW5nIGZ1bmN0aW9ucyB1c2UgdGhpcz9cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkTGF0aW4xU3RyaW5nKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGxldCByZXQgPSBcIlwiO1xyXG4gICAgbGV0IG5leHRCeXRlOiBudW1iZXJcclxuICAgIHdoaWxlIChuZXh0Qnl0ZSA9IHJlYWRVaW50OChpbXBsLCBwdHIrKykpIHtcclxuICAgICAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0Qnl0ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG4vLyBOb3RlOiBJbiBXb3JrbGV0cywgYFRleHREZWNvZGVyYCBhbmQgYFRleHRFbmNvZGVyYCBuZWVkIGEgcG9seWZpbGwuXHJcbmxldCB1dGY4RGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcihcInV0Zi04XCIpO1xyXG5sZXQgdXRmMTZEZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLTE2bGVcIik7XHJcbmxldCB1dGY4RW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBudWxsLXRlcm1pbmF0ZWQgVVRGLTggc3RyaW5nLiBJZiB5b3Uga25vdyB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcsIHlvdSBjYW4gc2F2ZSB0aW1lIGJ5IHVzaW5nIGB1dGY4VG9TdHJpbmdMYCBpbnN0ZWFkLlxyXG4gKiBcclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBwdHIgXHJcbiAqIEByZXR1cm5zIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhUb1N0cmluZ1ooaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50OChpbXBsLCBlbmQrKykgIT0gMCk7XHJcblxyXG4gICAgcmV0dXJuIHV0ZjhUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYxNlRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzdGFydCA9IHB0cjtcclxuICAgIGxldCBlbmQgPSBzdGFydDtcclxuXHJcbiAgICB3aGlsZSAocmVhZFVpbnQxNihpbXBsLCBlbmQpICE9IDApIHsgZW5kICs9IDI7IH1cclxuXHJcbiAgICByZXR1cm4gdXRmMTZUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjMyVG9TdHJpbmdaKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gcHRyO1xyXG4gICAgbGV0IGVuZCA9IHN0YXJ0O1xyXG5cclxuICAgIHdoaWxlIChyZWFkVWludDMyKGltcGwsIGVuZCkgIT0gMCkgeyBlbmQgKz0gNDsgfVxyXG5cclxuICAgIHJldHVybiB1dGYzMlRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIGJ5dGVDb3VudDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB1dGY4RGVjb2Rlci5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgYnl0ZUNvdW50KSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjE2VG9TdHJpbmdMKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyLCB3Y2hhckNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHV0ZjE2RGVjb2Rlci5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgd2NoYXJDb3VudCAqIDIpKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMzJUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBjaGFycyA9IChuZXcgVWludDMyQXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgd2NoYXJDb3VudCkpO1xyXG4gICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICBmb3IgKGxldCBjaCBvZiBjaGFycykge1xyXG4gICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1V0Zjgoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICByZXR1cm4gdXRmOEVuY29kZXIuZW5jb2RlKHN0cmluZykuYnVmZmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nVG9VdGYxNihzdHJpbmc6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcclxuICAgIGxldCByZXQgPSBuZXcgVWludDE2QXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGgpKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmV0Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgcmV0W2ldID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0LmJ1ZmZlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmMzIoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICBsZXQgdHJ1ZUxlbmd0aCA9IDA7XHJcbiAgICAvLyBUaGUgd29yc3QtY2FzZSBzY2VuYXJpbyBpcyBhIHN0cmluZyBvZiBhbGwgc3Vycm9nYXRlLXBhaXJzLCBzbyBhbGxvY2F0ZSB0aGF0LlxyXG4gICAgLy8gV2UnbGwgc2hyaW5rIGl0IHRvIHRoZSBhY3R1YWwgc2l6ZSBhZnRlcndhcmRzLlxyXG4gICAgbGV0IHRlbXAgPSBuZXcgVWludDMyQXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGggKiA0ICogMikpO1xyXG4gICAgZm9yIChjb25zdCBjaCBvZiBzdHJpbmcpIHtcclxuICAgICAgICB0ZW1wW3RydWVMZW5ndGhdID0gY2guY29kZVBvaW50QXQoMCkhO1xyXG4gICAgICAgICsrdHJ1ZUxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGVtcC5idWZmZXIuc2xpY2UoMCwgdHJ1ZUxlbmd0aCAqIDQpO1xyXG59XHJcblxyXG4vKipcclxuICogVXNlZCB3aGVuIHNlbmRpbmcgc3RyaW5ncyBmcm9tIEpTIHRvIFdBU00uXHJcbiAqIFxyXG4gKiBcclxuICogQHBhcmFtIHN0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEY4KHN0cjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGxldCBsZW4gPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBsZXQgYyA9IHN0ci5jb2RlUG9pbnRBdChpKSE7XHJcbiAgICAgICAgaWYgKGMgPD0gMHg3RilcclxuICAgICAgICAgICAgbGVuKys7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8PSAweDdGRilcclxuICAgICAgICAgICAgbGVuICs9IDI7XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8PSAweDdGRkYpXHJcbiAgICAgICAgICAgIGxlbiArPSAzO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBsZW4gKz0gNDtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBsZW47XHJcbn0iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRMYXRpbjFTdHJpbmcgfSBmcm9tIFwiLi4vc3RyaW5nLmpzXCI7XHJcblxyXG4vKipcclxuICogUmVnaXN0ZXJpbmcgYSB0eXBlIGlzIGFuIGFzeW5jIGZ1bmN0aW9uIGNhbGxlZCBieSBhIHN5bmMgZnVuY3Rpb24uIFRoaXMgaGFuZGxlcyB0aGUgY29udmVyc2lvbiwgYWRkaW5nIHRoZSBwcm9taXNlIHRvIGBBbGxFbWJpbmRQcm9taXNlc2AuXHJcbiAqIFxyXG4gKiBBbHNvLCBiZWNhdXNlIGV2ZXJ5IHNpbmdsZSByZWdpc3RyYXRpb24gY29tZXMgd2l0aCBhIG5hbWUgdGhhdCBuZWVkcyB0byBiZSBwYXJzZWQsIHRoaXMgYWxzbyBwYXJzZXMgdGhhdCBuYW1lIGZvciB5b3UuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3RlcihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBuYW1lUHRyOiBudW1iZXIsIGZ1bmM6IChuYW1lOiBzdHJpbmcpID0+ICh2b2lkIHwgUHJvbWlzZTx2b2lkPikpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZShpbXBsLCByZWFkTGF0aW4xU3RyaW5nKGltcGwsIG5hbWVQdHIpLCBmdW5jKTtcclxufVxyXG5cclxuLyoqIFxyXG4gKiBTYW1lIGFzIGBfZW1iaW5kX3JlZ2lzdGVyYCwgYnV0IGZvciBrbm93biAob3Igc3ludGhldGljKSBuYW1lcy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgbmFtZTogc3RyaW5nLCBmdW5jOiAobmFtZTogc3RyaW5nKSA9PiAodm9pZCB8IFByb21pc2U8dm9pZD4pKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgcHJvbWlzZTogUHJvbWlzZTx2b2lkPiA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgbGV0IGhhbmRsZSA9IDA7XHJcbiAgICAgICAgLy8gRnVuIGZhY3Q6IHNldFRpbWVvdXQgZG9lc24ndCBleGlzdCBpbiBXb3JrbGV0cyEgXHJcbiAgICAgICAgLy8gSSBndWVzcyBpdCB2YWd1ZWx5IG1ha2VzIHNlbnNlIGluIGEgXCJkZXRlcm1pbmlzbSBpcyBnb29kXCIgd2F5LCBcclxuICAgICAgICAvLyBidXQgaXQgYWxzbyBzZWVtcyBnZW5lcmFsbHkgdXNlZnVsIHRoZXJlP1xyXG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJylcclxuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiB7IGNvbnNvbGUud2FybihgVGhlIGZ1bmN0aW9uIFwiJHtuYW1lfVwiIHVzZXMgYW4gdW5zdXBwb3J0ZWQgYXJndW1lbnQgb3IgcmV0dXJuIHR5cGUsIGFzIGl0cyBkZXBlbmRlbmNpZXMgYXJlIG5vdCByZXNvbHZpbmcuIEl0J3MgdW5saWtlbHkgdGhlIGVtYmluZCBwcm9taXNlIHdpbGwgcmVzb2x2ZS5gKTsgfSwgMTAwMCkgYXMgYW55O1xyXG4gICAgICAgIGF3YWl0IGZ1bmMobmFtZSk7XHJcbiAgICAgICAgaWYgKGhhbmRsZSlcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIEFsbEVtYmluZFByb21pc2VzLnB1c2gocHJvbWlzZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhd2FpdEFsbEVtYmluZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKEFsbEVtYmluZFByb21pc2VzKTtcclxufVxyXG5cclxuY29uc3QgQWxsRW1iaW5kUHJvbWlzZXMgPSBuZXcgQXJyYXk8UHJvbWlzZTx2b2lkPj4oKTtcclxuXHJcbiIsICJpbXBvcnQgeyBhd2FpdEFsbEVtYmluZCB9IGZyb20gXCIuL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEV2ZW50VHlwZXNNYXAgfSBmcm9tIFwiLi9fcHJpdmF0ZS9ldmVudC10eXBlcy1tYXAuanNcIjtcclxuaW1wb3J0IHsgdHlwZSBLbm93bkV4cG9ydHMsIHR5cGUgS25vd25JbXBvcnRzIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcblxyXG5leHBvcnQgdHlwZSBSb2xsdXBXYXNtUHJvbWlzZTxJIGV4dGVuZHMgS25vd25JbXBvcnRzID0gS25vd25JbXBvcnRzPiA9IChpbXBvcnRzPzogSSkgPT4gUHJvbWlzZTxXZWJBc3NlbWJseS5XZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZT47XHJcblxyXG5cclxuXHJcbmludGVyZmFjZSBJbnN0YW50aWF0ZWRXYXNtRXZlbnRUYXJnZXQgZXh0ZW5kcyBFdmVudFRhcmdldCB7XHJcbiAgICBhZGRFdmVudExpc3RlbmVyPEsgZXh0ZW5kcyBrZXlvZiBFdmVudFR5cGVzTWFwPih0eXBlOiBLLCBsaXN0ZW5lcjogKHRoaXM6IEZpbGVSZWFkZXIsIGV2OiBFdmVudFR5cGVzTWFwW0tdKSA9PiBhbnksIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB2b2lkO1xyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcih0eXBlOiBzdHJpbmcsIGNhbGxiYWNrOiBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0IHwgbnVsbCwgb3B0aW9ucz86IEV2ZW50TGlzdGVuZXJPcHRpb25zIHwgYm9vbGVhbik6IHZvaWQ7XHJcbn1cclxuXHJcblxyXG4vLyAgVGhpcyByZWFzc2lnbm1lbnQgaXMgYSBUeXBlc2NyaXB0IGhhY2sgdG8gYWRkIGN1c3RvbSB0eXBlcyB0byBhZGRFdmVudExpc3RlbmVyLi4uXHJcbmNvbnN0IEV2ZW50VGFyZ2V0VyA9IEV2ZW50VGFyZ2V0IGFzIHsgbmV3KCk6IEluc3RhbnRpYXRlZFdhc21FdmVudFRhcmdldDsgcHJvdG90eXBlOiBJbnN0YW50aWF0ZWRXYXNtRXZlbnRUYXJnZXQgfTtcclxuXHJcbi8qKlxyXG4gKiBFeHRlbnNpb24gb2YgYFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlYCB0aGF0IGlzIGFsc28gYW4gYEV2ZW50VGFyZ2V0YCBmb3IgYWxsIFdBU0kgXCJldmVudFwicyAod2hpY2gsIHllcywgaXMgd2h5IHRoaXMgaXMgYW4gZW50aXJlIGBjbGFzc2ApLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEluc3RhbnRpYXRlZFdhc208RXhwb3J0cyBleHRlbmRzIHt9ID0ge30sIEVtYmluZCBleHRlbmRzIHt9ID0ge30+IGV4dGVuZHMgRXZlbnRUYXJnZXRXIGltcGxlbWVudHMgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2Uge1xyXG4gICAgLyoqIFRoZSBgV2ViQXNzZW1ibHkuTW9kdWxlYCB0aGlzIGluc3RhbmNlIHdhcyBidWlsdCBmcm9tLiBSYXJlbHkgdXNlZnVsIGJ5IGl0c2VsZi4gKi9cclxuICAgIHB1YmxpYyBtb2R1bGU6IFdlYkFzc2VtYmx5Lk1vZHVsZTtcclxuXHJcbiAgICAvKiogVGhlIGBXZWJBc3NlbWJseS5Nb2R1bGVgIHRoaXMgaW5zdGFuY2Ugd2FzIGJ1aWx0IGZyb20uIFJhcmVseSB1c2VmdWwgYnkgaXRzZWxmLiAqL1xyXG4gICAgcHVibGljIGluc3RhbmNlOiBXZWJBc3NlbWJseS5JbnN0YW5jZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnRhaW5zIGV2ZXJ5dGhpbmcgZXhwb3J0ZWQgdXNpbmcgZW1iaW5kLlxyXG4gICAgICogXHJcbiAgICAgKiBUaGVzZSBhcmUgc2VwYXJhdGUgZnJvbSByZWd1bGFyIGV4cG9ydHMgb24gYGluc3RhbmNlLmV4cG9ydGAuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBlbWJpbmQ6IEVtYmluZDtcclxuXHJcbiAgICAvKiogXHJcbiAgICAgKiBUaGUgXCJyYXdcIiBXQVNNIGV4cG9ydHMuIE5vbmUgYXJlIHByZWZpeGVkIHdpdGggXCJfXCIuXHJcbiAgICAgKiBcclxuICAgICAqIE5vIGNvbnZlcnNpb24gaXMgcGVyZm9ybWVkIG9uIHRoZSB0eXBlcyBoZXJlOyBldmVyeXRoaW5nIHRha2VzIG9yIHJldHVybnMgYSBudW1iZXIuXHJcbiAgICAgKiBcclxuICAgICAqL1xyXG4gICAgcHVibGljIGV4cG9ydHM6IEV4cG9ydHMgJiBLbm93bkV4cG9ydHM7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBgZXhwb3J0cy5tZW1vcnlgLCBidXQgdXBkYXRlZCB3aGVuL2lmIG1vcmUgbWVtb3J5IGlzIGFsbG9jYXRlZC5cclxuICAgICAqIFxyXG4gICAgICogR2VuZXJhbGx5IHNwZWFraW5nLCBpdCdzIG1vcmUgY29udmVuaWVudCB0byB1c2UgdGhlIGdlbmVyYWwtcHVycG9zZSBgcmVhZFVpbnQzMmAgZnVuY3Rpb25zLFxyXG4gICAgICogc2luY2UgdGhleSBhY2NvdW50IGZvciBgRGF0YVZpZXdgIGJlaW5nIGJpZy1lbmRpYW4gYnkgZGVmYXVsdC5cclxuICAgICAqL1xyXG4gICAgcHVibGljIGNhY2hlZE1lbW9yeVZpZXc6IERhdGFWaWV3O1xyXG5cclxuICAgIC8qKiBcclxuICAgICAqIE5vdCBpbnRlbmRlZCB0byBiZSBjYWxsZWQgZGlyZWN0bHkuIFVzZSB0aGUgc3RhdGljIGBpbnN0YW50aWF0ZWAgZnVuY3Rpb24gaW5zdGVhZCwgd2hpY2ggcmV0dXJucyBvbmUgb2YgdGhlc2UuXHJcbiAgICAgKiBcclxuICAgICAqIEkgd2FudCB0byBpbnN0ZWFkIGp1c3QgcmV0dXJuIGEgcHJvbWlzZSBoZXJlIHNvb29vb29vIGJhZGx5Li4uXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLm1vZHVsZSA9IHRoaXMuaW5zdGFuY2UgPSB0aGlzLmV4cG9ydHMgPSB0aGlzLmNhY2hlZE1lbW9yeVZpZXcgPSBudWxsIVxyXG4gICAgICAgIHRoaXMuZW1iaW5kID0ge30gYXMgbmV2ZXI7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5zdGFudGlhdGVzIGEgV0FTTSBtb2R1bGUgd2l0aCB0aGUgc3BlY2lmaWVkIFdBU0kgaW1wb3J0cy5cclxuICAgICAqIFxyXG4gICAgICogYGlucHV0YCBjYW4gYmUgYW55IG9uZSBvZjpcclxuICAgICAqIFxyXG4gICAgICogKiBgUmVzcG9uc2VgIG9yIGBQcm9taXNlPFJlc3BvbnNlPmAgKGZyb20gZS5nLiBgZmV0Y2hgKS4gVXNlcyBgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmdgLlxyXG4gICAgICogKiBgQXJyYXlCdWZmZXJgIHJlcHJlc2VudGluZyB0aGUgV0FTTSBpbiBiaW5hcnkgZm9ybSwgb3IgYSBgV2ViQXNzZW1ibHkuTW9kdWxlYC4gXHJcbiAgICAgKiAqIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyAxIGFyZ3VtZW50IG9mIHR5cGUgYFdlYkFzc2VtYmx5LkltcG9ydHNgIGFuZCByZXR1cm5zIGEgYFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlYC4gVGhpcyBpcyB0aGUgdHlwZSB0aGF0IGBAcm9sbHVwL3BsdWdpbi13YXNtYCByZXR1cm5zIHdoZW4gYnVuZGxpbmcgYSBwcmUtYnVpbHQgV0FTTSBiaW5hcnkuXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB3YXNtRmV0Y2hQcm9taXNlIFxyXG4gICAgICogQHBhcmFtIHVuYm91bmRJbXBvcnRzIFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgYXN5bmMgaW5zdGFudGlhdGU8RXhwb3J0cyBleHRlbmRzIHt9LCBFbWJpbmQgZXh0ZW5kcyB7fT4od2FzbUZldGNoUHJvbWlzZTogUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4sIHVuYm91bmRJbXBvcnRzOiBLbm93bkltcG9ydHMpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc208RXhwb3J0cywgRW1iaW5kPj47XHJcbiAgICBzdGF0aWMgYXN5bmMgaW5zdGFudGlhdGU8RXhwb3J0cyBleHRlbmRzIHt9LCBFbWJpbmQgZXh0ZW5kcyB7fT4obW9kdWxlQnl0ZXM6IFdlYkFzc2VtYmx5Lk1vZHVsZSB8IEJ1ZmZlclNvdXJjZSwgdW5ib3VuZEltcG9ydHM6IEtub3duSW1wb3J0cyk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzLCBFbWJpbmQ+PjtcclxuICAgIHN0YXRpYyBhc3luYyBpbnN0YW50aWF0ZTxFeHBvcnRzIGV4dGVuZHMge30sIEVtYmluZCBleHRlbmRzIHt9Pih3YXNtSW5zdGFudGlhdG9yOiBSb2xsdXBXYXNtUHJvbWlzZSwgdW5ib3VuZEltcG9ydHM6IEtub3duSW1wb3J0cyk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzLCBFbWJpbmQ+PjtcclxuICAgIHN0YXRpYyBhc3luYyBpbnN0YW50aWF0ZTxFeHBvcnRzIGV4dGVuZHMge30sIEVtYmluZCBleHRlbmRzIHt9Pih3YXNtRGF0YU9yRmV0Y2hlcjogUm9sbHVwV2FzbVByb21pc2UgfCBXZWJBc3NlbWJseS5Nb2R1bGUgfCBCdWZmZXJTb3VyY2UgfCBSZXNwb25zZSB8IFByb21pc2VMaWtlPFJlc3BvbnNlPiwgeyB3YXNpX3NuYXBzaG90X3ByZXZpZXcxLCBlbnYsIC4uLnVuYm91bmRJbXBvcnRzIH06IEtub3duSW1wb3J0cyk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzLCBFbWJpbmQ+PiB7XHJcbiAgICAgICAgLy8gKFRoZXNlIGFyZSBqdXN0IHVwIGhlcmUgdG8gbm90IGdldCBpbiB0aGUgd2F5IG9mIHRoZSBjb21tZW50cylcclxuICAgICAgICBsZXQgd2FzbTogSW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzLCBFbWJpbmQ+O1xyXG4gICAgICAgIGxldCBtb2R1bGU6IFdlYkFzc2VtYmx5Lk1vZHVsZTtcclxuICAgICAgICBsZXQgaW5zdGFuY2U6IFdlYkFzc2VtYmx5Lkluc3RhbmNlO1xyXG5cclxuXHJcbiAgICAgICAgLy8gVGhlcmUncyBhIGJpdCBvZiBzb25nIGFuZCBkYW5jZSB0byBnZXQgYXJvdW5kIHRoZSBmYWN0IHRoYXQ6XHJcbiAgICAgICAgLy8gMS4gV0FTTSBuZWVkcyBpdHMgV0FTSSBpbXBvcnRzIGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi5cclxuICAgICAgICAvLyAyLiBXQVNJIG5lZWRzIGl0cyBXQVNNIGBJbnN0YW5jZWAgaW4gb3JkZXIgdG8gZnVuY3Rpb24uXHJcblxyXG4gICAgICAgIC8vIEZpcnN0LCBiaW5kIGFsbCBvZiBvdXIgaW1wb3J0cyB0byB0aGUgc2FtZSBvYmplY3QsIFxyXG4gICAgICAgIC8vIHdoaWNoIGFsc28gaGFwcGVucyB0byBiZSB0aGUgSW5zdGFudGlhdGVkV2FzbSB3ZSdyZSByZXR1cm5pbmcgKGJ1dCBjb3VsZCB0aGVvcmV0aWNhbGx5IGJlIHNvbWV0aGluZyBlbHNlKS5cclxuICAgICAgICAvLyBUaGlzIGlzIGhvdyB0aGV5J2xsIGJlIGFibGUgdG8gYWNjZXNzIG1lbW9yeSBhbmQgY29tbXVuaWNhdGUgd2l0aCBlYWNoIG90aGVyLlxyXG4gICAgICAgIHdhc20gPSBuZXcgSW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzLCBFbWJpbmQ+KCk7XHJcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IHtcclxuICAgICAgICAgICAgd2FzaV9zbmFwc2hvdF9wcmV2aWV3MTogYmluZEFsbEZ1bmNzKHdhc20sIHdhc2lfc25hcHNob3RfcHJldmlldzEpLFxyXG4gICAgICAgICAgICBlbnY6IGJpbmRBbGxGdW5jcyh3YXNtLCBlbnYpLFxyXG4gICAgICAgICAgICAuLi51bmJvdW5kSW1wb3J0c1xyXG4gICAgICAgIH0gYXMgS25vd25JbXBvcnRzICYgV2ViQXNzZW1ibHkuSW1wb3J0cztcclxuXHJcbiAgICAgICAgLy8gV2UgaGF2ZSB0aG9zZSBpbXBvcnRzLCBhbmQgdGhleSd2ZSBiZWVuIGJvdW5kIHRvIHRoZSB0by1iZS1pbnN0YW50aWF0ZWQgV0FTTS5cclxuICAgICAgICAvLyBOb3cgcGFzcyB0aG9zZSBib3VuZCBpbXBvcnRzIHRvIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlIChvciB3aGF0ZXZlciB0aGUgdXNlciBzcGVjaWZpZWQpXHJcbiAgICAgICAgaWYgKHdhc21EYXRhT3JGZXRjaGVyIGluc3RhbmNlb2YgV2ViQXNzZW1ibHkuTW9kdWxlKSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlID0gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUod2FzbURhdGFPckZldGNoZXIsIGltcG9ydHMpXHJcbiAgICAgICAgICAgIG1vZHVsZSA9IHdhc21EYXRhT3JGZXRjaGVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh3YXNtRGF0YU9yRmV0Y2hlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IEFycmF5QnVmZmVyLmlzVmlldyh3YXNtRGF0YU9yRmV0Y2hlcikpXHJcbiAgICAgICAgICAgICh7IGluc3RhbmNlLCBtb2R1bGUgfSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKHdhc21EYXRhT3JGZXRjaGVyLCBpbXBvcnRzKSk7XHJcbiAgICAgICAgZWxzZSBpZiAoaXNSZXNwb25zZSh3YXNtRGF0YU9yRmV0Y2hlcikpXHJcbiAgICAgICAgICAgICh7IGluc3RhbmNlLCBtb2R1bGUgfSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKHdhc21EYXRhT3JGZXRjaGVyLCBpbXBvcnRzKSk7XHJcblxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgKHsgaW5zdGFuY2UsIG1vZHVsZSB9ID0gYXdhaXQgd2FzbURhdGFPckZldGNoZXIoaW1wb3J0cykpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gRG8gdGhlIHN0dWZmIHdlIGNvdWxkbid0IGRvIGluIHRoZSBgSW5zdGFudGlhdGVkV2FzbWAgY29uc3RydWN0b3IgYmVjYXVzZSB3ZSBkaWRuJ3QgaGF2ZSB0aGVzZSB0aGVuOlxyXG4gICAgICAgIHdhc20uaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgICB3YXNtLm1vZHVsZSA9IG1vZHVsZTtcclxuICAgICAgICB3YXNtLmV4cG9ydHMgPSB3YXNtLmluc3RhbmNlLmV4cG9ydHMgYXMgRXhwb3J0cyBhcyBFeHBvcnRzICYgS25vd25FeHBvcnRzO1xyXG4gICAgICAgIHdhc20uY2FjaGVkTWVtb3J5VmlldyA9IG5ldyBEYXRhVmlldyh3YXNtLmV4cG9ydHMubWVtb3J5LmJ1ZmZlcik7XHJcblxyXG4gICAgICAgIC8vIEFsbW9zdCBkb25lIC0tIG5vdyBydW4gV0FTSSdzIGBfc3RhcnRgIG9yIGBfaW5pdGlhbGl6ZWAgZnVuY3Rpb24uXHJcbiAgICAgICAgY29uc29sZS5hc3NlcnQoKFwiX2luaXRpYWxpemVcIiBpbiB3YXNtLmluc3RhbmNlLmV4cG9ydHMpICE9IFwiX3N0YXJ0XCIgaW4gd2FzbS5pbnN0YW5jZS5leHBvcnRzLCBgRXhwZWN0ZWQgZWl0aGVyIF9pbml0aWFsaXplIFhPUiBfc3RhcnQgdG8gYmUgZXhwb3J0ZWQgZnJvbSB0aGlzIFdBU00uYCk7XHJcbiAgICAgICAgaWYgKFwiX2luaXRpYWxpemVcIiBpbiB3YXNtLmluc3RhbmNlLmV4cG9ydHMpXHJcbiAgICAgICAgICAgICh3YXNtLmluc3RhbmNlLmV4cG9ydHMgYXMgYW55KS5faW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIGVsc2UgaWYgKFwiX3N0YXJ0XCIgaW4gd2FzbS5pbnN0YW5jZS5leHBvcnRzKVxyXG4gICAgICAgICAgICAod2FzbS5pbnN0YW5jZS5leHBvcnRzIGFzIGFueSkuX3N0YXJ0KCk7XHJcblxyXG4gICAgICAgIC8vIFdhaXQgZm9yIGFsbCBFbWJpbmQgY2FsbHMgdG8gcmVzb2x2ZSAodGhleSBgYXdhaXRgIGVhY2ggb3RoZXIgYmFzZWQgb24gdGhlIGRlcGVuZGVuY2llcyB0aGV5IG5lZWQsIGFuZCB0aGlzIHJlc29sdmVzIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBoYXZlIHRvbylcclxuICAgICAgICBhd2FpdCBhd2FpdEFsbEVtYmluZCgpO1xyXG5cclxuICAgICAgICAvLyBBbmQgd2UncmUgZmluYWxseSBmaW5pc2hlZC5cclxuICAgICAgICByZXR1cm4gd2FzbTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gR2l2ZW4gYW4gb2JqZWN0LCBiaW5kcyBlYWNoIGZ1bmN0aW9uIGluIHRoYXQgb2JqZWN0IHRvIHAgKHNoYWxsb3dseSkuXHJcbmZ1bmN0aW9uIGJpbmRBbGxGdW5jczxSIGV4dGVuZHMge30+KHA6IEluc3RhbnRpYXRlZFdhc20sIHI6IFIpOiBSIHtcclxuICAgIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMoT2JqZWN0LmVudHJpZXMocikubWFwKChba2V5LCBmdW5jXSkgPT4geyByZXR1cm4gW2tleSwgKHR5cGVvZiBmdW5jID09IFwiZnVuY3Rpb25cIiA/IGZ1bmMuYmluZChwKSA6IGZ1bmMpXSBhcyBjb25zdDsgfSkpIGFzIFI7XHJcbn1cclxuXHJcbi8vIFNlcGFyYXRlZCBvdXQgZm9yIHR5cGUgcmVhc29ucyBkdWUgdG8gXCJSZXNwb25zZVwiIG5vdCBleGlzdGluZyBpbiBsaW1pdGVkIFdvcmtsZXQtbGlrZSBlbnZpcm9ubWVudHMuXHJcbmZ1bmN0aW9uIGlzUmVzcG9uc2UoYXJnOiBhbnkpOiBhcmcgaXMgUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4geyByZXR1cm4gXCJ0aGVuXCIgaW4gYXJnIHx8IChcIlJlc3BvbnNlXCIgaW4gZ2xvYmFsVGhpcyAmJiBhcmcgaW5zdGFuY2VvZiBSZXNwb25zZSk7IH1cclxuXHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBBbGlnbmZhdWx0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcihcIkFsaWdubWVudCBmYXVsdFwiKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gVXNlZCBieSBTQUZFX0hFQVBcclxuZXhwb3J0IGZ1bmN0aW9uIGFsaWduZmF1bHQodGhpczogSW5zdGFudGlhdGVkV2FzbSk6IG5ldmVyIHtcclxuICAgIHRocm93IG5ldyBBbGlnbmZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFR5cGVJRCB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8VD4gZXh0ZW5kcyBQcm9taXNlV2l0aFJlc29sdmVyczxUPiB7XHJcbiAgICByZXNvbHZlZFZhbHVlOiBUO1xyXG59XHJcbmNvbnN0IERlcGVuZGVuY2llc1RvV2FpdEZvcjogTWFwPFR5cGVJRCwgUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+Pj4gPSBuZXcgTWFwPFR5cGVJRCwgUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8YW55LCBhbnk+Pj4oKTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBwYXJzZWQgdHlwZSBpbmZvLCBjb252ZXJ0ZXJzLCBldGMuIGZvciB0aGUgZ2l2ZW4gQysrIFJUVEkgVHlwZUlEIHBvaW50ZXIuXHJcbiAqXHJcbiAqIFBhc3NpbmcgYSBudWxsIHR5cGUgSUQgaXMgZmluZSBhbmQgd2lsbCBqdXN0IHJlc3VsdCBpbiBhIGBudWxsYCBhdCB0aGF0IHNwb3QgaW4gdGhlIHJldHVybmVkIGFycmF5LlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFR5cGVJbmZvPEUgZXh0ZW5kcyAoRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPGFueSwgYW55PiB8IG51bGwgfCB1bmRlZmluZWQpW10+KC4uLnR5cGVJZHM6IG51bWJlcltdKTogUHJvbWlzZTxFPiB7XHJcblxyXG4gICAgcmV0dXJuIGF3YWl0IFByb21pc2UuYWxsPE5vbk51bGxhYmxlPEVbbnVtYmVyXT4+KHR5cGVJZHMubWFwKGFzeW5jICh0eXBlSWQpOiBQcm9taXNlPE5vbk51bGxhYmxlPEVbbnVtYmVyXT4+ID0+IHtcclxuICAgICAgICBpZiAoIXR5cGVJZClcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsISk7XHJcblxyXG4gICAgICAgIGxldCB3aXRoUmVzb2x2ZXJzID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVycyh0eXBlSWQpO1xyXG4gICAgICAgIHJldHVybiBhd2FpdCAod2l0aFJlc29sdmVycy5wcm9taXNlIGFzIFByb21pc2U8Tm9uTnVsbGFibGU8RVtudW1iZXJdPj4pO1xyXG4gICAgfSkpIGFzIGFueTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERlcGVuZGVuY3lSZXNvbHZlcnModHlwZUlkOiBudW1iZXIpOiBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4+IHtcclxuICAgIGxldCB3aXRoUmVzb2x2ZXJzID0gRGVwZW5kZW5jaWVzVG9XYWl0Rm9yLmdldCh0eXBlSWQpO1xyXG4gICAgaWYgKHdpdGhSZXNvbHZlcnMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICBEZXBlbmRlbmNpZXNUb1dhaXRGb3Iuc2V0KHR5cGVJZCwgd2l0aFJlc29sdmVycyA9IHsgcmVzb2x2ZWRWYWx1ZTogdW5kZWZpbmVkISwgLi4uUHJvbWlzZS53aXRoUmVzb2x2ZXJzPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxhbnksIGFueT4+KCkgfSk7XHJcbiAgICByZXR1cm4gd2l0aFJlc29sdmVycztcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IGdldERlcGVuZGVuY3lSZXNvbHZlcnMgfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNldCBhIHZhbHVlIG9uIHRoZSBgZW1iaW5kYCBvYmplY3QuICBOb3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IHRvIGNhbGwuXHJcbiAqIEBwYXJhbSBpbXBsIFxyXG4gKiBAcGFyYW0gbmFtZSBcclxuICogQHBhcmFtIHZhbHVlIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRW1ib3VuZDxUPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBuYW1lOiBzdHJpbmcsIHZhbHVlOiBUKTogdm9pZCB7XHJcbiAgICAoaW1wbC5lbWJpbmQgYXMgYW55KVtuYW1lXSA9IHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsbCB3aGVuIGEgdHlwZSBpcyByZWFkeSB0byBiZSB1c2VkIGJ5IG90aGVyIHR5cGVzLlxyXG4gKiBcclxuICogRm9yIHRoaW5ncyBsaWtlIGBpbnRgIG9yIGBib29sYCwgdGhpcyBjYW4ganVzdCBiZSBjYWxsZWQgaW1tZWRpYXRlbHkgdXBvbiByZWdpc3RyYXRpb24uXHJcbiAqIEBwYXJhbSBpbmZvIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmFsaXplVHlwZTxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4oaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgbmFtZTogc3RyaW5nLCBwYXJzZWRUeXBlSW5mbzogT21pdDxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+LCBcIm5hbWVcIj4pOiB2b2lkIHtcclxuICAgIGNvbnN0IGluZm8gPSB7IG5hbWUsIC4uLnBhcnNlZFR5cGVJbmZvIH07XHJcbiAgICBsZXQgd2l0aFJlc29sdmVycyA9IGdldERlcGVuZGVuY3lSZXNvbHZlcnMoaW5mby50eXBlSWQpO1xyXG4gICAgd2l0aFJlc29sdmVycy5yZXNvbHZlKHdpdGhSZXNvbHZlcnMucmVzb2x2ZWRWYWx1ZSA9IGluZm8pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBzaXplOiBudW1iZXIsIG1pblJhbmdlOiBiaWdpbnQsIG1heFJhbmdlOiBiaWdpbnQpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgaXNVbnNpZ25lZCA9IChtaW5SYW5nZSA9PT0gMG4pO1xyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IGlzVW5zaWduZWQgPyBmcm9tV2lyZVR5cGVVbnNpZ25lZCA6IGZyb21XaXJlVHlwZVNpZ25lZDtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPGJpZ2ludCwgYmlnaW50Pih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiB2YWx1ZSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZSB9KSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmcm9tV2lyZVR5cGVTaWduZWQod2lyZVZhbHVlOiBiaWdpbnQpIHsgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiBCaWdJbnQod2lyZVZhbHVlKSB9OyB9XHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVVuc2lnbmVkKHdpcmVWYWx1ZTogYmlnaW50KSB7IHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogQmlnSW50KHdpcmVWYWx1ZSkgJiAweEZGRkZfRkZGRl9GRkZGX0ZGRkZuIH0gfSIsICJcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Jvb2wodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIHRydWVWYWx1ZTogMSwgZmFsc2VWYWx1ZTogMCk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBuYW1lID0+IHtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciB8IGJvb2xlYW4sIGJvb2xlYW4+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh3aXJlVmFsdWUpID0+IHsgcmV0dXJuIHsganNWYWx1ZTogISF3aXJlVmFsdWUsIHdpcmVWYWx1ZSB9OyB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4geyByZXR1cm4geyB3aXJlVmFsdWU6IG8gPyB0cnVlVmFsdWUgOiBmYWxzZVZhbHVlLCBqc1ZhbHVlOiBvIH07IH0sXHJcbiAgICAgICAgfSlcclxuICAgIH0pXHJcbn1cclxuIiwgIlxyXG5leHBvcnQgZnVuY3Rpb24gcmVuYW1lRnVuY3Rpb248VCBleHRlbmRzICgoLi4uYXJnczogYW55W10pID0+IGFueSkgfCBGdW5jdGlvbj4obmFtZTogc3RyaW5nLCBib2R5OiBUKTogVCB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGJvZHksICduYW1lJywgeyB2YWx1ZTogbmFtZSB9KTtcclxufVxyXG4iLCAiLy8gVGhlc2UgYXJlIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGhhdmUgYmVlbiByZWdpc3RlcmVkLCBhY2Nlc3NlZCBieSB0aGVpciBSVFRJIFR5cGVJZFxyXG4vLyBJdCdzIG9mZiBpbiBpdHMgb3duIGZpbGUgdG8ga2VlcCBpdCBwcml2YXRlLlxyXG5leHBvcnQgY29uc3QgRW1ib3VuZENsYXNzZXM6IFJlY29yZDxudW1iZXIsIHR5cGVvZiBFbWJvdW5kQ2xhc3M+ID0ge307XHJcblxyXG5cclxuLy8gVGhpcyBpcyBhIHJ1bm5pbmcgbGlzdCBvZiBhbGwgdGhlIGluc3RhbnRpYXRlZCBjbGFzc2VzLCBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuY29uc3QgaW5zdGFudGlhdGVkQ2xhc3NlcyA9IG5ldyBNYXA8bnVtYmVyLCBXZWFrUmVmPEVtYm91bmRDbGFzcz4+KCk7XHJcblxyXG4vLyBUaGlzIGtlZXBzIHRyYWNrIG9mIGFsbCBkZXN0cnVjdG9ycyBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuLy8gVXNlZCBmb3IgRmluYWxpemF0aW9uUmVnaXN0cnkgYW5kIHRoZSBkZXN0cnVjdG9yIGl0c2VsZi5cclxuY29uc3QgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkID0gbmV3IE1hcDxudW1iZXIsICgpID0+IHZvaWQ+KCk7XHJcblxyXG4vLyBVc2VkIHRvIGVuc3VyZSBubyBvbmUgYnV0IHRoZSB0eXBlIGNvbnZlcnRlcnMgY2FuIHVzZSB0aGUgc2VjcmV0IHBvaW50ZXIgY29uc3RydWN0b3IuXHJcbmV4cG9ydCBjb25zdCBTZWNyZXQ6IFN5bWJvbCA9IFN5bWJvbCgpO1xyXG5leHBvcnQgY29uc3QgU2VjcmV0Tm9EaXNwb3NlOiBTeW1ib2wgPSBTeW1ib2woKTtcclxuXHJcbi8vIFRPRE86IFRoaXMgbmVlZHMgcHJvcGVyIHRlc3RpbmcsIG9yIHBvc3NpYmx5IGV2ZW4ganVzdGlmaWNhdGlvbiBmb3IgaXRzIGV4aXN0ZW5jZS5cclxuLy8gSSdtIHByZXR0eSBzdXJlIG9ubHkgSlMgaGVhcCBwcmVzc3VyZSB3aWxsIGludm9rZSBhIGNhbGxiYWNrLCBtYWtpbmcgaXQga2luZCBvZiBcclxuLy8gcG9pbnRsZXNzIGZvciBDKysgY2xlYW51cCwgd2hpY2ggaGFzIG5vIGludGVyYWN0aW9uIHdpdGggdGhlIEpTIGhlYXAuXHJcbmNvbnN0IHJlZ2lzdHJ5ID0gbmV3IEZpbmFsaXphdGlvblJlZ2lzdHJ5KChfdGhpczogbnVtYmVyKSA9PiB7XHJcbiAgICBjb25zb2xlLndhcm4oYFdBU00gY2xhc3MgYXQgYWRkcmVzcyAke190aGlzfSB3YXMgbm90IHByb3Blcmx5IGRpc3Bvc2VkLmApO1xyXG4gICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldChfdGhpcyk/LigpO1xyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBCYXNlIGNsYXNzIGZvciBhbGwgRW1iaW5kLWVuYWJsZWQgY2xhc3Nlcy5cclxuICpcclxuICogSW4gZ2VuZXJhbCwgaWYgdHdvIChxdW90ZS11bnF1b3RlKSBcImluc3RhbmNlc1wiIG9mIHRoaXMgY2xhc3MgaGF2ZSB0aGUgc2FtZSBgX3RoaXNgIHBvaW50ZXIsXHJcbiAqIHRoZW4gdGhleSB3aWxsIGNvbXBhcmUgZXF1YWxseSB3aXRoIGA9PWAsIGFzIGlmIGNvbXBhcmluZyBhZGRyZXNzZXMgaW4gQysrLlxyXG4gKi9cclxuXHJcbmV4cG9ydCBjbGFzcyBFbWJvdW5kQ2xhc3Mge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHRyYW5zZm9ybWVkIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgdGFrZXMgSlMgYXJndW1lbnRzIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3NcclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9jb25zdHJ1Y3RvcjogKC4uLmFyZ3M6IGFueVtdKSA9PiBFbWJvdW5kQ2xhc3M7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBc3NpZ25lZCBieSB0aGUgZGVyaXZlZCBjbGFzcyB3aGVuIHRoYXQgY2xhc3MgaXMgcmVnaXN0ZXJlZC5cclxuICAgICAqXHJcbiAgICAgKiBUaGlzIG9uZSBpcyBub3QgdHJhbnNmb3JtZWQgYmVjYXVzZSBpdCBvbmx5IHRha2VzIGEgcG9pbnRlciBhbmQgcmV0dXJucyBub3RoaW5nLlxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgX2Rlc3RydWN0b3I6IChfdGhpczogbnVtYmVyKSA9PiB2b2lkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHBvaW50ZXIgdG8gdGhlIGNsYXNzIGluIFdBU00gbWVtb3J5OyB0aGUgc2FtZSBhcyB0aGUgQysrIGB0aGlzYCBwb2ludGVyLlxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgX3RoaXMhOiBudW1iZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcclxuICAgICAgICBjb25zdCBDcmVhdGVkRnJvbVdhc20gPSAoYXJncy5sZW5ndGggPT09IDIgJiYgKGFyZ3NbMF0gPT09IFNlY3JldCB8fCBhcmdzWzBdID09IFNlY3JldE5vRGlzcG9zZSkgJiYgdHlwZW9mIGFyZ3NbMV0gPT09ICdudW1iZXInKTtcclxuXHJcbiAgICAgICAgaWYgKCFDcmVhdGVkRnJvbVdhc20pIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gSlMuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFVubGlrZSBhIG5vcm1hbCBjb25zdHJ1Y3Rvciwgd2UgZGVsZWdhdGUgdGhlIGNsYXNzIGNyZWF0aW9uIHRvXHJcbiAgICAgICAgICAgICAqIGEgY29tYmluYXRpb24gb2YgX2NvbnN0cnVjdG9yIGFuZCBgZnJvbVdpcmVUeXBlYC5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogYF9jb25zdHJ1Y3RvcmAgd2lsbCBjYWxsIHRoZSBDKysgY29kZSB0aGF0IGFsbG9jYXRlcyBtZW1vcnksXHJcbiAgICAgICAgICAgICAqIGluaXRpYWxpemVzIHRoZSBjbGFzcywgYW5kIHJldHVybnMgaXRzIGB0aGlzYCBwb2ludGVyLFxyXG4gICAgICAgICAgICAgKiB3aGlsZSBgZnJvbVdpcmVUeXBlYCwgY2FsbGVkIGFzIHBhcnQgb2YgdGhlIGdsdWUtY29kZSBwcm9jZXNzLFxyXG4gICAgICAgICAgICAgKiB3aWxsIGFjdHVhbGx5IGluc3RhbnRpYXRlIHRoaXMgY2xhc3MuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIChJbiBvdGhlciB3b3JkcywgdGhpcyBwYXJ0IHJ1bnMgZmlyc3QsIHRoZW4gdGhlIGBlbHNlYCBiZWxvdyBydW5zKVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmV0dXJuIG5ldy50YXJnZXQuX2NvbnN0cnVjdG9yKC4uLmFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gQysrLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBXZSBnZXQgaGVyZSB2aWEgYGZyb21XaXJlVHlwZWAsIG1lYW5pbmcgdGhhdCB0aGVcclxuICAgICAgICAgICAgICogY2xhc3MgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWQgaW4gQysrLCBhbmQgd2VcclxuICAgICAgICAgICAgICoganVzdCBuZWVkIG91ciBcImhhbmRsZVwiIHRvIGl0IGluIEpTLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgY29uc3QgX3RoaXMgPSBhcmdzWzFdO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCBfdGhpcyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBTZWNyZXROb0Rpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSBuZXcudGFyZ2V0Ll9kZXN0cnVjdG9yO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5zZXQoX3RoaXMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0cnVjdG9yKF90aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW50aWF0ZWRDbGFzc2VzLmRlbGV0ZShfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgW1N5bWJvbC5kaXNwb3NlXSgpOiB2b2lkIHtcclxuICAgICAgICAvLyBPbmx5IHJ1biB0aGUgZGVzdHJ1Y3RvciBpZiB3ZSBvdXJzZWx2ZXMgY29uc3RydWN0ZWQgdGhpcyBjbGFzcyAoYXMgb3Bwb3NlZCB0byBgaW5zcGVjdGBpbmcgaXQpXHJcbiAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9IGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgaWYgKGRlc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgZGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKT8uKCk7XHJcbiAgICAgICAgICAgIGRlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5kZWxldGUodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIFxyXG4gKiBJbnN0ZWFkIG9mIGluc3RhbnRpYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgXHJcbiAqIHlvdSBjYW4gaW5zcGVjdCBhbiBleGlzdGluZyBwb2ludGVyIGluc3RlYWQuXHJcbiAqXHJcbiAqIFRoaXMgaXMgbWFpbmx5IGludGVuZGVkIGZvciBzaXR1YXRpb25zIHRoYXQgRW1iaW5kIGRvZXNuJ3Qgc3VwcG9ydCxcclxuICogbGlrZSBhcnJheS1vZi1zdHJ1Y3RzLWFzLWEtcG9pbnRlci5cclxuICogXHJcbiAqIEJlIGF3YXJlIHRoYXQgdGhlcmUncyBubyBsaWZldGltZSB0cmFja2luZyBpbnZvbHZlZCwgc29cclxuICogbWFrZSBzdXJlIHlvdSBkb24ndCBrZWVwIHRoaXMgdmFsdWUgYXJvdW5kIGFmdGVyIHRoZVxyXG4gKiBwb2ludGVyJ3MgYmVlbiBpbnZhbGlkYXRlZC4gXHJcbiAqIFxyXG4gKiAqKkRvIG5vdCBjYWxsIFtTeW1ib2wuZGlzcG9zZV0qKiBvbiBhbiBpbnNwZWN0ZWQgY2xhc3MsXHJcbiAqIHNpbmNlIHRoZSBhc3N1bXB0aW9uIGlzIHRoYXQgdGhlIEMrKyBjb2RlIG93bnMgdGhhdCBwb2ludGVyXHJcbiAqIGFuZCB3ZSdyZSBqdXN0IGxvb2tpbmcgYXQgaXQsIHNvIGRlc3Ryb3lpbmcgaXQgd291bGQgYmUgcnVkZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNwZWN0Q2xhc3NCeVBvaW50ZXI8VD4ocG9pbnRlcjogbnVtYmVyKTogVCB7XHJcbiAgICByZXR1cm4gbmV3IEVtYm91bmRDbGFzcyhTZWNyZXROb0Rpc3Bvc2UsIHBvaW50ZXIpIGFzIFQ7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGFibGVGdW5jdGlvbjxUIGV4dGVuZHMgRnVuY3Rpb24+KGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHNpZ25hdHVyZVB0cjogbnVtYmVyLCBmdW5jdGlvbkluZGV4OiBudW1iZXIpOiBUIHtcclxuICAgIGNvbnN0IGZwID0gaW1wbC5leHBvcnRzLl9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUuZ2V0KGZ1bmN0aW9uSW5kZXgpO1xyXG4gICAgY29uc29sZS5hc3NlcnQodHlwZW9mIGZwID09IFwiZnVuY3Rpb25cIik7XHJcbiAgICByZXR1cm4gZnAgYXMgVDtcclxufSIsICJpbXBvcnQgeyByZW5hbWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzcywgRW1ib3VuZENsYXNzZXMsIFNlY3JldCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFdpcmVDb252ZXJzaW9uUmVzdWx0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuZXhwb3J0IHsgaW5zcGVjdENsYXNzQnlQb2ludGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MoXHJcbiAgICB0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3VHlwZTogbnVtYmVyLFxyXG4gICAgcmF3UG9pbnRlclR5cGU6IG51bWJlcixcclxuICAgIHJhd0NvbnN0UG9pbnRlclR5cGU6IG51bWJlcixcclxuICAgIGJhc2VDbGFzc1Jhd1R5cGU6IG51bWJlcixcclxuICAgIGdldEFjdHVhbFR5cGVTaWduYXR1cmU6IG51bWJlcixcclxuICAgIGdldEFjdHVhbFR5cGVQdHI6IG51bWJlcixcclxuICAgIHVwY2FzdFNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgdXBjYXN0UHRyOiBudW1iZXIsXHJcbiAgICBkb3duY2FzdFNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgZG93bmNhc3RQdHI6IG51bWJlcixcclxuICAgIG5hbWVQdHI6IG51bWJlcixcclxuICAgIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlcixcclxuICAgIHJhd0Rlc3RydWN0b3JQdHI6IG51bWJlcik6IHZvaWQge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTm90ZTogX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyBkb2Vzbid0IGhhdmUgYSBjb3JyZXNwb25kaW5nIGBmaW5hbGl6ZWAgdmVyc2lvbixcclxuICAgICAqIGxpa2UgdmFsdWVfYXJyYXkgYW5kIHZhbHVlX29iamVjdCBoYXZlLCB3aGljaCBpcyBmaW5lIEkgZ3Vlc3M/XHJcbiAgICAgKiBcclxuICAgICAqIEJ1dCBpdCBtZWFucyB0aGF0IHdlIGNhbid0IGp1c3QgY3JlYXRlIGEgY2xhc3MgcHJlLWluc3RhbGxlZCB3aXRoIGV2ZXJ5dGhpbmcgaXQgbmVlZHMtLVxyXG4gICAgICogd2UgbmVlZCB0byBhZGQgbWVtYmVyIGZ1bmN0aW9ucyBhbmQgcHJvcGVydGllcyBhbmQgc3VjaCBhcyB3ZSBnZXQgdGhlbSwgYW5kIHdlXHJcbiAgICAgKiBuZXZlciByZWFsbHkga25vdyB3aGVuIHdlJ3JlIGRvbmUuXHJcbiAgICAgKi9cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmF3RGVzdHJ1Y3Rvckludm9rZXIgPSBnZXRUYWJsZUZ1bmN0aW9uPChfdGhpczogbnVtYmVyKSA9PiB2b2lkPih0aGlzLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yUHRyKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETyg/KSBJdCdzIHByb2JhYmx5IG5vdCBuZWNlc3NhcnkgdG8gaGF2ZSBFbWJvdW5kQ2xhc3NlcyBhbmQgdGhpcy5lbWJpbmQgYmFzaWNhbGx5IGJlIHRoZSBzYW1lIGV4YWN0IHRoaW5nLlxyXG4gICAgICAgIEVtYm91bmRDbGFzc2VzW3Jhd1R5cGVdID0gKHRoaXMuZW1iaW5kIGFzIGFueSlbbmFtZV0gPSByZW5hbWVGdW5jdGlvbihuYW1lLFxyXG4gICAgICAgICAgICAvLyBVbmxpa2UgdGhlIGNvbnN0cnVjdG9yLCB0aGUgZGVzdHJ1Y3RvciBpcyBrbm93biBlYXJseSBlbm91Z2ggdG8gYXNzaWduIG5vdy5cclxuICAgICAgICAgICAgLy8gUHJvYmFibHkgYmVjYXVzZSBkZXN0cnVjdG9ycyBjYW4ndCBiZSBvdmVybG9hZGVkIGJ5IGFueXRoaW5nIHNvIHRoZXJlJ3Mgb25seSBldmVyIG9uZS5cclxuICAgICAgICAgICAgLy8gQW55d2F5LCBhc3NpZ24gaXQgdG8gdGhpcyBuZXcgY2xhc3MuXHJcbiAgICAgICAgICAgIGNsYXNzIGV4dGVuZHMgRW1ib3VuZENsYXNzIHtcclxuICAgICAgICAgICAgICAgIHN0YXRpYyBfZGVzdHJ1Y3RvciA9IHJhd0Rlc3RydWN0b3JJbnZva2VyO1xyXG4gICAgICAgICAgICB9IGFzIGFueSk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGZyb21XaXJlVHlwZShfdGhpczogbnVtYmVyKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+IHsgY29uc3QganNWYWx1ZSA9IG5ldyBFbWJvdW5kQ2xhc3Nlc1tyYXdUeXBlXShTZWNyZXQsIF90aGlzKTsgcmV0dXJuIHsgd2lyZVZhbHVlOiBfdGhpcywganNWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiBqc1ZhbHVlW1N5bWJvbC5kaXNwb3NlXSgpIH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHRvV2lyZVR5cGUoanNPYmplY3Q6IEVtYm91bmRDbGFzcyk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PG51bWJlciwgRW1ib3VuZENsYXNzPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IChqc09iamVjdCBhcyBhbnkpLl90aGlzLFxyXG4gICAgICAgICAgICAgICAganNWYWx1ZToganNPYmplY3QsXHJcbiAgICAgICAgICAgICAgICAvLyBOb3RlOiBubyBkZXN0cnVjdG9ycyBmb3IgYW55IG9mIHRoZXNlLFxyXG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSB0aGV5J3JlIGp1c3QgZm9yIHZhbHVlLXR5cGVzLWFzLW9iamVjdC10eXBlcy5cclxuICAgICAgICAgICAgICAgIC8vIEFkZGluZyBpdCBoZXJlIHdvdWxkbid0IHdvcmsgcHJvcGVybHksIGJlY2F1c2UgaXQgYXNzdW1lc1xyXG4gICAgICAgICAgICAgICAgLy8gd2Ugb3duIHRoZSBvYmplY3QgKHdoZW4gY29udmVydGluZyBmcm9tIGEgSlMgc3RyaW5nIHRvIHN0ZDo6c3RyaW5nLCB3ZSBlZmZlY3RpdmVseSBkbywgYnV0IG5vdCBoZXJlKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gV2lzaCBvdGhlciB0eXBlcyBpbmNsdWRlZCBwb2ludGVyIFR5cGVJRHMgd2l0aCB0aGVtIHRvby4uLlxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgbmFtZSwgeyB0eXBlSWQ6IHJhd1R5cGUsIGZyb21XaXJlVHlwZSwgdG9XaXJlVHlwZSB9KTtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+KHRoaXMsIGAke25hbWV9KmAsIHsgdHlwZUlkOiByYXdQb2ludGVyVHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgYCR7bmFtZX0gY29uc3QqYCwgeyB0eXBlSWQ6IHJhd0NvbnN0UG9pbnRlclR5cGUsIGZyb21XaXJlVHlwZSwgdG9XaXJlVHlwZSB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJcclxuZXhwb3J0IGZ1bmN0aW9uIHJ1bkRlc3RydWN0b3JzKGRlc3RydWN0b3JzOiAoKCkgPT4gdm9pZClbXSk6IHZvaWQge1xyXG4gICAgd2hpbGUgKGRlc3RydWN0b3JzLmxlbmd0aCkge1xyXG4gICAgICAgIGRlc3RydWN0b3JzLnBvcCgpISgpO1xyXG4gICAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgcmVuYW1lRnVuY3Rpb24gfSBmcm9tIFwiLi9jcmVhdGUtbmFtZWQtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kQ2xhc3MgfSBmcm9tIFwiLi9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgZ2V0VHlwZUluZm8gfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBKUyBmdW5jdGlvbiB0aGF0IGNhbGxzIGEgQysrIGZ1bmN0aW9uLCBhY2NvdW50aW5nIGZvciBgdGhpc2AgdHlwZXMgYW5kIGNvbnRleHQuXHJcbiAqIFxyXG4gKiBJdCBjb252ZXJ0cyBhbGwgYXJndW1lbnRzIGJlZm9yZSBwYXNzaW5nIHRoZW0sIGFuZCBjb252ZXJ0cyB0aGUgcmV0dXJuIHR5cGUgYmVmb3JlIHJldHVybmluZy5cclxuICogXHJcbiAqIEBwYXJhbSBpbXBsIFxyXG4gKiBAcGFyYW0gYXJnVHlwZUlkcyBBbGwgUlRUSSBUeXBlSWRzLCBpbiB0aGUgb3JkZXIgb2YgW1JldFR5cGUsIFRoaXNUeXBlLCAuLi5BcmdUeXBlc10uIFRoaXNUeXBlIGNhbiBiZSBudWxsIGZvciBzdGFuZGFsb25lIGZ1bmN0aW9ucy5cclxuICogQHBhcmFtIGludm9rZXJTaWduYXR1cmUgQSBwb2ludGVyIHRvIHRoZSBzaWduYXR1cmUgc3RyaW5nLlxyXG4gKiBAcGFyYW0gaW52b2tlckluZGV4IFRoZSBpbmRleCB0byB0aGUgaW52b2tlciBmdW5jdGlvbiBpbiB0aGUgYFdlYkFzc2VtYmx5LlRhYmxlYC5cclxuICogQHBhcmFtIGludm9rZXJDb250ZXh0IFRoZSBjb250ZXh0IHBvaW50ZXIgdG8gdXNlLCBpZiBhbnkuXHJcbiAqIEByZXR1cm5zIFxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUdsdWVGdW5jdGlvbjxGIGV4dGVuZHMgKCguLi5hcmdzOiBhbnlbXSkgPT4gYW55KSB8IEZ1bmN0aW9uPihcclxuICAgIGltcGw6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICByZXR1cm5UeXBlSWQ6IG51bWJlcixcclxuICAgIGFyZ1R5cGVJZHM6IG51bWJlcltdLFxyXG4gICAgaW52b2tlclNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyIHwgbnVsbFxyXG4pOiBQcm9taXNlPEY+IHtcclxuXHJcbiAgICB0eXBlIFIgPSBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V2lyZVR5cGVzLCBhbnk+O1xyXG4gICAgdHlwZSBBcmdUeXBlcyA9IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIGFueT5bXTtcclxuXHJcblxyXG4gICAgY29uc3QgW3JldHVyblR5cGUsIC4uLmFyZ1R5cGVzXSA9IGF3YWl0IGdldFR5cGVJbmZvPFtSLCAuLi5BcmdUeXBlc10+KHJldHVyblR5cGVJZCwgLi4uYXJnVHlwZUlkcyk7XHJcbiAgICBjb25zdCByYXdJbnZva2VyID0gZ2V0VGFibGVGdW5jdGlvbjwoLi4uYXJnczogV2lyZVR5cGVzW10pID0+IGFueT4oaW1wbCwgaW52b2tlclNpZ25hdHVyZSwgaW52b2tlckluZGV4KTtcclxuXHJcblxyXG4gICAgcmV0dXJuIHJlbmFtZUZ1bmN0aW9uKG5hbWUsIGZ1bmN0aW9uICh0aGlzOiBFbWJvdW5kQ2xhc3MsIC4uLmpzQXJnczogYW55W10pIHtcclxuICAgICAgICBjb25zdCB3aXJlZFRoaXMgPSB0aGlzID8gdGhpcy5fdGhpcyA6IHVuZGVmaW5lZDtcclxuICAgICAgICBjb25zdCB3aXJlZEFyZ3M6IFdpcmVUeXBlc1tdID0gW107XHJcbiAgICAgICAgY29uc3Qgc3RhY2tCYXNlZERlc3RydWN0b3JzOiAoKCkgPT4gdm9pZClbXSA9IFtdOyAgIC8vIFVzZWQgdG8gcHJldGVuZCBsaWtlIHdlJ3JlIGEgcGFydCBvZiB0aGUgV0FTTSBzdGFjaywgd2hpY2ggd291bGQgZGVzdHJveSB0aGVzZSBvYmplY3RzIGFmdGVyd2FyZHMuXHJcblxyXG4gICAgICAgIGlmIChpbnZva2VyQ29udGV4dClcclxuICAgICAgICAgICAgd2lyZWRBcmdzLnB1c2goaW52b2tlckNvbnRleHQpO1xyXG4gICAgICAgIGlmICh3aXJlZFRoaXMpXHJcbiAgICAgICAgICAgIHdpcmVkQXJncy5wdXNoKHdpcmVkVGhpcyk7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgZWFjaCBKUyBhcmd1bWVudCB0byBpdHMgV0FTTSBlcXVpdmFsZW50IChnZW5lcmFsbHkgYSBwb2ludGVyLCBvciBpbnQvZmxvYXQpXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdUeXBlcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gYXJnVHlwZXNbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IGFyZyA9IGpzQXJnc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gdHlwZS50b1dpcmVUeXBlKGFyZyk7XHJcbiAgICAgICAgICAgIHdpcmVkQXJncy5wdXNoKHdpcmVWYWx1ZSk7XHJcbiAgICAgICAgICAgIGlmIChzdGFja0Rlc3RydWN0b3IpXHJcbiAgICAgICAgICAgICAgICBzdGFja0Jhc2VkRGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3IoanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGaW5hbGx5LCBjYWxsIHRoZSBcInJhd1wiIFdBU00gZnVuY3Rpb25cclxuICAgICAgICBsZXQgd2lyZWRSZXR1cm46IFdpcmVUeXBlcyA9IHJhd0ludm9rZXIoLi4ud2lyZWRBcmdzKTtcclxuXHJcbiAgICAgICAgLy8gU3RpbGwgcHJldGVuZGluZyB3ZSdyZSBhIHBhcnQgb2YgdGhlIHN0YWNrLCBcclxuICAgICAgICAvLyBub3cgZGVzdHJ1Y3QgZXZlcnl0aGluZyB3ZSBcInB1c2hlZFwiIG9udG8gaXQuXHJcbiAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoc3RhY2tCYXNlZERlc3RydWN0b3JzKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB3aGF0ZXZlciB0aGUgV0FTTSBmdW5jdGlvbiByZXR1cm5lZCB0byBhIEpTIHJlcHJlc2VudGF0aW9uXHJcbiAgICAgICAgLy8gSWYgdGhlIG9iamVjdCByZXR1cm5lZCBpcyBEaXNwb3NhYmxlLCB0aGVuIHdlIGxldCB0aGUgdXNlciBkaXNwb3NlIG9mIGl0XHJcbiAgICAgICAgLy8gd2hlbiByZWFkeS5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIE90aGVyd2lzZSAobmFtZWx5IHN0cmluZ3MpLCBkaXNwb3NlIGl0cyBvcmlnaW5hbCByZXByZXNlbnRhdGlvbiBub3cuXHJcbiAgICAgICAgaWYgKHJldHVyblR5cGUgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gcmV0dXJuVHlwZT8uZnJvbVdpcmVUeXBlKHdpcmVkUmV0dXJuKTtcclxuICAgICAgICBpZiAoc3RhY2tEZXN0cnVjdG9yICYmICEoanNWYWx1ZSAmJiB0eXBlb2YganNWYWx1ZSA9PSBcIm9iamVjdFwiICYmIChTeW1ib2wuZGlzcG9zZSBpbiBqc1ZhbHVlKSkpXHJcbiAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3Rvcihqc1ZhbHVlLCB3aXJlVmFsdWUpO1xyXG5cclxuICAgICAgICByZXR1cm4ganNWYWx1ZTtcclxuXHJcbiAgICB9IGFzIEYpO1xyXG59XHJcbiIsICJcclxuZXhwb3J0IHR5cGUgSXM2NCA9IGZhbHNlO1xyXG5leHBvcnQgY29uc3QgSXM2NCA9IGZhbHNlO1xyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgSXM2NCB9IGZyb20gXCIuL2lzLTY0LmpzXCI7XHJcblxyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBQb2ludGVyU2l6ZTogNCB8IDggPSAoSXM2NCA/IDggOiA0KTtcclxuZXhwb3J0IGNvbnN0IGdldFBvaW50ZXI6IFwiZ2V0QmlnVWludDY0XCIgfCBcImdldFVpbnQzMlwiID0gKElzNjQgPyBcImdldEJpZ1VpbnQ2NFwiIDogXCJnZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgY29uc3Qgc2V0UG9pbnRlcjogXCJzZXRCaWdVaW50NjRcIiB8IFwic2V0VWludDMyXCIgPSAoSXM2NCA/IFwic2V0QmlnVWludDY0XCIgOiBcInNldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG9pbnRlclNpemUoX2luc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtKTogNCB7IHJldHVybiBQb2ludGVyU2l6ZSBhcyA0OyB9IiwgImltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgZ2V0UG9pbnRlciB9IGZyb20gXCIuL3BvaW50ZXIuanNcIjtcclxuXHJcblxyXG4vKipcclxuICogU2FtZSBhcyBgcmVhZFVpbnQzMmAsIGJ1dCB0eXBlZCBmb3IgcG9pbnRlcnMsIGFuZCBmdXR1cmUtcHJvb2ZzIGFnYWluc3QgNjQtYml0IGFyY2hpdGVjdHVyZXMuXHJcbiAqIFxyXG4gKiBUaGlzIGlzICpub3QqIHRoZSBzYW1lIGFzIGRlcmVmZXJlbmNpbmcgYSBwb2ludGVyLiBUaGlzIGlzIGFib3V0IHJlYWRpbmcgdGhlIG51bWVyaWNhbCB2YWx1ZSBhdCBhIGdpdmVuIGFkZHJlc3MgdGhhdCBpcywgaXRzZWxmLCB0byBiZSBpbnRlcnByZXRlZCBhcyBhIHBvaW50ZXIuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFBvaW50ZXIoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogUG9pbnRlcjxudW1iZXI+KTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbZ2V0UG9pbnRlcl0ocHRyLCB0cnVlKSBhcyBudW1iZXI7IH1cclxuIiwgImltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uLy4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkUG9pbnRlciB9IGZyb20gXCIuLi8uLi91dGlsL3JlYWQtcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYWxseSwgRW1iaW5kIGZ1bmN0aW9ucyBpbmNsdWRlIGFuIGFycmF5IG9mIFJUVEkgVHlwZUlkcyBpbiB0aGUgZm9ybSBvZlxyXG4gKiBbUmV0VHlwZSwgVGhpc1R5cGU/LCAuLi5BcmdUeXBlc11cclxuICogXHJcbiAqIFRoaXMgcmV0dXJucyB0aGF0IGFycmF5IG9mIHR5cGVJZHMgZm9yIGEgZ2l2ZW4gZnVuY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFycmF5T2ZUeXBlcyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBjb3VudDogbnVtYmVyLCByYXdBcmdUeXBlc1B0cjogbnVtYmVyKTogbnVtYmVyW10ge1xyXG4gICAgY29uc3QgcmV0OiBudW1iZXJbXSA9IFtdO1xyXG4gICAgY29uc3QgcG9pbnRlclNpemUgPSBnZXRQb2ludGVyU2l6ZShpbXBsKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcclxuICAgICAgICByZXQucHVzaChyZWFkUG9pbnRlcihpbXBsLCByYXdBcmdUeXBlc1B0ciArIGkgKiBwb2ludGVyU2l6ZSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldDtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kQ2xhc3NlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyByZWFkQXJyYXlPZlR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgbWV0aG9kTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBpc0FzeW5jOiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbWV0aG9kTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICAoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpKVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZSh0aGlzLCBcIjxjb25zdHJ1Y3Rvcj5cIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdIGFzIGFueSkpLl9jb25zdHJ1Y3RvciA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBcIjxjb25zdHJ1Y3Rvcj5cIiwgcmV0dXJuVHlwZUlkLCBhcmdUeXBlSWRzLCBpbnZva2VyU2lnbmF0dXJlUHRyLCBpbnZva2VySW5kZXgsIGludm9rZXJDb250ZXh0KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBtZXRob2ROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlciwgLy8gW1JldHVyblR5cGUsIFRoaXNUeXBlLCBBcmdzLi4uXVxyXG4gICAgaW52b2tlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyLFxyXG4gICAgaXNQdXJlVmlydHVhbDogbnVtYmVyLFxyXG4gICAgaXNBc3luYzogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgdGhpc1R5cGVJZCwgLi4uYXJnVHlwZUlkc10gPSByZWFkQXJyYXlPZlR5cGVzKHRoaXMsIGFyZ0NvdW50LCByYXdBcmdUeXBlc1B0cik7XHJcbiAgICAvL2NvbnNvbGUuYXNzZXJ0KHRoaXNUeXBlSWQgIT0gcmF3Q2xhc3NUeXBlSWQsYEludGVybmFsIGVycm9yOyBleHBlY3RlZCB0aGUgUlRUSSBwb2ludGVycyBmb3IgdGhlIGNsYXNzIHR5cGUgYW5kIGl0cyBwb2ludGVyIHR5cGUgdG8gYmUgZGlmZmVyZW50LmApO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBtZXRob2ROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICAoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpLnByb3RvdHlwZSBhcyBhbnkpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICByZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgICAgIGFyZ1R5cGVJZHMsXHJcbiAgICAgICAgICAgIGludm9rZXJTaWduYXR1cmVQdHIsXHJcbiAgICAgICAgICAgIGludm9rZXJJbmRleCxcclxuICAgICAgICAgICAgaW52b2tlckNvbnRleHRcclxuICAgICAgICApO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHkoXHJcbiAgICB0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIGZpZWxkTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsXHJcbiAgICBnZXR0ZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGdldHRlckluZGV4OiBudW1iZXIsXHJcbiAgICBnZXR0ZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLFxyXG4gICAgc2V0dGVyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBzZXR0ZXJJbmRleDogbnVtYmVyLFxyXG4gICAgc2V0dGVyQ29udGV4dDogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIGZpZWxkTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZ2V0ID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uPCgpID0+IGFueT4odGhpcywgYCR7bmFtZX1fZ2V0dGVyYCwgZ2V0dGVyUmV0dXJuVHlwZUlkLCBbXSwgZ2V0dGVyU2lnbmF0dXJlUHRyLCBnZXR0ZXJJbmRleCwgZ2V0dGVyQ29udGV4dCk7XHJcbiAgICAgICAgY29uc3Qgc2V0ID0gc2V0dGVySW5kZXg/IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbjwodmFsdWU6IGFueSkgPT4gdm9pZD4odGhpcywgYCR7bmFtZX1fc2V0dGVyYCwgMCwgW3NldHRlckFyZ3VtZW50VHlwZUlkXSwgc2V0dGVyU2lnbmF0dXJlUHRyLCBzZXR0ZXJJbmRleCwgc2V0dGVyQ29udGV4dCkgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgoKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXSBhcyBhbnkpLnByb3RvdHlwZSBhcyBhbnkpLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIGdldCxcclxuICAgICAgICAgICAgc2V0LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgIlxyXG5pbXBvcnQgeyByZWdpc3RlckVtYm91bmQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQ8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIG5hbWVQdHI6IG51bWJlciwgdHlwZVB0cjogbnVtYmVyLCB2YWx1ZUFzV2lyZVR5cGU6IFdUKTogdm9pZCB7XHJcblxyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKGNvbnN0TmFtZSkgPT4ge1xyXG4gICAgICAgIC8vIFdhaXQgdW50aWwgd2Uga25vdyBob3cgdG8gcGFyc2UgdGhlIHR5cGUgdGhpcyBjb25zdGFudCByZWZlcmVuY2VzLlxyXG4gICAgICAgIGNvbnN0IFt0eXBlXSA9IGF3YWl0IGdldFR5cGVJbmZvPFtFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+XT4odHlwZVB0cik7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIGNvbnN0YW50IGZyb20gaXRzIHdpcmUgcmVwcmVzZW50YXRpb24gdG8gaXRzIEpTIHJlcHJlc2VudGF0aW9uLlxyXG4gICAgICAgIGNvbnN0IHZhbHVlID0gdHlwZS5mcm9tV2lyZVR5cGUodmFsdWVBc1dpcmVUeXBlKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHRoaXMgY29uc3RhbnQgdmFsdWUgdG8gdGhlIGBlbWJpbmRgIG9iamVjdC5cclxuICAgICAgICByZWdpc3RlckVtYm91bmQ8VD4odGhpcywgY29uc3ROYW1lLCB2YWx1ZS5qc1ZhbHVlKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwodGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAvLyBUT0RPLi4uXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW12YWxfdGFrZV92YWx1ZSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIHB0cjogbnVtYmVyKTogYW55IHtcclxuICAgIC8vIFRPRE8uLi5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiBfZW12YWxfZGVjcmVmKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGhhbmRsZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIC8vIFRPRE8uLi5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUsIHJlZ2lzdGVyRW1ib3VuZCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmNvbnN0IEFsbEVudW1zOiBSZWNvcmQ8bnVtYmVyLCBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PiA9IHt9O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZW51bSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgc2l6ZTogbnVtYmVyLCBpc1NpZ25lZDogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgdGhlIGVudW0gb2JqZWN0IHRoYXQgdGhlIHVzZXIgd2lsbCBpbnNwZWN0IHRvIGxvb2sgZm9yIGVudW0gdmFsdWVzXHJcbiAgICAgICAgQWxsRW51bXNbdHlwZVB0cl0gPSB7fTtcclxuXHJcbiAgICAgICAgLy8gTWFyayB0aGlzIHR5cGUgYXMgcmVhZHkgdG8gYmUgdXNlZCBieSBvdGhlciB0eXBlcyBcclxuICAgICAgICAvLyAoZXZlbiBpZiB3ZSBkb24ndCBoYXZlIHRoZSBlbnVtIHZhbHVlcyB5ZXQsIGVudW0gdmFsdWVzXHJcbiAgICAgICAgLy8gdGhlbXNlbHZlcyBhcmVuJ3QgdXNlZCBieSBhbnkgcmVnaXN0cmF0aW9uIGZ1bmN0aW9ucy4pXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgbnVtYmVyPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAod2lyZVZhbHVlKSA9PiB7IHJldHVybiB7d2lyZVZhbHVlLCBqc1ZhbHVlOiB3aXJlVmFsdWV9OyB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoanNWYWx1ZSkgPT4geyByZXR1cm4geyB3aXJlVmFsdWU6IGpzVmFsdWUsIGpzVmFsdWUgfSB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIE1ha2UgdGhpcyB0eXBlIGF2YWlsYWJsZSBmb3IgdGhlIHVzZXJcclxuICAgICAgICByZWdpc3RlckVtYm91bmQodGhpcywgbmFtZSBhcyBuZXZlciwgQWxsRW51bXNbdHlwZVB0ciBhcyBhbnldKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZW51bV92YWx1ZSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdFbnVtVHlwZTogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGVudW1WYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgLy8gSnVzdCBhZGQgdGhpcyBuYW1lJ3MgdmFsdWUgdG8gdGhlIGV4aXN0aW5nIGVudW0gdHlwZS5cclxuICAgICAgICBBbGxFbnVtc1tyYXdFbnVtVHlwZV1bbmFtZV0gPSBlbnVtVmFsdWU7XHJcbiAgICB9KVxyXG59IiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgYnl0ZVdpZHRoOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh2YWx1ZSkgPT4gKHsgd2lyZVZhbHVlOiB2YWx1ZSwganNWYWx1ZTogdmFsdWV9KSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKHZhbHVlKSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZX0pLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBcclxuICogQHBhcmFtIG5hbWVQdHIgQSBwb2ludGVyIHRvIHRoZSBudWxsLXRlcm1pbmF0ZWQgbmFtZSBvZiB0aGlzIGV4cG9ydC5cclxuICogQHBhcmFtIGFyZ0NvdW50IFRoZSBudW1iZXIgb2YgYXJndW1lbnRzIHRoZSBXQVNNIGZ1bmN0aW9uIHRha2VzXHJcbiAqIEBwYXJhbSByYXdBcmdUeXBlc1B0ciBBIHBvaW50ZXIgdG8gYW4gYXJyYXkgb2YgbnVtYmVycywgZWFjaCByZXByZXNlbnRpbmcgYSBUeXBlSUQuIFRoZSAwdGggdmFsdWUgaXMgdGhlIHJldHVybiB0eXBlLCB0aGUgcmVzdCBhcmUgdGhlIGFyZ3VtZW50cyB0aGVtc2VsdmVzLlxyXG4gKiBAcGFyYW0gc2lnbmF0dXJlIEEgcG9pbnRlciB0byBhIG51bGwtdGVybWluYXRlZCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBXQVNNIHNpZ25hdHVyZSBvZiB0aGUgZnVuY3Rpb247IGUuZy4gXCJgcGBcIiwgXCJgZnBwYFwiLCBcImB2cGBcIiwgXCJgZnBmZmZgXCIsIGV0Yy5cclxuICogQHBhcmFtIHJhd0ludm9rZXJQdHIgVGhlIHBvaW50ZXIgdG8gdGhlIGZ1bmN0aW9uIGluIFdBU00uXHJcbiAqIEBwYXJhbSBmdW5jdGlvbkluZGV4IFRoZSBpbmRleCBvZiB0aGUgZnVuY3Rpb24gaW4gdGhlIGBXZWJBc3NlbWJseS5UYWJsZWAgdGhhdCdzIGV4cG9ydGVkLlxyXG4gKiBAcGFyYW0gaXNBc3luYyBVbnVzZWQuLi5wcm9iYWJseVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24oXHJcbiAgICB0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgbmFtZVB0cjogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsXHJcbiAgICBzaWduYXR1cmU6IG51bWJlcixcclxuICAgIHJhd0ludm9rZXJQdHI6IG51bWJlcixcclxuICAgIGZ1bmN0aW9uSW5kZXg6IG51bWJlcixcclxuICAgIGlzQXN5bmM6IGJvb2xlYW5cclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgKHRoaXMuZW1iaW5kIGFzIGFueSlbbmFtZV0gPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb24odGhpcywgbmFtZSwgcmV0dXJuVHlwZUlkLCBhcmdUeXBlSWRzLCBzaWduYXR1cmUsIHJhd0ludm9rZXJQdHIsIGZ1bmN0aW9uSW5kZXgpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIodGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGJ5dGVXaWR0aDogbnVtYmVyLCBtaW5WYWx1ZTogbnVtYmVyLCBtYXhWYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGlzVW5zaWduZWRUeXBlID0gKG1pblZhbHVlID09PSAwKTtcclxuICAgICAgICBjb25zdCBmcm9tV2lyZVR5cGUgPSBpc1Vuc2lnbmVkVHlwZSA/IGZyb21XaXJlVHlwZVUoYnl0ZVdpZHRoKSA6IGZyb21XaXJlVHlwZVMoYnl0ZVdpZHRoKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogbWluL21heFZhbHVlIGFyZW4ndCB1c2VkIGZvciBib3VuZHMgY2hlY2tpbmcsXHJcbiAgICAgICAgLy8gYnV0IGlmIHRoZXkgYXJlLCBtYWtlIHN1cmUgdG8gYWRqdXN0IG1heFZhbHVlIGZvciB0aGUgc2FtZSBzaWduZWQvdW5zaWduZWQgdHlwZSBpc3N1ZVxyXG4gICAgICAgIC8vIG9uIDMyLWJpdCBzaWduZWQgaW50IHR5cGVzOlxyXG4gICAgICAgIC8vIG1heFZhbHVlID0gZnJvbVdpcmVUeXBlKG1heFZhbHVlKTtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgbnVtYmVyPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoanNWYWx1ZTogbnVtYmVyKSA9PiAoeyB3aXJlVmFsdWU6IGpzVmFsdWUsIGpzVmFsdWUgfSlcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuLy8gV2UgbmVlZCBhIHNlcGFyYXRlIGZ1bmN0aW9uIGZvciB1bnNpZ25lZCBjb252ZXJzaW9uIGJlY2F1c2UgV0FTTSBvbmx5IGhhcyBzaWduZWQgdHlwZXMsIFxyXG4vLyBldmVuIHdoZW4gbGFuZ3VhZ2VzIGhhdmUgdW5zaWduZWQgdHlwZXMsIGFuZCBpdCBleHBlY3RzIHRoZSBjbGllbnQgdG8gbWFuYWdlIHRoZSB0cmFuc2l0aW9uLlxyXG4vLyBTbyB0aGlzIGlzIHVzLCBtYW5hZ2luZyB0aGUgdHJhbnNpdGlvbi5cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlVShieXRlV2lkdGg6IG51bWJlcik6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxudW1iZXIsIG51bWJlcj5bXCJmcm9tV2lyZVR5cGVcIl0ge1xyXG4gICAgLy8gU2hpZnQgb3V0IGFsbCB0aGUgYml0cyBoaWdoZXIgdGhhbiB3aGF0IHdvdWxkIGZpdCBpbiB0aGlzIGludGVnZXIgdHlwZSxcclxuICAgIC8vIGJ1dCBpbiBwYXJ0aWN1bGFyIG1ha2Ugc3VyZSB0aGUgbmVnYXRpdmUgYml0IGdldHMgY2xlYXJlZCBvdXQgYnkgdGhlID4+PiBhdCB0aGUgZW5kLlxyXG4gICAgY29uc3Qgb3ZlcmZsb3dCaXRDb3VudCA9IDMyIC0gOCAqIGJ5dGVXaWR0aDtcclxuICAgIHJldHVybiBmdW5jdGlvbiAod2lyZVZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6ICgod2lyZVZhbHVlIDw8IG92ZXJmbG93Qml0Q291bnQpID4+PiBvdmVyZmxvd0JpdENvdW50KSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmcm9tV2lyZVR5cGVTKGJ5dGVXaWR0aDogbnVtYmVyKTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPG51bWJlciwgbnVtYmVyPltcImZyb21XaXJlVHlwZVwiXSB7XHJcbiAgICAvLyBTaGlmdCBvdXQgYWxsIHRoZSBiaXRzIGhpZ2hlciB0aGFuIHdoYXQgd291bGQgZml0IGluIHRoaXMgaW50ZWdlciB0eXBlLlxyXG4gICAgY29uc3Qgb3ZlcmZsb3dCaXRDb3VudCA9IDMyIC0gOCAqIGJ5dGVXaWR0aDtcclxuICAgIHJldHVybiBmdW5jdGlvbiAod2lyZVZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6ICgod2lyZVZhbHVlIDw8IG92ZXJmbG93Qml0Q291bnQpID4+IG92ZXJmbG93Qml0Q291bnQpIH07XHJcbiAgICB9XHJcbn0iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBleDogYW55KTogdm9pZCB7XHJcbiAgICAvLyBUT0RPXHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IElzNjQgfSBmcm9tIFwiLi9pcy02NC5qc1wiO1xyXG5pbXBvcnQgeyBQb2ludGVyU2l6ZSB9IGZyb20gXCIuL3BvaW50ZXIuanNcIjtcclxuXHJcbmNvbnN0IFNpemVUU2l6ZTogNCB8IDggPSBQb2ludGVyU2l6ZTtcclxuZXhwb3J0IGNvbnN0IHNldFNpemVUOiBcInNldEJpZ1VpbnQ2NFwiIHwgXCJzZXRVaW50MzJcIiA9IChJczY0ID8gXCJzZXRCaWdVaW50NjRcIiA6IFwic2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuZXhwb3J0IGNvbnN0IGdldFNpemVUOiBcImdldEJpZ1VpbnQ2NFwiIHwgXCJnZXRVaW50MzJcIiA9IChJczY0ID8gXCJnZXRCaWdVaW50NjRcIiA6IFwiZ2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNpemVUU2l6ZShfaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20pOiA0IHsgcmV0dXJuIFNpemVUU2l6ZSBhcyA0OyB9XHJcblxyXG4iLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRTaXplVCB9IGZyb20gXCIuL3NpemV0LmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgYHJlYWRVaW50MzJgLCBidXQgdHlwZWQgZm9yIHNpemVfdCB2YWx1ZXMsIGFuZCBmdXR1cmUtcHJvb2ZzIGFnYWluc3QgNjQtYml0IGFyY2hpdGVjdHVyZXMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNpemVUKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IFBvaW50ZXI8bnVtYmVyPik6IG51bWJlciB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3W2dldFNpemVUXShwdHIsIHRydWUpIGFzIG51bWJlcjsgfVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBzZXRTaXplVCB9IGZyb20gXCIuL3NpemV0LmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTaXplVChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tzZXRTaXplVF0ocHRyLCB2YWx1ZSBhcyBuZXZlciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQxNihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0VWludDE2KHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVVaW50MzIoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogUG9pbnRlcjxudW1iZXI+LCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LnNldFVpbnQzMihwdHIsIHZhbHVlLCB0cnVlKTsgfVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDgoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogUG9pbnRlcjxudW1iZXI+LCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LnNldFVpbnQ4KHB0ciwgdmFsdWUpOyB9XHJcbiIsICJpbXBvcnQgeyByZWFkU2l6ZVQgfSBmcm9tIFwiLi4vLi4vdXRpbC9yZWFkLXNpemV0LmpzXCI7XHJcbmltcG9ydCB7IGdldFNpemVUU2l6ZSB9IGZyb20gXCIuLi8uLi91dGlsL3NpemV0LmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlU2l6ZVQgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS1zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQxNiB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQxNi5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQ4IH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtdWludDguanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgc3RyaW5nVG9VdGYxNiwgc3RyaW5nVG9VdGYzMiwgc3RyaW5nVG9VdGY4LCB1dGYxNlRvU3RyaW5nTCwgdXRmMzJUb1N0cmluZ0wsIHV0ZjhUb1N0cmluZ0wgfSBmcm9tIFwiLi4vc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFdpcmVDb252ZXJzaW9uUmVzdWx0IH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8vIFNoYXJlZCBiZXR3ZWVuIHN0ZDo6c3RyaW5nIGFuZCBzdGQ6OndzdHJpbmdcclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBjaGFyV2lkdGg6IDEgfCAyIHwgNCwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgdXRmVG9TdHJpbmdMID0gKGNoYXJXaWR0aCA9PSAxKSA/IHV0ZjhUb1N0cmluZ0wgOiAoY2hhcldpZHRoID09IDIpID8gdXRmMTZUb1N0cmluZ0wgOiB1dGYzMlRvU3RyaW5nTDtcclxuICAgIGNvbnN0IHN0cmluZ1RvVXRmID0gKGNoYXJXaWR0aCA9PSAxKSA/IHN0cmluZ1RvVXRmOCA6IChjaGFyV2lkdGggPT0gMikgPyBzdHJpbmdUb1V0ZjE2IDogc3RyaW5nVG9VdGYzMjtcclxuICAgIGNvbnN0IFVpbnRBcnJheSA9IChjaGFyV2lkdGggPT0gMSkgPyBVaW50OEFycmF5IDogKGNoYXJXaWR0aCA9PSAyKSA/IFVpbnQxNkFycmF5IDogVWludDMyQXJyYXk7XHJcbiAgICBjb25zdCB3cml0ZVVpbnQgPSAoY2hhcldpZHRoID09IDEpID8gd3JpdGVVaW50OCA6IChjaGFyV2lkdGggPT0gMikgPyB3cml0ZVVpbnQxNiA6IHdyaXRlVWludDMyO1xyXG5cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKGltcGwsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IChwdHI6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAvLyBUaGUgd2lyZSB0eXBlIGlzIGEgcG9pbnRlciB0byBhIFwic3RydWN0XCIgKG5vdCByZWFsbHkgYSBzdHJ1Y3QgaW4gdGhlIHVzdWFsIHNlbnNlLi4uXHJcbiAgICAgICAgICAgIC8vIGV4Y2VwdCBtYXliZSBpbiBuZXdlciBDIHZlcnNpb25zIEkgZ3Vlc3MpIHdoZXJlIFxyXG4gICAgICAgICAgICAvLyB0aGUgZmlyc3QgZmllbGQgaXMgYSBzaXplX3QgcmVwcmVzZW50aW5nIHRoZSBsZW5ndGgsXHJcbiAgICAgICAgICAgIC8vIEFuZCB0aGUgc2Vjb25kIFwiZmllbGRcIiBpcyB0aGUgc3RyaW5nIGRhdGEgaXRzZWxmLFxyXG4gICAgICAgICAgICAvLyBmaW5hbGx5IGFsbCBlbmRlZCB3aXRoIGFuIGV4dHJhIG51bGwgYnl0ZS5cclxuICAgICAgICAgICAgbGV0IGxlbmd0aCA9IHJlYWRTaXplVChpbXBsLCBwdHIpO1xyXG4gICAgICAgICAgICBsZXQgcGF5bG9hZCA9IHB0ciArIGdldFNpemVUU2l6ZShpbXBsKTtcclxuICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gXCJcIjtcclxuICAgICAgICAgICAgbGV0IGRlY29kZVN0YXJ0UHRyID0gcGF5bG9hZDtcclxuICAgICAgICAgICAgc3RyID0gdXRmVG9TdHJpbmdMKGltcGwsIGRlY29kZVN0YXJ0UHRyLCBsZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGpzVmFsdWU6IHN0cixcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBjYWxsIHRvIF9mcmVlIGhhcHBlbnMgYmVjYXVzZSBFbWJpbmQgY2FsbHMgbWFsbG9jIGR1cmluZyBpdHMgdG9XaXJlVHlwZSBmdW5jdGlvbi5cclxuICAgICAgICAgICAgICAgICAgICAvLyBTdXJlbHkgdGhlcmUncyBhIHdheSB0byBhdm9pZCB0aGlzIGNvcHkgb2YgYSBjb3B5IG9mIGEgY29weSB0aG91Z2gsIHJpZ2h0PyBSaWdodD9cclxuICAgICAgICAgICAgICAgICAgICBpbXBsLmV4cG9ydHMuZnJlZShwdHIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHRvV2lyZVR5cGUgPSAoc3RyOiBzdHJpbmcpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIHN0cmluZz4gPT4ge1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFsdWVBc0FycmF5QnVmZmVySW5KUyA9IG5ldyBVaW50QXJyYXkoc3RyaW5nVG9VdGYoc3RyKSk7XHJcblxyXG4gICAgICAgICAgICAvLyBJcyBpdCBtb3JlIG9yIGxlc3MgY2xlYXIgd2l0aCBhbGwgdGhlc2UgdmFyaWFibGVzIGV4cGxpY2l0bHkgbmFtZWQ/XHJcbiAgICAgICAgICAgIC8vIEhvcGVmdWxseSBtb3JlLCBhdCBsZWFzdCBzbGlnaHRseS5cclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aG91dE51bGwgPSB2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aE51bGwgPSBjaGFyQ291bnRXaXRob3V0TnVsbCArIDE7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRob3V0TnVsbCA9IGNoYXJDb3VudFdpdGhvdXROdWxsICogY2hhcldpZHRoO1xyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRoTnVsbCA9IGNoYXJDb3VudFdpdGhOdWxsICogY2hhcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgLy8gMS4gKG0pYWxsb2NhdGUgc3BhY2UgZm9yIHRoZSBzdHJ1Y3QgYWJvdmVcclxuICAgICAgICAgICAgY29uc3Qgd2FzbVN0cmluZ1N0cnVjdCA9IGltcGwuZXhwb3J0cy5tYWxsb2MoZ2V0U2l6ZVRTaXplKGltcGwpICsgYnl0ZUNvdW50V2l0aE51bGwpO1xyXG5cclxuICAgICAgICAgICAgLy8gMi4gV3JpdGUgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nIHRvIHRoZSBzdHJ1Y3RcclxuICAgICAgICAgICAgY29uc3Qgc3RyaW5nU3RhcnQgPSB3YXNtU3RyaW5nU3RydWN0ICsgZ2V0U2l6ZVRTaXplKGltcGwpO1xyXG4gICAgICAgICAgICB3cml0ZVNpemVUKGltcGwsIHdhc21TdHJpbmdTdHJ1Y3QsIGNoYXJDb3VudFdpdGhvdXROdWxsKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDMuIFdyaXRlIHRoZSBzdHJpbmcgZGF0YSB0byB0aGUgc3RydWN0XHJcbiAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gbmV3IFVpbnRBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgc3RyaW5nU3RhcnQsIGJ5dGVDb3VudFdpdGhvdXROdWxsKTtcclxuICAgICAgICAgICAgZGVzdGluYXRpb24uc2V0KHZhbHVlQXNBcnJheUJ1ZmZlckluSlMpO1xyXG5cclxuICAgICAgICAgICAgLy8gNC4gV3JpdGUgYSBudWxsIGJ5dGVcclxuICAgICAgICAgICAgd3JpdGVVaW50KGltcGwsIHN0cmluZ1N0YXJ0ICsgYnl0ZUNvdW50V2l0aG91dE51bGwsIDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4gaW1wbC5leHBvcnRzLmZyZWUod2FzbVN0cmluZ1N0cnVjdCksXHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHdhc21TdHJpbmdTdHJ1Y3QsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBzdHJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGUoaW1wbCwgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICByZXR1cm4gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSh0aGlzLCB0eXBlUHRyLCAxLCBuYW1lUHRyKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcodGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBjaGFyV2lkdGg6IDIgfCA0LCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHJldHVybiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55KHRoaXMsIHR5cGVQdHIsIGNoYXJXaWR0aCwgbmFtZVB0cik7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIC4uLmFyZ3M6IG51bWJlcltdKTogdm9pZCB7XHJcbiAgICBkZWJ1Z2dlcjtcclxuICAgIC8vIFRPRE8uLi5cclxufSIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUeXBlSW5mbyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVDb252ZXJzaW9uUmVzdWx0LCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXVD4gPSAoZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBwdHI6IG51bWJlcikgPT4gV1Q7XHJcbmV4cG9ydCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V1Q+ID0gKHNldHRlckNvbnRleHQ6IG51bWJlciwgcHRyOiBudW1iZXIsIHdpcmVUeXBlOiBXVCkgPT4gdm9pZDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbyB7XHJcbiAgICBuYW1lUHRyOiBudW1iZXI7XHJcbiAgICBfY29uc3RydWN0b3IoKTogbnVtYmVyO1xyXG4gICAgX2Rlc3RydWN0b3IocHRyOiBXaXJlVHlwZXMpOiB2b2lkO1xyXG4gICAgZWxlbWVudHM6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPGFueSwgYW55PltdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiB7XHJcblxyXG4gICAgLyoqIFRoZSBcInJhd1wiIGdldHRlciwgZXhwb3J0ZWQgZnJvbSBFbWJpbmQuIE5lZWRzIGNvbnZlcnNpb24gYmV0d2VlbiB0eXBlcy4gKi9cclxuICAgIHdhc21HZXR0ZXI6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8V1Q+O1xyXG5cclxuICAgIC8qKiBUaGUgXCJyYXdcIiBzZXR0ZXIsIGV4cG9ydGVkIGZyb20gRW1iaW5kLiBOZWVkcyBjb252ZXJzaW9uIGJldHdlZW4gdHlwZXMuICovXHJcbiAgICB3YXNtU2V0dGVyOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFdUPjtcclxuXHJcbiAgICAvKiogVGhlIG51bWVyaWMgdHlwZSBJRCBvZiB0aGUgdHlwZSB0aGUgZ2V0dGVyIHJldHVybnMgKi9cclxuICAgIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBUaGUgbnVtZXJpYyB0eXBlIElEIG9mIHRoZSB0eXBlIHRoZSBzZXR0ZXIgYWNjZXB0cyAqL1xyXG4gICAgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlcjtcclxuXHJcbiAgICAvKiogVW5rbm93bjsgdXNlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgZW1iaW5kIGdldHRlciAqL1xyXG4gICAgZ2V0dGVyQ29udGV4dDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBVbmtub3duOyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBlbWJpbmQgc2V0dGVyICovXHJcbiAgICBzZXR0ZXJDb250ZXh0OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiB7XHJcbiAgICAvKiogQSB2ZXJzaW9uIG9mIGB3YXNtR2V0dGVyYCB0aGF0IGhhbmRsZXMgdHlwZSBjb252ZXJzaW9uICovXHJcbiAgICByZWFkKHB0cjogV1QpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxXVCwgVD47XHJcblxyXG4gICAgLyoqIEEgdmVyc2lvbiBvZiBgd2FzbVNldHRlcmAgdGhhdCBoYW5kbGVzIHR5cGUgY29udmVyc2lvbiAqL1xyXG4gICAgd3JpdGUocHRyOiBudW1iZXIsIHZhbHVlOiBUKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8V1QsIFQ+O1xyXG5cclxuICAgIC8qKiBgZ2V0dGVyUmV0dXJuVHlwZUlkLCBidXQgcmVzb2x2ZWQgdG8gdGhlIHBhcnNlZCB0eXBlIGluZm8gKi9cclxuICAgIGdldHRlclJldHVyblR5cGU6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD47XHJcblxyXG4gICAgLyoqIGBzZXR0ZXJSZXR1cm5UeXBlSWQsIGJ1dCByZXNvbHZlZCB0byB0aGUgcGFyc2VkIHR5cGUgaW5mbyAqL1xyXG4gICAgc2V0dGVyQXJndW1lbnRUeXBlOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+O1xyXG59XHJcblxyXG4vLyBUZW1wb3Jhcnkgc2NyYXRjaCBtZW1vcnkgdG8gY29tbXVuaWNhdGUgYmV0d2VlbiByZWdpc3RyYXRpb24gY2FsbHMuXHJcbmV4cG9ydCBjb25zdCBjb21wb3NpdGVSZWdpc3RyYXRpb25zOiBSZWNvcmQ8bnVtYmVyLCBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvPiA9IHt9O1xyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfY29tcG9zaXRlPFQ+KGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXSA9IHtcclxuICAgICAgICBuYW1lUHRyLFxyXG4gICAgICAgIF9jb25zdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbihpbXBsLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uKGltcGwsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpLFxyXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcclxuICAgIH07XHJcblxyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxJIGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPGFueSwgYW55Pj4oZWxlbWVudHM6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPGFueSwgYW55PltdKTogUHJvbWlzZTxJW10+IHtcclxuICAgIGNvbnN0IGRlcGVuZGVuY3lJZHMgPSBbLi4uZWxlbWVudHMubWFwKChlbHQpID0+IGVsdC5nZXR0ZXJSZXR1cm5UeXBlSWQpLCAuLi5lbGVtZW50cy5tYXAoKGVsdCkgPT4gZWx0LnNldHRlckFyZ3VtZW50VHlwZUlkKV07XHJcblxyXG4gICAgY29uc3QgZGVwZW5kZW5jaWVzID0gYXdhaXQgZ2V0VHlwZUluZm8oLi4uZGVwZW5kZW5jeUlkcyk7XHJcbiAgICBjb25zb2xlLmFzc2VydChkZXBlbmRlbmNpZXMubGVuZ3RoID09IGVsZW1lbnRzLmxlbmd0aCAqIDIpO1xyXG5cclxuICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGVsZW1lbnRzLm1hcCgoZmllbGQsIGkpOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8YW55LCBhbnk+ID0+IHtcclxuICAgICAgICBjb25zdCBnZXR0ZXJSZXR1cm5UeXBlID0gZGVwZW5kZW5jaWVzW2ldITtcclxuICAgICAgICBjb25zdCBzZXR0ZXJBcmd1bWVudFR5cGUgPSBkZXBlbmRlbmNpZXNbaSArIGVsZW1lbnRzLmxlbmd0aF0hO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkKHB0cjogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXR0ZXJSZXR1cm5UeXBlLmZyb21XaXJlVHlwZShmaWVsZC53YXNtR2V0dGVyKGZpZWxkLmdldHRlckNvbnRleHQsIHB0cikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZShwdHI6IG51bWJlciwgbzogYW55KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IHNldHRlckFyZ3VtZW50VHlwZS50b1dpcmVUeXBlKG8pO1xyXG4gICAgICAgICAgICBmaWVsZC53YXNtU2V0dGVyKGZpZWxkLnNldHRlckNvbnRleHQsIHB0ciwgcmV0LndpcmVWYWx1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXQ7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlLFxyXG4gICAgICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGUsXHJcbiAgICAgICAgICAgIHJlYWQsXHJcbiAgICAgICAgICAgIHdyaXRlLFxyXG4gICAgICAgICAgICAuLi5maWVsZFxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBmaWVsZFJlY29yZHMgYXMgSVtdO1xyXG59IiwgImltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50cywgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGUsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlciwgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbywgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0UsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlciwgY29tcG9zaXRlUmVnaXN0cmF0aW9ucyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuaW50ZXJmYWNlIEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+IHsgfVxyXG5pbnRlcmZhY2UgQXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCwgVD4sIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCwgVD4geyB9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheTxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgY29uc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3Q29uc3RydWN0b3I6IG51bWJlciwgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdEZXN0cnVjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfY29tcG9zaXRlPFQ+KHRoaXMsIHJhd1R5cGVQdHIsIG5hbWVQdHIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlLCByYXdDb25zdHJ1Y3RvciwgZGVzdHJ1Y3RvclNpZ25hdHVyZSwgcmF3RGVzdHJ1Y3Rvcik7XHJcblxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudDxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUdXBsZVR5cGU6IG51bWJlciwgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsIGdldHRlclNpZ25hdHVyZTogbnVtYmVyLCBnZXR0ZXI6IG51bWJlciwgZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLCBzZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgc2V0dGVyOiBudW1iZXIsIHNldHRlckNvbnRleHQ6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUdXBsZVR5cGVdLmVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgIGdldHRlckNvbnRleHQsXHJcbiAgICAgICAgc2V0dGVyQ29udGV4dCxcclxuICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgc2V0dGVyQXJndW1lbnRUeXBlSWQsXHJcbiAgICAgICAgd2FzbUdldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFQ+Pih0aGlzLCBnZXR0ZXJTaWduYXR1cmUsIGdldHRlciksXHJcbiAgICAgICAgd2FzbVNldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFQ+Pih0aGlzLCBzZXR0ZXJTaWduYXR1cmUsIHNldHRlcilcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9hcnJheTxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbnN0IHJlZyA9IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcbiAgICBkZWxldGUgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXTtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIHJlZy5uYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBmaWVsZFJlY29yZHMgPSBhd2FpdCBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxhbnksIFQ+PihyZWcuZWxlbWVudHMpO1xyXG5cclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPGFueSwgdW5rbm93bltdPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAocHRyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXQ6IChhbnlbXSkgPSBbXSBhcyBhbnk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWcuZWxlbWVudHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZCA9IGZpZWxkUmVjb3Jkc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZFJlY29yZHNbaV0ucmVhZChwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IGpzVmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKnJldFtTeW1ib2wuZGlzcG9zZV0gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKVxyXG4gICAgICAgICAgICAgICAgfSovXHJcblxyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogcmV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnREZXN0cnVjdG9yczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHRyID0gcmVnLl9jb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZmllbGQgb2YgZmllbGRSZWNvcmRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGQud3JpdGUocHRyLCBvW2ldIGFzIGFueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogbyxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzLCBjb21wb3NpdGVSZWdpc3RyYXRpb25zLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXIsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm8sIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXIsIHR5cGUgQ29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyByZWFkTGF0aW4xU3RyaW5nIH0gZnJvbSBcIi4uL19wcml2YXRlL3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RSZWdpc3RyYXRpb25JbmZvIGV4dGVuZHMgQ29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbyB7XHJcbiAgICBlbGVtZW50czogU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvPGFueSwgYW55PltdO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdULCBUPiB7XHJcbiAgICAvKiogVGhlIG5hbWUgb2YgdGhpcyBmaWVsZCAqL1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvRTxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88V1QsIFQ+LCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QsIFQ+IHsgfVxyXG5cclxuLyoqXHJcbiAqIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZpcnN0LCB0byBzdGFydCB0aGUgcmVnaXN0cmF0aW9uIG9mIGEgc3RydWN0IGFuZCBhbGwgaXRzIGZpZWxkcy4gXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3QodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZTogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0NvbnN0cnVjdG9yOiBudW1iZXIsIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3RGVzdHJ1Y3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVdID0ge1xyXG4gICAgICAgIG5hbWVQdHIsXHJcbiAgICAgICAgX2NvbnN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPCgpID0+IG51bWJlcj4odGhpcywgY29uc3RydWN0b3JTaWduYXR1cmUsIHJhd0NvbnN0cnVjdG9yKSxcclxuICAgICAgICBfZGVzdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbjwoKSA9PiB2b2lkPih0aGlzLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yKSxcclxuICAgICAgICBlbGVtZW50czogW10sXHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBwZXIgZmllbGQsIGFmdGVyIGBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdGAgYW5kIGJlZm9yZSBgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3RgLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0X2ZpZWxkPFQ+KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgZmllbGROYW1lOiBudW1iZXIsIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyLCBnZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgZ2V0dGVyOiBudW1iZXIsIGdldHRlckNvbnRleHQ6IG51bWJlciwgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlciwgc2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIHNldHRlcjogbnVtYmVyLCBzZXR0ZXJDb250ZXh0OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIChjb21wb3NpdGVSZWdpc3RyYXRpb25zW3Jhd1R5cGVQdHJdIGFzIFN0cnVjdFJlZ2lzdHJhdGlvbkluZm8pLmVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgIG5hbWU6IHJlYWRMYXRpbjFTdHJpbmcodGhpcywgZmllbGROYW1lKSxcclxuICAgICAgICBnZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIHNldHRlckNvbnRleHQsXHJcbiAgICAgICAgZ2V0dGVyUmV0dXJuVHlwZUlkLFxyXG4gICAgICAgIHNldHRlckFyZ3VtZW50VHlwZUlkLFxyXG4gICAgICAgIHdhc21HZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxUPj4odGhpcywgZ2V0dGVyU2lnbmF0dXJlLCBnZXR0ZXIpLFxyXG4gICAgICAgIHdhc21TZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxUPj4odGhpcywgc2V0dGVyU2lnbmF0dXJlLCBzZXR0ZXIpLFxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgYWZ0ZXIgYWxsIG90aGVyIG9iamVjdCByZWdpc3RyYXRpb24gZnVuY3Rpb25zIGFyZSBjYWxsZWQ7IHRoaXMgY29udGFpbnMgdGhlIGFjdHVhbCByZWdpc3RyYXRpb24gY29kZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdDxUPih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbnN0IHJlZyA9IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnNbcmF3VHlwZVB0cl07XHJcbiAgICBkZWxldGUgY29tcG9zaXRlUmVnaXN0cmF0aW9uc1tyYXdUeXBlUHRyXTtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIHJlZy5uYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBmaWVsZFJlY29yZHMgPSBhd2FpdCBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm9FPGFueSwgVD4+KHJlZy5lbGVtZW50cyk7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZSh0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAocHRyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudERlc3RydWN0b3JzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXQgPSB7fSBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICAvKk9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIFN5bWJvbC5kaXNwb3NlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pOyovXHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWcuZWxlbWVudHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZCA9IGZpZWxkUmVjb3Jkc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZFJlY29yZHNbaV0ucmVhZChwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIGZpZWxkLm5hbWUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGpzVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIE9iamVjdC5mcmVlemUocmV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IHJldCxcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKG8pID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHB0ciA9IHJlZy5fY29uc3RydWN0b3IoKTtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50RGVzdHJ1Y3RvcnM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGZpZWxkIG9mIGZpZWxkUmVjb3Jkcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IGZpZWxkLndyaXRlKHB0ciwgb1tmaWVsZC5uYW1lIGFzIG5ldmVyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IG8sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkRlc3RydWN0b3JzKGVsZW1lbnREZXN0cnVjdG9ycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG59XHJcblxyXG4iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgbmFtZSA9PiB7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgdW5kZWZpbmVkPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAoKSA9PiAoeyBqc1ZhbHVlOiB1bmRlZmluZWQhLCB3aXJlVmFsdWU6IHVuZGVmaW5lZCEgfSksXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6ICgpID0+ICh7IGpzVmFsdWU6IHVuZGVmaW5lZCEsIHdpcmVWYWx1ZTogdW5kZWZpbmVkISB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSlcclxuXHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1lbW9yeUdyb3d0aEV2ZW50RGV0YWlsIHsgaW5kZXg6IG51bWJlciB9XHJcblxyXG5leHBvcnQgY2xhc3MgTWVtb3J5R3Jvd3RoRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxNZW1vcnlHcm93dGhFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgaW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKFwiTWVtb3J5R3Jvd3RoRXZlbnRcIiwgeyBjYW5jZWxhYmxlOiBmYWxzZSwgZGV0YWlsOiB7IGluZGV4IH0gfSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgodGhpczogSW5zdGFudGlhdGVkV2FzbSwgaW5kZXg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgdGhpcy5jYWNoZWRNZW1vcnlWaWV3ID0gbmV3IERhdGFWaWV3KHRoaXMuZXhwb3J0cy5tZW1vcnkuYnVmZmVyKTtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgTWVtb3J5R3Jvd3RoRXZlbnQodGhpcywgaW5kZXgpKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU2VnZmF1bHRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKFwiU2VnbWVudGF0aW9uIGZhdWx0XCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBVc2VkIGJ5IFNBRkVfSEVBUFxyXG5leHBvcnQgZnVuY3Rpb24gc2VnZmF1bHQodGhpczogSW5zdGFudGlhdGVkV2FzbSk6IG5ldmVyIHtcclxuICAgIHRocm93IG5ldyBTZWdmYXVsdEVycm9yKCk7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgRW1zY3JpcHRlbkV4Y2VwdGlvbiB9IGZyb20gXCIuLi9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UuanNcIjtcclxuaW1wb3J0IHsgZ2V0UG9pbnRlclNpemUgfSBmcm9tIFwiLi4vdXRpbC9wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRQb2ludGVyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyB1dGY4VG9TdHJpbmdaIH0gZnJvbSBcIi4vc3RyaW5nLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4Y2VwdGlvbk1lc3NhZ2UoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgZXg6IEVtc2NyaXB0ZW5FeGNlcHRpb24pOiBbc3RyaW5nLCBzdHJpbmddIHtcclxuICAgIHZhciBwdHIgPSBnZXRDcHBFeGNlcHRpb25UaHJvd25PYmplY3RGcm9tV2ViQXNzZW1ibHlFeGNlcHRpb24oaW1wbCwgZXgpO1xyXG4gICAgcmV0dXJuIGdldEV4Y2VwdGlvbk1lc3NhZ2VDb21tb24oaW1wbCwgcHRyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q3BwRXhjZXB0aW9uVGhyb3duT2JqZWN0RnJvbVdlYkFzc2VtYmx5RXhjZXB0aW9uKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIGV4OiBFbXNjcmlwdGVuRXhjZXB0aW9uKSB7XHJcbiAgICAvLyBJbiBXYXNtIEVILCB0aGUgdmFsdWUgZXh0cmFjdGVkIGZyb20gV2ViQXNzZW1ibHkuRXhjZXB0aW9uIGlzIGEgcG9pbnRlclxyXG4gICAgLy8gdG8gdGhlIHVud2luZCBoZWFkZXIuIENvbnZlcnQgaXQgdG8gdGhlIGFjdHVhbCB0aHJvd24gdmFsdWUuXHJcbiAgICBjb25zdCB1bndpbmRfaGVhZGVyOiBudW1iZXIgPSBleC5nZXRBcmcoKGltcGwuZXhwb3J0cykuX19jcHBfZXhjZXB0aW9uLCAwKTtcclxuICAgIHJldHVybiAoaW1wbC5leHBvcnRzKS5fX3Rocm93bl9vYmplY3RfZnJvbV91bndpbmRfZXhjZXB0aW9uKHVud2luZF9oZWFkZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdGFja1NhdmUoaW1wbDogSW5zdGFudGlhdGVkV2FzbSkge1xyXG4gICAgcmV0dXJuIGltcGwuZXhwb3J0cy5lbXNjcmlwdGVuX3N0YWNrX2dldF9jdXJyZW50KCk7XHJcbn1cclxuZnVuY3Rpb24gc3RhY2tBbGxvYyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBzaXplOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBpbXBsLmV4cG9ydHMuX2Vtc2NyaXB0ZW5fc3RhY2tfYWxsb2Moc2l6ZSk7XHJcbn1cclxuZnVuY3Rpb24gc3RhY2tSZXN0b3JlKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHN0YWNrUG9pbnRlcjogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gaW1wbC5leHBvcnRzLl9lbXNjcmlwdGVuX3N0YWNrX3Jlc3RvcmUoc3RhY2tQb2ludGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RXhjZXB0aW9uTWVzc2FnZUNvbW1vbihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IFtzdHJpbmcsIHN0cmluZ10ge1xyXG4gICAgY29uc3Qgc3AgPSBzdGFja1NhdmUoaW1wbCk7XHJcbiAgICBjb25zdCB0eXBlX2FkZHJfYWRkciA9IHN0YWNrQWxsb2MoaW1wbCwgZ2V0UG9pbnRlclNpemUoaW1wbCkpO1xyXG4gICAgY29uc3QgbWVzc2FnZV9hZGRyX2FkZHIgPSBzdGFja0FsbG9jKGltcGwsIGdldFBvaW50ZXJTaXplKGltcGwpKTtcclxuICAgIGltcGwuZXhwb3J0cy5fX2dldF9leGNlcHRpb25fbWVzc2FnZShwdHIsIHR5cGVfYWRkcl9hZGRyLCBtZXNzYWdlX2FkZHJfYWRkcik7XHJcbiAgICBjb25zdCB0eXBlX2FkZHIgPSByZWFkUG9pbnRlcihpbXBsLCB0eXBlX2FkZHJfYWRkcik7XHJcbiAgICBjb25zdCBtZXNzYWdlX2FkZHIgPSByZWFkUG9pbnRlcihpbXBsLCBtZXNzYWdlX2FkZHJfYWRkcik7XHJcbiAgICBjb25zdCB0eXBlID0gdXRmOFRvU3RyaW5nWihpbXBsLCB0eXBlX2FkZHIpO1xyXG4gICAgaW1wbC5leHBvcnRzLmZyZWUodHlwZV9hZGRyKTtcclxuICAgIGxldCBtZXNzYWdlID0gXCJcIjtcclxuICAgIGlmIChtZXNzYWdlX2FkZHIpIHtcclxuICAgICAgICBtZXNzYWdlID0gdXRmOFRvU3RyaW5nWihpbXBsLCBtZXNzYWdlX2FkZHIpO1xyXG4gICAgICAgIGltcGwuZXhwb3J0cy5mcmVlKG1lc3NhZ2VfYWRkcik7XHJcbiAgICB9XHJcbiAgICBzdGFja1Jlc3RvcmUoaW1wbCwgc3ApO1xyXG4gICAgcmV0dXJuIFt0eXBlLCBtZXNzYWdlXTtcclxufVxyXG5cclxuIiwgImltcG9ydCB7IGdldEV4Y2VwdGlvbk1lc3NhZ2UgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZXhjZXB0aW9uLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYkFzc2VtYmx5RXhjZXB0aW9uRXZlbnREZXRhaWwgeyBleGNlcHRpb246IFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiB9XHJcblxyXG5kZWNsYXJlIG5hbWVzcGFjZSBXZWJBc3NlbWJseSB7XHJcbiAgICBjbGFzcyBFeGNlcHRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHRhZzogbnVtYmVyLCBwYXlsb2FkOiBudW1iZXJbXSwgb3B0aW9ucz86IHsgdHJhY2VTdGFjaz86IGJvb2xlYW4gfSk7XHJcbiAgICAgICAgZ2V0QXJnKGV4Y2VwdGlvblRhZzogbnVtYmVyLCBpbmRleDogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVtc2NyaXB0ZW5FeGNlcHRpb24gZXh0ZW5kcyBXZWJBc3NlbWJseS5FeGNlcHRpb24ge1xyXG4gICAgbWVzc2FnZTogW3N0cmluZywgc3RyaW5nXTtcclxufVxyXG4vKlxyXG5leHBvcnQgY2xhc3MgV2ViQXNzZW1ibHlFeGNlcHRpb25FdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PFdlYkFzc2VtYmx5RXhjZXB0aW9uRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIGV4Y2VwdGlvbjogV2ViQXNzZW1ibHkuRXhjZXB0aW9uKSB7XHJcbiAgICAgICAgc3VwZXIoXCJXZWJBc3NlbWJseUV4Y2VwdGlvbkV2ZW50XCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGV4Y2VwdGlvbiB9IH0pXHJcbiAgICB9XHJcbn1cclxuKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZXg6IGFueSk6IHZvaWQge1xyXG4gICAgY29uc3QgdCA9IG5ldyBXZWJBc3NlbWJseS5FeGNlcHRpb24oKHRoaXMuZXhwb3J0cykuX19jcHBfZXhjZXB0aW9uLCBbZXhdLCB7IHRyYWNlU3RhY2s6IHRydWUgfSkgYXMgRW1zY3JpcHRlbkV4Y2VwdGlvbjtcclxuICAgIHQubWVzc2FnZSA9IGdldEV4Y2VwdGlvbk1lc3NhZ2UodGhpcywgdCk7XHJcbiAgICB0aHJvdyB0O1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX3R6c2V0X2pzKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sdGltZXpvbmU6IG51bWJlciwgZGF5bGlnaHQ6IG51bWJlciwgc3RkX25hbWU6IG51bWJlciwgZHN0X25hbWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgZGVidWdnZXI7XHJcbiAgICAvLyBUT0RPXHJcbiAgfSIsICJcclxuLy8gVGhlc2UgY29uc3RhbnRzIGFyZW4ndCBkb25lIGFzIGFuIGVudW0gYmVjYXVzZSA5NSUgb2YgdGhlbSBhcmUgbmV2ZXIgcmVmZXJlbmNlZCxcclxuLy8gYnV0IHRoZXknZCBhbG1vc3QgY2VydGFpbmx5IG5ldmVyIGJlIHRyZWUtc2hha2VuIG91dC5cclxuXHJcbi8qKiBObyBlcnJvciBvY2N1cnJlZC4gU3lzdGVtIGNhbGwgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gKi8gICBleHBvcnQgY29uc3QgRVNVQ0NFU1MgPSAwO1xyXG4vKiogQXJndW1lbnQgbGlzdCB0b28gbG9uZy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEUyQklHID0gMTtcclxuLyoqIFBlcm1pc3Npb24gZGVuaWVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUNDRVMgPSAyO1xyXG4vKiogQWRkcmVzcyBpbiB1c2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSSU5VU0UgPSAzO1xyXG4vKiogQWRkcmVzcyBub3QgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSTk9UQVZBSUwgPSA0O1xyXG4vKiogQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRk5PU1VQUE9SVCA9IDU7XHJcbi8qKiBSZXNvdXJjZSB1bmF2YWlsYWJsZSwgb3Igb3BlcmF0aW9uIHdvdWxkIGJsb2NrLiAqLyAgICAgICAgICBleHBvcnQgY29uc3QgRUFHQUlOID0gNjtcclxuLyoqIENvbm5lY3Rpb24gYWxyZWFkeSBpbiBwcm9ncmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUxSRUFEWSA9IDc7XHJcbi8qKiBCYWQgZmlsZSBkZXNjcmlwdG9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUJBREYgPSA4O1xyXG4vKiogQmFkIG1lc3NhZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCQURNU0cgPSA5O1xyXG4vKiogRGV2aWNlIG9yIHJlc291cmNlIGJ1c3kuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCVVNZID0gMTA7XHJcbi8qKiBPcGVyYXRpb24gY2FuY2VsZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNBTkNFTEVEID0gMTE7XHJcbi8qKiBObyBjaGlsZCBwcm9jZXNzZXMuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNISUxEID0gMTI7XHJcbi8qKiBDb25uZWN0aW9uIGFib3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5BQk9SVEVEID0gMTM7XHJcbi8qKiBDb25uZWN0aW9uIHJlZnVzZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5SRUZVU0VEID0gMTQ7XHJcbi8qKiBDb25uZWN0aW9uIHJlc2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5SRVNFVCA9IDE1O1xyXG4vKiogUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVERUFETEsgPSAxNjtcclxuLyoqIERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFREVTVEFERFJSRVEgPSAxNztcclxuLyoqIE1hdGhlbWF0aWNzIGFyZ3VtZW50IG91dCBvZiBkb21haW4gb2YgZnVuY3Rpb24uICovICAgICAgICAgIGV4cG9ydCBjb25zdCBFRE9NID0gMTg7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRURRVU9UID0gMTk7XHJcbi8qKiBGaWxlIGV4aXN0cy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUVYSVNUID0gMjA7XHJcbi8qKiBCYWQgYWRkcmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUZBVUxUID0gMjE7XHJcbi8qKiBGaWxlIHRvbyBsYXJnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUZCSUcgPSAyMjtcclxuLyoqIEhvc3QgaXMgdW5yZWFjaGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSE9TVFVOUkVBQ0ggPSAyMztcclxuLyoqIElkZW50aWZpZXIgcmVtb3ZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSURSTSA9IDI0O1xyXG4vKiogSWxsZWdhbCBieXRlIHNlcXVlbmNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTFNFUSA9IDI1O1xyXG4vKiogT3BlcmF0aW9uIGluIHByb2dyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTlBST0dSRVNTID0gMjY7XHJcbi8qKiBJbnRlcnJ1cHRlZCBmdW5jdGlvbi4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlOVFIgPSAyNztcclxuLyoqIEludmFsaWQgYXJndW1lbnQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU5WQUwgPSAyODtcclxuLyoqIEkvTyBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU8gPSAyOTtcclxuLyoqIFNvY2tldCBpcyBjb25uZWN0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSVNDT05OID0gMzA7XHJcbi8qKiBJcyBhIGRpcmVjdG9yeS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlTRElSID0gMzE7XHJcbi8qKiBUb28gbWFueSBsZXZlbHMgb2Ygc3ltYm9saWMgbGlua3MuICovICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUxPT1AgPSAzMjtcclxuLyoqIEZpbGUgZGVzY3JpcHRvciB2YWx1ZSB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTUZJTEUgPSAzMztcclxuLyoqIFRvbyBtYW55IGxpbmtzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTUxJTksgPSAzNDtcclxuLyoqIE1lc3NhZ2UgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTVNHU0laRSA9IDM1O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNVUxUSUhPUCA9IDM2O1xyXG4vKiogRmlsZW5hbWUgdG9vIGxvbmcuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOQU1FVE9PTE9ORyA9IDM3O1xyXG4vKiogTmV0d29yayBpcyBkb3duLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORVRET1dOID0gMzg7XHJcbi8qKiBDb25uZWN0aW9uIGFib3J0ZWQgYnkgbmV0d29yay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVFJFU0VUID0gMzk7XHJcbi8qKiBOZXR3b3JrIHVucmVhY2hhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVFVOUkVBQ0ggPSA0MDtcclxuLyoqIFRvbyBtYW55IGZpbGVzIG9wZW4gaW4gc3lzdGVtLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkZJTEUgPSA0MTtcclxuLyoqIE5vIGJ1ZmZlciBzcGFjZSBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9CVUZTID0gNDI7XHJcbi8qKiBObyBzdWNoIGRldmljZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PREVWID0gNDM7XHJcbi8qKiBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PRU5UID0gNDQ7XHJcbi8qKiBFeGVjdXRhYmxlIGZpbGUgZm9ybWF0IGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PRVhFQyA9IDQ1O1xyXG4vKiogTm8gbG9ja3MgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0xDSyA9IDQ2O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0xJTksgPSA0NztcclxuLyoqIE5vdCBlbm91Z2ggc3BhY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9NRU0gPSA0ODtcclxuLyoqIE5vIG1lc3NhZ2Ugb2YgdGhlIGRlc2lyZWQgdHlwZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9NU0cgPSA0OTtcclxuLyoqIFByb3RvY29sIG5vdCBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9QUk9UT09QVCA9IDUwO1xyXG4vKiogTm8gc3BhY2UgbGVmdCBvbiBkZXZpY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1NQQyA9IDUxO1xyXG4vKiogRnVuY3Rpb24gbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1NZUyA9IDUyO1xyXG4vKiogVGhlIHNvY2tldCBpcyBub3QgY29ubmVjdGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RDT05OID0gNTM7XHJcbi8qKiBOb3QgYSBkaXJlY3Rvcnkgb3IgYSBzeW1ib2xpYyBsaW5rIHRvIGEgZGlyZWN0b3J5LiAqLyAgICAgICBleHBvcnQgY29uc3QgRU5PVERJUiA9IDU0O1xyXG4vKiogRGlyZWN0b3J5IG5vdCBlbXB0eS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RFTVBUWSA9IDU1O1xyXG4vKiogU3RhdGUgbm90IHJlY292ZXJhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RSRUNPVkVSQUJMRSA9IDU2O1xyXG4vKiogTm90IGEgc29ja2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RTT0NLID0gNTc7XHJcbi8qKiBOb3Qgc3VwcG9ydGVkLCBvciBvcGVyYXRpb24gbm90IHN1cHBvcnRlZCBvbiBzb2NrZXQuICovICAgICBleHBvcnQgY29uc3QgRU5PVFNVUCA9IDU4O1xyXG4vKiogSW5hcHByb3ByaWF0ZSBJL08gY29udHJvbCBvcGVyYXRpb24uICovICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RUWSA9IDU5O1xyXG4vKiogTm8gc3VjaCBkZXZpY2Ugb3IgYWRkcmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOWElPID0gNjA7XHJcbi8qKiBWYWx1ZSB0b28gbGFyZ2UgdG8gYmUgc3RvcmVkIGluIGRhdGEgdHlwZS4gKi8gICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU9WRVJGTE9XID0gNjE7XHJcbi8qKiBQcmV2aW91cyBvd25lciBkaWVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU9XTkVSREVBRCA9IDYyO1xyXG4vKiogT3BlcmF0aW9uIG5vdCBwZXJtaXR0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQRVJNID0gNjM7XHJcbi8qKiBCcm9rZW4gcGlwZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBJUEUgPSA2NDtcclxuLyoqIFByb3RvY29sIGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE8gPSA2NTtcclxuLyoqIFByb3RvY29sIG5vdCBzdXBwb3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE9OT1NVUFBPUlQgPSA2NjtcclxuLyoqIFByb3RvY29sIHdyb25nIHR5cGUgZm9yIHNvY2tldC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE9UWVBFID0gNjc7XHJcbi8qKiBSZXN1bHQgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVJBTkdFID0gNjg7XHJcbi8qKiBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVJPRlMgPSA2OTtcclxuLyoqIEludmFsaWQgc2Vlay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1BJUEUgPSA3MDtcclxuLyoqIE5vIHN1Y2ggcHJvY2Vzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1JDSCA9IDcxO1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVTVEFMRSA9IDcyO1xyXG4vKiogQ29ubmVjdGlvbiB0aW1lZCBvdXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVUSU1FRE9VVCA9IDczO1xyXG4vKiogVGV4dCBmaWxlIGJ1c3kuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVUWFRCU1kgPSA3NDtcclxuLyoqIENyb3NzLWRldmljZSBsaW5rLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFWERFViA9IDc1O1xyXG4vKiogRXh0ZW5zaW9uOiBDYXBhYmlsaXRpZXMgaW5zdWZmaWNpZW50LiAqLyAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RDQVBBQkxFID0gNzY7IiwgImltcG9ydCB0eXBlIHsgUG9pbnRlciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQ2NChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBQb2ludGVyPG51bWJlcj4sIHZhbHVlOiBiaWdpbnQpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0QmlnVWludDY0KHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBFSU5WQUwsIEVOT1NZUywgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50NjQgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50NjQuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZW51bSBDbG9ja0lkIHtcclxuICAgIFJFQUxUSU1FID0gMCxcclxuICAgIE1PTk9UT05JQyA9IDEsXHJcbiAgICBQUk9DRVNTX0NQVVRJTUVfSUQgPSAyLFxyXG4gICAgVEhSRUFEX0NQVVRJTUVfSUQgPSAzXHJcbn1cclxuXHJcbmNvbnN0IHAgPSAoZ2xvYmFsVGhpcy5wZXJmb3JtYW5jZSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2xvY2tfdGltZV9nZXQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgY2xrX2lkOiBudW1iZXIsIF9wcmVjaXNpb246IG51bWJlciwgb3V0UHRyOiBudW1iZXIpOiBudW1iZXIge1xyXG5cclxuICAgIGxldCBub3dNczogbnVtYmVyO1xyXG4gICAgc3dpdGNoIChjbGtfaWQpIHtcclxuICAgICAgICBjYXNlIENsb2NrSWQuUkVBTFRJTUU6XHJcbiAgICAgICAgICAgIG5vd01zID0gRGF0ZS5ub3coKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLk1PTk9UT05JQzpcclxuICAgICAgICAgICAgaWYgKHAgPT0gbnVsbCkgcmV0dXJuIEVOT1NZUzsgICAvLyBUT0RPOiBQb3NzaWJsZSB0byBiZSBudWxsIGluIFdvcmtsZXRzP1xyXG4gICAgICAgICAgICBub3dNcyA9IHAubm93KCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgQ2xvY2tJZC5QUk9DRVNTX0NQVVRJTUVfSUQ6XHJcbiAgICAgICAgY2FzZSBDbG9ja0lkLlRIUkVBRF9DUFVUSU1FX0lEOlxyXG4gICAgICAgICAgICByZXR1cm4gRU5PU1lTO1xyXG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiBFSU5WQUw7XHJcbiAgICB9XHJcbiAgICBjb25zdCBub3dOcyA9IEJpZ0ludChNYXRoLnJvdW5kKG5vd01zICogMTAwMCAqIDEwMDApKTtcclxuICAgIHdyaXRlVWludDY0KHRoaXMsIG91dFB0ciwgbm93TnMpO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufSIsICJpbXBvcnQgdHlwZSB7IFBvaW50ZXIgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlbnZpcm9uX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBlbnZpcm9uQ291bnRPdXRwdXQ6IFBvaW50ZXI8UG9pbnRlcjxudW1iZXI+PiwgZW52aXJvblNpemVPdXRwdXQ6IFBvaW50ZXI8bnVtYmVyPikge1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvbkNvdW50T3V0cHV0LCAwKTtcclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25TaXplT3V0cHV0LCAwKTtcclxuXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW52aXJvbl9zaXplc19nZXQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZW52aXJvbkNvdW50T3V0cHV0OiBQb2ludGVyPFBvaW50ZXI8bnVtYmVyPj4sIGVudmlyb25TaXplT3V0cHV0OiBQb2ludGVyPG51bWJlcj4pIHtcclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25Db3VudE91dHB1dCwgMCk7XHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBlbnZpcm9uU2l6ZU91dHB1dCwgMCk7XHJcblxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yQ2xvc2VFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqIFxyXG4gICAgICogSXQncyBtb3JlLW9yLWxlc3MgW3VuaXZlcnNhbGx5IGV4cGVjdGVkXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdGFuZGFyZF9zdHJlYW0pIHRoYXQgMCBpcyBmb3IgaW5wdXQsIDEgZm9yIG91dHB1dCwgYW5kIDIgZm9yIGVycm9ycyxcclxuICAgICAqIHNvIHlvdSBjYW4gbWFwIDEgdG8gYGNvbnNvbGUubG9nYCBhbmQgMiB0byBgY29uc29sZS5lcnJvcmAuIFxyXG4gICAgICovXHJcbiAgICBmaWxlRGVzY3JpcHRvcjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9jbG9zZVwiLCB7IGNhbmNlbGFibGU6IHRydWUsIGRldGFpbDogeyBmaWxlRGVzY3JpcHRvciB9IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogUE9TSVggY2xvc2UgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX2Nsb3NlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvcik6IHZvaWQge1xyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50KGZkKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcblxyXG4gICAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDMyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElvdmVjIHtcclxuICAgIGJ1ZmZlclN0YXJ0OiBudW1iZXI7XHJcbiAgICBidWZmZXJMZW5ndGg6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKGluZm86IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogSW92ZWMge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBidWZmZXJTdGFydDogcmVhZFBvaW50ZXIoaW5mbywgcHRyKSxcclxuICAgICAgICBidWZmZXJMZW5ndGg6IHJlYWRVaW50MzIoaW5mbywgcHRyICsgZ2V0UG9pbnRlclNpemUoaW5mbykpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiogcGFyc2VBcnJheShpbmZvOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgY291bnQ6IG51bWJlcik6IEdlbmVyYXRvcjxJb3ZlYywgdm9pZCwgdm9pZD4ge1xyXG4gICAgY29uc3Qgc2l6ZW9mU3RydWN0ID0gZ2V0UG9pbnRlclNpemUoaW5mbykgKyA0O1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XHJcbiAgICAgICAgeWllbGQgcGFyc2UoaW5mbywgcHRyICsgKGkgKiBzaXplb2ZTdHJ1Y3QpKVxyXG4gICAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyB0eXBlIElvdmVjLCBwYXJzZUFycmF5IH0gZnJvbSBcIi4uL19wcml2YXRlL2lvdmVjLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50OCB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQ4LmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYCwgd2l0aCBvdGhlcnMgaGFuZGxlZCB3aXRoIHRoZSB2YXJpb3VzIGZpbGUtb3BlbmluZyBjYWxscy4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcblxyXG4gICAgcmVxdWVzdGVkQnVmZmVyczogSW92ZWNbXTtcclxuXHJcbiAgICByZWFkSW50b01lbW9yeShidWZmZXJzOiAoVWludDhBcnJheSlbXSk6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50RGV0YWlsPiB7XHJcbiAgICBwcml2YXRlIF9ieXRlc1dyaXR0ZW4gPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIGZpbGVEZXNjcmlwdG9yOiBudW1iZXIsIHJlcXVlc3RlZEJ1ZmZlckluZm86IElvdmVjW10pIHtcclxuICAgICAgICBzdXBlcihcImZkX3JlYWRcIiwge1xyXG4gICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcclxuICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICAgICAgICBmaWxlRGVzY3JpcHRvcixcclxuICAgICAgICAgICAgICAgIHJlcXVlc3RlZEJ1ZmZlcnM6IHJlcXVlc3RlZEJ1ZmZlckluZm8sXHJcbiAgICAgICAgICAgICAgICByZWFkSW50b01lbW9yeTogKGlucHV0QnVmZmVycykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIDEwMCUgdW50ZXN0ZWQsIHByb2JhYmx5IGRvZXNuJ3Qgd29yayBpZiBJJ20gYmVpbmcgaG9uZXN0XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZXF1ZXN0ZWRCdWZmZXJJbmZvLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID49IGlucHV0QnVmZmVycy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gaW5wdXRCdWZmZXJzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IE1hdGgubWluKGJ1ZmZlci5ieXRlTGVuZ3RoLCBpbnB1dEJ1ZmZlcnNbal0uYnl0ZUxlbmd0aCk7ICsraikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVVaW50OChpbXBsLCByZXF1ZXN0ZWRCdWZmZXJJbmZvW2ldLmJ1ZmZlclN0YXJ0ICsgaiwgYnVmZmVyW2pdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsrdGhpcy5fYnl0ZXNXcml0dGVuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBieXRlc1dyaXR0ZW4oKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fYnl0ZXNXcml0dGVuO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5oYW5kbGVkRmlsZVJlYWRFdmVudCBleHRlbmRzIEVycm9yIHtcclxuICAgIGNvbnN0cnVjdG9yKGZkOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihgVW5oYW5kbGVkIHJlYWQgdG8gZmlsZSBkZXNjcmlwdG9yICMke2ZkfS5gKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbi8qKiBQT1NJWCByZWFkdiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfcmVhZCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBmZDogRmlsZURlc2NyaXB0b3IsIGlvdjogbnVtYmVyLCBpb3ZjbnQ6IG51bWJlciwgcG51bTogbnVtYmVyKSB7XHJcblxyXG4gICAgbGV0IG5Xcml0dGVuID0gMDtcclxuICAgIGNvbnN0IGdlbiA9IHBhcnNlQXJyYXkodGhpcywgaW92LCBpb3ZjbnQpO1xyXG5cclxuICAgIC8vIEdldCBhbGwgdGhlIGRhdGEgdG8gcmVhZCBpbiBpdHMgc2VwYXJhdGUgYnVmZmVyc1xyXG4gICAgLy9jb25zdCBhc1R5cGVkQXJyYXlzID0gWy4uLmdlbl0ubWFwKCh7IGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGggfSkgPT4geyBuV3JpdHRlbiArPSBidWZmZXJMZW5ndGg7IHJldHVybiBuZXcgVWludDhBcnJheSh0aGlzLmdldE1lbW9yeSgpLmJ1ZmZlciwgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCkgfSk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JSZWFkRXZlbnQodGhpcywgZmQsIFsuLi5nZW5dKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgbldyaXR0ZW4gPSAwO1xyXG4gICAgICAgIC8qaWYgKGZkID09IDApIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGVycm9ybm8uYmFkZjsqL1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbldyaXR0ZW4gPSBldmVudC5ieXRlc1dyaXR0ZW4oKTtcclxuICAgIH1cclxuXHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBwbnVtLCBuV3JpdHRlbik7XHJcblxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5jb25zdCB0ZXh0RGVjb2RlcnMgPSBuZXcgTWFwPHN0cmluZywgVGV4dERlY29kZXI+KCk7XHJcbmZ1bmN0aW9uIGdldFRleHREZWNvZGVyKGxhYmVsOiBzdHJpbmcpIHtcclxuICAgIGxldCByZXQ6IFRleHREZWNvZGVyIHwgdW5kZWZpbmVkID0gdGV4dERlY29kZXJzLmdldChsYWJlbCk7XHJcbiAgICBpZiAoIXJldCkge1xyXG4gICAgICAgIHJldCA9IG5ldyBUZXh0RGVjb2RlcihsYWJlbCk7XHJcbiAgICAgICAgdGV4dERlY29kZXJzLnNldChsYWJlbCwgcmV0KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0O1xyXG59IiwgImltcG9ydCB7IEVCQURGLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yLCBQb2ludGVyIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYC4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclNlZWtFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9zZWVrXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQT1NJWCBsc2VlayAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfc2Vlayh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBmZDogRmlsZURlc2NyaXB0b3IsIG9mZnNldDogbnVtYmVyLCB3aGVuY2U6IG51bWJlciwgb2Zmc2V0T3V0OiBQb2ludGVyPG51bWJlcj4pOiB0eXBlb2YgRUJBREYgfCB0eXBlb2YgRVNVQ0NFU1Mge1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRmlsZURlc2NyaXB0b3JTZWVrRXZlbnQoZmQpKSkge1xyXG4gICAgICAgIHN3aXRjaCAoZmQpIHtcclxuICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBFQkFERjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn1cclxuIiwgImltcG9ydCB7IHBhcnNlQXJyYXkgfSBmcm9tIFwiLi4vX3ByaXZhdGUvaW92ZWMuanNcIjtcclxuaW1wb3J0IHsgRUJBREYsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JXcml0ZUV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYCwgd2l0aCBvdGhlcnMgaGFuZGxlZCB3aXRoIHRoZSB2YXJpb3VzIGZpbGUtb3BlbmluZyBjYWxscy4gXHJcbiAgICAgKi9cclxuICAgIGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbiAgICBkYXRhOiBVaW50OEFycmF5W107XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIsIGRhdGE6IFVpbnQ4QXJyYXlbXSkge1xyXG4gICAgICAgIHN1cGVyKFwiZmRfd3JpdGVcIiwgeyBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGRhdGEsIGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbiAgICBhc1N0cmluZyhsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kZXRhaWwuZGF0YS5tYXAoKGQsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBkZWNvZGVkID0gZ2V0VGV4dERlY29kZXIobGFiZWwpLmRlY29kZShkKTtcclxuICAgICAgICAgICAgaWYgKGRlY29kZWQgPT0gXCJcXDBcIiAmJiBpbmRleCA9PSB0aGlzLmRldGFpbC5kYXRhLmxlbmd0aCAtIDEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgcmV0dXJuIGRlY29kZWQ7XHJcbiAgICAgICAgfSkuam9pbihcIlwiKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVuaGFuZGxlZEZpbGVXcml0ZUV2ZW50IGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoZmQ6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKGBVbmhhbmRsZWQgd3JpdGUgdG8gZmlsZSBkZXNjcmlwdG9yICMke2ZkfS5gKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbi8qKiBQT1NJWCB3cml0ZXYgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX3dyaXRlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpOiB0eXBlb2YgRVNVQ0NFU1MgfCB0eXBlb2YgRUJBREYge1xyXG5cclxuICAgIGxldCBuV3JpdHRlbiA9IDA7XHJcbiAgICBjb25zdCBnZW4gPSBwYXJzZUFycmF5KHRoaXMsIGlvdiwgaW92Y250KTtcclxuXHJcbiAgICAvLyBHZXQgYWxsIHRoZSBkYXRhIHRvIHdyaXRlIGluIGl0cyBzZXBhcmF0ZSBidWZmZXJzXHJcbiAgICBjb25zdCBhc1R5cGVkQXJyYXlzID0gWy4uLmdlbl0ubWFwKCh7IGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGggfSkgPT4geyBuV3JpdHRlbiArPSBidWZmZXJMZW5ndGg7IHJldHVybiBuZXcgVWludDhBcnJheSh0aGlzLmNhY2hlZE1lbW9yeVZpZXcuYnVmZmVyLCBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoKSB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnQoZmQsIGFzVHlwZWRBcnJheXMpO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBjb25zdCBzdHIgPSBldmVudC5hc1N0cmluZyhcInV0Zi04XCIpO1xyXG4gICAgICAgIGlmIChmZCA9PSAxKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzdHIpO1xyXG4gICAgICAgIGVsc2UgaWYgKGZkID09IDIpXHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3Ioc3RyKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBFQkFERjtcclxuICAgIH1cclxuXHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBwbnVtLCBuV3JpdHRlbik7XHJcblxyXG4gICAgcmV0dXJuIEVTVUNDRVNTO1xyXG59XHJcblxyXG5cclxuY29uc3QgdGV4dERlY29kZXJzID0gbmV3IE1hcDxzdHJpbmcsIFRleHREZWNvZGVyPigpO1xyXG5mdW5jdGlvbiBnZXRUZXh0RGVjb2RlcihsYWJlbDogc3RyaW5nKSB7XHJcbiAgICBsZXQgcmV0OiBUZXh0RGVjb2RlciB8IHVuZGVmaW5lZCA9IHRleHREZWNvZGVycy5nZXQobGFiZWwpO1xyXG4gICAgaWYgKCFyZXQpIHtcclxuICAgICAgICByZXQgPSBuZXcgVGV4dERlY29kZXIobGFiZWwpO1xyXG4gICAgICAgIHRleHREZWNvZGVycy5zZXQobGFiZWwsIHJldCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBYm9ydEV2ZW50RGV0YWlsIHtcclxuICAgIGNvZGU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFib3J0RXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxBYm9ydEV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY29kZTogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJwcm9jX2V4aXRcIiwgeyBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogeyBjb2RlIH0gfSk7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQWJvcnRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICAgIGNvbnN0cnVjdG9yKGNvZGU6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKGBhYm9ydCgke2NvZGV9KSB3YXMgY2FsbGVkYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwcm9jX2V4aXQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgY29kZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEFib3J0RXZlbnQoY29kZSkpO1xyXG4gICAgdGhyb3cgbmV3IEFib3J0RXJyb3IoY29kZSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGFsaWduZmF1bHQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvYWxpZ25mYXVsdC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfYm9vbC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLCBfZW12YWxfZGVjcmVmLCBfZW12YWxfdGFrZV92YWx1ZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZW12YWwuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9lbnVtLCBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUsIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9lbnVtLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlciB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlci5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZyB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX2FycmF5LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfdmFsdWVfb2JqZWN0LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCwgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZvaWQuanNcIjtcclxuaW1wb3J0IHsgZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoLmpzXCI7XHJcbmltcG9ydCB7IHNlZ2ZhdWx0IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L3NlZ2ZhdWx0LmpzXCI7XHJcbmltcG9ydCB7IF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UuanNcIjtcclxuaW1wb3J0IHsgX3R6c2V0X2pzIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L3R6c2V0X2pzLmpzXCI7XHJcbmltcG9ydCB7IGNsb2NrX3RpbWVfZ2V0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9jbG9ja190aW1lX2dldC5qc1wiO1xyXG5pbXBvcnQgeyBlbnZpcm9uX2dldCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9nZXQuanNcIjtcclxuaW1wb3J0IHsgZW52aXJvbl9zaXplc19nZXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fc2l6ZXNfZ2V0LmpzXCI7XHJcbmltcG9ydCB7IGZkX2Nsb3NlIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9jbG9zZS5qc1wiO1xyXG5pbXBvcnQgeyBmZF9yZWFkIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9yZWFkLmpzXCI7XHJcbmltcG9ydCB7IGZkX3NlZWsgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3NlZWsuanNcIjtcclxuaW1wb3J0IHsgZmRfd3JpdGUgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3dyaXRlLmpzXCI7XHJcbmltcG9ydCB7IHByb2NfZXhpdCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvcHJvY19leGl0LmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTdHJ1Y3RUZXN0IHtcclxuICAgIHN0cmluZzogc3RyaW5nO1xyXG4gICAgbnVtYmVyOiBudW1iZXI7XHJcbiAgICB0cmlwbGU6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcclxufVxyXG5cclxuZXhwb3J0IGRlY2xhcmUgY2xhc3MgVGVzdENsYXNzIGltcGxlbWVudHMgRGlzcG9zYWJsZSB7XHJcbiAgICBwdWJsaWMgeDogbnVtYmVyO1xyXG4gICAgcHVibGljIHk6IHN0cmluZztcclxuICAgIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogc3RyaW5nKTtcclxuICAgIGluY3JlbWVudFgoKTogVGVzdENsYXNzO1xyXG5cclxuICAgIGdldFgoKTogbnVtYmVyO1xyXG4gICAgc2V0WCh4OiBudW1iZXIpOiB2b2lkO1xyXG5cclxuICAgIHN0YXRpYyBnZXRTdHJpbmdGcm9tSW5zdGFuY2UoaW5zdGFuY2U6IFRlc3RDbGFzcyk6IHN0cmluZztcclxuXHJcbiAgICBzdGF0aWMgY3JlYXRlKCk6IFRlc3RDbGFzcztcclxuXHJcbiAgICBzdGF0aWMgaWRlbnRpdHlDb25zdFBvaW50ZXIoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuICAgIHN0YXRpYyBpZGVudGl0eVBvaW50ZXIoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuICAgIHN0YXRpYyBpZGVudGl0eVJlZmVyZW5jZShpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5Q29uc3RSZWZlcmVuY2UoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuICAgIHN0YXRpYyBpZGVudGl0eUNvcHkoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuXHJcbiAgICBbU3ltYm9sLmRpc3Bvc2VdKCk6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1ib3VuZFR5cGVzIHtcclxuXHJcbiAgICBpZGVudGl0eV91OChuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV9pOChuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV91MTYobjogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgaWRlbnRpdHlfaTE2KG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X3UzMihuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV9pMzIobjogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgaWRlbnRpdHlfdTY0KG46IGJpZ2ludCk6IGJpZ2ludDtcclxuICAgIGlkZW50aXR5X2k2NChuOiBiaWdpbnQpOiBiaWdpbnQ7XHJcbiAgICBpZGVudGl0eV9zdHJpbmcobjogc3RyaW5nKTogc3RyaW5nO1xyXG4gICAgaWRlbnRpdHlfd3N0cmluZyhuOiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV9vbGRfZW51bShuOiBhbnkpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV9uZXdfZW51bShuOiBhbnkpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV9zdHJ1Y3RfcG9pbnRlcihuOiBTdHJ1Y3RUZXN0KTogU3RydWN0VGVzdDtcclxuICAgIHN0cnVjdF9jcmVhdGUoKTogU3RydWN0VGVzdDtcclxuICAgIHN0cnVjdF9jb25zdW1lKG46IFN0cnVjdFRlc3QpOiB2b2lkO1xyXG4gICAgaWRlbnRpdHlfc3RydWN0X2NvcHkobjogU3RydWN0VGVzdCk6IFN0cnVjdFRlc3Q7XHJcbiAgICB0ZXN0Q2xhc3NBcnJheSgpOiBudW1iZXI7XHJcbiAgICBub3dTdGVhZHkoKTogbnVtYmVyO1xyXG4gICAgbm93U3lzdGVtKCk6IG51bWJlcjtcclxuICAgIHRocm93c0V4Y2VwdGlvbigpOiBuZXZlcjtcclxuICAgIGNhdGNoZXNFeGNlcHRpb24oKTogbmV2ZXI7XHJcblxyXG4gICAgVGVzdENsYXNzOiB0eXBlb2YgVGVzdENsYXNzO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgS25vd25JbnN0YW5jZUV4cG9ydHMge1xyXG4gICAgcHJpbnRUZXN0KCk6IG51bWJlcjtcclxuICAgIHJldmVyc2VJbnB1dCgpOiBudW1iZXI7XHJcbiAgICBnZXRSYW5kb21OdW1iZXIoKTogbnVtYmVyO1xyXG4gICAgZ2V0S2V5KCk6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlKHdoZXJlOiBzdHJpbmcsIHVuaW5zdGFudGlhdGVkPzogQXJyYXlCdWZmZXIpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc208S25vd25JbnN0YW5jZUV4cG9ydHMsIEVtYm91bmRUeXBlcz4+IHtcclxuXHJcbiAgICBsZXQgd2FzbSA9IGF3YWl0IEluc3RhbnRpYXRlZFdhc20uaW5zdGFudGlhdGU8S25vd25JbnN0YW5jZUV4cG9ydHMsIEVtYm91bmRUeXBlcz4odW5pbnN0YW50aWF0ZWQgPz8gZmV0Y2gobmV3IFVSTChcIndhc20ud2FzbVwiLCBpbXBvcnQubWV0YS51cmwpKSwge1xyXG4gICAgICAgIGVudjoge1xyXG4gICAgICAgICAgICBfX3Rocm93X2V4Y2VwdGlvbl93aXRoX3N0YWNrX3RyYWNlLFxyXG4gICAgICAgICAgICBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfZmluYWxpemVfdmFsdWVfYXJyYXksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0X2ZpZWxkLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCxcclxuICAgICAgICAgICAgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZW51bSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlLFxyXG4gICAgICAgICAgICBfZW12YWxfdGFrZV92YWx1ZSxcclxuICAgICAgICAgICAgX2VtdmFsX2RlY3JlZixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUsXHJcbiAgICAgICAgICAgIF90enNldF9qcyxcclxuICAgICAgICAgICAgc2VnZmF1bHQsXHJcbiAgICAgICAgICAgIGFsaWduZmF1bHQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB3YXNpX3NuYXBzaG90X3ByZXZpZXcxOiB7XHJcbiAgICAgICAgICAgIGZkX2Nsb3NlLFxyXG4gICAgICAgICAgICBmZF9yZWFkLFxyXG4gICAgICAgICAgICBmZF9zZWVrLFxyXG4gICAgICAgICAgICBmZF93cml0ZSxcclxuICAgICAgICAgICAgZW52aXJvbl9nZXQsXHJcbiAgICAgICAgICAgIGVudmlyb25fc2l6ZXNfZ2V0LFxyXG4gICAgICAgICAgICBwcm9jX2V4aXQsXHJcbiAgICAgICAgICAgIGNsb2NrX3RpbWVfZ2V0XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgd2FzbS5hZGRFdmVudExpc3RlbmVyKFwiZmRfd3JpdGVcIiwgZSA9PiB7XHJcbiAgICAgICAgaWYgKGUuZGV0YWlsLmZpbGVEZXNjcmlwdG9yID09IDEpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGUuYXNTdHJpbmcoXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYCR7d2hlcmV9OiAke3ZhbHVlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB3YXNtO1xyXG59XHJcbiIsICJpbXBvcnQgXCIuL3dvcmtsZXQtcG9seWZpbGwuanNcIjtcclxuXHJcbi8vaW1wb3J0IFwiY29yZS1qc1wiO1xyXG5cclxuXHJcbmltcG9ydCAqIGFzIENvbWxpbmsgZnJvbSBcImNvbWxpbmtcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi9kaXN0L2luc3RhbnRpYXRlZC13YXNpLmpzXCI7XHJcbmltcG9ydCB7IGluc3RhbnRpYXRlLCBLbm93bkluc3RhbmNlRXhwb3J0cyB9IGZyb20gXCIuL2luc3RhbnRpYXRlLmpzXCI7XHJcblxyXG5cclxuXHJcbi8vIFRlc3RpbmcgYW4gYXVkaW8gd29ya2xldCBpcyBhIGxpdHRsZSB0b3VnaCBiZWNhdXNlXHJcbi8vIHRoZXkgZG9uJ3QgaGF2ZSBgZmV0Y2hgLCBkb24ndCBoYXZlIGBFdmVudGAgKGluIHNvbWUgZW52aXJvbm1lbnRzKSwgZXRjLi4uXHJcblxyXG5sZXQgeyBwcm9taXNlOiB1bmluc3RhbnRpYXRlZFdhc20sIHJlc29sdmU6IHJlc29sdmVVbmluc3RhbnRpYXRlZFdhc20gfSA9IFByb21pc2Uud2l0aFJlc29sdmVyczxBcnJheUJ1ZmZlcj4oKTtcclxuXHJcblxyXG5cclxubGV0IHdhc206IEluc3RhbnRpYXRlZFdhc208S25vd25JbnN0YW5jZUV4cG9ydHM+ID0gbnVsbCE7XHJcblxyXG51bmluc3RhbnRpYXRlZFdhc20udGhlbihiaW5hcnkgPT4gaW5zdGFudGlhdGUoXCJXb3JrbGV0XCIsIGJpbmFyeSkudGhlbih3ID0+IHdhc20gPSB3KSk7XHJcblxyXG5jbGFzcyBSYW5kb21Ob2lzZVByb2Nlc3NvciBleHRlbmRzIEF1ZGlvV29ya2xldFByb2Nlc3NvciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIENvbWxpbmsuZXhwb3NlKHtcclxuICAgICAgICAgICAgcHJvdmlkZVdhc20oZGF0YTogQXJyYXlCdWZmZXIpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmVVbmluc3RhbnRpYXRlZFdhc20oZGF0YSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGV4ZWN1dGUoc3RyOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAobmV3IEZ1bmN0aW9uKFwid2FzbVwiLCBzdHIpKSh3YXNtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIHRoaXMucG9ydCk7XHJcblxyXG4gICAgfVxyXG4gICAgcHJvY2VzcyhpbnB1dHM6IEZsb2F0MzJBcnJheVtdW10sIG91dHB1dHM6IEZsb2F0MzJBcnJheVtdW10sIHBhcmFtZXRlcnM6IFJlY29yZDxzdHJpbmcsIEZsb2F0MzJBcnJheT4pIHtcclxuICAgICAgICBpZiAod2FzbSkge1xyXG4gICAgICAgICAgICBvdXRwdXRzWzBdLmZvckVhY2goKGNoYW5uZWwpID0+IHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbm5lbC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWxbaV0gPSAod2FzbS5leHBvcnRzLmdldFJhbmRvbU51bWJlcigpICogMiAtIDEpIC8gMTAwMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxucmVnaXN0ZXJQcm9jZXNzb3IoXCJyYW5kb20tbm9pc2UtcHJvY2Vzc29yXCIsIFJhbmRvbU5vaXNlUHJvY2Vzc29yKTtcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbmludGVyZmFjZSBBdWRpb1dvcmtsZXRQcm9jZXNzb3Ige1xyXG4gICAgcmVhZG9ubHkgcG9ydDogTWVzc2FnZVBvcnQ7XHJcbn1cclxuXHJcbmludGVyZmFjZSBBdWRpb1dvcmtsZXRQcm9jZXNzb3JJbXBsIGV4dGVuZHMgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yIHtcclxuICAgIHByb2Nlc3MoXHJcbiAgICAgICAgaW5wdXRzOiBGbG9hdDMyQXJyYXlbXVtdLFxyXG4gICAgICAgIG91dHB1dHM6IEZsb2F0MzJBcnJheVtdW10sXHJcbiAgICAgICAgcGFyYW1ldGVyczogUmVjb3JkPHN0cmluZywgRmxvYXQzMkFycmF5PlxyXG4gICAgKTogYm9vbGVhbjtcclxufVxyXG5cclxuZGVjbGFyZSB2YXIgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yOiB7XHJcbiAgICBwcm90b3R5cGU6IEF1ZGlvV29ya2xldFByb2Nlc3NvcjtcclxuICAgIG5ldyhvcHRpb25zPzogQXVkaW9Xb3JrbGV0Tm9kZU9wdGlvbnMpOiBBdWRpb1dvcmtsZXRQcm9jZXNzb3I7XHJcbn07XHJcblxyXG50eXBlIEF1ZGlvUGFyYW1EZXNjcmlwdG9yID0ge1xyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgYXV0b21hdGlvblJhdGU6IEF1dG9tYXRpb25SYXRlLFxyXG4gICAgbWluVmFsdWU6IG51bWJlcixcclxuICAgIG1heFZhbHVlOiBudW1iZXIsXHJcbiAgICBkZWZhdWx0VmFsdWU6IG51bWJlclxyXG59XHJcblxyXG5pbnRlcmZhY2UgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yQ29uc3RydWN0b3Ige1xyXG4gICAgbmV3KG9wdGlvbnM/OiBBdWRpb1dvcmtsZXROb2RlT3B0aW9ucyk6IEF1ZGlvV29ya2xldFByb2Nlc3NvckltcGw7XHJcbiAgICBwYXJhbWV0ZXJEZXNjcmlwdG9ycz86IEF1ZGlvUGFyYW1EZXNjcmlwdG9yW107XHJcbn1cclxuXHJcbmRlY2xhcmUgZnVuY3Rpb24gcmVnaXN0ZXJQcm9jZXNzb3IoXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICBwcm9jZXNzb3JDdG9yOiBBdWRpb1dvcmtsZXRQcm9jZXNzb3JDb25zdHJ1Y3RvcixcclxuKTogdm9pZDtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUlBLElBQU1BLFNBQU4sTUFBTSxPQUFLO0VBRVAsWUFBWSxPQUFlLGVBQXlCO0FBQ2hELFNBQUssVUFBVSxlQUFlLFdBQVc7QUFDekMsU0FBSyxlQUFlO0FBQ3BCLFNBQUssYUFBYSxlQUFlLGNBQWM7QUFDL0MsU0FBSyxXQUFXLGVBQWUsWUFBWTtBQUMzQyxTQUFLLGdCQUFnQjtBQUNyQixTQUFLLG1CQUFtQjtBQUN4QixTQUFLLGFBQWEsT0FBTTtBQUN4QixTQUFLLFlB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bUIsS0FBSyxZQUFVLFlBQVksV0FBVyxNQUFNLEVBQUUsS0FBSyxPQUFLLE9BQU8sQ0FBQyxDQUFDO0FBRXBGLElBQU0sdUJBQU4sY0FBbUMsc0JBQXNCO0FBQUEsRUFDckQsY0FBYztBQUNWLFVBQU07QUFDTixJQUFRLE9BQU87QUFBQSxNQUNYLFlBQVksTUFBbUI7QUFDM0Isa0NBQTBCLElBQUk7QUFBQSxNQUNsQztBQUFBLE1BQ0EsUUFBUSxLQUFhO0FBQ2pCLGVBQVEsSUFBSSxTQUFTLFFBQVEsR0FBRyxFQUFHLElBQUk7QUFBQSxNQUMzQztBQUFBLElBQ0osR0FBRyxLQUFLLElBQUk7QUFBQSxFQUVoQjtBQUFBLEVBQ0EsUUFBUSxRQUEwQixTQUEyQixZQUEwQztBQUNuRyxRQUFJLE1BQU07QUFDTixjQUFRLENBQUMsRUFBRSxRQUFRLENBQUMsWUFBWTtBQUM1QixpQkFBUyxJQUFJLEdBQUcsSUFBSSxRQUFRLFFBQVEsS0FBSztBQUNyQyxrQkFBUSxDQUFDLEtBQUssS0FBSyxRQUFRLGdCQUFnQixJQUFJLElBQUksS0FBSztBQUFBLFFBQzVEO0FBQUEsTUFDSixDQUFDO0FBQUEsSUFDTDtBQUNBLFdBQU87QUFBQSxFQUNYO0FBQ0o7QUFHQSxrQkFBa0IsMEJBQTBCLG9CQUFvQjsiLAogICJuYW1lcyI6IFsiRXZlbnQiLCAiRXZlbnQiLCAiQ3VzdG9tRXZlbnQiLCAiVEQiLCAib2JqIiwgInJldHVyblZhbHVlIiwgInByb3h5IiwgInAiLCAid2FzbSIsICJwIiwgImpzVmFsdWUiLCAid2lyZVZhbHVlIiwgInN0YWNrRGVzdHJ1Y3RvciIsICJDbG9ja0lkIiwgIndhc20iXQp9Cg==
