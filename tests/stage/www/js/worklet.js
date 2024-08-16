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
globalThis.Event ??= /* @__PURE__ */ (() => {
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
globalThis.CustomEvent ??= /* @__PURE__ */ (() => {
  return CustomEvent2;
})();

// ../dist/polyfill/text-decoder.js
globalThis.TextDecoder ??= class TD {
  encoding = "utf8";
  fatal = false;
  ignoreBOM = false;
  decode(input, _options) {
    let i = 0;
    if (!input)
      return "";
    const input2 = new Uint8Array(input instanceof ArrayBuffer ? input : input.buffer);
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
    const b = new Uint8Array(new ArrayBuffer(input.length));
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
  for (const ch of chars) {
    ret += String.fromCharCode(ch);
  }
  return ret;
}
function stringToUtf8(string) {
  return utf8Encoder.encode(string).buffer;
}
function stringToUtf16(string) {
  const ret = new Uint16Array(new ArrayBuffer(string.length));
  for (let i = 0; i < ret.length; ++i) {
    ret[i] = string.charCodeAt(i);
  }
  return ret.buffer;
}
function stringToUtf32(string) {
  let trueLength = 0;
  const temp = new Uint32Array(new ArrayBuffer(string.length * 4 * 2));
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
function _embind_register_known_name(_impl, name, func) {
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
   * **IMPORTANT**: Until `initialize` is called, no WASM-related methods/fields can be used.
   *
   * `addEventListener` and other `EventTarget` methods are fine, though, and in fact are required for events that occur during `_initialize` or `_start`.
   *
   * If you don't care about events during initialization, you can also just call `InstantiatedWasm.instantiate`, which is an async function that does both in one step.
   */
  constructor() {
    super();
    this.module = this.instance = this.exports = this.cachedMemoryView = null;
    this.embind = {};
  }
  /**
   * Instantiates a WASM module with the specified WASI imports.
   *
   * `input` can be any one of:
   *
   * * `Response` or `Promise<Response>` (from e.g. `fetch`). Uses `WebAssembly.instantiateStreaming`.
   * * `ArrayBuffer` representing the WASM in binary form, or a `WebAssembly.Module`.
   * * A function that takes 1 argument of type `WebAssembly.Imports` and returns a `WebAssembly.WebAssemblyInstantiatedSource`. This is the type that `@rollup/plugin-wasm` returns when bundling a pre-built WASM binary.
   *
   * @param wasmFetchPromise
   * @param unboundImports
   */
  async instantiate(wasmDataOrFetcher, { wasi_snapshot_preview1, env, ...unboundImports }) {
    let module;
    let instance;
    const imports = {
      wasi_snapshot_preview1: bindAllFuncs(this, wasi_snapshot_preview1),
      env: bindAllFuncs(this, env),
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
    this.instance = instance;
    this.module = module;
    this.exports = this.instance.exports;
    this.cachedMemoryView = new DataView(this.exports.memory.buffer);
    console.assert("_initialize" in this.instance.exports != "_start" in this.instance.exports, `Expected either _initialize XOR _start to be exported from this WASM.`);
    (this.exports._initialize ?? this.exports._start)?.();
    await awaitAllEmbind();
  }
  static async instantiate(wasmDataOrFetcher, unboundImports, eventListeners = []) {
    const ret = new _InstantiatedWasm();
    for (const args of eventListeners)
      ret.addEventListener(...args);
    await ret.instantiate(wasmDataOrFetcher, unboundImports);
    return ret;
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
    const withResolvers = getDependencyResolvers(typeId);
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
function finalizeType(_impl, name, parsedTypeInfo) {
  const info = { name, ...parsedTypeInfo };
  const withResolvers = getDependencyResolvers(info.typeId);
  withResolvers.resolve(withResolvers.resolvedValue = info);
}

// ../dist/env/embind_register_bigint.js
function _embind_register_bigint(rawTypePtr, namePtr, _size, minRange, _maxRange) {
  _embind_register(this, namePtr, (name) => {
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
var InstantiatedClasses = /* @__PURE__ */ new Map();
var DestructorsYetToBeCalled = /* @__PURE__ */ new Map();
var Secret = Symbol();
var SecretNoDispose = Symbol();
var registry = new FinalizationRegistry((_this) => {
  const destructor = DestructorsYetToBeCalled.get(_this);
  if (destructor) {
    console.warn(`WASM class at address ${_this} was not properly disposed.`);
    destructor();
    DestructorsYetToBeCalled.delete(_this);
  }
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
      const existing = InstantiatedClasses.get(_this)?.deref();
      if (existing)
        return existing;
      this._this = _this;
      InstantiatedClasses.set(_this, new WeakRef(this));
      registry.register(this, _this);
      if (args[0] != SecretNoDispose) {
        const destructor = new.target._destructor;
        DestructorsYetToBeCalled.set(_this, () => {
          destructor(_this);
          InstantiatedClasses.delete(_this);
        });
      }
    }
  }
  [Symbol.dispose]() {
    const destructor = DestructorsYetToBeCalled.get(this._this);
    if (destructor) {
      DestructorsYetToBeCalled.get(this._this)?.();
      DestructorsYetToBeCalled.delete(this._this);
      this._this = 0;
    }
  }
};

// ../dist/_private/embind/get-table-function.js
function getTableFunction(impl, _signaturePtr, functionIndex) {
  const fp = impl.exports.__indirect_function_table.get(functionIndex);
  console.assert(typeof fp == "function");
  return fp;
}

// ../dist/env/embind_register_class.js
function _embind_register_class(rawType, rawPointerType, rawConstPointerType, _baseClassRawType, _getActualTypeSignature, _getActualTypePtr, _upcastSignature, _upcastPtr, _downcastSignature, _downcastPtr, namePtr, destructorSignature, rawDestructorPtr) {
  _embind_register(this, namePtr, (name) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any , @typescript-eslint/no-unsafe-member-access
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
    const wiredReturn = rawInvoker(...wiredArgs);
    runDestructors(stackBasedDestructors);
    if (returnType == null)
      return void 0;
    const { jsValue, wireValue, stackDestructor } = returnType.fromWireType(wiredReturn);
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
var setPointer = Is64 ? "setBigUint64" : "setUint32";
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
function _embind_register_class_class_function(rawClassTypeId, methodNamePtr, argCount, rawArgTypesPtr, invokerSignaturePtr, invokerIndex, invokerContext, _isAsync) {
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
function _embind_register_class_function(rawClassTypeId, methodNamePtr, argCount, rawArgTypesPtr, invokerSignaturePtr, invokerIndex, invokerContext, _isPureVirtual, _isAsync) {
  const [returnTypeId, _thisTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
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
function _embind_register_emval(_typePtr) {
}
function _emval_take_value(_rawTypePtr, _ptr) {
  return 0;
}
function _emval_decref(_handle) {
  return 0;
}

// ../dist/env/embind_register_enum.js
var AllEnums = {};
function _embind_register_enum(typePtr, namePtr, _size, _isSigned) {
  _embind_register(this, namePtr, (name) => {
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
  _embind_register(this, namePtr, (name) => {
    AllEnums[rawEnumType][name] = enumValue;
  });
}

// ../dist/env/embind_register_float.js
function _embind_register_float(typePtr, namePtr, _byteWidth) {
  _embind_register(this, namePtr, (name) => {
    finalizeType(this, name, {
      typeId: typePtr,
      fromWireType: (value) => ({ wireValue: value, jsValue: value }),
      toWireType: (value) => ({ wireValue: value, jsValue: value })
    });
  });
}

// ../dist/env/embind_register_function.js
function _embind_register_function(namePtr, argCount, rawArgTypesPtr, signature, rawInvokerPtr, functionIndex, _isAsync) {
  const [returnTypeId, ...argTypeIds] = readArrayOfTypes(this, argCount, rawArgTypesPtr);
  _embind_register(this, namePtr, async (name) => {
    this.embind[name] = await createGlueFunction(this, name, returnTypeId, argTypeIds, signature, rawInvokerPtr, functionIndex);
  });
}

// ../dist/env/embind_register_integer.js
function _embind_register_integer(typePtr, namePtr, byteWidth, minValue, _maxValue) {
  _embind_register(this, namePtr, (name) => {
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
function _embind_register_memory_view(_ex) {
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
  _embind_register(impl, namePtr, (name) => {
    const fromWireType = (ptr) => {
      const length = readSizeT(impl, ptr);
      const payload = ptr + getSizeTSize(impl);
      const decodeStartPtr = payload;
      const str = utfToStringL(impl, decodeStartPtr, length);
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
function _embind_register_user_type(..._args) {
}

// ../dist/_private/embind/register-composite.js
var compositeRegistrations = /* @__PURE__ */ new Map();
function _embind_register_value_composite(impl, rawTypePtr, namePtr, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
  compositeRegistrations.set(rawTypePtr, {
    namePtr,
    _constructor: getTableFunction(impl, constructorSignature, rawConstructor),
    _destructor: getTableFunction(impl, destructorSignature, rawDestructor),
    elements: []
  });
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
  compositeRegistrations.get(rawTupleType).elements.push({
    getterContext,
    setterContext,
    getterReturnTypeId,
    setterArgumentTypeId,
    wasmGetter: getTableFunction(this, getterSignature, getter),
    wasmSetter: getTableFunction(this, setterSignature, setter)
  });
}
function _embind_finalize_value_array(rawTypePtr) {
  const reg = compositeRegistrations.get(rawTypePtr);
  compositeRegistrations.delete(rawTypePtr);
  _embind_register(this, reg.namePtr, async (name) => {
    const fieldRecords = await _embind_finalize_composite_elements(reg.elements);
    finalizeType(this, name, {
      typeId: rawTypePtr,
      fromWireType: (ptr) => {
        const elementDestructors = [];
        const ret = [];
        for (let i = 0; i < reg.elements.length; ++i) {
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
        const elementDestructors = [];
        const ptr = reg._constructor();
        let i = 0;
        for (const field of fieldRecords) {
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
  compositeRegistrations.set(rawType, {
    namePtr,
    _constructor: getTableFunction(this, constructorSignature, rawConstructor),
    _destructor: getTableFunction(this, destructorSignature, rawDestructor),
    elements: []
  });
}
function _embind_register_value_object_field(rawTypePtr, fieldName, getterReturnTypeId, getterSignature, getter, getterContext, setterArgumentTypeId, setterSignature, setter, setterContext) {
  compositeRegistrations.get(rawTypePtr).elements.push({
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
  const reg = compositeRegistrations.get(rawTypePtr);
  compositeRegistrations.delete(rawTypePtr);
  _embind_register(this, reg.namePtr, async (name) => {
    const fieldRecords = await _embind_finalize_composite_elements(reg.elements);
    finalizeType(this, name, {
      typeId: rawTypePtr,
      fromWireType: (ptr) => {
        const elementDestructors = [];
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
        const elementDestructors = [];
        for (const field of fieldRecords) {
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
  constructor(_impl, index) {
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
  const ptr = getCppExceptionThrownObjectFromWebAssemblyException(impl, ex);
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
function _tzset_js(_timezone, _daylight, _std_name, _dst_name) {
}

// ../dist/errno.js
var ESUCCESS = 0;
var EBADF = 8;
var EINVAL = 28;
var ENOSYS = 52;
var ESPIPE = 70;

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
    case +ClockId.REALTIME:
      nowMs = Date.now();
      break;
    case +ClockId.MONOTONIC:
      if (p == null)
        return ENOSYS;
      nowMs = p.now();
      break;
    case +ClockId.PROCESS_CPUTIME_ID:
    case +ClockId.THREAD_CPUTIME_ID:
      return ENOSYS;
    default:
      return EINVAL;
  }
  const nowNs = BigInt(Math.round(nowMs * 1e3 * 1e3));
  writeUint64(this, outPtr, nowNs);
  return ESUCCESS;
}

// ../dist/_private/environ.js
var EnvironGetEvent = class extends CustomEvent {
  constructor() {
    super("environ_get", { cancelable: false, detail: { strings: [] } });
  }
};
var EnvironInfoSymbol = Symbol();
function getEnviron(impl) {
  return impl[EnvironInfoSymbol] ??= (() => {
    const t = new TextEncoder();
    const e = new EnvironGetEvent();
    impl.dispatchEvent(e);
    const strings = e.detail.strings;
    let bufferSize = 0;
    const buffers = [];
    for (const [key, value] of strings) {
      const utf8 = t.encode(`${key}=${value}\0`);
      bufferSize += utf8.length + 1;
      buffers.push(utf8);
    }
    return { bufferSize, strings: buffers };
  })();
}

// ../dist/util/copy-to-wasm.js
function copyToWasm(instance, destinationAddress, sourceData) {
  new Uint8Array(instance.cachedMemoryView.buffer, destinationAddress, sourceData.byteLength).set(sourceData);
}

// ../dist/util/write-pointer.js
function writePointer(instance, ptr, value) {
  instance.cachedMemoryView[setPointer](ptr, value, true);
}

// ../dist/wasi_snapshot_preview1/environ_get.js
function environ_get(environ, environBuffer) {
  const { strings } = getEnviron(this);
  let currentBufferPtr = environBuffer;
  let currentEnvironPtr = environ;
  for (const string of strings) {
    writePointer(this, currentEnvironPtr, currentBufferPtr);
    copyToWasm(this, currentBufferPtr, string);
    currentBufferPtr += string.byteLength + 1;
    currentEnvironPtr += getPointerSize(this);
  }
  return ESUCCESS;
}

// ../dist/wasi_snapshot_preview1/environ_sizes_get.js
function environ_sizes_get(environCountOutput, environSizeOutput) {
  const { bufferSize, strings } = getEnviron(this);
  writeUint32(this, environCountOutput, strings.length);
  writeUint32(this, environSizeOutput, bufferSize);
  return ESUCCESS;
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
  const bufferStart = readPointer(info, ptr);
  const bufferLength = readUint32(info, ptr + getPointerSize(info));
  const uint8 = new Uint8Array(info.cachedMemoryView.buffer, bufferStart, bufferLength);
  return {
    bufferStart,
    bufferLength,
    uint8
  };
}
function parseArray(info, ptr, count) {
  const sizeofStruct = getPointerSize(info) + 4;
  const ret = [];
  for (let i = 0; i < count; ++i) {
    ret.push(parse(info, ptr + i * sizeofStruct));
  }
  return ret;
}

// ../dist/wasi_snapshot_preview1/fd_read.js
var FdReadInfoSymbol = Symbol();
var FileDescriptorReadEvent = class extends CustomEvent {
  constructor(fileDescriptor, data) {
    super("fd_read", {
      bubbles: false,
      cancelable: true,
      detail: {
        fileDescriptor,
        data
      }
    });
  }
};
function fd_read(fd, iov, iovcnt, pnum) {
  let nWritten = 0;
  const buffers = parseArray(this, iov, iovcnt);
  const this2 = this[FdReadInfoSymbol] ??= { data: [] };
  const event = new FileDescriptorReadEvent(fd, this2.data);
  if (this.dispatchEvent(event)) {
    if (fd === 0) {
      if (event.detail.data.length == 0) {
        console.assert(event.detail.data.length == 0);
        const str = (window.prompt() ?? "") + "\n";
        event.detail.data.push(str);
      }
    } else {
      return EBADF;
    }
  }
  let outBuffIndex = 0;
  let inBuffIndex = 0;
  let outBuff = buffers[outBuffIndex].uint8;
  let inBuff = event.detail.data[inBuffIndex];
  while (true) {
    if (typeof inBuff == "string")
      inBuff = new TextEncoder().encode(inBuff);
    if (outBuff == null || inBuff == null)
      break;
    const lengthRemainingToWrite = inBuff.byteLength;
    const lengthAvailableToWrite = outBuff.byteLength;
    const lengthToWrite = Math.min(lengthAvailableToWrite, lengthRemainingToWrite);
    outBuff.set(inBuff.subarray(0, lengthToWrite));
    inBuff = inBuff.subarray(lengthToWrite);
    outBuff = outBuff.subarray(lengthToWrite);
    if (lengthRemainingToWrite < lengthAvailableToWrite) {
      ++inBuffIndex;
      inBuff = event.detail.data[inBuffIndex];
    }
    if (lengthAvailableToWrite < lengthRemainingToWrite) {
      ++outBuffIndex;
      outBuff = buffers[outBuffIndex]?.uint8;
    }
    nWritten += lengthToWrite;
  }
  const d = [];
  if (inBuff && inBuff.byteLength)
    d.push(inBuff);
  if (event.detail.data.length > 0)
    d.push(...event.detail.data.slice(inBuffIndex + 1));
  this2.data = d;
  writeSizeT(this, pnum, nWritten);
  return ESUCCESS;
}

// ../dist/wasi_snapshot_preview1/fd_seek.js
var FileDescriptorSeekEvent = class extends CustomEvent {
  constructor(fileDescriptor, offset, whence) {
    super("fd_seek", { cancelable: true, detail: { fileDescriptor, offset, whence, newPosition: 0, error: void 0 } });
  }
};
function fd_seek(fd, offset, whence, offsetOut) {
  const event = new FileDescriptorSeekEvent(fd, offset, whence);
  if (this.dispatchEvent(event)) {
    switch (fd) {
      case 0:
      case 1:
      case 2:
        return ESPIPE;
      default:
        return EBADF;
    }
  } else {
    writePointer(this, offsetOut, event.detail.newPosition);
    return event.detail.error ?? ESUCCESS;
  }
}

// ../dist/wasi_snapshot_preview1/fd_write.js
var FileDescriptorWriteEvent = class extends CustomEvent {
  constructor(fileDescriptor, data) {
    super("fd_write", {
      bubbles: false,
      cancelable: true,
      detail: {
        data,
        fileDescriptor,
        asString(label) {
          return this.data.map((d, index) => {
            const decoded = typeof d == "string" ? d : getTextDecoder(label).decode(d);
            if (decoded == "\0" && index == this.data.length - 1)
              return "";
            return decoded;
          }).join("");
        }
      }
    });
  }
};
function fd_write(fd, iov, iovcnt, pnum) {
  let nWritten = 0;
  const gen = parseArray(this, iov, iovcnt);
  const asTypedArrays = gen.map(({ bufferStart, bufferLength }) => {
    nWritten += bufferLength;
    return new Uint8Array(this.cachedMemoryView.buffer, bufferStart, bufferLength);
  });
  const event = new FileDescriptorWriteEvent(fd, asTypedArrays);
  if (this.dispatchEvent(event)) {
    const str = event.detail.asString("utf-8");
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
var ProcExitEvent = class extends CustomEvent {
  code;
  constructor(code) {
    super("proc_exit", { bubbles: false, cancelable: false, detail: { code } });
    this.code = code;
  }
};
function proc_exit(code) {
  this.dispatchEvent(new ProcExitEvent(code));
}

// stage/instantiate.ts
async function instantiate(where, uninstantiated) {
  let wasm2 = new InstantiatedWasm();
  wasm2.addEventListener("environ_get", (e) => {
    e.detail.strings = [
      ["key_1", "value_1"],
      ["key_2", "value_2"],
      ["key_3", "value_3"]
    ];
  });
  await wasm2.instantiate(uninstantiated ?? fetch(new URL("wasm.wasm", import.meta.url)), {
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
      const value = e.detail.asString("utf-8");
      console.log(`${where}: ${value}`);
    }
  });
  return wasm2;
}

// stage/worklet.ts
var { promise: uninstantiatedWasm, resolve: resolveUninstantiatedWasm } = Promise.withResolvers();
var wasm = null;
uninstantiatedWasm.then((binary) => instantiate("Worklet", binary).then((w) => wasm = w));
registerProcessor("random-noise-processor", class RandomNoiseProcessor extends AudioWorkletProcessor {
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
});
/*! Bundled license information:

comlink/dist/esm/comlink.mjs:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc3JjL3BvbHlmaWxsL2V2ZW50LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9wb2x5ZmlsbC9jdXN0b20tZXZlbnQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3BvbHlmaWxsL3RleHQtZGVjb2Rlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvcG9seWZpbGwvdGV4dC1lbmNvZGVyLnRzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9jb21saW5rQDQuNC4xL25vZGVfbW9kdWxlcy9jb21saW5rL3NyYy9jb21saW5rLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDMyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3JlYWQtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL3N0cmluZy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNtLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvYWxpZ25mYXVsdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2dldC10eXBlLWluZm8udHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfYm9vbC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1uYW1lZC1mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9nZXQtdGFibGUtZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL2lzLTY0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3BvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC1wb2ludGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9lbXZhbC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9lbnVtLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvc2l6ZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC1zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS1zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50MTYudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDMyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQ4LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3QudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfdm9pZC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9zZWdmYXVsdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZXhjZXB0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi90enNldF9qcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvZXJybm8udHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDY0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Nsb2NrX3RpbWVfZ2V0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbnZpcm9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL2NvcHktdG8td2FzbS50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS1wb2ludGVyLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fZ2V0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fc2l6ZXNfZ2V0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX2Nsb3NlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9pb3ZlYy50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9yZWFkLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3NlZWsudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfd3JpdGUudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvcHJvY19leGl0LnRzIiwgIi4uLy4uL2luc3RhbnRpYXRlLnRzIiwgIi4uLy4uL3dvcmtsZXQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1mdW5jdGlvbiAqL1xyXG5cclxuLy8gUG9seWZpbGwgZm9yIGV4dHJlbWVseSBsaW1pdGVkIGVudmlyb25tZW50cywgbGlrZSBXb3JrbGV0cy5cclxuLy8gVGhpcyBzZWVtcyB0byBleGlzdCBpbiBDaHJvbWUgYnV0IG5vdCwgZS5nLiwgRmlyZWZveCwgcG9zc2libHkgU2FmYXJpXHJcbi8vIFRPRE86IFRoaXMgaXMgdGlueSwgYnV0IGEgd2F5IHRvIG9wdGltaXplIGl0IG91dCBmb3IgZW52aXJvbm1lbnRzIHRoYXQgKmRvKiBoYXZlIGBFdmVudGAgd291bGQgYmUgbmljZS4uLlxyXG5jbGFzcyBFdmVudCB7XHJcblxyXG4gICAgY29uc3RydWN0b3IodHlwZV86IHN0cmluZywgZXZlbnRJbml0RGljdD86IEV2ZW50SW5pdCkge1xyXG4gICAgICAgIHRoaXMuYnViYmxlcyA9IGV2ZW50SW5pdERpY3Q/LmJ1YmJsZXMgfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5jYW5jZWxCdWJibGUgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNhbmNlbGFibGUgPSBldmVudEluaXREaWN0Py5jYW5jZWxhYmxlIHx8IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY29tcG9zZWQgPSBldmVudEluaXREaWN0Py5jb21wb3NlZCB8fCBmYWxzZTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRUYXJnZXQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZGVmYXVsdFByZXZlbnRlZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuZXZlbnRQaGFzZSA9IEV2ZW50Lk5PTkU7XHJcbiAgICAgICAgdGhpcy5pc1RydXN0ZWQgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnNyY0VsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMudGFyZ2V0ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnRpbWVTdGFtcCA9IDA7XHJcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZV87XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIE5PTkUgPSAwO1xyXG4gICAgc3RhdGljIENBUFRVUklOR19QSEFTRSA9IDE7XHJcbiAgICBzdGF0aWMgQVRfVEFSR0VUID0gMjtcclxuICAgIHN0YXRpYyBCVUJCTElOR19QSEFTRSA9IDM7XHJcblxyXG4gICAgYnViYmxlczogYm9vbGVhbjtcclxuICAgIGNhbmNlbEJ1YmJsZTogYm9vbGVhbjtcclxuICAgIGNhbmNlbGFibGU6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBjb21wb3NlZDogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IGN1cnJlbnRUYXJnZXQ6IEV2ZW50VGFyZ2V0IHwgbnVsbDtcclxuICAgIGRlZmF1bHRQcmV2ZW50ZWQ6IGJvb2xlYW47XHJcbiAgICByZWFkb25seSBldmVudFBoYXNlOiBudW1iZXI7XHJcbiAgICByZWFkb25seSBpc1RydXN0ZWQ6IGJvb2xlYW47XHJcbiAgICByZXR1cm5WYWx1ZTogYm9vbGVhbjtcclxuICAgIHJlYWRvbmx5IHNyY0VsZW1lbnQ6IEV2ZW50VGFyZ2V0IHwgbnVsbDtcclxuICAgIHJlYWRvbmx5IHRhcmdldDogRXZlbnRUYXJnZXQgfCBudWxsO1xyXG4gICAgcmVhZG9ubHkgdGltZVN0YW1wOiBET01IaWdoUmVzVGltZVN0YW1wO1xyXG4gICAgdHlwZTogc3RyaW5nO1xyXG4gICAgY29tcG9zZWRQYXRoKCk6IEV2ZW50VGFyZ2V0W10geyByZXR1cm4gW10gfVxyXG4gICAgaW5pdEV2ZW50KHR5cGVfOiBzdHJpbmcsIGJ1YmJsZXM/OiBib29sZWFuLCBjYW5jZWxhYmxlPzogYm9vbGVhbik6IHZvaWQgeyB0aGlzLnR5cGUgPSB0eXBlXzsgdGhpcy5idWJibGVzID0gYnViYmxlcyB8fCB0aGlzLmJ1YmJsZXM7IHRoaXMuY2FuY2VsYWJsZSA9IGNhbmNlbGFibGUgfHwgdGhpcy5jYW5jZWxhYmxlOyB9XHJcbiAgICBwcmV2ZW50RGVmYXVsdCgpOiB2b2lkIHsgdGhpcy5kZWZhdWx0UHJldmVudGVkID0gdHJ1ZTsgfVxyXG4gICAgc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk6IHZvaWQgeyB9XHJcbiAgICBzdG9wUHJvcGFnYXRpb24oKTogdm9pZCB7IH1cclxuXHJcbn07XHJcblxyXG4oZ2xvYmFsVGhpcy5FdmVudCkgPz89ICgoKSA9PiB7XHJcbiAgICAvLyBjb25zb2xlLmluZm8oYFRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3QgZGVmaW5lIEV2ZW50OyB1c2luZyBhIHBvbHlmaWxsLmApXHJcbiAgICByZXR1cm4gRXZlbnQ7XHJcbn0pKCkgYXMgbmV2ZXI7XHJcbiIsICJpbXBvcnQgdHlwZSB7IEV2ZW50VHlwZXNNYXAgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZXZlbnQtdHlwZXMtbWFwLmpzXCI7XHJcblxyXG4vLyBXb3JrbGV0cyBkb24ndCBkZWZpbmUgYEN1c3RvbUV2ZW50YCwgZXZlbiB3aGVuIHRoZXkgZG8gZGVmaW5lIGBFdmVudGAgaXRzZWxmLi4uXHJcbmNsYXNzIEN1c3RvbUV2ZW50PFQgPSB1bmtub3duPiBleHRlbmRzIEV2ZW50IHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlOiBrZXlvZiBFdmVudFR5cGVzTWFwLCBldmVudEluaXREaWN0PzogQ3VzdG9tRXZlbnRJbml0PFQ+KSB7XHJcbiAgICAgICAgc3VwZXIodHlwZSwgZXZlbnRJbml0RGljdCk7XHJcbiAgICAgICAgdGhpcy5kZXRhaWwgPSBldmVudEluaXREaWN0Py5kZXRhaWwgYXMgbmV2ZXI7XHJcbiAgICB9XHJcblxyXG4gICAgZGV0YWlsOiBUO1xyXG5cclxuICAgIGluaXRDdXN0b21FdmVudChfdHlwZTogc3RyaW5nLCBfYnViYmxlcz86IGJvb2xlYW4sIF9jYW5jZWxhYmxlPzogYm9vbGVhbiwgZGV0YWlsPzogVCk6IHZvaWQge1xyXG4gICAgICAgIC8vIHRoaXMudHlwZSwgdGhpcy5idWJibGVzLCBhbmQgdGhpcy5jYW5jZWxhYmxlIGFyZSBhbGwgcmVhZG9ubHkuLi5cclxuICAgICAgICB0aGlzLmRldGFpbCA9IChkZXRhaWwgPz8gdGhpcy5kZXRhaWwpITtcclxuICAgIH1cclxufVxyXG5cclxuKGdsb2JhbFRoaXMuQ3VzdG9tRXZlbnQpID8/PSAoKCkgPT4ge1xyXG4gICAgLy8gY29uc29sZS5pbmZvKGBUaGlzIGVudmlyb25tZW50IGRvZXMgbm90IGRlZmluZSBDdXN0b21FdmVudDsgdXNpbmcgYSBwb2x5ZmlsbGApO1xyXG4gICAgcmV0dXJuIEN1c3RvbUV2ZW50O1xyXG59KSgpIGFzIG5ldmVyO1xyXG4iLCAiXHJcbmdsb2JhbFRoaXMuVGV4dERlY29kZXIgPz89IGNsYXNzIFREIGltcGxlbWVudHMgVGV4dERlY29kZXJDb21tb24ge1xyXG4gICAgZW5jb2RpbmcgPSAndXRmOCc7XHJcbiAgICBmYXRhbCA9IGZhbHNlO1xyXG4gICAgaWdub3JlQk9NID0gZmFsc2U7XHJcbiAgICBkZWNvZGUoaW5wdXQ/OiBBbGxvd1NoYXJlZEJ1ZmZlclNvdXJjZSwgX29wdGlvbnM/OiBUZXh0RGVjb2RlT3B0aW9ucyk6IHN0cmluZyB7XHJcbiAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgIGlmICghaW5wdXQpXHJcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG5cclxuICAgICAgICBjb25zdCBpbnB1dDIgPSBuZXcgVWludDhBcnJheSgoaW5wdXQgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikgPyBpbnB1dCA6IGlucHV0LmJ1ZmZlcik7XHJcblxyXG4gICAgICAgIGxldCByZXQgPSBcIlwiO1xyXG4gICAgICAgIHdoaWxlIChpIDwgaW5wdXQuYnl0ZUxlbmd0aCkge1xyXG4gICAgICAgICAgICBjb25zdCBieXRlID0gaW5wdXQyW2ldO1xyXG4gICAgICAgICAgICBpZiAoYnl0ZSA8IDB4ODApXHJcbiAgICAgICAgICAgICAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBub24tQVNDSUkgY2hhcmFjdGVycyBpbiBXb3JrbGV0c1wiKVxyXG4gICAgICAgICAgICArK2k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgfVxyXG59XHJcblxyXG4iLCAiXHJcbmdsb2JhbFRoaXMuVGV4dEVuY29kZXIgPz89IGNsYXNzIFREIGltcGxlbWVudHMgVGV4dEVuY29kZXJDb21tb24ge1xyXG4gICAgZW5jb2RpbmcgPSAndXRmOCc7XHJcbiAgICBlbmNvZGVJbnRvKHNvdXJjZTogc3RyaW5nLCBkZXN0aW5hdGlvbjogVWludDhBcnJheSk6IFRleHRFbmNvZGVyRW5jb2RlSW50b1Jlc3VsdCB7XHJcblxyXG4gICAgICAgIGxldCByZWFkID0gMDtcclxuICAgICAgICBsZXQgd3JpdHRlbiA9IDA7XHJcblxyXG4gICAgICAgIGxldCBieXRlSW5kZXggPSAwO1xyXG4gICAgICAgIGZvciAoY29uc3QgY2ggb2Ygc291cmNlKSB7XHJcbiAgICAgICAgICAgIGlmIChjaC5jb2RlUG9pbnRBdCgwKSEgPj0gMHg4MClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogbm9uLUFTQ0lJIGNoYXJhY3RlcnMgaW4gV29ya2xldHNcIik7XHJcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uW2J5dGVJbmRleCsrXSA9IGNoLmNvZGVQb2ludEF0KDApITtcclxuICAgICAgICAgICAgKytyZWFkO1xyXG4gICAgICAgICAgICArK3dyaXR0ZW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZWFkLFxyXG4gICAgICAgICAgICB3cml0dGVuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZW5jb2RlKGlucHV0Pzogc3RyaW5nKTogVWludDhBcnJheSB7XHJcbiAgICAgICAgaWYgKCFpbnB1dClcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGIgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIoaW5wdXQubGVuZ3RoKSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICBpZiAoaW5wdXRbaV0uY2hhckNvZGVBdCgwKSA8IDB4ODApXHJcbiAgICAgICAgICAgICAgICBiW2ldID0gaW5wdXRbaV0uY2hhckNvZGVBdCgwKSFcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcbn1cclxuXHJcbiIsICIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuICovXG5cbmltcG9ydCB7XG4gIEVuZHBvaW50LFxuICBFdmVudFNvdXJjZSxcbiAgTWVzc2FnZSxcbiAgTWVzc2FnZVR5cGUsXG4gIFBvc3RNZXNzYWdlV2l0aE9yaWdpbixcbiAgV2lyZVZhbHVlLFxuICBXaXJlVmFsdWVUeXBlLFxufSBmcm9tIFwiLi9wcm90b2NvbFwiO1xuZXhwb3J0IHR5cGUgeyBFbmRwb2ludCB9O1xuXG5leHBvcnQgY29uc3QgcHJveHlNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnByb3h5XCIpO1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUVuZHBvaW50ID0gU3ltYm9sKFwiQ29tbGluay5lbmRwb2ludFwiKTtcbmV4cG9ydCBjb25zdCByZWxlYXNlUHJveHkgPSBTeW1ib2woXCJDb21saW5rLnJlbGVhc2VQcm94eVwiKTtcbmV4cG9ydCBjb25zdCBmaW5hbGl6ZXIgPSBTeW1ib2woXCJDb21saW5rLmZpbmFsaXplclwiKTtcblxuY29uc3QgdGhyb3dNYXJrZXIgPSBTeW1ib2woXCJDb21saW5rLnRocm93blwiKTtcblxuLyoqXG4gKiBJbnRlcmZhY2Ugb2YgdmFsdWVzIHRoYXQgd2VyZSBtYXJrZWQgdG8gYmUgcHJveGllZCB3aXRoIGBjb21saW5rLnByb3h5KClgLlxuICogQ2FuIGFsc28gYmUgaW1wbGVtZW50ZWQgYnkgY2xhc3Nlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcm94eU1hcmtlZCB7XG4gIFtwcm94eU1hcmtlcl06IHRydWU7XG59XG5cbi8qKlxuICogVGFrZXMgYSB0eXBlIGFuZCB3cmFwcyBpdCBpbiBhIFByb21pc2UsIGlmIGl0IG5vdCBhbHJlYWR5IGlzIG9uZS5cbiAqIFRoaXMgaXMgdG8gYXZvaWQgYFByb21pc2U8UHJvbWlzZTxUPj5gLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFVucHJvbWlzaWZ5PFQ+YC5cbiAqL1xudHlwZSBQcm9taXNpZnk8VD4gPSBUIGV4dGVuZHMgUHJvbWlzZTx1bmtub3duPiA/IFQgOiBQcm9taXNlPFQ+O1xuLyoqXG4gKiBUYWtlcyBhIHR5cGUgdGhhdCBtYXkgYmUgUHJvbWlzZSBhbmQgdW53cmFwcyB0aGUgUHJvbWlzZSB0eXBlLlxuICogSWYgYFBgIGlzIG5vdCBhIFByb21pc2UsIGl0IHJldHVybnMgYFBgLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFByb21pc2lmeTxUPmAuXG4gKi9cbnR5cGUgVW5wcm9taXNpZnk8UD4gPSBQIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiBQO1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBwcm9wZXJ0eSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGF0IGlzIHZpc2libGUgdG8gdGhlIGxvY2FsIHRocmVhZCBvbiB0aGUgcHJveHkuXG4gKlxuICogTm90ZTogVGhpcyBuZWVkcyB0byBiZSBpdHMgb3duIHR5cGUgYWxpYXMsIG90aGVyd2lzZSBpdCB3aWxsIG5vdCBkaXN0cmlidXRlIG92ZXIgdW5pb25zLlxuICogU2VlIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL2FkdmFuY2VkLXR5cGVzLmh0bWwjZGlzdHJpYnV0aXZlLWNvbmRpdGlvbmFsLXR5cGVzXG4gKi9cbnR5cGUgUmVtb3RlUHJvcGVydHk8VD4gPVxuICAvLyBJZiB0aGUgdmFsdWUgaXMgYSBtZXRob2QsIGNvbWxpbmsgd2lsbCBwcm94eSBpdCBhdXRvbWF0aWNhbGx5LlxuICAvLyBPYmplY3RzIGFyZSBvbmx5IHByb3hpZWQgaWYgdGhleSBhcmUgbWFya2VkIHRvIGJlIHByb3hpZWQuXG4gIC8vIE90aGVyd2lzZSwgdGhlIHByb3BlcnR5IGlzIGNvbnZlcnRlZCB0byBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB0aGUgY2xvbmVkIHZhbHVlLlxuICBUIGV4dGVuZHMgRnVuY3Rpb24gfCBQcm94eU1hcmtlZCA/IFJlbW90ZTxUPiA6IFByb21pc2lmeTxUPjtcblxuLyoqXG4gKiBUYWtlcyB0aGUgcmF3IHR5cGUgb2YgYSBwcm9wZXJ0eSBhcyBhIHJlbW90ZSB0aHJlYWQgd291bGQgc2VlIGl0IHRocm91Z2ggYSBwcm94eSAoZS5nLiB3aGVuIHBhc3NlZCBpbiBhcyBhIGZ1bmN0aW9uXG4gKiBhcmd1bWVudCkgYW5kIHJldHVybnMgdGhlIHR5cGUgdGhhdCB0aGUgbG9jYWwgdGhyZWFkIGhhcyB0byBzdXBwbHkuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUmVtb3RlUHJvcGVydHk8VD5gLlxuICpcbiAqIE5vdGU6IFRoaXMgbmVlZHMgdG8gYmUgaXRzIG93biB0eXBlIGFsaWFzLCBvdGhlcndpc2UgaXQgd2lsbCBub3QgZGlzdHJpYnV0ZSBvdmVyIHVuaW9ucy4gU2VlXG4gKiBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9hZHZhbmNlZC10eXBlcy5odG1sI2Rpc3RyaWJ1dGl2ZS1jb25kaXRpb25hbC10eXBlc1xuICovXG50eXBlIExvY2FsUHJvcGVydHk8VD4gPSBUIGV4dGVuZHMgRnVuY3Rpb24gfCBQcm94eU1hcmtlZFxuICA/IExvY2FsPFQ+XG4gIDogVW5wcm9taXNpZnk8VD47XG5cbi8qKlxuICogUHJveGllcyBgVGAgaWYgaXQgaXMgYSBgUHJveHlNYXJrZWRgLCBjbG9uZXMgaXQgb3RoZXJ3aXNlIChhcyBoYW5kbGVkIGJ5IHN0cnVjdHVyZWQgY2xvbmluZyBhbmQgdHJhbnNmZXIgaGFuZGxlcnMpLlxuICovXG5leHBvcnQgdHlwZSBQcm94eU9yQ2xvbmU8VD4gPSBUIGV4dGVuZHMgUHJveHlNYXJrZWQgPyBSZW1vdGU8VD4gOiBUO1xuLyoqXG4gKiBJbnZlcnNlIG9mIGBQcm94eU9yQ2xvbmU8VD5gLlxuICovXG5leHBvcnQgdHlwZSBVbnByb3h5T3JDbG9uZTxUPiA9IFQgZXh0ZW5kcyBSZW1vdGVPYmplY3Q8UHJveHlNYXJrZWQ+XG4gID8gTG9jYWw8VD5cbiAgOiBUO1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBvYmplY3QgaW4gdGhlIG90aGVyIHRocmVhZCBhbmQgcmV0dXJucyB0aGUgdHlwZSBhcyBpdCBpcyB2aXNpYmxlIHRvIHRoZSBsb2NhbCB0aHJlYWRcbiAqIHdoZW4gcHJveGllZCB3aXRoIGBDb21saW5rLnByb3h5KClgLlxuICpcbiAqIFRoaXMgZG9lcyBub3QgaGFuZGxlIGNhbGwgc2lnbmF0dXJlcywgd2hpY2ggaXMgaGFuZGxlZCBieSB0aGUgbW9yZSBnZW5lcmFsIGBSZW1vdGU8VD5gIHR5cGUuXG4gKlxuICogQHRlbXBsYXRlIFQgVGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIG9iamVjdCBhcyBzZWVuIGluIHRoZSBvdGhlciB0aHJlYWQuXG4gKi9cbmV4cG9ydCB0eXBlIFJlbW90ZU9iamVjdDxUPiA9IHsgW1AgaW4ga2V5b2YgVF06IFJlbW90ZVByb3BlcnR5PFRbUF0+IH07XG4vKipcbiAqIFRha2VzIHRoZSB0eXBlIG9mIGFuIG9iamVjdCBhcyBhIHJlbW90ZSB0aHJlYWQgd291bGQgc2VlIGl0IHRocm91Z2ggYSBwcm94eSAoZS5nLiB3aGVuIHBhc3NlZCBpbiBhcyBhIGZ1bmN0aW9uXG4gKiBhcmd1bWVudCkgYW5kIHJldHVybnMgdGhlIHR5cGUgdGhhdCB0aGUgbG9jYWwgdGhyZWFkIGhhcyB0byBzdXBwbHkuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBoYW5kbGUgY2FsbCBzaWduYXR1cmVzLCB3aGljaCBpcyBoYW5kbGVkIGJ5IHRoZSBtb3JlIGdlbmVyYWwgYExvY2FsPFQ+YCB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludmVyc2Ugb2YgYFJlbW90ZU9iamVjdDxUPmAuXG4gKlxuICogQHRlbXBsYXRlIFQgVGhlIHR5cGUgb2YgYSBwcm94aWVkIG9iamVjdC5cbiAqL1xuZXhwb3J0IHR5cGUgTG9jYWxPYmplY3Q8VD4gPSB7IFtQIGluIGtleW9mIFRdOiBMb2NhbFByb3BlcnR5PFRbUF0+IH07XG5cbi8qKlxuICogQWRkaXRpb25hbCBzcGVjaWFsIGNvbWxpbmsgbWV0aG9kcyBhdmFpbGFibGUgb24gZWFjaCBwcm94eSByZXR1cm5lZCBieSBgQ29tbGluay53cmFwKClgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb3h5TWV0aG9kcyB7XG4gIFtjcmVhdGVFbmRwb2ludF06ICgpID0+IFByb21pc2U8TWVzc2FnZVBvcnQ+O1xuICBbcmVsZWFzZVByb3h5XTogKCkgPT4gdm9pZDtcbn1cblxuLyoqXG4gKiBUYWtlcyB0aGUgcmF3IHR5cGUgb2YgYSByZW1vdGUgb2JqZWN0LCBmdW5jdGlvbiBvciBjbGFzcyBpbiB0aGUgb3RoZXIgdGhyZWFkIGFuZCByZXR1cm5zIHRoZSB0eXBlIGFzIGl0IGlzIHZpc2libGUgdG9cbiAqIHRoZSBsb2NhbCB0aHJlYWQgZnJvbSB0aGUgcHJveHkgcmV0dXJuIHZhbHVlIG9mIGBDb21saW5rLndyYXAoKWAgb3IgYENvbWxpbmsucHJveHkoKWAuXG4gKi9cbmV4cG9ydCB0eXBlIFJlbW90ZTxUPiA9XG4gIC8vIEhhbmRsZSBwcm9wZXJ0aWVzXG4gIFJlbW90ZU9iamVjdDxUPiAmXG4gICAgLy8gSGFuZGxlIGNhbGwgc2lnbmF0dXJlIChpZiBwcmVzZW50KVxuICAgIChUIGV4dGVuZHMgKC4uLmFyZ3M6IGluZmVyIFRBcmd1bWVudHMpID0+IGluZmVyIFRSZXR1cm5cbiAgICAgID8gKFxuICAgICAgICAgIC4uLmFyZ3M6IHsgW0kgaW4ga2V5b2YgVEFyZ3VtZW50c106IFVucHJveHlPckNsb25lPFRBcmd1bWVudHNbSV0+IH1cbiAgICAgICAgKSA9PiBQcm9taXNpZnk8UHJveHlPckNsb25lPFVucHJvbWlzaWZ5PFRSZXR1cm4+Pj5cbiAgICAgIDogdW5rbm93bikgJlxuICAgIC8vIEhhbmRsZSBjb25zdHJ1Y3Qgc2lnbmF0dXJlIChpZiBwcmVzZW50KVxuICAgIC8vIFRoZSByZXR1cm4gb2YgY29uc3RydWN0IHNpZ25hdHVyZXMgaXMgYWx3YXlzIHByb3hpZWQgKHdoZXRoZXIgbWFya2VkIG9yIG5vdClcbiAgICAoVCBleHRlbmRzIHsgbmV3ICguLi5hcmdzOiBpbmZlciBUQXJndW1lbnRzKTogaW5mZXIgVEluc3RhbmNlIH1cbiAgICAgID8ge1xuICAgICAgICAgIG5ldyAoXG4gICAgICAgICAgICAuLi5hcmdzOiB7XG4gICAgICAgICAgICAgIFtJIGluIGtleW9mIFRBcmd1bWVudHNdOiBVbnByb3h5T3JDbG9uZTxUQXJndW1lbnRzW0ldPjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApOiBQcm9taXNpZnk8UmVtb3RlPFRJbnN0YW5jZT4+O1xuICAgICAgICB9XG4gICAgICA6IHVua25vd24pICZcbiAgICAvLyBJbmNsdWRlIGFkZGl0aW9uYWwgc3BlY2lhbCBjb21saW5rIG1ldGhvZHMgYXZhaWxhYmxlIG9uIHRoZSBwcm94eS5cbiAgICBQcm94eU1ldGhvZHM7XG5cbi8qKlxuICogRXhwcmVzc2VzIHRoYXQgYSB0eXBlIGNhbiBiZSBlaXRoZXIgYSBzeW5jIG9yIGFzeW5jLlxuICovXG50eXBlIE1heWJlUHJvbWlzZTxUPiA9IFByb21pc2U8VD4gfCBUO1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBvYmplY3QsIGZ1bmN0aW9uIG9yIGNsYXNzIGFzIGEgcmVtb3RlIHRocmVhZCB3b3VsZCBzZWUgaXQgdGhyb3VnaCBhIHByb3h5IChlLmcuIHdoZW5cbiAqIHBhc3NlZCBpbiBhcyBhIGZ1bmN0aW9uIGFyZ3VtZW50KSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGUgbG9jYWwgdGhyZWFkIGhhcyB0byBzdXBwbHkuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUmVtb3RlPFQ+YC4gSXQgdGFrZXMgYSBgUmVtb3RlPFQ+YCBhbmQgcmV0dXJucyBpdHMgb3JpZ2luYWwgaW5wdXQgYFRgLlxuICovXG5leHBvcnQgdHlwZSBMb2NhbDxUPiA9XG4gIC8vIE9taXQgdGhlIHNwZWNpYWwgcHJveHkgbWV0aG9kcyAodGhleSBkb24ndCBuZWVkIHRvIGJlIHN1cHBsaWVkLCBjb21saW5rIGFkZHMgdGhlbSlcbiAgT21pdDxMb2NhbE9iamVjdDxUPiwga2V5b2YgUHJveHlNZXRob2RzPiAmXG4gICAgLy8gSGFuZGxlIGNhbGwgc2lnbmF0dXJlcyAoaWYgcHJlc2VudClcbiAgICAoVCBleHRlbmRzICguLi5hcmdzOiBpbmZlciBUQXJndW1lbnRzKSA9PiBpbmZlciBUUmV0dXJuXG4gICAgICA/IChcbiAgICAgICAgICAuLi5hcmdzOiB7IFtJIGluIGtleW9mIFRBcmd1bWVudHNdOiBQcm94eU9yQ2xvbmU8VEFyZ3VtZW50c1tJXT4gfVxuICAgICAgICApID0+IC8vIFRoZSByYXcgZnVuY3Rpb24gY291bGQgZWl0aGVyIGJlIHN5bmMgb3IgYXN5bmMsIGJ1dCBpcyBhbHdheXMgcHJveGllZCBhdXRvbWF0aWNhbGx5XG4gICAgICAgIE1heWJlUHJvbWlzZTxVbnByb3h5T3JDbG9uZTxVbnByb21pc2lmeTxUUmV0dXJuPj4+XG4gICAgICA6IHVua25vd24pICZcbiAgICAvLyBIYW5kbGUgY29uc3RydWN0IHNpZ25hdHVyZSAoaWYgcHJlc2VudClcbiAgICAvLyBUaGUgcmV0dXJuIG9mIGNvbnN0cnVjdCBzaWduYXR1cmVzIGlzIGFsd2F5cyBwcm94aWVkICh3aGV0aGVyIG1hcmtlZCBvciBub3QpXG4gICAgKFQgZXh0ZW5kcyB7IG5ldyAoLi4uYXJnczogaW5mZXIgVEFyZ3VtZW50cyk6IGluZmVyIFRJbnN0YW5jZSB9XG4gICAgICA/IHtcbiAgICAgICAgICBuZXcgKFxuICAgICAgICAgICAgLi4uYXJnczoge1xuICAgICAgICAgICAgICBbSSBpbiBrZXlvZiBUQXJndW1lbnRzXTogUHJveHlPckNsb25lPFRBcmd1bWVudHNbSV0+O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk6IC8vIFRoZSByYXcgY29uc3RydWN0b3IgY291bGQgZWl0aGVyIGJlIHN5bmMgb3IgYXN5bmMsIGJ1dCBpcyBhbHdheXMgcHJveGllZCBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgTWF5YmVQcm9taXNlPExvY2FsPFVucHJvbWlzaWZ5PFRJbnN0YW5jZT4+PjtcbiAgICAgICAgfVxuICAgICAgOiB1bmtub3duKTtcblxuY29uc3QgaXNPYmplY3QgPSAodmFsOiB1bmtub3duKTogdmFsIGlzIG9iamVjdCA9PlxuICAodHlwZW9mIHZhbCA9PT0gXCJvYmplY3RcIiAmJiB2YWwgIT09IG51bGwpIHx8IHR5cGVvZiB2YWwgPT09IFwiZnVuY3Rpb25cIjtcblxuLyoqXG4gKiBDdXN0b21pemVzIHRoZSBzZXJpYWxpemF0aW9uIG9mIGNlcnRhaW4gdmFsdWVzIGFzIGRldGVybWluZWQgYnkgYGNhbkhhbmRsZSgpYC5cbiAqXG4gKiBAdGVtcGxhdGUgVCBUaGUgaW5wdXQgdHlwZSBiZWluZyBoYW5kbGVkIGJ5IHRoaXMgdHJhbnNmZXIgaGFuZGxlci5cbiAqIEB0ZW1wbGF0ZSBTIFRoZSBzZXJpYWxpemVkIHR5cGUgc2VudCBvdmVyIHRoZSB3aXJlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zZmVySGFuZGxlcjxULCBTPiB7XG4gIC8qKlxuICAgKiBHZXRzIGNhbGxlZCBmb3IgZXZlcnkgdmFsdWUgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyB0cmFuc2ZlciBoYW5kbGVyXG4gICAqIHNob3VsZCBzZXJpYWxpemUgdGhlIHZhbHVlLCB3aGljaCBpbmNsdWRlcyBjaGVja2luZyB0aGF0IGl0IGlzIG9mIHRoZSByaWdodFxuICAgKiB0eXBlIChidXQgY2FuIHBlcmZvcm0gY2hlY2tzIGJleW9uZCB0aGF0IGFzIHdlbGwpLlxuICAgKi9cbiAgY2FuSGFuZGxlKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgVDtcblxuICAvKipcbiAgICogR2V0cyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUgaWYgYGNhbkhhbmRsZSgpYCByZXR1cm5lZCBgdHJ1ZWAgdG8gcHJvZHVjZSBhXG4gICAqIHZhbHVlIHRoYXQgY2FuIGJlIHNlbnQgaW4gYSBtZXNzYWdlLCBjb25zaXN0aW5nIG9mIHN0cnVjdHVyZWQtY2xvbmVhYmxlXG4gICAqIHZhbHVlcyBhbmQvb3IgdHJhbnNmZXJyYWJsZSBvYmplY3RzLlxuICAgKi9cbiAgc2VyaWFsaXplKHZhbHVlOiBUKTogW1MsIFRyYW5zZmVyYWJsZVtdXTtcblxuICAvKipcbiAgICogR2V0cyBjYWxsZWQgdG8gZGVzZXJpYWxpemUgYW4gaW5jb21pbmcgdmFsdWUgdGhhdCB3YXMgc2VyaWFsaXplZCBpbiB0aGVcbiAgICogb3RoZXIgdGhyZWFkIHdpdGggdGhpcyB0cmFuc2ZlciBoYW5kbGVyIChrbm93biB0aHJvdWdoIHRoZSBuYW1lIGl0IHdhc1xuICAgKiByZWdpc3RlcmVkIHVuZGVyKS5cbiAgICovXG4gIGRlc2VyaWFsaXplKHZhbHVlOiBTKTogVDtcbn1cblxuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGUgdG8gaGFuZGxlIG9iamVjdHMgbWFya2VkIHRvIHByb3h5LlxuICovXG5jb25zdCBwcm94eVRyYW5zZmVySGFuZGxlcjogVHJhbnNmZXJIYW5kbGVyPG9iamVjdCwgTWVzc2FnZVBvcnQ+ID0ge1xuICBjYW5IYW5kbGU6ICh2YWwpOiB2YWwgaXMgUHJveHlNYXJrZWQgPT5cbiAgICBpc09iamVjdCh2YWwpICYmICh2YWwgYXMgUHJveHlNYXJrZWQpW3Byb3h5TWFya2VyXSxcbiAgc2VyaWFsaXplKG9iaikge1xuICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBleHBvc2Uob2JqLCBwb3J0MSk7XG4gICAgcmV0dXJuIFtwb3J0MiwgW3BvcnQyXV07XG4gIH0sXG4gIGRlc2VyaWFsaXplKHBvcnQpIHtcbiAgICBwb3J0LnN0YXJ0KCk7XG4gICAgcmV0dXJuIHdyYXAocG9ydCk7XG4gIH0sXG59O1xuXG5pbnRlcmZhY2UgVGhyb3duVmFsdWUge1xuICBbdGhyb3dNYXJrZXJdOiB1bmtub3duOyAvLyBqdXN0IG5lZWRzIHRvIGJlIHByZXNlbnRcbiAgdmFsdWU6IHVua25vd247XG59XG50eXBlIFNlcmlhbGl6ZWRUaHJvd25WYWx1ZSA9XG4gIHwgeyBpc0Vycm9yOiB0cnVlOyB2YWx1ZTogRXJyb3IgfVxuICB8IHsgaXNFcnJvcjogZmFsc2U7IHZhbHVlOiB1bmtub3duIH07XG5cbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlciB0byBoYW5kbGUgdGhyb3duIGV4Y2VwdGlvbnMuXG4gKi9cbmNvbnN0IHRocm93VHJhbnNmZXJIYW5kbGVyOiBUcmFuc2ZlckhhbmRsZXI8XG4gIFRocm93blZhbHVlLFxuICBTZXJpYWxpemVkVGhyb3duVmFsdWVcbj4gPSB7XG4gIGNhbkhhbmRsZTogKHZhbHVlKTogdmFsdWUgaXMgVGhyb3duVmFsdWUgPT5cbiAgICBpc09iamVjdCh2YWx1ZSkgJiYgdGhyb3dNYXJrZXIgaW4gdmFsdWUsXG4gIHNlcmlhbGl6ZSh7IHZhbHVlIH0pIHtcbiAgICBsZXQgc2VyaWFsaXplZDogU2VyaWFsaXplZFRocm93blZhbHVlO1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBzZXJpYWxpemVkID0ge1xuICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgICB2YWx1ZToge1xuICAgICAgICAgIG1lc3NhZ2U6IHZhbHVlLm1lc3NhZ2UsXG4gICAgICAgICAgbmFtZTogdmFsdWUubmFtZSxcbiAgICAgICAgICBzdGFjazogdmFsdWUuc3RhY2ssXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXJpYWxpemVkID0geyBpc0Vycm9yOiBmYWxzZSwgdmFsdWUgfTtcbiAgICB9XG4gICAgcmV0dXJuIFtzZXJpYWxpemVkLCBbXV07XG4gIH0sXG4gIGRlc2VyaWFsaXplKHNlcmlhbGl6ZWQpIHtcbiAgICBpZiAoc2VyaWFsaXplZC5pc0Vycm9yKSB7XG4gICAgICB0aHJvdyBPYmplY3QuYXNzaWduKFxuICAgICAgICBuZXcgRXJyb3Ioc2VyaWFsaXplZC52YWx1ZS5tZXNzYWdlKSxcbiAgICAgICAgc2VyaWFsaXplZC52YWx1ZVxuICAgICAgKTtcbiAgICB9XG4gICAgdGhyb3cgc2VyaWFsaXplZC52YWx1ZTtcbiAgfSxcbn07XG5cbi8qKlxuICogQWxsb3dzIGN1c3RvbWl6aW5nIHRoZSBzZXJpYWxpemF0aW9uIG9mIGNlcnRhaW4gdmFsdWVzLlxuICovXG5leHBvcnQgY29uc3QgdHJhbnNmZXJIYW5kbGVycyA9IG5ldyBNYXA8XG4gIHN0cmluZyxcbiAgVHJhbnNmZXJIYW5kbGVyPHVua25vd24sIHVua25vd24+XG4+KFtcbiAgW1wicHJveHlcIiwgcHJveHlUcmFuc2ZlckhhbmRsZXJdLFxuICBbXCJ0aHJvd1wiLCB0aHJvd1RyYW5zZmVySGFuZGxlcl0sXG5dKTtcblxuZnVuY3Rpb24gaXNBbGxvd2VkT3JpZ2luKFxuICBhbGxvd2VkT3JpZ2luczogKHN0cmluZyB8IFJlZ0V4cClbXSxcbiAgb3JpZ2luOiBzdHJpbmdcbik6IGJvb2xlYW4ge1xuICBmb3IgKGNvbnN0IGFsbG93ZWRPcmlnaW4gb2YgYWxsb3dlZE9yaWdpbnMpIHtcbiAgICBpZiAob3JpZ2luID09PSBhbGxvd2VkT3JpZ2luIHx8IGFsbG93ZWRPcmlnaW4gPT09IFwiKlwiKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGFsbG93ZWRPcmlnaW4gaW5zdGFuY2VvZiBSZWdFeHAgJiYgYWxsb3dlZE9yaWdpbi50ZXN0KG9yaWdpbikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHBvc2UoXG4gIG9iajogYW55LFxuICBlcDogRW5kcG9pbnQgPSBnbG9iYWxUaGlzIGFzIGFueSxcbiAgYWxsb3dlZE9yaWdpbnM6IChzdHJpbmcgfCBSZWdFeHApW10gPSBbXCIqXCJdXG4pIHtcbiAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gY2FsbGJhY2soZXY6IE1lc3NhZ2VFdmVudCkge1xuICAgIGlmICghZXYgfHwgIWV2LmRhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFpc0FsbG93ZWRPcmlnaW4oYWxsb3dlZE9yaWdpbnMsIGV2Lm9yaWdpbikpIHtcbiAgICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBvcmlnaW4gJyR7ZXYub3JpZ2lufScgZm9yIGNvbWxpbmsgcHJveHlgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgeyBpZCwgdHlwZSwgcGF0aCB9ID0ge1xuICAgICAgcGF0aDogW10gYXMgc3RyaW5nW10sXG4gICAgICAuLi4oZXYuZGF0YSBhcyBNZXNzYWdlKSxcbiAgICB9O1xuICAgIGNvbnN0IGFyZ3VtZW50TGlzdCA9IChldi5kYXRhLmFyZ3VtZW50TGlzdCB8fCBbXSkubWFwKGZyb21XaXJlVmFsdWUpO1xuICAgIGxldCByZXR1cm5WYWx1ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFyZW50ID0gcGF0aC5zbGljZSgwLCAtMSkucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgIGNvbnN0IHJhd1ZhbHVlID0gcGF0aC5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuR0VUOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gcmF3VmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLlNFVDpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBwYXJlbnRbcGF0aC5zbGljZSgtMSlbMF1dID0gZnJvbVdpcmVWYWx1ZShldi5kYXRhLnZhbHVlKTtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuQVBQTFk6XG4gICAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZS5hcHBseShwYXJlbnQsIGFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLkNPTlNUUlVDVDpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG5ldyByYXdWYWx1ZSguLi5hcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBwcm94eSh2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLkVORFBPSU5UOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgICAgIGV4cG9zZShvYmosIHBvcnQyKTtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gdHJhbnNmZXIocG9ydDEsIFtwb3J0MV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5SRUxFQVNFOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfSBjYXRjaCAodmFsdWUpIHtcbiAgICAgIHJldHVyblZhbHVlID0geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgIH1cbiAgICBQcm9taXNlLnJlc29sdmUocmV0dXJuVmFsdWUpXG4gICAgICAuY2F0Y2goKHZhbHVlKSA9PiB7XG4gICAgICAgIHJldHVybiB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgICB9KVxuICAgICAgLnRoZW4oKHJldHVyblZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUocmV0dXJuVmFsdWUpO1xuICAgICAgICBlcC5wb3N0TWVzc2FnZSh7IC4uLndpcmVWYWx1ZSwgaWQgfSwgdHJhbnNmZXJhYmxlcyk7XG4gICAgICAgIGlmICh0eXBlID09PSBNZXNzYWdlVHlwZS5SRUxFQVNFKSB7XG4gICAgICAgICAgLy8gZGV0YWNoIGFuZCBkZWFjdGl2ZSBhZnRlciBzZW5kaW5nIHJlbGVhc2UgcmVzcG9uc2UgYWJvdmUuXG4gICAgICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2FsbGJhY2sgYXMgYW55KTtcbiAgICAgICAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgICAgICAgICBpZiAoZmluYWxpemVyIGluIG9iaiAmJiB0eXBlb2Ygb2JqW2ZpbmFsaXplcl0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb2JqW2ZpbmFsaXplcl0oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIC8vIFNlbmQgU2VyaWFsaXphdGlvbiBFcnJvciBUbyBDYWxsZXJcbiAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZSh7XG4gICAgICAgICAgdmFsdWU6IG5ldyBUeXBlRXJyb3IoXCJVbnNlcmlhbGl6YWJsZSByZXR1cm4gdmFsdWVcIiksXG4gICAgICAgICAgW3Rocm93TWFya2VyXTogMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGVwLnBvc3RNZXNzYWdlKHsgLi4ud2lyZVZhbHVlLCBpZCB9LCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgIH0pO1xuICB9IGFzIGFueSk7XG4gIGlmIChlcC5zdGFydCkge1xuICAgIGVwLnN0YXJ0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNNZXNzYWdlUG9ydChlbmRwb2ludDogRW5kcG9pbnQpOiBlbmRwb2ludCBpcyBNZXNzYWdlUG9ydCB7XG4gIHJldHVybiBlbmRwb2ludC5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk1lc3NhZ2VQb3J0XCI7XG59XG5cbmZ1bmN0aW9uIGNsb3NlRW5kUG9pbnQoZW5kcG9pbnQ6IEVuZHBvaW50KSB7XG4gIGlmIChpc01lc3NhZ2VQb3J0KGVuZHBvaW50KSkgZW5kcG9pbnQuY2xvc2UoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXA8VD4oZXA6IEVuZHBvaW50LCB0YXJnZXQ/OiBhbnkpOiBSZW1vdGU8VD4ge1xuICByZXR1cm4gY3JlYXRlUHJveHk8VD4oZXAsIFtdLCB0YXJnZXQpIGFzIGFueTtcbn1cblxuZnVuY3Rpb24gdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNSZWxlYXNlZDogYm9vbGVhbikge1xuICBpZiAoaXNSZWxlYXNlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlByb3h5IGhhcyBiZWVuIHJlbGVhc2VkIGFuZCBpcyBub3QgdXNlYWJsZVwiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWxlYXNlRW5kcG9pbnQoZXA6IEVuZHBvaW50KSB7XG4gIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgdHlwZTogTWVzc2FnZVR5cGUuUkVMRUFTRSxcbiAgfSkudGhlbigoKSA9PiB7XG4gICAgY2xvc2VFbmRQb2ludChlcCk7XG4gIH0pO1xufVxuXG5pbnRlcmZhY2UgRmluYWxpemF0aW9uUmVnaXN0cnk8VD4ge1xuICBuZXcgKGNiOiAoaGVsZFZhbHVlOiBUKSA9PiB2b2lkKTogRmluYWxpemF0aW9uUmVnaXN0cnk8VD47XG4gIHJlZ2lzdGVyKFxuICAgIHdlYWtJdGVtOiBvYmplY3QsXG4gICAgaGVsZFZhbHVlOiBULFxuICAgIHVucmVnaXN0ZXJUb2tlbj86IG9iamVjdCB8IHVuZGVmaW5lZFxuICApOiB2b2lkO1xuICB1bnJlZ2lzdGVyKHVucmVnaXN0ZXJUb2tlbjogb2JqZWN0KTogdm9pZDtcbn1cbmRlY2xhcmUgdmFyIEZpbmFsaXphdGlvblJlZ2lzdHJ5OiBGaW5hbGl6YXRpb25SZWdpc3RyeTxFbmRwb2ludD47XG5cbmNvbnN0IHByb3h5Q291bnRlciA9IG5ldyBXZWFrTWFwPEVuZHBvaW50LCBudW1iZXI+KCk7XG5jb25zdCBwcm94eUZpbmFsaXplcnMgPVxuICBcIkZpbmFsaXphdGlvblJlZ2lzdHJ5XCIgaW4gZ2xvYmFsVGhpcyAmJlxuICBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKGVwOiBFbmRwb2ludCkgPT4ge1xuICAgIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApIC0gMTtcbiAgICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gICAgaWYgKG5ld0NvdW50ID09PSAwKSB7XG4gICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgIH1cbiAgfSk7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyUHJveHkocHJveHk6IG9iamVjdCwgZXA6IEVuZHBvaW50KSB7XG4gIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApICsgMTtcbiAgcHJveHlDb3VudGVyLnNldChlcCwgbmV3Q291bnQpO1xuICBpZiAocHJveHlGaW5hbGl6ZXJzKSB7XG4gICAgcHJveHlGaW5hbGl6ZXJzLnJlZ2lzdGVyKHByb3h5LCBlcCwgcHJveHkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJQcm94eShwcm94eTogb2JqZWN0KSB7XG4gIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICBwcm94eUZpbmFsaXplcnMudW5yZWdpc3Rlcihwcm94eSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlUHJveHk8VD4oXG4gIGVwOiBFbmRwb2ludCxcbiAgcGF0aDogKHN0cmluZyB8IG51bWJlciB8IHN5bWJvbClbXSA9IFtdLFxuICB0YXJnZXQ6IG9iamVjdCA9IGZ1bmN0aW9uICgpIHt9XG4pOiBSZW1vdGU8VD4ge1xuICBsZXQgaXNQcm94eVJlbGVhc2VkID0gZmFsc2U7XG4gIGNvbnN0IHByb3h5ID0gbmV3IFByb3h5KHRhcmdldCwge1xuICAgIGdldChfdGFyZ2V0LCBwcm9wKSB7XG4gICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgaWYgKHByb3AgPT09IHJlbGVhc2VQcm94eSkge1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIHVucmVnaXN0ZXJQcm94eShwcm94eSk7XG4gICAgICAgICAgcmVsZWFzZUVuZHBvaW50KGVwKTtcbiAgICAgICAgICBpc1Byb3h5UmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHByb3AgPT09IFwidGhlblwiKSB7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiB7IHRoZW46ICgpID0+IHByb3h5IH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgciA9IHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5HRVQsXG4gICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIHJldHVybiByLnRoZW4uYmluZChyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgWy4uLnBhdGgsIHByb3BdKTtcbiAgICB9LFxuICAgIHNldChfdGFyZ2V0LCBwcm9wLCByYXdWYWx1ZSkge1xuICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgIC8vIEZJWE1FOiBFUzYgUHJveHkgSGFuZGxlciBgc2V0YCBtZXRob2RzIGFyZSBzdXBwb3NlZCB0byByZXR1cm4gYVxuICAgICAgLy8gYm9vbGVhbi4gVG8gc2hvdyBnb29kIHdpbGwsIHdlIHJldHVybiB0cnVlIGFzeW5jaHJvbm91c2x5IFx1MDBBRlxcXyhcdTMwQzQpXy9cdTAwQUZcbiAgICAgIGNvbnN0IFt2YWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyYXdWYWx1ZSk7XG4gICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShcbiAgICAgICAgZXAsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5TRVQsXG4gICAgICAgICAgcGF0aDogWy4uLnBhdGgsIHByb3BdLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJhYmxlc1xuICAgICAgKS50aGVuKGZyb21XaXJlVmFsdWUpIGFzIGFueTtcbiAgICB9LFxuICAgIGFwcGx5KF90YXJnZXQsIF90aGlzQXJnLCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICBjb25zdCBsYXN0ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKChsYXN0IGFzIGFueSkgPT09IGNyZWF0ZUVuZHBvaW50KSB7XG4gICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuRU5EUE9JTlQsXG4gICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICB9XG4gICAgICAvLyBXZSBqdXN0IHByZXRlbmQgdGhhdCBgYmluZCgpYCBkaWRuXHUyMDE5dCBoYXBwZW4uXG4gICAgICBpZiAobGFzdCA9PT0gXCJiaW5kXCIpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBwYXRoLnNsaWNlKDAsIC0xKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBbYXJndW1lbnRMaXN0LCB0cmFuc2ZlcmFibGVzXSA9IHByb2Nlc3NBcmd1bWVudHMocmF3QXJndW1lbnRMaXN0KTtcbiAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKFxuICAgICAgICBlcCxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLkFQUExZLFxuICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJhYmxlc1xuICAgICAgKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgIH0sXG4gICAgY29uc3RydWN0KF90YXJnZXQsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoXG4gICAgICAgIGVwLFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuQ09OU1RSVUNULFxuICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgIGFyZ3VtZW50TGlzdCxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJhYmxlc1xuICAgICAgKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgIH0sXG4gIH0pO1xuICByZWdpc3RlclByb3h5KHByb3h5LCBlcCk7XG4gIHJldHVybiBwcm94eSBhcyBhbnk7XG59XG5cbmZ1bmN0aW9uIG15RmxhdDxUPihhcnI6IChUIHwgVFtdKVtdKTogVFtdIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGFycik7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NBcmd1bWVudHMoYXJndW1lbnRMaXN0OiBhbnlbXSk6IFtXaXJlVmFsdWVbXSwgVHJhbnNmZXJhYmxlW11dIHtcbiAgY29uc3QgcHJvY2Vzc2VkID0gYXJndW1lbnRMaXN0Lm1hcCh0b1dpcmVWYWx1ZSk7XG4gIHJldHVybiBbcHJvY2Vzc2VkLm1hcCgodikgPT4gdlswXSksIG15RmxhdChwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzFdKSldO1xufVxuXG5jb25zdCB0cmFuc2ZlckNhY2hlID0gbmV3IFdlYWtNYXA8YW55LCBUcmFuc2ZlcmFibGVbXT4oKTtcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2ZlcjxUPihvYmo6IFQsIHRyYW5zZmVyczogVHJhbnNmZXJhYmxlW10pOiBUIHtcbiAgdHJhbnNmZXJDYWNoZS5zZXQob2JqLCB0cmFuc2ZlcnMpO1xuICByZXR1cm4gb2JqO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJveHk8VCBleHRlbmRzIHt9PihvYmo6IFQpOiBUICYgUHJveHlNYXJrZWQge1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihvYmosIHsgW3Byb3h5TWFya2VyXTogdHJ1ZSB9KSBhcyBhbnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aW5kb3dFbmRwb2ludChcbiAgdzogUG9zdE1lc3NhZ2VXaXRoT3JpZ2luLFxuICBjb250ZXh0OiBFdmVudFNvdXJjZSA9IGdsb2JhbFRoaXMsXG4gIHRhcmdldE9yaWdpbiA9IFwiKlwiXG4pOiBFbmRwb2ludCB7XG4gIHJldHVybiB7XG4gICAgcG9zdE1lc3NhZ2U6IChtc2c6IGFueSwgdHJhbnNmZXJhYmxlczogVHJhbnNmZXJhYmxlW10pID0+XG4gICAgICB3LnBvc3RNZXNzYWdlKG1zZywgdGFyZ2V0T3JpZ2luLCB0cmFuc2ZlcmFibGVzKSxcbiAgICBhZGRFdmVudExpc3RlbmVyOiBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBjb250ZXh0LnJlbW92ZUV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdG9XaXJlVmFsdWUodmFsdWU6IGFueSk6IFtXaXJlVmFsdWUsIFRyYW5zZmVyYWJsZVtdXSB7XG4gIGZvciAoY29uc3QgW25hbWUsIGhhbmRsZXJdIG9mIHRyYW5zZmVySGFuZGxlcnMpIHtcbiAgICBpZiAoaGFuZGxlci5jYW5IYW5kbGUodmFsdWUpKSB7XG4gICAgICBjb25zdCBbc2VyaWFsaXplZFZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IGhhbmRsZXIuc2VyaWFsaXplKHZhbHVlKTtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBXaXJlVmFsdWVUeXBlLkhBTkRMRVIsXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICB2YWx1ZTogc2VyaWFsaXplZFZhbHVlLFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzLFxuICAgICAgXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtcbiAgICB7XG4gICAgICB0eXBlOiBXaXJlVmFsdWVUeXBlLlJBVyxcbiAgICAgIHZhbHVlLFxuICAgIH0sXG4gICAgdHJhbnNmZXJDYWNoZS5nZXQodmFsdWUpIHx8IFtdLFxuICBdO1xufVxuXG5mdW5jdGlvbiBmcm9tV2lyZVZhbHVlKHZhbHVlOiBXaXJlVmFsdWUpOiBhbnkge1xuICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICBjYXNlIFdpcmVWYWx1ZVR5cGUuSEFORExFUjpcbiAgICAgIHJldHVybiB0cmFuc2ZlckhhbmRsZXJzLmdldCh2YWx1ZS5uYW1lKSEuZGVzZXJpYWxpemUodmFsdWUudmFsdWUpO1xuICAgIGNhc2UgV2lyZVZhbHVlVHlwZS5SQVc6XG4gICAgICByZXR1cm4gdmFsdWUudmFsdWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShcbiAgZXA6IEVuZHBvaW50LFxuICBtc2c6IE1lc3NhZ2UsXG4gIHRyYW5zZmVycz86IFRyYW5zZmVyYWJsZVtdXG4pOiBQcm9taXNlPFdpcmVWYWx1ZT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBpZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgIGVwLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIGwoZXY6IE1lc3NhZ2VFdmVudCkge1xuICAgICAgaWYgKCFldi5kYXRhIHx8ICFldi5kYXRhLmlkIHx8IGV2LmRhdGEuaWQgIT09IGlkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVwLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGwgYXMgYW55KTtcbiAgICAgIHJlc29sdmUoZXYuZGF0YSk7XG4gICAgfSBhcyBhbnkpO1xuICAgIGlmIChlcC5zdGFydCkge1xuICAgICAgZXAuc3RhcnQoKTtcbiAgICB9XG4gICAgZXAucG9zdE1lc3NhZ2UoeyBpZCwgLi4ubXNnIH0sIHRyYW5zZmVycyk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5ldyBBcnJheSg0KVxuICAgIC5maWxsKDApXG4gICAgLm1hcCgoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikudG9TdHJpbmcoMTYpKVxuICAgIC5qb2luKFwiLVwiKTtcbn1cbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkVWludDMyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IG51bWJlciB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LmdldFVpbnQzMihwdHIsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkVWludDgoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuZ2V0VWludDgocHRyKTsgfVxyXG4iLCAiaW1wb3J0IHsgcmVhZFVpbnQxNiB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDE2LmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkVWludDggfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQ4LmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFRPRE86IENhbid0IEMrKyBpZGVudGlmaWVycyBpbmNsdWRlIG5vbi1BU0NJSSBjaGFyYWN0ZXJzPyBcclxuICogV2h5IGRvIGFsbCB0aGUgdHlwZSBkZWNvZGluZyBmdW5jdGlvbnMgdXNlIHRoaXM/XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVhZExhdGluMVN0cmluZyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBsZXQgcmV0ID0gXCJcIjtcclxuICAgIGxldCBuZXh0Qnl0ZTogbnVtYmVyXHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uZC1hc3NpZ25cclxuICAgIHdoaWxlIChuZXh0Qnl0ZSA9IHJlYWRVaW50OChpbXBsLCBwdHIrKykpIHtcclxuICAgICAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0Qnl0ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG4vLyBOb3RlOiBJbiBXb3JrbGV0cywgYFRleHREZWNvZGVyYCBhbmQgYFRleHRFbmNvZGVyYCBuZWVkIGEgcG9seWZpbGwuXHJcbmNvbnN0IHV0ZjhEZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLThcIik7XHJcbmNvbnN0IHV0ZjE2RGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcihcInV0Zi0xNmxlXCIpO1xyXG5jb25zdCB1dGY4RW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBudWxsLXRlcm1pbmF0ZWQgVVRGLTggc3RyaW5nLiBJZiB5b3Uga25vdyB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcsIHlvdSBjYW4gc2F2ZSB0aW1lIGJ5IHVzaW5nIGB1dGY4VG9TdHJpbmdMYCBpbnN0ZWFkLlxyXG4gKiBcclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBwdHIgXHJcbiAqIEByZXR1cm5zIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhUb1N0cmluZ1ooaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50OChpbXBsLCBlbmQrKykgIT0gMCk7XHJcblxyXG4gICAgcmV0dXJuIHV0ZjhUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYxNlRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzdGFydCA9IHB0cjtcclxuICAgIGxldCBlbmQgPSBzdGFydDtcclxuXHJcbiAgICB3aGlsZSAocmVhZFVpbnQxNihpbXBsLCBlbmQpICE9IDApIHsgZW5kICs9IDI7IH1cclxuXHJcbiAgICByZXR1cm4gdXRmMTZUb1N0cmluZ0woaW1wbCwgc3RhcnQsIGVuZCAtIHN0YXJ0IC0gMSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjMyVG9TdHJpbmdaKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gcHRyO1xyXG4gICAgbGV0IGVuZCA9IHN0YXJ0O1xyXG5cclxuICAgIHdoaWxlIChyZWFkVWludDMyKGltcGwsIGVuZCkgIT0gMCkgeyBlbmQgKz0gNDsgfVxyXG5cclxuICAgIHJldHVybiB1dGYzMlRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjhUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIGJ5dGVDb3VudDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB1dGY4RGVjb2Rlci5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgYnl0ZUNvdW50KSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjE2VG9TdHJpbmdMKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyLCB3Y2hhckNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHV0ZjE2RGVjb2Rlci5kZWNvZGUobmV3IFVpbnQ4QXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgd2NoYXJDb3VudCAqIDIpKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMzJUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBjaGFycyA9IChuZXcgVWludDMyQXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgd2NoYXJDb3VudCkpO1xyXG4gICAgbGV0IHJldCA9IFwiXCI7XHJcbiAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYXJzKSB7XHJcbiAgICAgICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2gpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmOChzdHJpbmc6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcclxuICAgIHJldHVybiB1dGY4RW5jb2Rlci5lbmNvZGUoc3RyaW5nKS5idWZmZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1V0ZjE2KHN0cmluZzogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xyXG4gICAgY29uc3QgcmV0ID0gbmV3IFVpbnQxNkFycmF5KG5ldyBBcnJheUJ1ZmZlcihzdHJpbmcubGVuZ3RoKSk7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJldC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHJldFtpXSA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldC5idWZmZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1V0ZjMyKHN0cmluZzogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xyXG4gICAgbGV0IHRydWVMZW5ndGggPSAwO1xyXG4gICAgLy8gVGhlIHdvcnN0LWNhc2Ugc2NlbmFyaW8gaXMgYSBzdHJpbmcgb2YgYWxsIHN1cnJvZ2F0ZS1wYWlycywgc28gYWxsb2NhdGUgdGhhdC5cclxuICAgIC8vIFdlJ2xsIHNocmluayBpdCB0byB0aGUgYWN0dWFsIHNpemUgYWZ0ZXJ3YXJkcy5cclxuICAgIGNvbnN0IHRlbXAgPSBuZXcgVWludDMyQXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGggKiA0ICogMikpO1xyXG4gICAgZm9yIChjb25zdCBjaCBvZiBzdHJpbmcpIHtcclxuICAgICAgICB0ZW1wW3RydWVMZW5ndGhdID0gY2guY29kZVBvaW50QXQoMCkhO1xyXG4gICAgICAgICsrdHJ1ZUxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGVtcC5idWZmZXIuc2xpY2UoMCwgdHJ1ZUxlbmd0aCAqIDQpO1xyXG59XHJcblxyXG4vKipcclxuICogVXNlZCB3aGVuIHNlbmRpbmcgc3RyaW5ncyBmcm9tIEpTIHRvIFdBU00uXHJcbiAqIFxyXG4gKiBcclxuICogQHBhcmFtIHN0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbGVuZ3RoQnl0ZXNVVEY4KHN0cjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGxldCBsZW4gPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBjb25zdCBjID0gc3RyLmNvZGVQb2ludEF0KGkpITtcclxuICAgICAgICBpZiAoYyA8PSAweDdGKVxyXG4gICAgICAgICAgICBsZW4rKztcclxuICAgICAgICBlbHNlIGlmIChjIDw9IDB4N0ZGKVxyXG4gICAgICAgICAgICBsZW4gKz0gMjtcclxuICAgICAgICBlbHNlIGlmIChjIDw9IDB4N0ZGRilcclxuICAgICAgICAgICAgbGVuICs9IDM7XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGxlbiArPSA0O1xyXG4gICAgICAgICAgICArK2k7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlbjtcclxufSIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgcmVhZExhdGluMVN0cmluZyB9IGZyb20gXCIuLi9zdHJpbmcuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlcmluZyBhIHR5cGUgaXMgYW4gYXN5bmMgZnVuY3Rpb24gY2FsbGVkIGJ5IGEgc3luYyBmdW5jdGlvbi4gVGhpcyBoYW5kbGVzIHRoZSBjb252ZXJzaW9uLCBhZGRpbmcgdGhlIHByb21pc2UgdG8gYEFsbEVtYmluZFByb21pc2VzYC5cclxuICogXHJcbiAqIEFsc28sIGJlY2F1c2UgZXZlcnkgc2luZ2xlIHJlZ2lzdHJhdGlvbiBjb21lcyB3aXRoIGEgbmFtZSB0aGF0IG5lZWRzIHRvIGJlIHBhcnNlZCwgdGhpcyBhbHNvIHBhcnNlcyB0aGF0IG5hbWUgZm9yIHlvdS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIG5hbWVQdHI6IG51bWJlciwgZnVuYzogKG5hbWU6IHN0cmluZykgPT4gKHZvaWQgfCBQcm9taXNlPHZvaWQ+KSk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKGltcGwsIHJlYWRMYXRpbjFTdHJpbmcoaW1wbCwgbmFtZVB0ciksIGZ1bmMpO1xyXG59XHJcblxyXG4vKiogXHJcbiAqIFNhbWUgYXMgYF9lbWJpbmRfcmVnaXN0ZXJgLCBidXQgZm9yIGtub3duIChvciBzeW50aGV0aWMpIG5hbWVzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZShfaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgbmFtZTogc3RyaW5nLCBmdW5jOiAobmFtZTogc3RyaW5nKSA9PiAodm9pZCB8IFByb21pc2U8dm9pZD4pKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgcHJvbWlzZTogUHJvbWlzZTx2b2lkPiA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgbGV0IGhhbmRsZSA9IDA7XHJcbiAgICAgICAgLy8gRnVuIGZhY3Q6IHNldFRpbWVvdXQgZG9lc24ndCBleGlzdCBpbiBXb3JrbGV0cyEgXHJcbiAgICAgICAgLy8gSSBndWVzcyBpdCB2YWd1ZWx5IG1ha2VzIHNlbnNlIGluIGEgXCJkZXRlcm1pbmlzbSBpcyBnb29kXCIgd2F5LCBcclxuICAgICAgICAvLyBidXQgaXQgYWxzbyBzZWVtcyBnZW5lcmFsbHkgdXNlZnVsIHRoZXJlP1xyXG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJylcclxuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiB7IGNvbnNvbGUud2FybihgVGhlIGZ1bmN0aW9uIFwiJHtuYW1lfVwiIHVzZXMgYW4gdW5zdXBwb3J0ZWQgYXJndW1lbnQgb3IgcmV0dXJuIHR5cGUsIGFzIGl0cyBkZXBlbmRlbmNpZXMgYXJlIG5vdCByZXNvbHZpbmcuIEl0J3MgdW5saWtlbHkgdGhlIGVtYmluZCBwcm9taXNlIHdpbGwgcmVzb2x2ZS5gKTsgfSwgMTAwMCk7XHJcbiAgICAgICAgYXdhaXQgZnVuYyhuYW1lKTtcclxuICAgICAgICBpZiAoaGFuZGxlKVxyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcclxuICAgIH0pKCk7XHJcblxyXG4gICAgQWxsRW1iaW5kUHJvbWlzZXMucHVzaChwcm9taXNlKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGF3YWl0QWxsRW1iaW5kKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoQWxsRW1iaW5kUHJvbWlzZXMpO1xyXG59XHJcblxyXG5jb25zdCBBbGxFbWJpbmRQcm9taXNlcyA9IG5ldyBBcnJheTxQcm9taXNlPHZvaWQ+PigpO1xyXG5cclxuIiwgImltcG9ydCB7IGF3YWl0QWxsRW1iaW5kIH0gZnJvbSBcIi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRXZlbnRUeXBlc01hcCB9IGZyb20gXCIuL19wcml2YXRlL2V2ZW50LXR5cGVzLW1hcC5qc1wiO1xyXG5pbXBvcnQgeyB0eXBlIEtub3duRXhwb3J0cywgdHlwZSBLbm93bkltcG9ydHMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCB0eXBlIFJvbGx1cFdhc21Qcm9taXNlPEkgZXh0ZW5kcyBLbm93bkltcG9ydHMgPSBLbm93bkltcG9ydHM+ID0gKGltcG9ydHM/OiBJKSA9PiBQcm9taXNlPFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlPjtcclxuXHJcblxyXG5cclxuaW50ZXJmYWNlIEluc3RhbnRpYXRlZFdhc21FdmVudFRhcmdldCBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXI8SyBleHRlbmRzIGtleW9mIEV2ZW50VHlwZXNNYXA+KHR5cGU6IEssIGxpc3RlbmVyOiAodGhpczogRmlsZVJlYWRlciwgZXY6IEV2ZW50VHlwZXNNYXBbS10pID0+IHVua25vd24sIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB2b2lkO1xyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcih0eXBlOiBzdHJpbmcsIGNhbGxiYWNrOiBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0IHwgbnVsbCwgb3B0aW9ucz86IEV2ZW50TGlzdGVuZXJPcHRpb25zIHwgYm9vbGVhbik6IHZvaWQ7XHJcbn1cclxuXHJcblxyXG4vLyAgVGhpcyByZWFzc2lnbm1lbnQgaXMgYSBUeXBlc2NyaXB0IGhhY2sgdG8gYWRkIGN1c3RvbSB0eXBlcyB0byBhZGRFdmVudExpc3RlbmVyLi4uXHJcbmNvbnN0IEV2ZW50VGFyZ2V0VyA9IEV2ZW50VGFyZ2V0IGFzIHsgbmV3KCk6IEluc3RhbnRpYXRlZFdhc21FdmVudFRhcmdldDsgcHJvdG90eXBlOiBJbnN0YW50aWF0ZWRXYXNtRXZlbnRUYXJnZXQgfTtcclxuXHJcbi8qKlxyXG4gKiBFeHRlbnNpb24gb2YgYFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlYCB0aGF0IGlzIGFsc28gYW4gYEV2ZW50VGFyZ2V0YCBmb3IgYWxsIFdBU0kgXCJldmVudFwicyAod2hpY2gsIHllcywgaXMgd2h5IHRoaXMgaXMgYW4gZW50aXJlIGBjbGFzc2ApLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEluc3RhbnRpYXRlZFdhc208RXhwb3J0cyBleHRlbmRzIG9iamVjdCA9IG9iamVjdCwgRW1iaW5kIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiBleHRlbmRzIEV2ZW50VGFyZ2V0VyBpbXBsZW1lbnRzIFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlIHtcclxuICAgIC8qKiBUaGUgYFdlYkFzc2VtYmx5Lk1vZHVsZWAgdGhpcyBpbnN0YW5jZSB3YXMgYnVpbHQgZnJvbS4gUmFyZWx5IHVzZWZ1bCBieSBpdHNlbGYuICovXHJcbiAgICBwdWJsaWMgbW9kdWxlOiBXZWJBc3NlbWJseS5Nb2R1bGU7XHJcblxyXG4gICAgLyoqIFRoZSBgV2ViQXNzZW1ibHkuTW9kdWxlYCB0aGlzIGluc3RhbmNlIHdhcyBidWlsdCBmcm9tLiBSYXJlbHkgdXNlZnVsIGJ5IGl0c2VsZi4gKi9cclxuICAgIHB1YmxpYyBpbnN0YW5jZTogV2ViQXNzZW1ibHkuSW5zdGFuY2U7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb250YWlucyBldmVyeXRoaW5nIGV4cG9ydGVkIHVzaW5nIGVtYmluZC5cclxuICAgICAqIFxyXG4gICAgICogVGhlc2UgYXJlIHNlcGFyYXRlIGZyb20gcmVndWxhciBleHBvcnRzIG9uIGBpbnN0YW5jZS5leHBvcnRgLlxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgZW1iaW5kOiBFbWJpbmQ7XHJcblxyXG4gICAgLyoqIFxyXG4gICAgICogVGhlIFwicmF3XCIgV0FTTSBleHBvcnRzLiBOb25lIGFyZSBwcmVmaXhlZCB3aXRoIFwiX1wiLlxyXG4gICAgICogXHJcbiAgICAgKiBObyBjb252ZXJzaW9uIGlzIHBlcmZvcm1lZCBvbiB0aGUgdHlwZXMgaGVyZTsgZXZlcnl0aGluZyB0YWtlcyBvciByZXR1cm5zIGEgbnVtYmVyLlxyXG4gICAgICogXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBleHBvcnRzOiBFeHBvcnRzICYgS25vd25FeHBvcnRzO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogYGV4cG9ydHMubWVtb3J5YCwgYnV0IHVwZGF0ZWQgd2hlbi9pZiBtb3JlIG1lbW9yeSBpcyBhbGxvY2F0ZWQuXHJcbiAgICAgKiBcclxuICAgICAqIEdlbmVyYWxseSBzcGVha2luZywgaXQncyBtb3JlIGNvbnZlbmllbnQgdG8gdXNlIHRoZSBnZW5lcmFsLXB1cnBvc2UgYHJlYWRVaW50MzJgIGZ1bmN0aW9ucyxcclxuICAgICAqIHNpbmNlIHRoZXkgYWNjb3VudCBmb3IgYERhdGFWaWV3YCBiZWluZyBiaWctZW5kaWFuIGJ5IGRlZmF1bHQuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBjYWNoZWRNZW1vcnlWaWV3OiBEYXRhVmlldztcclxuXHJcbiAgICAvKiogXHJcbiAgICAgKiAqKklNUE9SVEFOVCoqOiBVbnRpbCBgaW5pdGlhbGl6ZWAgaXMgY2FsbGVkLCBubyBXQVNNLXJlbGF0ZWQgbWV0aG9kcy9maWVsZHMgY2FuIGJlIHVzZWQuIFxyXG4gICAgICogXHJcbiAgICAgKiBgYWRkRXZlbnRMaXN0ZW5lcmAgYW5kIG90aGVyIGBFdmVudFRhcmdldGAgbWV0aG9kcyBhcmUgZmluZSwgdGhvdWdoLCBhbmQgaW4gZmFjdCBhcmUgcmVxdWlyZWQgZm9yIGV2ZW50cyB0aGF0IG9jY3VyIGR1cmluZyBgX2luaXRpYWxpemVgIG9yIGBfc3RhcnRgLlxyXG4gICAgICogXHJcbiAgICAgKiBJZiB5b3UgZG9uJ3QgY2FyZSBhYm91dCBldmVudHMgZHVyaW5nIGluaXRpYWxpemF0aW9uLCB5b3UgY2FuIGFsc28ganVzdCBjYWxsIGBJbnN0YW50aWF0ZWRXYXNtLmluc3RhbnRpYXRlYCwgd2hpY2ggaXMgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBkb2VzIGJvdGggaW4gb25lIHN0ZXAuXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5tb2R1bGUgPSB0aGlzLmluc3RhbmNlID0gdGhpcy5leHBvcnRzID0gdGhpcy5jYWNoZWRNZW1vcnlWaWV3ID0gbnVsbCFcclxuICAgICAgICB0aGlzLmVtYmluZCA9IHt9IGFzIG5ldmVyO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEluc3RhbnRpYXRlcyBhIFdBU00gbW9kdWxlIHdpdGggdGhlIHNwZWNpZmllZCBXQVNJIGltcG9ydHMuXHJcbiAgICAgKiBcclxuICAgICAqIGBpbnB1dGAgY2FuIGJlIGFueSBvbmUgb2Y6XHJcbiAgICAgKiBcclxuICAgICAqICogYFJlc3BvbnNlYCBvciBgUHJvbWlzZTxSZXNwb25zZT5gIChmcm9tIGUuZy4gYGZldGNoYCkuIFVzZXMgYFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nYC5cclxuICAgICAqICogYEFycmF5QnVmZmVyYCByZXByZXNlbnRpbmcgdGhlIFdBU00gaW4gYmluYXJ5IGZvcm0sIG9yIGEgYFdlYkFzc2VtYmx5Lk1vZHVsZWAuIFxyXG4gICAgICogKiBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgMSBhcmd1bWVudCBvZiB0eXBlIGBXZWJBc3NlbWJseS5JbXBvcnRzYCBhbmQgcmV0dXJucyBhIGBXZWJBc3NlbWJseS5XZWJBc3NlbWJseUluc3RhbnRpYXRlZFNvdXJjZWAuIFRoaXMgaXMgdGhlIHR5cGUgdGhhdCBgQHJvbGx1cC9wbHVnaW4td2FzbWAgcmV0dXJucyB3aGVuIGJ1bmRsaW5nIGEgcHJlLWJ1aWx0IFdBU00gYmluYXJ5LlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0gd2FzbUZldGNoUHJvbWlzZSBcclxuICAgICAqIEBwYXJhbSB1bmJvdW5kSW1wb3J0cyBcclxuICAgICAqL1xyXG4gICAgYXN5bmMgaW5zdGFudGlhdGUod2FzbURhdGFPckZldGNoZXI6IFJvbGx1cFdhc21Qcm9taXNlIHwgV2ViQXNzZW1ibHkuTW9kdWxlIHwgQnVmZmVyU291cmNlIHwgUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4sIHsgd2FzaV9zbmFwc2hvdF9wcmV2aWV3MSwgZW52LCAuLi51bmJvdW5kSW1wb3J0cyB9OiBLbm93bkltcG9ydHMpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAvLyAoVGhlc2UgYXJlIGp1c3QgdXAgaGVyZSB0byBub3QgZ2V0IGluIHRoZSB3YXkgb2YgdGhlIGNvbW1lbnRzKVxyXG4gICAgICAgIGxldCBtb2R1bGU6IFdlYkFzc2VtYmx5Lk1vZHVsZTtcclxuICAgICAgICBsZXQgaW5zdGFuY2U6IFdlYkFzc2VtYmx5Lkluc3RhbmNlO1xyXG5cclxuXHJcbiAgICAgICAgLy8gVGhlcmUncyBhIGJpdCBvZiBzb25nIGFuZCBkYW5jZSB0byBnZXQgYXJvdW5kIHRoZSBmYWN0IHRoYXQ6XHJcbiAgICAgICAgLy8gMS4gV0FTTSBuZWVkcyBpdHMgV0FTSSBpbXBvcnRzIGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi5cclxuICAgICAgICAvLyAyLiBXQVNJIG5lZWRzIGl0cyBXQVNNIGBJbnN0YW5jZWAgaW4gb3JkZXIgdG8gZnVuY3Rpb24uXHJcblxyXG4gICAgICAgIC8vIEZpcnN0LCBiaW5kIGFsbCBvZiBvdXIgaW1wb3J0cyB0byB0aGUgc2FtZSBvYmplY3QsIFxyXG4gICAgICAgIC8vIHdoaWNoIGFsc28gaGFwcGVucyB0byBiZSB0aGUgSW5zdGFudGlhdGVkV2FzbSB3ZSdyZSByZXR1cm5pbmcgKGJ1dCBjb3VsZCB0aGVvcmV0aWNhbGx5IGJlIHNvbWV0aGluZyBlbHNlKS5cclxuICAgICAgICAvLyBUaGlzIGlzIGhvdyB0aGV5J2xsIGJlIGFibGUgdG8gYWNjZXNzIG1lbW9yeSBhbmQgY29tbXVuaWNhdGUgd2l0aCBlYWNoIG90aGVyLlxyXG4gICAgICAgIGNvbnN0IGltcG9ydHMgPSB7XHJcbiAgICAgICAgICAgIHdhc2lfc25hcHNob3RfcHJldmlldzE6IGJpbmRBbGxGdW5jcyh0aGlzLCB3YXNpX3NuYXBzaG90X3ByZXZpZXcxKSxcclxuICAgICAgICAgICAgZW52OiBiaW5kQWxsRnVuY3ModGhpcywgZW52KSxcclxuICAgICAgICAgICAgLi4udW5ib3VuZEltcG9ydHNcclxuICAgICAgICB9IGFzIEtub3duSW1wb3J0cyAmIFdlYkFzc2VtYmx5LkltcG9ydHM7XHJcblxyXG4gICAgICAgIC8vIFdlIGhhdmUgdGhvc2UgaW1wb3J0cywgYW5kIHRoZXkndmUgYmVlbiBib3VuZCB0byB0aGUgdG8tYmUtaW5zdGFudGlhdGVkIFdBU00uXHJcbiAgICAgICAgLy8gTm93IHBhc3MgdGhvc2UgYm91bmQgaW1wb3J0cyB0byBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSAob3Igd2hhdGV2ZXIgdGhlIHVzZXIgc3BlY2lmaWVkKVxyXG4gICAgICAgIGlmICh3YXNtRGF0YU9yRmV0Y2hlciBpbnN0YW5jZW9mIFdlYkFzc2VtYmx5Lk1vZHVsZSkge1xyXG4gICAgICAgICAgICBpbnN0YW5jZSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKHdhc21EYXRhT3JGZXRjaGVyLCBpbXBvcnRzKVxyXG4gICAgICAgICAgICBtb2R1bGUgPSB3YXNtRGF0YU9yRmV0Y2hlcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAod2FzbURhdGFPckZldGNoZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fCBBcnJheUJ1ZmZlci5pc1ZpZXcod2FzbURhdGFPckZldGNoZXIpKVxyXG4gICAgICAgICAgICAoeyBpbnN0YW5jZSwgbW9kdWxlIH0gPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSh3YXNtRGF0YU9yRmV0Y2hlciwgaW1wb3J0cykpO1xyXG4gICAgICAgIGVsc2UgaWYgKGlzUmVzcG9uc2Uod2FzbURhdGFPckZldGNoZXIpKVxyXG4gICAgICAgICAgICAoeyBpbnN0YW5jZSwgbW9kdWxlIH0gPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZyh3YXNtRGF0YU9yRmV0Y2hlciwgaW1wb3J0cykpO1xyXG5cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICh7IGluc3RhbmNlLCBtb2R1bGUgfSA9IGF3YWl0IHdhc21EYXRhT3JGZXRjaGVyKGltcG9ydHMpKTtcclxuXHJcblxyXG4gICAgICAgIC8vIERvIHRoZSBzdHVmZiB3ZSBjb3VsZG4ndCBkbyBpbiB0aGUgYEluc3RhbnRpYXRlZFdhc21gIGNvbnN0cnVjdG9yIGJlY2F1c2Ugd2UgZGlkbid0IGhhdmUgdGhlc2UgdGhlbjpcclxuICAgICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICAgICAgdGhpcy5tb2R1bGUgPSBtb2R1bGU7XHJcbiAgICAgICAgdGhpcy5leHBvcnRzID0gdGhpcy5pbnN0YW5jZS5leHBvcnRzIGFzIEV4cG9ydHMgYXMgRXhwb3J0cyAmIEtub3duRXhwb3J0cztcclxuICAgICAgICB0aGlzLmNhY2hlZE1lbW9yeVZpZXcgPSBuZXcgRGF0YVZpZXcodGhpcy5leHBvcnRzLm1lbW9yeS5idWZmZXIpO1xyXG5cclxuICAgICAgICAvLyBBbG1vc3QgZG9uZSAtLSBub3cgcnVuIFdBU0kncyBgX3N0YXJ0YCBvciBgX2luaXRpYWxpemVgIGZ1bmN0aW9uLlxyXG4gICAgICAgIGNvbnNvbGUuYXNzZXJ0KChcIl9pbml0aWFsaXplXCIgaW4gdGhpcy5pbnN0YW5jZS5leHBvcnRzKSAhPSAoXCJfc3RhcnRcIiBpbiB0aGlzLmluc3RhbmNlLmV4cG9ydHMpLCBgRXhwZWN0ZWQgZWl0aGVyIF9pbml0aWFsaXplIFhPUiBfc3RhcnQgdG8gYmUgZXhwb3J0ZWQgZnJvbSB0aGlzIFdBU00uYCk7XHJcbiAgICAgICAgKHRoaXMuZXhwb3J0cy5faW5pdGlhbGl6ZSA/PyB0aGlzLmV4cG9ydHMuX3N0YXJ0KT8uKCk7XHJcblxyXG4gICAgICAgIC8vIFdhaXQgZm9yIGFsbCBFbWJpbmQgY2FsbHMgdG8gcmVzb2x2ZSAodGhleSBgYXdhaXRgIGVhY2ggb3RoZXIgYmFzZWQgb24gdGhlIGRlcGVuZGVuY2llcyB0aGV5IG5lZWQsIGFuZCB0aGlzIHJlc29sdmVzIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBoYXZlIHRvbylcclxuICAgICAgICBhd2FpdCBhd2FpdEFsbEVtYmluZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBhc3luYyBpbnN0YW50aWF0ZTxFeHBvcnRzIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0LCBFbWJpbmQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KHdhc21EYXRhT3JGZXRjaGVyOiBSb2xsdXBXYXNtUHJvbWlzZSB8IFdlYkFzc2VtYmx5Lk1vZHVsZSB8IEJ1ZmZlclNvdXJjZSB8IFJlc3BvbnNlIHwgUHJvbWlzZUxpa2U8UmVzcG9uc2U+LCB1bmJvdW5kSW1wb3J0czogS25vd25JbXBvcnRzLCBldmVudExpc3RlbmVyczogUGFyYW1ldGVyczxJbnN0YW50aWF0ZWRXYXNtPEV4cG9ydHMsIEVtYmluZD5bXCJhZGRFdmVudExpc3RlbmVyXCJdPltdID0gW10pOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc208RXhwb3J0cywgRW1iaW5kPj4ge1xyXG4gICAgICAgIGNvbnN0IHJldCA9IG5ldyBJbnN0YW50aWF0ZWRXYXNtPEV4cG9ydHMsIEVtYmluZD4oKTtcclxuICAgICAgICBmb3IgKGNvbnN0IGFyZ3Mgb2YgZXZlbnRMaXN0ZW5lcnMpXHJcbiAgICAgICAgICAgIHJldC5hZGRFdmVudExpc3RlbmVyKC4uLmFyZ3MpO1xyXG4gICAgICAgIGF3YWl0IHJldC5pbnN0YW50aWF0ZSh3YXNtRGF0YU9yRmV0Y2hlciwgdW5ib3VuZEltcG9ydHMpO1xyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIEdpdmVuIGFuIG9iamVjdCwgYmluZHMgZWFjaCBmdW5jdGlvbiBpbiB0aGF0IG9iamVjdCB0byBwIChzaGFsbG93bHkpLlxyXG5mdW5jdGlvbiBiaW5kQWxsRnVuY3M8UiBleHRlbmRzIG9iamVjdD4ocDogSW5zdGFudGlhdGVkV2FzbSwgcjogUik6IFIge1xyXG4gICAgcmV0dXJuIE9iamVjdC5mcm9tRW50cmllcyhPYmplY3QuZW50cmllcyhyKS5tYXAoKFtrZXksIGZ1bmNdKSA9PiB7IHJldHVybiBba2V5LCAodHlwZW9mIGZ1bmMgPT0gXCJmdW5jdGlvblwiID8gKGZ1bmMgYXMgKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bikuYmluZChwKSA6IGZ1bmMpXSBhcyBjb25zdDsgfSkpIGFzIFI7XHJcbn1cclxuXHJcbi8vIFNlcGFyYXRlZCBvdXQgZm9yIHR5cGUgcmVhc29ucyBkdWUgdG8gXCJSZXNwb25zZVwiIG5vdCBleGlzdGluZyBpbiBsaW1pdGVkIFdvcmtsZXQtbGlrZSBlbnZpcm9ubWVudHMuXHJcbmZ1bmN0aW9uIGlzUmVzcG9uc2UoYXJnOiBvYmplY3QpOiBhcmcgaXMgUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4geyByZXR1cm4gXCJ0aGVuXCIgaW4gYXJnIHx8IChcIlJlc3BvbnNlXCIgaW4gZ2xvYmFsVGhpcyAmJiBhcmcgaW5zdGFuY2VvZiBSZXNwb25zZSk7IH1cclxuXHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBBbGlnbmZhdWx0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcihcIkFsaWdubWVudCBmYXVsdFwiKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gVXNlZCBieSBTQUZFX0hFQVBcclxuZXhwb3J0IGZ1bmN0aW9uIGFsaWduZmF1bHQodGhpczogSW5zdGFudGlhdGVkV2FzbSk6IG5ldmVyIHtcclxuICAgIHRocm93IG5ldyBBbGlnbmZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFR5cGVJRCwgV2lyZVR5cGVzIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxUPiBleHRlbmRzIFByb21pc2VXaXRoUmVzb2x2ZXJzPFQ+IHtcclxuICAgIHJlc29sdmVkVmFsdWU6IFQ7XHJcbn1cclxuY29uc3QgRGVwZW5kZW5jaWVzVG9XYWl0Rm9yOiBNYXA8VHlwZUlELCBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZT4+ID0gbmV3IE1hcDxUeXBlSUQsIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPj4oKTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBwYXJzZWQgdHlwZSBpbmZvLCBjb252ZXJ0ZXJzLCBldGMuIGZvciB0aGUgZ2l2ZW4gQysrIFJUVEkgVHlwZUlEIHBvaW50ZXIuXHJcbiAqXHJcbiAqIFBhc3NpbmcgYSBudWxsIHR5cGUgSUQgaXMgZmluZSBhbmQgd2lsbCBqdXN0IHJlc3VsdCBpbiBhIGBudWxsYCBhdCB0aGF0IHNwb3QgaW4gdGhlIHJldHVybmVkIGFycmF5LlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFR5cGVJbmZvPEUgZXh0ZW5kcyAoRW1ib3VuZFJlZ2lzdGVyZWRUeXBlIHwgbnVsbCB8IHVuZGVmaW5lZClbXT4oLi4udHlwZUlkczogbnVtYmVyW10pOiBQcm9taXNlPEU+IHtcclxuXHJcbiAgICByZXR1cm4gYXdhaXQgKFByb21pc2UuYWxsPE5vbk51bGxhYmxlPEVbbnVtYmVyXT4+KHR5cGVJZHMubWFwKGFzeW5jICh0eXBlSWQpOiBQcm9taXNlPE5vbk51bGxhYmxlPEVbbnVtYmVyXT4+ID0+IHtcclxuICAgICAgICBpZiAoIXR5cGVJZClcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsISk7XHJcblxyXG4gICAgICAgIGNvbnN0IHdpdGhSZXNvbHZlcnMgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXJzKHR5cGVJZCk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0ICh3aXRoUmVzb2x2ZXJzLnByb21pc2UgYXMgUHJvbWlzZTxOb25OdWxsYWJsZTxFW251bWJlcl0+Pik7XHJcbiAgICB9KSkgYXMgdW5rbm93biBhcyBQcm9taXNlPEU+KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERlcGVuZGVuY3lSZXNvbHZlcnM8V2lyZVR5cGUgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+KHR5cGVJZDogbnVtYmVyKTogUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V2lyZVR5cGUsIFQ+PiB7XHJcbiAgICBsZXQgd2l0aFJlc29sdmVycyA9IERlcGVuZGVuY2llc1RvV2FpdEZvci5nZXQodHlwZUlkKSBhcyBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZSwgVD4+IHwgdW5kZWZpbmVkO1xyXG4gICAgaWYgKHdpdGhSZXNvbHZlcnMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICBEZXBlbmRlbmNpZXNUb1dhaXRGb3Iuc2V0KHR5cGVJZCwgd2l0aFJlc29sdmVycyA9IHsgcmVzb2x2ZWRWYWx1ZTogdW5kZWZpbmVkISwgLi4uUHJvbWlzZS53aXRoUmVzb2x2ZXJzPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIHVua25vd24+PigpIH0gc2F0aXNmaWVzIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPiBhcyBuZXZlcik7XHJcbiAgICByZXR1cm4gd2l0aFJlc29sdmVycztcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IGdldERlcGVuZGVuY3lSZXNvbHZlcnMgfSBmcm9tIFwiLi9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNldCBhIHZhbHVlIG9uIHRoZSBgZW1iaW5kYCBvYmplY3QuICBOb3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IHRvIGNhbGwuXHJcbiAqIEBwYXJhbSBpbXBsIFxyXG4gKiBAcGFyYW0gbmFtZSBcclxuICogQHBhcmFtIHZhbHVlIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRW1ib3VuZDxUPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBuYW1lOiBzdHJpbmcsIHZhbHVlOiBUKTogdm9pZCB7XHJcbiAgICBpbXBsLmVtYmluZFtuYW1lIGFzIG5ldmVyXSA9IHZhbHVlIGFzIG5ldmVyO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsbCB3aGVuIGEgdHlwZSBpcyByZWFkeSB0byBiZSB1c2VkIGJ5IG90aGVyIHR5cGVzLlxyXG4gKiBcclxuICogRm9yIHRoaW5ncyBsaWtlIGBpbnRgIG9yIGBib29sYCwgdGhpcyBjYW4ganVzdCBiZSBjYWxsZWQgaW1tZWRpYXRlbHkgdXBvbiByZWdpc3RyYXRpb24uXHJcbiAqIEBwYXJhbSBpbmZvIFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmFsaXplVHlwZTxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4oX2ltcGw6IEluc3RhbnRpYXRlZFdhc20sIG5hbWU6IHN0cmluZywgcGFyc2VkVHlwZUluZm86IE9taXQ8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdULCBUPiwgXCJuYW1lXCI+KTogdm9pZCB7XHJcbiAgICBjb25zdCBpbmZvID0geyBuYW1lLCAuLi5wYXJzZWRUeXBlSW5mbyB9O1xyXG4gICAgY29uc3Qgd2l0aFJlc29sdmVycyA9IGdldERlcGVuZGVuY3lSZXNvbHZlcnM8V1QsIFQ+KGluZm8udHlwZUlkKTtcclxuICAgIHdpdGhSZXNvbHZlcnMucmVzb2x2ZSh3aXRoUmVzb2x2ZXJzLnJlc29sdmVkVmFsdWUgPSBpbmZvKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgX3NpemU6IG51bWJlciwgbWluUmFuZ2U6IGJpZ2ludCwgX21heFJhbmdlOiBiaWdpbnQpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgaXNVbnNpZ25lZCA9IChtaW5SYW5nZSA9PT0gMG4pO1xyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IGlzVW5zaWduZWQgPyBmcm9tV2lyZVR5cGVVbnNpZ25lZCA6IGZyb21XaXJlVHlwZVNpZ25lZDtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPGJpZ2ludCwgYmlnaW50Pih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiB2YWx1ZSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZSB9KSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmcm9tV2lyZVR5cGVTaWduZWQod2lyZVZhbHVlOiBiaWdpbnQpIHsgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiBCaWdJbnQod2lyZVZhbHVlKSB9OyB9XHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVVuc2lnbmVkKHdpcmVWYWx1ZTogYmlnaW50KSB7IHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogQmlnSW50KHdpcmVWYWx1ZSkgJiAweEZGRkZfRkZGRl9GRkZGX0ZGRkZuIH0gfSIsICJcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Jvb2wodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIHRydWVWYWx1ZTogMSwgZmFsc2VWYWx1ZTogMCk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBuYW1lID0+IHtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciB8IGJvb2xlYW4sIGJvb2xlYW4+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh3aXJlVmFsdWUpID0+IHsgcmV0dXJuIHsganNWYWx1ZTogISF3aXJlVmFsdWUsIHdpcmVWYWx1ZSB9OyB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4geyByZXR1cm4geyB3aXJlVmFsdWU6IG8gPyB0cnVlVmFsdWUgOiBmYWxzZVZhbHVlLCBqc1ZhbHVlOiBvIH07IH0sXHJcbiAgICAgICAgfSlcclxuICAgIH0pXHJcbn1cclxuIiwgIlxyXG4vKiBlc2xpbnQgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1mdW5jdGlvbi10eXBlOiBcIm9mZlwiICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5hbWVGdW5jdGlvbjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pIHwgRnVuY3Rpb24+KG5hbWU6IHN0cmluZywgYm9keTogVCk6IFQge1xyXG4gICAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShib2R5LCAnbmFtZScsIHsgdmFsdWU6IG5hbWUgfSk7XHJcbn1cclxuIiwgIi8vIFRoZXNlIGFyZSBhbGwgdGhlIGNsYXNzZXMgdGhhdCBoYXZlIGJlZW4gcmVnaXN0ZXJlZCwgYWNjZXNzZWQgYnkgdGhlaXIgUlRUSSBUeXBlSWRcclxuLy8gSXQncyBvZmYgaW4gaXRzIG93biBmaWxlIHRvIGtlZXAgaXQgcHJpdmF0ZS5cclxuZXhwb3J0IGNvbnN0IEVtYm91bmRDbGFzc2VzOiBSZWNvcmQ8bnVtYmVyLCB0eXBlb2YgRW1ib3VuZENsYXNzPiA9IHt9O1xyXG5cclxuXHJcbi8vIFRoaXMgaXMgYSBydW5uaW5nIGxpc3Qgb2YgYWxsIHRoZSBpbnN0YW50aWF0ZWQgY2xhc3NlcywgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbmNvbnN0IEluc3RhbnRpYXRlZENsYXNzZXMgPSBuZXcgTWFwPG51bWJlciwgV2Vha1JlZjxFbWJvdW5kQ2xhc3M+PigpO1xyXG5cclxuLy8gVGhpcyBrZWVwcyB0cmFjayBvZiBhbGwgZGVzdHJ1Y3RvcnMgYnkgdGhlaXIgYHRoaXNgIHBvaW50ZXIuXHJcbi8vIFVzZWQgZm9yIEZpbmFsaXphdGlvblJlZ2lzdHJ5IGFuZCB0aGUgZGVzdHJ1Y3RvciBpdHNlbGYuXHJcbmNvbnN0IERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZCA9IG5ldyBNYXA8bnVtYmVyLCAoKSA9PiB2b2lkPigpO1xyXG5cclxuLy8gVXNlZCB0byBlbnN1cmUgbm8gb25lIGJ1dCB0aGUgdHlwZSBjb252ZXJ0ZXJzIGNhbiB1c2UgdGhlIHNlY3JldCBwb2ludGVyIGNvbnN0cnVjdG9yLlxyXG5leHBvcnQgY29uc3QgU2VjcmV0OiBzeW1ib2wgPSBTeW1ib2woKTtcclxuZXhwb3J0IGNvbnN0IFNlY3JldE5vRGlzcG9zZTogc3ltYm9sID0gU3ltYm9sKCk7XHJcblxyXG4vLyBUT0RPOiBJJ20gbm90IGNvbnZpbmNlZCB0aGlzIGlzIGEgZ29vZCBpZGVhLCBcclxuLy8gdGhvdWdoIEkgc3VwcG9zZSB0aGUgd2FybmluZyBpcyB1c2VmdWwgaW4gZGV0ZXJtaW5pc3RpYyBlbnZpcm9ubWVudHNcclxuLy8gd2hlcmUgeW91IGNhbiBicmVhayBvbiBhIGNsYXNzIGhhdmluZyBhIGNlcnRhaW4gYHRoaXNgIHBvaW50ZXIuXHJcbi8vIFRoYXQgc2FpZCBJJ20gcHJldHR5IHN1cmUgb25seSBKUyBoZWFwIHByZXNzdXJlIHdpbGwgaW52b2tlIGEgY2FsbGJhY2ssIFxyXG4vLyBtYWtpbmcgaXQga2luZCBvZiBwb2ludGxlc3MgZm9yIEMrKyBjbGVhbnVwLCB3aGljaCBoYXMgbm8gaW50ZXJhY3Rpb24gd2l0aCB0aGUgSlMgaGVhcC5cclxuY29uc3QgcmVnaXN0cnkgPSBuZXcgRmluYWxpemF0aW9uUmVnaXN0cnkoKF90aGlzOiBudW1iZXIpID0+IHtcclxuICAgIGNvbnN0IGRlc3RydWN0b3IgPSBEZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KF90aGlzKTtcclxuICAgIGlmIChkZXN0cnVjdG9yKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKGBXQVNNIGNsYXNzIGF0IGFkZHJlc3MgJHtfdGhpc30gd2FzIG5vdCBwcm9wZXJseSBkaXNwb3NlZC5gKTtcclxuICAgICAgICBkZXN0cnVjdG9yKCk7XHJcbiAgICAgICAgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmRlbGV0ZShfdGhpcyk7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEJhc2UgY2xhc3MgZm9yIGFsbCBFbWJpbmQtZW5hYmxlZCBjbGFzc2VzLlxyXG4gKlxyXG4gKiBJbiBnZW5lcmFsLCBpZiB0d28gKHF1b3RlLXVucXVvdGUpIFwiaW5zdGFuY2VzXCIgb2YgdGhpcyBjbGFzcyBoYXZlIHRoZSBzYW1lIGBfdGhpc2AgcG9pbnRlcixcclxuICogdGhlbiB0aGV5IHdpbGwgY29tcGFyZSBlcXVhbGx5IHdpdGggYD09YCwgYXMgaWYgY29tcGFyaW5nIGFkZHJlc3NlcyBpbiBDKysuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRW1ib3VuZENsYXNzIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB0cmFuc2Zvcm1lZCBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0aGF0IHRha2VzIEpTIGFyZ3VtZW50cyBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfY29uc3RydWN0b3I6ICguLi5hcmdzOiB1bmtub3duW10pID0+IEVtYm91bmRDbGFzcztcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFzc2lnbmVkIGJ5IHRoZSBkZXJpdmVkIGNsYXNzIHdoZW4gdGhhdCBjbGFzcyBpcyByZWdpc3RlcmVkLlxyXG4gICAgICpcclxuICAgICAqIFRoaXMgb25lIGlzIG5vdCB0cmFuc2Zvcm1lZCBiZWNhdXNlIGl0IG9ubHkgdGFrZXMgYSBwb2ludGVyIGFuZCByZXR1cm5zIG5vdGhpbmcuXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBfZGVzdHJ1Y3RvcjogKF90aGlzOiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgcG9pbnRlciB0byB0aGUgY2xhc3MgaW4gV0FTTSBtZW1vcnk7IHRoZSBzYW1lIGFzIHRoZSBDKysgYHRoaXNgIHBvaW50ZXIuXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBfdGhpcyE6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiB1bmtub3duW10pIHtcclxuICAgICAgICBjb25zdCBDcmVhdGVkRnJvbVdhc20gPSAoYXJncy5sZW5ndGggPT09IDIgJiYgKGFyZ3NbMF0gPT09IFNlY3JldCB8fCBhcmdzWzBdID09IFNlY3JldE5vRGlzcG9zZSkgJiYgdHlwZW9mIGFyZ3NbMV0gPT09ICdudW1iZXInKTtcclxuXHJcbiAgICAgICAgaWYgKCFDcmVhdGVkRnJvbVdhc20pIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gSlMuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFVubGlrZSBhIG5vcm1hbCBjb25zdHJ1Y3Rvciwgd2UgZGVsZWdhdGUgdGhlIGNsYXNzIGNyZWF0aW9uIHRvXHJcbiAgICAgICAgICAgICAqIGEgY29tYmluYXRpb24gb2YgX2NvbnN0cnVjdG9yIGFuZCBgZnJvbVdpcmVUeXBlYC5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogYF9jb25zdHJ1Y3RvcmAgd2lsbCBjYWxsIHRoZSBDKysgY29kZSB0aGF0IGFsbG9jYXRlcyBtZW1vcnksXHJcbiAgICAgICAgICAgICAqIGluaXRpYWxpemVzIHRoZSBjbGFzcywgYW5kIHJldHVybnMgaXRzIGB0aGlzYCBwb2ludGVyLFxyXG4gICAgICAgICAgICAgKiB3aGlsZSBgZnJvbVdpcmVUeXBlYCwgY2FsbGVkIGFzIHBhcnQgb2YgdGhlIGdsdWUtY29kZSBwcm9jZXNzLFxyXG4gICAgICAgICAgICAgKiB3aWxsIGFjdHVhbGx5IGluc3RhbnRpYXRlIHRoaXMgY2xhc3MuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIChJbiBvdGhlciB3b3JkcywgdGhpcyBwYXJ0IHJ1bnMgZmlyc3QsIHRoZW4gdGhlIGBlbHNlYCBiZWxvdyBydW5zKVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmV0dXJuIG5ldy50YXJnZXQuX2NvbnN0cnVjdG9yKC4uLmFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBjYWxsIHRvIGNyZWF0ZSB0aGlzIGNsYXNzIGZyb20gQysrLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBXZSBnZXQgaGVyZSB2aWEgYGZyb21XaXJlVHlwZWAsIG1lYW5pbmcgdGhhdCB0aGVcclxuICAgICAgICAgICAgICogY2xhc3MgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWQgaW4gQysrLCBhbmQgd2VcclxuICAgICAgICAgICAgICoganVzdCBuZWVkIG91ciBcImhhbmRsZVwiIHRvIGl0IGluIEpTLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgY29uc3QgX3RoaXMgPSBhcmdzWzFdIGFzIG51bWJlcjtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpcnN0LCBtYWtlIHN1cmUgd2UgaGF2ZW4ndCBpbnN0YW50aWF0ZWQgdGhpcyBjbGFzcyB5ZXQuXHJcbiAgICAgICAgICAgIC8vIFdlIHdhbnQgYWxsIGNsYXNzZXMgd2l0aCB0aGUgc2FtZSBgdGhpc2AgcG9pbnRlciB0byBcclxuICAgICAgICAgICAgLy8gYWN0dWFsbHkgKmJlKiB0aGUgc2FtZS5cclxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBJbnN0YW50aWF0ZWRDbGFzc2VzLmdldChfdGhpcyk/LmRlcmVmKCk7XHJcbiAgICAgICAgICAgIGlmIChleGlzdGluZylcclxuICAgICAgICAgICAgICAgIHJldHVybiBleGlzdGluZztcclxuXHJcbiAgICAgICAgICAgIC8vIElmIHdlIGdvdCBoZXJlLCB0aGVuIGNvbmdyYXR1bGF0aW9ucywgdGhpcy1pbnN0YW50aWF0aW9uLW9mLXRoaXMtY2xhc3MsIFxyXG4gICAgICAgICAgICAvLyB5b3UncmUgYWN0dWFsbHkgdGhlIG9uZSB0byBiZSBpbnN0YW50aWF0ZWQuIE5vIG1vcmUgaGFja3kgY29uc3RydWN0b3IgcmV0dXJucy5cclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gQ29uc2lkZXIgdGhpcyB0aGUgXCJhY3R1YWxcIiBjb25zdHJ1Y3RvciBjb2RlLCBJIHN1cHBvc2UuXHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSBfdGhpcztcclxuICAgICAgICAgICAgSW5zdGFudGlhdGVkQ2xhc3Nlcy5zZXQoX3RoaXMsIG5ldyBXZWFrUmVmKHRoaXMpKTtcclxuICAgICAgICAgICAgcmVnaXN0cnkucmVnaXN0ZXIodGhpcywgX3RoaXMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFyZ3NbMF0gIT0gU2VjcmV0Tm9EaXNwb3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZXN0cnVjdG9yID0gbmV3LnRhcmdldC5fZGVzdHJ1Y3RvcjtcclxuICAgICAgICAgICAgICAgIERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5zZXQoX3RoaXMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkZXN0cnVjdG9yKF90aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBJbnN0YW50aWF0ZWRDbGFzc2VzLmRlbGV0ZShfdGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgW1N5bWJvbC5kaXNwb3NlXSgpOiB2b2lkIHtcclxuICAgICAgICAvLyBPbmx5IHJ1biB0aGUgZGVzdHJ1Y3RvciBpZiB3ZSBvdXJzZWx2ZXMgY29uc3RydWN0ZWQgdGhpcyBjbGFzcyAoYXMgb3Bwb3NlZCB0byBgaW5zcGVjdGBpbmcgaXQpXHJcbiAgICAgICAgY29uc3QgZGVzdHJ1Y3RvciA9IERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgaWYgKGRlc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKT8uKCk7XHJcbiAgICAgICAgICAgIERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5kZWxldGUodGhpcy5fdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3RoaXMgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqIFxyXG4gKiBJbnN0ZWFkIG9mIGluc3RhbnRpYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgXHJcbiAqIHlvdSBjYW4gaW5zcGVjdCBhbiBleGlzdGluZyBwb2ludGVyIGluc3RlYWQuXHJcbiAqXHJcbiAqIFRoaXMgaXMgbWFpbmx5IGludGVuZGVkIGZvciBzaXR1YXRpb25zIHRoYXQgRW1iaW5kIGRvZXNuJ3Qgc3VwcG9ydCxcclxuICogbGlrZSBhcnJheS1vZi1zdHJ1Y3RzLWFzLWEtcG9pbnRlci5cclxuICogXHJcbiAqIEJlIGF3YXJlIHRoYXQgdGhlcmUncyBubyBsaWZldGltZSB0cmFja2luZyBpbnZvbHZlZCwgc29cclxuICogbWFrZSBzdXJlIHlvdSBkb24ndCBrZWVwIHRoaXMgdmFsdWUgYXJvdW5kIGFmdGVyIHRoZVxyXG4gKiBwb2ludGVyJ3MgYmVlbiBpbnZhbGlkYXRlZC4gXHJcbiAqIFxyXG4gKiAqKkRvIG5vdCBjYWxsIFtTeW1ib2wuZGlzcG9zZV0qKiBvbiBhbiBpbnNwZWN0ZWQgY2xhc3MsXHJcbiAqIHNpbmNlIHRoZSBhc3N1bXB0aW9uIGlzIHRoYXQgdGhlIEMrKyBjb2RlIG93bnMgdGhhdCBwb2ludGVyXHJcbiAqIGFuZCB3ZSdyZSBqdXN0IGxvb2tpbmcgYXQgaXQsIHNvIGRlc3Ryb3lpbmcgaXQgd291bGQgYmUgcnVkZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNwZWN0Q2xhc3NCeVBvaW50ZXI8VD4ocG9pbnRlcjogbnVtYmVyKTogVCB7XHJcbiAgICByZXR1cm4gbmV3IEVtYm91bmRDbGFzcyhTZWNyZXROb0Rpc3Bvc2UsIHBvaW50ZXIpIGFzIFQ7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcblxyXG4vKiBlc2xpbnQgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1mdW5jdGlvbi10eXBlOiBcIm9mZlwiICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUYWJsZUZ1bmN0aW9uPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bikgfCBGdW5jdGlvbj4oaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgX3NpZ25hdHVyZVB0cjogbnVtYmVyLCBmdW5jdGlvbkluZGV4OiBudW1iZXIpOiBUIHtcclxuICAgIGNvbnN0IGZwID0gaW1wbC5leHBvcnRzLl9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUuZ2V0KGZ1bmN0aW9uSW5kZXgpIGFzIFQ7XHJcbiAgICBjb25zb2xlLmFzc2VydCh0eXBlb2YgZnAgPT0gXCJmdW5jdGlvblwiKTtcclxuICAgIHJldHVybiBmcDtcclxufSIsICJpbXBvcnQgeyByZW5hbWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzcywgRW1ib3VuZENsYXNzZXMsIFNlY3JldCB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFdpcmVDb252ZXJzaW9uUmVzdWx0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuZXhwb3J0IHsgaW5zcGVjdENsYXNzQnlQb2ludGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MoXHJcbiAgICB0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3VHlwZTogbnVtYmVyLFxyXG4gICAgcmF3UG9pbnRlclR5cGU6IG51bWJlcixcclxuICAgIHJhd0NvbnN0UG9pbnRlclR5cGU6IG51bWJlcixcclxuICAgIF9iYXNlQ2xhc3NSYXdUeXBlOiBudW1iZXIsXHJcbiAgICBfZ2V0QWN0dWFsVHlwZVNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgX2dldEFjdHVhbFR5cGVQdHI6IG51bWJlcixcclxuICAgIF91cGNhc3RTaWduYXR1cmU6IG51bWJlcixcclxuICAgIF91cGNhc3RQdHI6IG51bWJlcixcclxuICAgIF9kb3duY2FzdFNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgX2Rvd25jYXN0UHRyOiBudW1iZXIsXHJcbiAgICBuYW1lUHRyOiBudW1iZXIsXHJcbiAgICBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICByYXdEZXN0cnVjdG9yUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIE5vdGU6IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MgZG9lc24ndCBoYXZlIGEgY29ycmVzcG9uZGluZyBgZmluYWxpemVgIHZlcnNpb24sXHJcbiAgICAgKiBsaWtlIHZhbHVlX2FycmF5IGFuZCB2YWx1ZV9vYmplY3QgaGF2ZSwgd2hpY2ggaXMgZmluZSBJIGd1ZXNzP1xyXG4gICAgICogXHJcbiAgICAgKiBCdXQgaXQgbWVhbnMgdGhhdCB3ZSBjYW4ndCBqdXN0IGNyZWF0ZSBhIGNsYXNzIHByZS1pbnN0YWxsZWQgd2l0aCBldmVyeXRoaW5nIGl0IG5lZWRzLS1cclxuICAgICAqIHdlIG5lZWQgdG8gYWRkIG1lbWJlciBmdW5jdGlvbnMgYW5kIHByb3BlcnRpZXMgYW5kIHN1Y2ggYXMgd2UgZ2V0IHRoZW0sIGFuZCB3ZVxyXG4gICAgICogbmV2ZXIgcmVhbGx5IGtub3cgd2hlbiB3ZSdyZSBkb25lLlxyXG4gICAgICovXHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJhd0Rlc3RydWN0b3JJbnZva2VyID0gZ2V0VGFibGVGdW5jdGlvbjwoX3RoaXM6IG51bWJlcikgPT4gdm9pZD4odGhpcywgZGVzdHJ1Y3RvclNpZ25hdHVyZSwgcmF3RGVzdHJ1Y3RvclB0cik7XHJcblxyXG4gICAgICAgIC8vIFRPRE8oPykgSXQncyBwcm9iYWJseSBub3QgbmVjZXNzYXJ5IHRvIGhhdmUgRW1ib3VuZENsYXNzZXMgYW5kIHRoaXMuZW1iaW5kIGJhc2ljYWxseSBiZSB0aGUgc2FtZSBleGFjdCB0aGluZy5cclxuICAgICAgICBFbWJvdW5kQ2xhc3Nlc1tyYXdUeXBlXSA9IHRoaXMuZW1iaW5kW25hbWUgYXMgbmV2ZXJdID0gcmVuYW1lRnVuY3Rpb24obmFtZSxcclxuICAgICAgICAgICAgLy8gVW5saWtlIHRoZSBjb25zdHJ1Y3RvciwgdGhlIGRlc3RydWN0b3IgaXMga25vd24gZWFybHkgZW5vdWdoIHRvIGFzc2lnbiBub3cuXHJcbiAgICAgICAgICAgIC8vIFByb2JhYmx5IGJlY2F1c2UgZGVzdHJ1Y3RvcnMgY2FuJ3QgYmUgb3ZlcmxvYWRlZCBieSBhbnl0aGluZyBzbyB0aGVyZSdzIG9ubHkgZXZlciBvbmUuXHJcbiAgICAgICAgICAgIC8vIEFueXdheSwgYXNzaWduIGl0IHRvIHRoaXMgbmV3IGNsYXNzLlxyXG4gICAgICAgICAgICBjbGFzcyBleHRlbmRzIEVtYm91bmRDbGFzcyB7XHJcbiAgICAgICAgICAgICAgICBzdGF0aWMgX2Rlc3RydWN0b3IgPSByYXdEZXN0cnVjdG9ySW52b2tlcjtcclxuICAgICAgICAgICAgfSkgYXMgbmV2ZXI7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGZyb21XaXJlVHlwZShfdGhpczogbnVtYmVyKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+IHsgY29uc3QganNWYWx1ZSA9IG5ldyBFbWJvdW5kQ2xhc3Nlc1tyYXdUeXBlXShTZWNyZXQsIF90aGlzKTsgcmV0dXJuIHsgd2lyZVZhbHVlOiBfdGhpcywganNWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiBqc1ZhbHVlW1N5bWJvbC5kaXNwb3NlXSgpIH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHRvV2lyZVR5cGUoanNPYmplY3Q6IEVtYm91bmRDbGFzcyk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PG51bWJlciwgRW1ib3VuZENsYXNzPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xyXG4gICAgICAgICAgICAgICAgd2lyZVZhbHVlOiAoanNPYmplY3QgYXMgYW55KS5fdGhpcyBhcyBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBqc09iamVjdCxcclxuICAgICAgICAgICAgICAgIC8vIE5vdGU6IG5vIGRlc3RydWN0b3JzIGZvciBhbnkgb2YgdGhlc2UsXHJcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIHRoZXkncmUganVzdCBmb3IgdmFsdWUtdHlwZXMtYXMtb2JqZWN0LXR5cGVzLlxyXG4gICAgICAgICAgICAgICAgLy8gQWRkaW5nIGl0IGhlcmUgd291bGRuJ3Qgd29yayBwcm9wZXJseSwgYmVjYXVzZSBpdCBhc3N1bWVzXHJcbiAgICAgICAgICAgICAgICAvLyB3ZSBvd24gdGhlIG9iamVjdCAod2hlbiBjb252ZXJ0aW5nIGZyb20gYSBKUyBzdHJpbmcgdG8gc3RkOjpzdHJpbmcsIHdlIGVmZmVjdGl2ZWx5IGRvLCBidXQgbm90IGhlcmUpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBXaXNoIG90aGVyIHR5cGVzIGluY2x1ZGVkIHBvaW50ZXIgVHlwZUlEcyB3aXRoIHRoZW0gdG9vLi4uXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBuYW1lLCB7IHR5cGVJZDogcmF3VHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIEVtYm91bmRDbGFzcz4odGhpcywgYCR7bmFtZX0qYCwgeyB0eXBlSWQ6IHJhd1BvaW50ZXJUeXBlLCBmcm9tV2lyZVR5cGUsIHRvV2lyZVR5cGUgfSk7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBgJHtuYW1lfSBjb25zdCpgLCB7IHR5cGVJZDogcmF3Q29uc3RQb2ludGVyVHlwZSwgZnJvbVdpcmVUeXBlLCB0b1dpcmVUeXBlIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgIlxyXG5leHBvcnQgZnVuY3Rpb24gcnVuRGVzdHJ1Y3RvcnMoZGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdKTogdm9pZCB7XHJcbiAgICB3aGlsZSAoZGVzdHJ1Y3RvcnMubGVuZ3RoKSB7XHJcbiAgICAgICAgZGVzdHJ1Y3RvcnMucG9wKCkhKCk7XHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyByZW5hbWVGdW5jdGlvbiB9IGZyb20gXCIuL2NyZWF0ZS1uYW1lZC1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBydW5EZXN0cnVjdG9ycyB9IGZyb20gXCIuL2Rlc3RydWN0b3JzLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzcyB9IGZyb20gXCIuL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUeXBlSW5mbyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIEpTIGZ1bmN0aW9uIHRoYXQgY2FsbHMgYSBDKysgZnVuY3Rpb24sIGFjY291bnRpbmcgZm9yIGB0aGlzYCB0eXBlcyBhbmQgY29udGV4dC5cclxuICogXHJcbiAqIEl0IGNvbnZlcnRzIGFsbCBhcmd1bWVudHMgYmVmb3JlIHBhc3NpbmcgdGhlbSwgYW5kIGNvbnZlcnRzIHRoZSByZXR1cm4gdHlwZSBiZWZvcmUgcmV0dXJuaW5nLlxyXG4gKiBcclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBhcmdUeXBlSWRzIEFsbCBSVFRJIFR5cGVJZHMsIGluIHRoZSBvcmRlciBvZiBbUmV0VHlwZSwgVGhpc1R5cGUsIC4uLkFyZ1R5cGVzXS4gVGhpc1R5cGUgY2FuIGJlIG51bGwgZm9yIHN0YW5kYWxvbmUgZnVuY3Rpb25zLlxyXG4gKiBAcGFyYW0gaW52b2tlclNpZ25hdHVyZSBBIHBvaW50ZXIgdG8gdGhlIHNpZ25hdHVyZSBzdHJpbmcuXHJcbiAqIEBwYXJhbSBpbnZva2VySW5kZXggVGhlIGluZGV4IHRvIHRoZSBpbnZva2VyIGZ1bmN0aW9uIGluIHRoZSBgV2ViQXNzZW1ibHkuVGFibGVgLlxyXG4gKiBAcGFyYW0gaW52b2tlckNvbnRleHQgVGhlIGNvbnRleHQgcG9pbnRlciB0byB1c2UsIGlmIGFueS5cclxuICogQHJldHVybnMgXHJcbiAqL1xyXG4vKiBlc2xpbnQgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1mdW5jdGlvbi10eXBlOiBcIm9mZlwiICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVHbHVlRnVuY3Rpb248RiBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKSB8IEZ1bmN0aW9uPihcclxuICAgIGltcGw6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICByZXR1cm5UeXBlSWQ6IG51bWJlcixcclxuICAgIGFyZ1R5cGVJZHM6IG51bWJlcltdLFxyXG4gICAgaW52b2tlclNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyIHwgbnVsbFxyXG4pOiBQcm9taXNlPEY+IHtcclxuICAgIHR5cGUgVCA9IFBhcmFtZXRlcnM8RiAmICgoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKT47XHJcbiAgICB0eXBlIFIgPSBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V2lyZVR5cGVzLCBUW251bWJlcl0+O1xyXG4gICAgdHlwZSBBcmdUeXBlcyA9IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIFRbbnVtYmVyXT5bXTtcclxuXHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZSwgLi4uYXJnVHlwZXNdID0gYXdhaXQgZ2V0VHlwZUluZm88W1IsIC4uLkFyZ1R5cGVzXT4ocmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzKTtcclxuICAgIGNvbnN0IHJhd0ludm9rZXIgPSBnZXRUYWJsZUZ1bmN0aW9uPCguLi5hcmdzOiBXaXJlVHlwZXNbXSkgPT4gV2lyZVR5cGVzPihpbXBsLCBpbnZva2VyU2lnbmF0dXJlLCBpbnZva2VySW5kZXgpO1xyXG5cclxuICAgIHJldHVybiByZW5hbWVGdW5jdGlvbihuYW1lLCBmdW5jdGlvbiAodGhpczogRW1ib3VuZENsYXNzLCAuLi5qc0FyZ3M6IHVua25vd25bXSkge1xyXG4gICAgICAgIGNvbnN0IHdpcmVkVGhpcyA9IHRoaXMgPyB0aGlzLl90aGlzIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIGNvbnN0IHdpcmVkQXJnczogV2lyZVR5cGVzW10gPSBbXTtcclxuICAgICAgICBjb25zdCBzdGFja0Jhc2VkRGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdID0gW107ICAgLy8gVXNlZCB0byBwcmV0ZW5kIGxpa2Ugd2UncmUgYSBwYXJ0IG9mIHRoZSBXQVNNIHN0YWNrLCB3aGljaCB3b3VsZCBkZXN0cm95IHRoZXNlIG9iamVjdHMgYWZ0ZXJ3YXJkcy5cclxuXHJcbiAgICAgICAgaWYgKGludm9rZXJDb250ZXh0KVxyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaChpbnZva2VyQ29udGV4dCk7XHJcbiAgICAgICAgaWYgKHdpcmVkVGhpcylcclxuICAgICAgICAgICAgd2lyZWRBcmdzLnB1c2god2lyZWRUaGlzKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCBlYWNoIEpTIGFyZ3VtZW50IHRvIGl0cyBXQVNNIGVxdWl2YWxlbnQgKGdlbmVyYWxseSBhIHBvaW50ZXIsIG9yIGludC9mbG9hdClcclxuICAgICAgICAvLyBUT0RPOiBUZXN0IHBlcmZvcm1hbmNlIHJlZ2FyZGluZyBsb29waW5nIHRocm91Z2ggZWFjaCBhcmd1bWVudCBiZWZvcmUgcGFzc2luZyBpdCB0byBhIGZ1bmN0aW9uLlxyXG4gICAgICAgIC8vIEknbSBob3BpbmcgdGhhdCB0aGUgSklUIGNvbXBpbGVyIHVuZGVyc3RhbmRzIHRoYXQgYXJnVHlwZXMubGVuZ3RoIG5ldmVyIGNoYW5nZXMgYW5kIHVucm9sbHMgaXQuLi5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ1R5cGVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBhcmdUeXBlc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgYXJnID0ganNBcmdzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSB0eXBlLnRvV2lyZVR5cGUoYXJnKTtcclxuICAgICAgICAgICAgd2lyZWRBcmdzLnB1c2god2lyZVZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKHN0YWNrRGVzdHJ1Y3RvcilcclxuICAgICAgICAgICAgICAgIHN0YWNrQmFzZWREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZpbmFsbHksIGNhbGwgdGhlIFwicmF3XCIgV0FTTSBmdW5jdGlvblxyXG4gICAgICAgIGNvbnN0IHdpcmVkUmV0dXJuOiBXaXJlVHlwZXMgPSByYXdJbnZva2VyKC4uLndpcmVkQXJncyk7XHJcblxyXG4gICAgICAgIC8vIFN0aWxsIHByZXRlbmRpbmcgd2UncmUgYSBwYXJ0IG9mIHRoZSBzdGFjaywgXHJcbiAgICAgICAgLy8gbm93IGRlc3RydWN0IGV2ZXJ5dGhpbmcgd2UgXCJwdXNoZWRcIiBvbnRvIGl0LlxyXG4gICAgICAgIHJ1bkRlc3RydWN0b3JzKHN0YWNrQmFzZWREZXN0cnVjdG9ycyk7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgd2hhdGV2ZXIgdGhlIFdBU00gZnVuY3Rpb24gcmV0dXJuZWQgdG8gYSBKUyByZXByZXNlbnRhdGlvblxyXG4gICAgICAgIC8vIElmIHRoZSBvYmplY3QgcmV0dXJuZWQgaXMgRGlzcG9zYWJsZSwgdGhlbiB3ZSBsZXQgdGhlIHVzZXIgZGlzcG9zZSBvZiBpdFxyXG4gICAgICAgIC8vIHdoZW4gcmVhZHkuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBPdGhlcndpc2UgKG5hbWVseSBzdHJpbmdzKSwgZGlzcG9zZSBpdHMgb3JpZ2luYWwgcmVwcmVzZW50YXRpb24gbm93LlxyXG4gICAgICAgIGlmIChyZXR1cm5UeXBlID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IHJldHVyblR5cGUuZnJvbVdpcmVUeXBlKHdpcmVkUmV0dXJuKTtcclxuICAgICAgICBpZiAoc3RhY2tEZXN0cnVjdG9yICYmICEoanNWYWx1ZSAmJiB0eXBlb2YganNWYWx1ZSA9PSBcIm9iamVjdFwiICYmIChTeW1ib2wuZGlzcG9zZSBpbiBqc1ZhbHVlKSkpXHJcbiAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3Rvcihqc1ZhbHVlLCB3aXJlVmFsdWUpO1xyXG5cclxuICAgICAgICByZXR1cm4ganNWYWx1ZTtcclxuXHJcbiAgICB9IGFzIEYpO1xyXG59XHJcbiIsICJcclxuZXhwb3J0IHR5cGUgSXM2NCA9IGZhbHNlO1xyXG5leHBvcnQgY29uc3QgSXM2NCA9IGZhbHNlO1xyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgSXM2NCB9IGZyb20gXCIuL2lzLTY0LmpzXCI7XHJcblxyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBQb2ludGVyU2l6ZTogNCB8IDggPSAoSXM2NCA/IDggOiA0KTtcclxuZXhwb3J0IGNvbnN0IGdldFBvaW50ZXI6IFwiZ2V0QmlnVWludDY0XCIgfCBcImdldFVpbnQzMlwiID0gKElzNjQgPyBcImdldEJpZ1VpbnQ2NFwiIDogXCJnZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgY29uc3Qgc2V0UG9pbnRlcjogXCJzZXRCaWdVaW50NjRcIiB8IFwic2V0VWludDMyXCIgPSAoSXM2NCA/IFwic2V0QmlnVWludDY0XCIgOiBcInNldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG9pbnRlclNpemUoX2luc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtKTogNCB7IHJldHVybiBQb2ludGVyU2l6ZSBhcyA0OyB9IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyIH0gZnJvbSBcIi4vcG9pbnRlci5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTYW1lIGFzIGByZWFkVWludDMyYCwgYnV0IHR5cGVkIGZvciBwb2ludGVycywgYW5kIGZ1dHVyZS1wcm9vZnMgYWdhaW5zdCA2NC1iaXQgYXJjaGl0ZWN0dXJlcy5cclxuICogXHJcbiAqIFRoaXMgaXMgKm5vdCogdGhlIHNhbWUgYXMgZGVyZWZlcmVuY2luZyBhIHBvaW50ZXIuIFRoaXMgaXMgYWJvdXQgcmVhZGluZyB0aGUgbnVtZXJpY2FsIHZhbHVlIGF0IGEgZ2l2ZW4gYWRkcmVzcyB0aGF0IGlzLCBpdHNlbGYsIHRvIGJlIGludGVycHJldGVkIGFzIGEgcG9pbnRlci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkUG9pbnRlcihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tnZXRQb2ludGVyXShwdHIsIHRydWUpIGFzIG51bWJlcjsgfVxyXG4iLCAiaW1wb3J0IHsgZ2V0UG9pbnRlclNpemUgfSBmcm9tIFwiLi4vLi4vdXRpbC9wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRQb2ludGVyIH0gZnJvbSBcIi4uLy4uL3V0aWwvcmVhZC1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcblxyXG4vKipcclxuICogR2VuZXJhbGx5LCBFbWJpbmQgZnVuY3Rpb25zIGluY2x1ZGUgYW4gYXJyYXkgb2YgUlRUSSBUeXBlSWRzIGluIHRoZSBmb3JtIG9mXHJcbiAqIFtSZXRUeXBlLCBUaGlzVHlwZT8sIC4uLkFyZ1R5cGVzXVxyXG4gKiBcclxuICogVGhpcyByZXR1cm5zIHRoYXQgYXJyYXkgb2YgdHlwZUlkcyBmb3IgYSBnaXZlbiBmdW5jdGlvbi5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkQXJyYXlPZlR5cGVzKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIGNvdW50OiBudW1iZXIsIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIpOiBudW1iZXJbXSB7XHJcbiAgICBjb25zdCByZXQ6IG51bWJlcltdID0gW107XHJcbiAgICBjb25zdCBwb2ludGVyU2l6ZSA9IGdldFBvaW50ZXJTaXplKGltcGwpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7ICsraSkge1xyXG4gICAgICAgIHJldC5wdXNoKHJlYWRQb2ludGVyKGltcGwsIHJhd0FyZ1R5cGVzUHRyICsgaSAqIHBvaW50ZXJTaXplKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24odGhpczogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBtZXRob2ROYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJJbmRleDogbnVtYmVyLFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlcixcclxuICAgIF9pc0FzeW5jOiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbWV0aG9kTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICBFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF1bbmFtZSBhcyBuZXZlcl0gPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb24odGhpcywgbmFtZSwgcmV0dXJuVHlwZUlkLCBhcmdUeXBlSWRzLCBpbnZva2VyU2lnbmF0dXJlUHRyLCBpbnZva2VySW5kZXgsIGludm9rZXJDb250ZXh0KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvcih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgLi4uYXJnVHlwZUlkc10gPSByZWFkQXJyYXlPZlR5cGVzKHRoaXMsIGFyZ0NvdW50LCByYXdBcmdUeXBlc1B0cik7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUodGhpcywgXCI8Y29uc3RydWN0b3I+XCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICBFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0uX2NvbnN0cnVjdG9yID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKHRoaXMsIFwiPGNvbnN0cnVjdG9yPlwiLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIG1ldGhvZE5hbWVQdHI6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLCAvLyBbUmV0dXJuVHlwZSwgVGhpc1R5cGUsIEFyZ3MuLi5dXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBfaXNQdXJlVmlydHVhbDogbnVtYmVyLFxyXG4gICAgX2lzQXN5bmM6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIF90aGlzVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIC8vY29uc29sZS5hc3NlcnQodGhpc1R5cGVJZCAhPSByYXdDbGFzc1R5cGVJZCxgSW50ZXJuYWwgZXJyb3I7IGV4cGVjdGVkIHRoZSBSVFRJIHBvaW50ZXJzIGZvciB0aGUgY2xhc3MgdHlwZSBhbmQgaXRzIHBvaW50ZXIgdHlwZSB0byBiZSBkaWZmZXJlbnQuYCk7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG1ldGhvZE5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIChFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0ucHJvdG90eXBlIGFzIG5ldmVyKVtuYW1lXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgbmFtZSxcclxuICAgICAgICAgICAgcmV0dXJuVHlwZUlkLFxyXG4gICAgICAgICAgICBhcmdUeXBlSWRzLFxyXG4gICAgICAgICAgICBpbnZva2VyU2lnbmF0dXJlUHRyLFxyXG4gICAgICAgICAgICBpbnZva2VySW5kZXgsXHJcbiAgICAgICAgICAgIGludm9rZXJDb250ZXh0XHJcbiAgICAgICAgKTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IEVtYm91bmRDbGFzc2VzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5KFxyXG4gICAgdGhpczogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIHJhd0NsYXNzVHlwZUlkOiBudW1iZXIsXHJcbiAgICBmaWVsZE5hbWVQdHI6IG51bWJlcixcclxuICAgIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyLFxyXG4gICAgZ2V0dGVyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBnZXR0ZXJJbmRleDogbnVtYmVyLFxyXG4gICAgZ2V0dGVyQ29udGV4dDogbnVtYmVyLFxyXG4gICAgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlcixcclxuICAgIHNldHRlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgc2V0dGVySW5kZXg6IG51bWJlcixcclxuICAgIHNldHRlckNvbnRleHQ6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIGZpZWxkTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZ2V0ID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uPCgpID0+IHVua25vd24+KHRoaXMsIGAke25hbWV9X2dldHRlcmAsIGdldHRlclJldHVyblR5cGVJZCwgW10sIGdldHRlclNpZ25hdHVyZVB0ciwgZ2V0dGVySW5kZXgsIGdldHRlckNvbnRleHQpO1xyXG4gICAgICAgIGNvbnN0IHNldCA9IHNldHRlckluZGV4ID8gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uPCh2YWx1ZTogdW5rbm93bikgPT4gdm9pZD4odGhpcywgYCR7bmFtZX1fc2V0dGVyYCwgMCwgW3NldHRlckFyZ3VtZW50VHlwZUlkXSwgc2V0dGVyU2lnbmF0dXJlUHRyLCBzZXR0ZXJJbmRleCwgc2V0dGVyQ29udGV4dCkgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgoRW1ib3VuZENsYXNzZXNbcmF3Q2xhc3NUeXBlSWRdLnByb3RvdHlwZSBhcyB1bmtub3duKSwgbmFtZSwge1xyXG4gICAgICAgICAgICBnZXQsXHJcbiAgICAgICAgICAgIHNldCxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJcclxuaW1wb3J0IHsgcmVnaXN0ZXJFbWJvdW5kIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUeXBlSW5mbyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXR5cGUtaW5mby5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIG5hbWVQdHI6IG51bWJlciwgdHlwZVB0cjogbnVtYmVyLCB2YWx1ZUFzV2lyZVR5cGU6IFdpcmVUeXBlcyk6IHZvaWQge1xyXG5cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChjb25zdE5hbWUpID0+IHtcclxuICAgICAgICAvLyBXYWl0IHVudGlsIHdlIGtub3cgaG93IHRvIHBhcnNlIHRoZSB0eXBlIHRoaXMgY29uc3RhbnQgcmVmZXJlbmNlcy5cclxuICAgICAgICBjb25zdCBbdHlwZV0gPSBhd2FpdCBnZXRUeXBlSW5mbzxbRW1ib3VuZFJlZ2lzdGVyZWRUeXBlXT4odHlwZVB0cik7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIGNvbnN0YW50IGZyb20gaXRzIHdpcmUgcmVwcmVzZW50YXRpb24gdG8gaXRzIEpTIHJlcHJlc2VudGF0aW9uLlxyXG4gICAgICAgIGNvbnN0IHZhbHVlID0gdHlwZS5mcm9tV2lyZVR5cGUodmFsdWVBc1dpcmVUeXBlKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHRoaXMgY29uc3RhbnQgdmFsdWUgdG8gdGhlIGBlbWJpbmRgIG9iamVjdC5cclxuICAgICAgICByZWdpc3RlckVtYm91bmQodGhpcywgY29uc3ROYW1lLCB2YWx1ZS5qc1ZhbHVlKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwodGhpczogSW5zdGFudGlhdGVkV2FzbSwgX3R5cGVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgLy8gVE9ETy4uLlxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtdmFsX3Rha2VfdmFsdWUodGhpczogSW5zdGFudGlhdGVkV2FzbSwgX3Jhd1R5cGVQdHI6IG51bWJlciwgX3B0cjogbnVtYmVyKTogdW5rbm93biB7XHJcbiAgICAvLyBUT0RPLi4uXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gX2VtdmFsX2RlY3JlZih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBfaGFuZGxlOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgLy8gVE9ETy4uLlxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSwgcmVnaXN0ZXJFbWJvdW5kIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuY29uc3QgQWxsRW51bXM6IFJlY29yZDxudW1iZXIsIFJlY29yZDxzdHJpbmcsIG51bWJlcj4+ID0ge307XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBfc2l6ZTogbnVtYmVyLCBfaXNTaWduZWQ6IGJvb2xlYW4pOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBlbnVtIG9iamVjdCB0aGF0IHRoZSB1c2VyIHdpbGwgaW5zcGVjdCB0byBsb29rIGZvciBlbnVtIHZhbHVlc1xyXG4gICAgICAgIEFsbEVudW1zW3R5cGVQdHJdID0ge307XHJcblxyXG4gICAgICAgIC8vIE1hcmsgdGhpcyB0eXBlIGFzIHJlYWR5IHRvIGJlIHVzZWQgYnkgb3RoZXIgdHlwZXMgXHJcbiAgICAgICAgLy8gKGV2ZW4gaWYgd2UgZG9uJ3QgaGF2ZSB0aGUgZW51bSB2YWx1ZXMgeWV0LCBlbnVtIHZhbHVlc1xyXG4gICAgICAgIC8vIHRoZW1zZWx2ZXMgYXJlbid0IHVzZWQgYnkgYW55IHJlZ2lzdHJhdGlvbiBmdW5jdGlvbnMuKVxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHdpcmVWYWx1ZSkgPT4geyByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6IHdpcmVWYWx1ZSB9OyB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoanNWYWx1ZSkgPT4geyByZXR1cm4geyB3aXJlVmFsdWU6IGpzVmFsdWUsIGpzVmFsdWUgfSB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIE1ha2UgdGhpcyB0eXBlIGF2YWlsYWJsZSBmb3IgdGhlIHVzZXJcclxuICAgICAgICByZWdpc3RlckVtYm91bmQodGhpcywgbmFtZSBhcyBuZXZlciwgQWxsRW51bXNbdHlwZVB0cl0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd0VudW1UeXBlOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgZW51bVZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgKG5hbWUpID0+IHtcclxuICAgICAgICAvLyBKdXN0IGFkZCB0aGlzIG5hbWUncyB2YWx1ZSB0byB0aGUgZXhpc3RpbmcgZW51bSB0eXBlLlxyXG4gICAgICAgIEFsbEVudW1zW3Jhd0VudW1UeXBlXVtuYW1lXSA9IGVudW1WYWx1ZTtcclxuICAgIH0pXHJcbn0iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBfYnl0ZVdpZHRoOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgKG5hbWUpID0+IHtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBudW1iZXI+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICh2YWx1ZSkgPT4gKHsgd2lyZVZhbHVlOiB2YWx1ZSwganNWYWx1ZTogdmFsdWUgfSksXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6ICh2YWx1ZSkgPT4gKHsgd2lyZVZhbHVlOiB2YWx1ZSwganNWYWx1ZTogdmFsdWUgfSksXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyByZWFkQXJyYXlPZlR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFxyXG4gKiBAcGFyYW0gbmFtZVB0ciBBIHBvaW50ZXIgdG8gdGhlIG51bGwtdGVybWluYXRlZCBuYW1lIG9mIHRoaXMgZXhwb3J0LlxyXG4gKiBAcGFyYW0gYXJnQ291bnQgVGhlIG51bWJlciBvZiBhcmd1bWVudHMgdGhlIFdBU00gZnVuY3Rpb24gdGFrZXNcclxuICogQHBhcmFtIHJhd0FyZ1R5cGVzUHRyIEEgcG9pbnRlciB0byBhbiBhcnJheSBvZiBudW1iZXJzLCBlYWNoIHJlcHJlc2VudGluZyBhIFR5cGVJRC4gVGhlIDB0aCB2YWx1ZSBpcyB0aGUgcmV0dXJuIHR5cGUsIHRoZSByZXN0IGFyZSB0aGUgYXJndW1lbnRzIHRoZW1zZWx2ZXMuXHJcbiAqIEBwYXJhbSBzaWduYXR1cmUgQSBwb2ludGVyIHRvIGEgbnVsbC10ZXJtaW5hdGVkIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIFdBU00gc2lnbmF0dXJlIG9mIHRoZSBmdW5jdGlvbjsgZS5nLiBcImBwYFwiLCBcImBmcHBgXCIsIFwiYHZwYFwiLCBcImBmcGZmZmBcIiwgZXRjLlxyXG4gKiBAcGFyYW0gcmF3SW52b2tlclB0ciBUaGUgcG9pbnRlciB0byB0aGUgZnVuY3Rpb24gaW4gV0FTTS5cclxuICogQHBhcmFtIGZ1bmN0aW9uSW5kZXggVGhlIGluZGV4IG9mIHRoZSBmdW5jdGlvbiBpbiB0aGUgYFdlYkFzc2VtYmx5LlRhYmxlYCB0aGF0J3MgZXhwb3J0ZWQuXHJcbiAqIEBwYXJhbSBpc0FzeW5jIFVudXNlZC4uLnByb2JhYmx5XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9mdW5jdGlvbihcclxuICAgIHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICBuYW1lUHRyOiBudW1iZXIsXHJcbiAgICBhcmdDb3VudDogbnVtYmVyLFxyXG4gICAgcmF3QXJnVHlwZXNQdHI6IG51bWJlcixcclxuICAgIHNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgcmF3SW52b2tlclB0cjogbnVtYmVyLFxyXG4gICAgZnVuY3Rpb25JbmRleDogbnVtYmVyLFxyXG4gICAgX2lzQXN5bmM6IGJvb2xlYW5cclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcbiAgICAgICAgdGhpcy5lbWJpbmRbbmFtZSBhcyBuZXZlcl0gPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb24odGhpcywgbmFtZSwgcmV0dXJuVHlwZUlkLCBhcmdUeXBlSWRzLCBzaWduYXR1cmUsIHJhd0ludm9rZXJQdHIsIGZ1bmN0aW9uSW5kZXgpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIodGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGJ5dGVXaWR0aDogbnVtYmVyLCBtaW5WYWx1ZTogbnVtYmVyLCBfbWF4VmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkVHlwZSA9IChtaW5WYWx1ZSA9PT0gMCk7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZFR5cGUgPyBmcm9tV2lyZVR5cGVVKGJ5dGVXaWR0aCkgOiBmcm9tV2lyZVR5cGVTKGJ5dGVXaWR0aCk7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IG1pbi9tYXhWYWx1ZSBhcmVuJ3QgdXNlZCBmb3IgYm91bmRzIGNoZWNraW5nLFxyXG4gICAgICAgIC8vIGJ1dCBpZiB0aGV5IGFyZSwgbWFrZSBzdXJlIHRvIGFkanVzdCBtYXhWYWx1ZSBmb3IgdGhlIHNhbWUgc2lnbmVkL3Vuc2lnbmVkIHR5cGUgaXNzdWVcclxuICAgICAgICAvLyBvbiAzMi1iaXQgc2lnbmVkIGludCB0eXBlczpcclxuICAgICAgICAvLyBtYXhWYWx1ZSA9IGZyb21XaXJlVHlwZShtYXhWYWx1ZSk7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKGpzVmFsdWU6IG51bWJlcikgPT4gKHsgd2lyZVZhbHVlOiBqc1ZhbHVlLCBqc1ZhbHVlIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbi8vIFdlIG5lZWQgYSBzZXBhcmF0ZSBmdW5jdGlvbiBmb3IgdW5zaWduZWQgY29udmVyc2lvbiBiZWNhdXNlIFdBU00gb25seSBoYXMgc2lnbmVkIHR5cGVzLCBcclxuLy8gZXZlbiB3aGVuIGxhbmd1YWdlcyBoYXZlIHVuc2lnbmVkIHR5cGVzLCBhbmQgaXQgZXhwZWN0cyB0aGUgY2xpZW50IHRvIG1hbmFnZSB0aGUgdHJhbnNpdGlvbi5cclxuLy8gU28gdGhpcyBpcyB1cywgbWFuYWdpbmcgdGhlIHRyYW5zaXRpb24uXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVUoYnl0ZVdpZHRoOiBudW1iZXIpOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8bnVtYmVyLCBudW1iZXI+W1wiZnJvbVdpcmVUeXBlXCJdIHtcclxuICAgIC8vIFNoaWZ0IG91dCBhbGwgdGhlIGJpdHMgaGlnaGVyIHRoYW4gd2hhdCB3b3VsZCBmaXQgaW4gdGhpcyBpbnRlZ2VyIHR5cGUsXHJcbiAgICAvLyBidXQgaW4gcGFydGljdWxhciBtYWtlIHN1cmUgdGhlIG5lZ2F0aXZlIGJpdCBnZXRzIGNsZWFyZWQgb3V0IGJ5IHRoZSA+Pj4gYXQgdGhlIGVuZC5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+Pj4gb3ZlcmZsb3dCaXRDb3VudCkgfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlUyhieXRlV2lkdGg6IG51bWJlcik6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxudW1iZXIsIG51bWJlcj5bXCJmcm9tV2lyZVR5cGVcIl0ge1xyXG4gICAgLy8gU2hpZnQgb3V0IGFsbCB0aGUgYml0cyBoaWdoZXIgdGhhbiB3aGF0IHdvdWxkIGZpdCBpbiB0aGlzIGludGVnZXIgdHlwZS5cclxuICAgIGNvbnN0IG92ZXJmbG93Qml0Q291bnQgPSAzMiAtIDggKiBieXRlV2lkdGg7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHdpcmVWYWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiAoKHdpcmVWYWx1ZSA8PCBvdmVyZmxvd0JpdENvdW50KSA+PiBvdmVyZmxvd0JpdENvdW50KSB9O1xyXG4gICAgfVxyXG59IiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcodGhpczogSW5zdGFudGlhdGVkV2FzbSwgX2V4OiB1bmtub3duKTogdm9pZCB7XHJcbiAgICAvLyBUT0RPXHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IElzNjQgfSBmcm9tIFwiLi9pcy02NC5qc1wiO1xyXG5pbXBvcnQgeyBQb2ludGVyU2l6ZSB9IGZyb20gXCIuL3BvaW50ZXIuanNcIjtcclxuXHJcbmNvbnN0IFNpemVUU2l6ZTogNCB8IDggPSBQb2ludGVyU2l6ZTtcclxuZXhwb3J0IGNvbnN0IHNldFNpemVUOiBcInNldEJpZ1VpbnQ2NFwiIHwgXCJzZXRVaW50MzJcIiA9IChJczY0ID8gXCJzZXRCaWdVaW50NjRcIiA6IFwic2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuZXhwb3J0IGNvbnN0IGdldFNpemVUOiBcImdldEJpZ1VpbnQ2NFwiIHwgXCJnZXRVaW50MzJcIiA9IChJczY0ID8gXCJnZXRCaWdVaW50NjRcIiA6IFwiZ2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNpemVUU2l6ZShfaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20pOiA0IHsgcmV0dXJuIFNpemVUU2l6ZSBhcyA0OyB9XHJcblxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IGdldFNpemVUIH0gZnJvbSBcIi4vc2l6ZXQuanNcIjtcclxuXHJcblxyXG4vKipcclxuICogU2FtZSBhcyBgcmVhZFVpbnQzMmAsIGJ1dCB0eXBlZCBmb3Igc2l6ZV90IHZhbHVlcywgYW5kIGZ1dHVyZS1wcm9vZnMgYWdhaW5zdCA2NC1iaXQgYXJjaGl0ZWN0dXJlcy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkU2l6ZVQoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbZ2V0U2l6ZVRdKHB0ciwgdHJ1ZSkgYXMgbnVtYmVyOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgc2V0U2l6ZVQgfSBmcm9tIFwiLi9zaXpldC5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlU2l6ZVQoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbc2V0U2l6ZVRdKHB0ciwgdmFsdWUgYXMgbmV2ZXIsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQxNihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0VWludDE2KHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQzMihpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0VWludDMyKHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQ4KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50OChwdHIsIHZhbHVlKTsgfVxyXG4iLCAiaW1wb3J0IHsgcmVhZFNpemVUIH0gZnJvbSBcIi4uLy4uL3V0aWwvcmVhZC1zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyBnZXRTaXplVFNpemUgfSBmcm9tIFwiLi4vLi4vdXRpbC9zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVNpemVUIH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtc2l6ZXQuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MTYgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50MTYuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50OCB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQ4LmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IHN0cmluZ1RvVXRmMTYsIHN0cmluZ1RvVXRmMzIsIHN0cmluZ1RvVXRmOCwgdXRmMTZUb1N0cmluZ0wsIHV0ZjMyVG9TdHJpbmdMLCB1dGY4VG9TdHJpbmdMIH0gZnJvbSBcIi4uL3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4vcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBXaXJlQ29udmVyc2lvblJlc3VsdCB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vLyBTaGFyZWQgYmV0d2VlbiBzdGQ6OnN0cmluZyBhbmQgc3RkOjp3c3RyaW5nXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55KGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgY2hhcldpZHRoOiAxIHwgMiB8IDQsIG5hbWVQdHI6IG51bWJlcik6IHZvaWQge1xyXG5cclxuICAgIGNvbnN0IHV0ZlRvU3RyaW5nTCA9IChjaGFyV2lkdGggPT0gMSkgPyB1dGY4VG9TdHJpbmdMIDogKGNoYXJXaWR0aCA9PSAyKSA/IHV0ZjE2VG9TdHJpbmdMIDogdXRmMzJUb1N0cmluZ0w7XHJcbiAgICBjb25zdCBzdHJpbmdUb1V0ZiA9IChjaGFyV2lkdGggPT0gMSkgPyBzdHJpbmdUb1V0ZjggOiAoY2hhcldpZHRoID09IDIpID8gc3RyaW5nVG9VdGYxNiA6IHN0cmluZ1RvVXRmMzI7XHJcbiAgICBjb25zdCBVaW50QXJyYXkgPSAoY2hhcldpZHRoID09IDEpID8gVWludDhBcnJheSA6IChjaGFyV2lkdGggPT0gMikgPyBVaW50MTZBcnJheSA6IFVpbnQzMkFycmF5O1xyXG4gICAgY29uc3Qgd3JpdGVVaW50ID0gKGNoYXJXaWR0aCA9PSAxKSA/IHdyaXRlVWludDggOiAoY2hhcldpZHRoID09IDIpID8gd3JpdGVVaW50MTYgOiB3cml0ZVVpbnQzMjtcclxuXHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3RlcihpbXBsLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBmcm9tV2lyZVR5cGUgPSAocHRyOiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgLy8gVGhlIHdpcmUgdHlwZSBpcyBhIHBvaW50ZXIgdG8gYSBcInN0cnVjdFwiIChub3QgcmVhbGx5IGEgc3RydWN0IGluIHRoZSB1c3VhbCBzZW5zZS4uLlxyXG4gICAgICAgICAgICAvLyBleGNlcHQgbWF5YmUgaW4gbmV3ZXIgQyB2ZXJzaW9ucyBJIGd1ZXNzKSB3aGVyZSBcclxuICAgICAgICAgICAgLy8gdGhlIGZpcnN0IGZpZWxkIGlzIGEgc2l6ZV90IHJlcHJlc2VudGluZyB0aGUgbGVuZ3RoLFxyXG4gICAgICAgICAgICAvLyBBbmQgdGhlIHNlY29uZCBcImZpZWxkXCIgaXMgdGhlIHN0cmluZyBkYXRhIGl0c2VsZixcclxuICAgICAgICAgICAgLy8gZmluYWxseSBhbGwgZW5kZWQgd2l0aCBhbiBleHRyYSBudWxsIGJ5dGUuXHJcbiAgICAgICAgICAgIGNvbnN0IGxlbmd0aCA9IHJlYWRTaXplVChpbXBsLCBwdHIpO1xyXG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gcHRyICsgZ2V0U2l6ZVRTaXplKGltcGwpO1xyXG4gICAgICAgICAgICBjb25zdCBkZWNvZGVTdGFydFB0ciA9IHBheWxvYWQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0ciA9IHV0ZlRvU3RyaW5nTChpbXBsLCBkZWNvZGVTdGFydFB0ciwgbGVuZ3RoKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBzdHIsXHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgY2FsbCB0byBfZnJlZSBoYXBwZW5zIGJlY2F1c2UgRW1iaW5kIGNhbGxzIG1hbGxvYyBkdXJpbmcgaXRzIHRvV2lyZVR5cGUgZnVuY3Rpb24uXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU3VyZWx5IHRoZXJlJ3MgYSB3YXkgdG8gYXZvaWQgdGhpcyBjb3B5IG9mIGEgY29weSBvZiBhIGNvcHkgdGhvdWdoLCByaWdodD8gUmlnaHQ/XHJcbiAgICAgICAgICAgICAgICAgICAgaW1wbC5leHBvcnRzLmZyZWUocHRyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCB0b1dpcmVUeXBlID0gKHN0cjogc3RyaW5nKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBzdHJpbmc+ID0+IHtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlQXNBcnJheUJ1ZmZlckluSlMgPSBuZXcgVWludEFycmF5KHN0cmluZ1RvVXRmKHN0cikpO1xyXG5cclxuICAgICAgICAgICAgLy8gSXMgaXQgbW9yZSBvciBsZXNzIGNsZWFyIHdpdGggYWxsIHRoZXNlIHZhcmlhYmxlcyBleHBsaWNpdGx5IG5hbWVkP1xyXG4gICAgICAgICAgICAvLyBIb3BlZnVsbHkgbW9yZSwgYXQgbGVhc3Qgc2xpZ2h0bHkuXHJcbiAgICAgICAgICAgIGNvbnN0IGNoYXJDb3VudFdpdGhvdXROdWxsID0gdmFsdWVBc0FycmF5QnVmZmVySW5KUy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGNoYXJDb3VudFdpdGhOdWxsID0gY2hhckNvdW50V2l0aG91dE51bGwgKyAxO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYnl0ZUNvdW50V2l0aG91dE51bGwgPSBjaGFyQ291bnRXaXRob3V0TnVsbCAqIGNoYXJXaWR0aDtcclxuICAgICAgICAgICAgY29uc3QgYnl0ZUNvdW50V2l0aE51bGwgPSBjaGFyQ291bnRXaXRoTnVsbCAqIGNoYXJXaWR0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIDEuIChtKWFsbG9jYXRlIHNwYWNlIGZvciB0aGUgc3RydWN0IGFib3ZlXHJcbiAgICAgICAgICAgIGNvbnN0IHdhc21TdHJpbmdTdHJ1Y3QgPSBpbXBsLmV4cG9ydHMubWFsbG9jKGdldFNpemVUU2l6ZShpbXBsKSArIGJ5dGVDb3VudFdpdGhOdWxsKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDIuIFdyaXRlIHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZyB0byB0aGUgc3RydWN0XHJcbiAgICAgICAgICAgIGNvbnN0IHN0cmluZ1N0YXJ0ID0gd2FzbVN0cmluZ1N0cnVjdCArIGdldFNpemVUU2l6ZShpbXBsKTtcclxuICAgICAgICAgICAgd3JpdGVTaXplVChpbXBsLCB3YXNtU3RyaW5nU3RydWN0LCBjaGFyQ291bnRXaXRob3V0TnVsbCk7XHJcblxyXG4gICAgICAgICAgICAvLyAzLiBXcml0ZSB0aGUgc3RyaW5nIGRhdGEgdG8gdGhlIHN0cnVjdFxyXG4gICAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvbiA9IG5ldyBVaW50QXJyYXkoaW1wbC5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHN0cmluZ1N0YXJ0LCBieXRlQ291bnRXaXRob3V0TnVsbCk7XHJcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uLnNldCh2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDQuIFdyaXRlIGEgbnVsbCBieXRlXHJcbiAgICAgICAgICAgIHdyaXRlVWludChpbXBsLCBzdHJpbmdTdGFydCArIGJ5dGVDb3VudFdpdGhvdXROdWxsLCAwKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IGltcGwuZXhwb3J0cy5mcmVlKHdhc21TdHJpbmdTdHJ1Y3QpLFxyXG4gICAgICAgICAgICAgICAgd2lyZVZhbHVlOiB3YXNtU3RyaW5nU3RydWN0LFxyXG4gICAgICAgICAgICAgICAganNWYWx1ZTogc3RyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlKGltcGwsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiB0eXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGUsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgcmV0dXJuIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkodGhpcywgdHlwZVB0ciwgMSwgbmFtZVB0cik7XHJcbn1cclxuIiwgImltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLXN0ZC1zdHJpbmcuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgY2hhcldpZHRoOiAyIHwgNCwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICByZXR1cm4gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSh0aGlzLCB0eXBlUHRyLCBjaGFyV2lkdGgsIG5hbWVQdHIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCAuLi5fYXJnczogbnVtYmVyW10pOiB2b2lkIHtcclxuICAgIC8vIFRPRE8uLi5cclxufSIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUeXBlSW5mbyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVDb252ZXJzaW9uUmVzdWx0LCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXVD4gPSAoZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBwdHI6IG51bWJlcikgPT4gV1Q7XHJcbmV4cG9ydCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V1Q+ID0gKHNldHRlckNvbnRleHQ6IG51bWJlciwgcHRyOiBudW1iZXIsIHdpcmVUeXBlOiBXVCkgPT4gdm9pZDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcz4ge1xyXG4gICAgbmFtZVB0cjogbnVtYmVyO1xyXG4gICAgX2NvbnN0cnVjdG9yKCk6IG51bWJlcjtcclxuICAgIF9kZXN0cnVjdG9yKHB0cjogV1QpOiB2b2lkO1xyXG4gICAgZWxlbWVudHM6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUPltdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzPiB7XHJcblxyXG4gICAgLyoqIFRoZSBcInJhd1wiIGdldHRlciwgZXhwb3J0ZWQgZnJvbSBFbWJpbmQuIE5lZWRzIGNvbnZlcnNpb24gYmV0d2VlbiB0eXBlcy4gKi9cclxuICAgIHdhc21HZXR0ZXI6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8V1Q+O1xyXG5cclxuICAgIC8qKiBUaGUgXCJyYXdcIiBzZXR0ZXIsIGV4cG9ydGVkIGZyb20gRW1iaW5kLiBOZWVkcyBjb252ZXJzaW9uIGJldHdlZW4gdHlwZXMuICovXHJcbiAgICB3YXNtU2V0dGVyOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFdUPjtcclxuXHJcbiAgICAvKiogVGhlIG51bWVyaWMgdHlwZSBJRCBvZiB0aGUgdHlwZSB0aGUgZ2V0dGVyIHJldHVybnMgKi9cclxuICAgIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBUaGUgbnVtZXJpYyB0eXBlIElEIG9mIHRoZSB0eXBlIHRoZSBzZXR0ZXIgYWNjZXB0cyAqL1xyXG4gICAgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlcjtcclxuXHJcbiAgICAvKiogVW5rbm93bjsgdXNlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgZW1iaW5kIGdldHRlciAqL1xyXG4gICAgZ2V0dGVyQ29udGV4dDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBVbmtub3duOyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBlbWJpbmQgc2V0dGVyICovXHJcbiAgICBzZXR0ZXJDb250ZXh0OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUPiB7XHJcbiAgICAvKiogQSB2ZXJzaW9uIG9mIGB3YXNtR2V0dGVyYCB0aGF0IGhhbmRsZXMgdHlwZSBjb252ZXJzaW9uICovXHJcbiAgICByZWFkKHB0cjogV1QpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxXVCwgVD47XHJcblxyXG4gICAgLyoqIEEgdmVyc2lvbiBvZiBgd2FzbVNldHRlcmAgdGhhdCBoYW5kbGVzIHR5cGUgY29udmVyc2lvbiAqL1xyXG4gICAgd3JpdGUocHRyOiBudW1iZXIsIHZhbHVlOiBUKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8V1QsIFQ+O1xyXG5cclxuICAgIC8qKiBgZ2V0dGVyUmV0dXJuVHlwZUlkLCBidXQgcmVzb2x2ZWQgdG8gdGhlIHBhcnNlZCB0eXBlIGluZm8gKi9cclxuICAgIGdldHRlclJldHVyblR5cGU6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD47XHJcblxyXG4gICAgLyoqIGBzZXR0ZXJSZXR1cm5UeXBlSWQsIGJ1dCByZXNvbHZlZCB0byB0aGUgcGFyc2VkIHR5cGUgaW5mbyAqL1xyXG4gICAgc2V0dGVyQXJndW1lbnRUeXBlOiBFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+O1xyXG59XHJcblxyXG4vLyBUZW1wb3Jhcnkgc2NyYXRjaCBtZW1vcnkgdG8gY29tbXVuaWNhdGUgYmV0d2VlbiByZWdpc3RyYXRpb24gY2FsbHMuXHJcbmV4cG9ydCBjb25zdCBjb21wb3NpdGVSZWdpc3RyYXRpb25zOiBNYXA8bnVtYmVyLCBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvPFdpcmVUeXBlcz4+ID0gbmV3IE1hcCgpO1xyXG5cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfY29tcG9zaXRlKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9ucy5zZXQocmF3VHlwZVB0ciwge1xyXG4gICAgICAgIG5hbWVQdHIsXHJcbiAgICAgICAgX2NvbnN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm88V2lyZVR5cGVzPltcIl9jb25zdHJ1Y3RvclwiXT4oaW1wbCwgY29uc3RydWN0b3JTaWduYXR1cmUsIHJhd0NvbnN0cnVjdG9yKSxcclxuICAgICAgICBfZGVzdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvPFdpcmVUeXBlcz5bXCJfZGVzdHJ1Y3RvclwiXT4oaW1wbCwgZGVzdHJ1Y3RvclNpZ25hdHVyZSwgcmF3RGVzdHJ1Y3RvciksXHJcbiAgICAgICAgZWxlbWVudHM6IFtdLFxyXG4gICAgfSk7XHJcblxyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxJIGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdpcmVUeXBlcywgdW5rbm93bj4+KGVsZW1lbnRzOiBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXaXJlVHlwZXM+W10pOiBQcm9taXNlPElbXT4ge1xyXG4gICAgY29uc3QgZGVwZW5kZW5jeUlkcyA9IFsuLi5lbGVtZW50cy5tYXAoKGVsdCkgPT4gZWx0LmdldHRlclJldHVyblR5cGVJZCksIC4uLmVsZW1lbnRzLm1hcCgoZWx0KSA9PiBlbHQuc2V0dGVyQXJndW1lbnRUeXBlSWQpXTtcclxuXHJcbiAgICBjb25zdCBkZXBlbmRlbmNpZXMgPSBhd2FpdCBnZXRUeXBlSW5mbyguLi5kZXBlbmRlbmN5SWRzKTtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KGRlcGVuZGVuY2llcy5sZW5ndGggPT0gZWxlbWVudHMubGVuZ3RoICogMik7XHJcblxyXG4gICAgY29uc3QgZmllbGRSZWNvcmRzID0gZWxlbWVudHMubWFwKChmaWVsZCwgaSk6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXaXJlVHlwZXMsIHVua25vd24+ID0+IHtcclxuICAgICAgICBjb25zdCBnZXR0ZXJSZXR1cm5UeXBlID0gZGVwZW5kZW5jaWVzW2ldITtcclxuICAgICAgICBjb25zdCBzZXR0ZXJBcmd1bWVudFR5cGUgPSBkZXBlbmRlbmNpZXNbaSArIGVsZW1lbnRzLmxlbmd0aF0hO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkKHB0cjogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXR0ZXJSZXR1cm5UeXBlLmZyb21XaXJlVHlwZShmaWVsZC53YXNtR2V0dGVyKGZpZWxkLmdldHRlckNvbnRleHQsIHB0cikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZShwdHI6IG51bWJlciwgbzogdW5rbm93bikge1xyXG4gICAgICAgICAgICBjb25zdCByZXQgPSBzZXR0ZXJBcmd1bWVudFR5cGUudG9XaXJlVHlwZShvKTtcclxuICAgICAgICAgICAgZmllbGQud2FzbVNldHRlcihmaWVsZC5zZXR0ZXJDb250ZXh0LCBwdHIsIHJldC53aXJlVmFsdWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0O1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZ2V0dGVyUmV0dXJuVHlwZSxcclxuICAgICAgICAgICAgc2V0dGVyQXJndW1lbnRUeXBlLFxyXG4gICAgICAgICAgICByZWFkLFxyXG4gICAgICAgICAgICB3cml0ZSxcclxuICAgICAgICAgICAgLi4uZmllbGRcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZmllbGRSZWNvcmRzIGFzIElbXTtcclxufSIsICJpbXBvcnQgeyBydW5EZXN0cnVjdG9ycyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZGVzdHJ1Y3RvcnMuanNcIjtcclxuaW1wb3J0IHsgZmluYWxpemVUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9maW5hbGl6ZS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9nZXQtdGFibGUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHMsIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfY29tcG9zaXRlLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXIsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm8sIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXIsIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFdpcmVUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktb2JqZWN0LXR5cGVcclxuaW50ZXJmYWNlIEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXM+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1Q+IHsgfVxyXG5pbnRlcmZhY2UgQXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVD4sIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCwgVD4geyB9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgY29uc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3Q29uc3RydWN0b3I6IG51bWJlciwgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdEZXN0cnVjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfY29tcG9zaXRlKHRoaXMsIHJhd1R5cGVQdHIsIG5hbWVQdHIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlLCByYXdDb25zdHJ1Y3RvciwgZGVzdHJ1Y3RvclNpZ25hdHVyZSwgcmF3RGVzdHJ1Y3Rvcik7XHJcblxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUdXBsZVR5cGU6IG51bWJlciwgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsIGdldHRlclNpZ25hdHVyZTogbnVtYmVyLCBnZXR0ZXI6IG51bWJlciwgZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLCBzZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgc2V0dGVyOiBudW1iZXIsIHNldHRlckNvbnRleHQ6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9ucy5nZXQocmF3VHVwbGVUeXBlKSEuZWxlbWVudHMucHVzaCh7XHJcbiAgICAgICAgZ2V0dGVyQ29udGV4dCxcclxuICAgICAgICBzZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIGdldHRlclJldHVyblR5cGVJZCxcclxuICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZCxcclxuICAgICAgICB3YXNtR2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXI8V2lyZVR5cGVzPj4odGhpcywgZ2V0dGVyU2lnbmF0dXJlLCBnZXR0ZXIpLFxyXG4gICAgICAgIHdhc21TZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxXaXJlVHlwZXM+Pih0aGlzLCBzZXR0ZXJTaWduYXR1cmUsIHNldHRlcilcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9hcnJheSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbnN0IHJlZyA9IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMuZ2V0KHJhd1R5cGVQdHIpITtcclxuICAgIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMuZGVsZXRlKHJhd1R5cGVQdHIpO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgcmVnLm5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGF3YWl0IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzPEFycmF5RWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdpcmVUeXBlcywgdW5rbm93bj4+KHJlZy5lbGVtZW50cyk7XHJcblxyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8V2lyZVR5cGVzLCB1bmtub3duW10+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6IChwdHIpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnREZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmV0OiAodW5rbm93bltdKSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnLmVsZW1lbnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGRSZWNvcmRzW2ldLnJlYWQocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBqc1ZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIE9iamVjdC5mcmVlemUocmV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IHJldCxcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKG8pID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnREZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHRyID0gcmVnLl9jb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBmaWVsZCBvZiBmaWVsZFJlY29yZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZC53cml0ZShwdHIsIG9baV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICsraTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IG8sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkRlc3RydWN0b3JzKGVsZW1lbnREZXN0cnVjdG9ycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50cywgY29tcG9zaXRlUmVnaXN0cmF0aW9ucywgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRSwgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyLCB0eXBlIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm8gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLWNvbXBvc2l0ZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFdpcmVUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgcmVhZExhdGluMVN0cmluZyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0UmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcz4gZXh0ZW5kcyBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvPFdUPiB7XHJcbiAgICBlbGVtZW50czogU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvPFdUPltdO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzPiBleHRlbmRzIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUPiB7XHJcbiAgICAvKiogVGhlIG5hbWUgb2YgdGhpcyBmaWVsZCAqL1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU3RydWN0RmllbGRSZWdpc3RyYXRpb25JbmZvRTxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88V1Q+LCBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QsIFQ+IHsgfVxyXG5cclxuLyoqXHJcbiAqIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZpcnN0LCB0byBzdGFydCB0aGUgcmVnaXN0cmF0aW9uIG9mIGEgc3RydWN0IGFuZCBhbGwgaXRzIGZpZWxkcy4gXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3QodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZTogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0NvbnN0cnVjdG9yOiBudW1iZXIsIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3RGVzdHJ1Y3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zLnNldChyYXdUeXBlLCB7XHJcbiAgICAgICAgbmFtZVB0cixcclxuICAgICAgICBfY29uc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb248KCkgPT4gbnVtYmVyPih0aGlzLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPCgpID0+IHZvaWQ+KHRoaXMsIGRlc3RydWN0b3JTaWduYXR1cmUsIHJhd0Rlc3RydWN0b3IpLFxyXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBwZXIgZmllbGQsIGFmdGVyIGBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdGAgYW5kIGJlZm9yZSBgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3RgLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0X2ZpZWxkKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgZmllbGROYW1lOiBudW1iZXIsIGdldHRlclJldHVyblR5cGVJZDogbnVtYmVyLCBnZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgZ2V0dGVyOiBudW1iZXIsIGdldHRlckNvbnRleHQ6IG51bWJlciwgc2V0dGVyQXJndW1lbnRUeXBlSWQ6IG51bWJlciwgc2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIHNldHRlcjogbnVtYmVyLCBzZXR0ZXJDb250ZXh0OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIChjb21wb3NpdGVSZWdpc3RyYXRpb25zLmdldChyYXdUeXBlUHRyKSBhcyBTdHJ1Y3RSZWdpc3RyYXRpb25JbmZvPFdpcmVUeXBlcz4pLmVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgIG5hbWU6IHJlYWRMYXRpbjFTdHJpbmcodGhpcywgZmllbGROYW1lKSxcclxuICAgICAgICBnZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIHNldHRlckNvbnRleHQsXHJcbiAgICAgICAgZ2V0dGVyUmV0dXJuVHlwZUlkLFxyXG4gICAgICAgIHNldHRlckFyZ3VtZW50VHlwZUlkLFxyXG4gICAgICAgIHdhc21HZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXaXJlVHlwZXM+Pih0aGlzLCBnZXR0ZXJTaWduYXR1cmUsIGdldHRlciksXHJcbiAgICAgICAgd2FzbVNldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFdpcmVUeXBlcz4+KHRoaXMsIHNldHRlclNpZ25hdHVyZSwgc2V0dGVyKSxcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsbGVkIGFmdGVyIGFsbCBvdGhlciBvYmplY3QgcmVnaXN0cmF0aW9uIGZ1bmN0aW9ucyBhcmUgY2FsbGVkOyB0aGlzIGNvbnRhaW5zIHRoZSBhY3R1YWwgcmVnaXN0cmF0aW9uIGNvZGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb25zdCByZWcgPSBjb21wb3NpdGVSZWdpc3RyYXRpb25zLmdldChyYXdUeXBlUHRyKSE7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zLmRlbGV0ZShyYXdUeXBlUHRyKTtcclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIHJlZy5uYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBmaWVsZFJlY29yZHMgPSBhd2FpdCBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50czxTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm9FPFdpcmVUeXBlcywgdW5rbm93bj4+KHJlZy5lbGVtZW50cyk7XHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZSh0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogcmF3VHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAocHRyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50RGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdID0gW11cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJldCA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVnLmVsZW1lbnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmllbGQgPSBmaWVsZFJlY29yZHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGRSZWNvcmRzW2ldLnJlYWQocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocmV0LCBmaWVsZC5uYW1lLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBqc1ZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBPYmplY3QuZnJlZXplKHJldCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiByZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkRlc3RydWN0b3JzKGVsZW1lbnREZXN0cnVjdG9ycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZy5fZGVzdHJ1Y3RvcihwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdHIgPSByZWcuX2NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50RGVzdHJ1Y3RvcnM6ICgoKSA9PiB2b2lkKVtdID0gW11cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZmllbGQgb2YgZmllbGRSZWNvcmRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gZmllbGQud3JpdGUocHRyLCBvW2ZpZWxkLm5hbWUgYXMgbmV2ZXJdKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50RGVzdHJ1Y3RvcnMucHVzaCgoKSA9PiBzdGFja0Rlc3RydWN0b3I/Lihqc1ZhbHVlLCB3aXJlVmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogbyxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCBuYW1lID0+IHtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCB1bmRlZmluZWQ+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6ICgpID0+ICh7IGpzVmFsdWU6IHVuZGVmaW5lZCEsIHdpcmVWYWx1ZTogdW5kZWZpbmVkISB9KSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKCkgPT4gKHsganNWYWx1ZTogdW5kZWZpbmVkISwgd2lyZVZhbHVlOiB1bmRlZmluZWQhIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KVxyXG5cclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWVtb3J5R3Jvd3RoRXZlbnREZXRhaWwge1xyXG4gICAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lbW9yeUdyb3d0aEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8TWVtb3J5R3Jvd3RoRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKF9pbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBpbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJNZW1vcnlHcm93dGhFdmVudFwiLCB7IGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHsgaW5kZXggfSB9KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBpbmRleDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICB0aGlzLmNhY2hlZE1lbW9yeVZpZXcgPSBuZXcgRGF0YVZpZXcodGhpcy5leHBvcnRzLm1lbW9yeS5idWZmZXIpO1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBNZW1vcnlHcm93dGhFdmVudCh0aGlzLCBpbmRleCkpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTZWdmYXVsdEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoXCJTZWdtZW50YXRpb24gZmF1bHRcIik7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIFVzZWQgYnkgU0FGRV9IRUFQXHJcbmV4cG9ydCBmdW5jdGlvbiBzZWdmYXVsdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtKTogbmV2ZXIge1xyXG4gICAgdGhyb3cgbmV3IFNlZ2ZhdWx0RXJyb3IoKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBFbXNjcmlwdGVuRXhjZXB0aW9uIH0gZnJvbSBcIi4uL2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IHV0ZjhUb1N0cmluZ1ogfSBmcm9tIFwiLi9zdHJpbmcuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhjZXB0aW9uTWVzc2FnZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBleDogRW1zY3JpcHRlbkV4Y2VwdGlvbik6IFtzdHJpbmcsIHN0cmluZ10ge1xyXG4gICAgY29uc3QgcHRyID0gZ2V0Q3BwRXhjZXB0aW9uVGhyb3duT2JqZWN0RnJvbVdlYkFzc2VtYmx5RXhjZXB0aW9uKGltcGwsIGV4KTtcclxuICAgIHJldHVybiBnZXRFeGNlcHRpb25NZXNzYWdlQ29tbW9uKGltcGwsIHB0cik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENwcEV4Y2VwdGlvblRocm93bk9iamVjdEZyb21XZWJBc3NlbWJseUV4Y2VwdGlvbihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBleDogRW1zY3JpcHRlbkV4Y2VwdGlvbikge1xyXG4gICAgLy8gSW4gV2FzbSBFSCwgdGhlIHZhbHVlIGV4dHJhY3RlZCBmcm9tIFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiBpcyBhIHBvaW50ZXJcclxuICAgIC8vIHRvIHRoZSB1bndpbmQgaGVhZGVyLiBDb252ZXJ0IGl0IHRvIHRoZSBhY3R1YWwgdGhyb3duIHZhbHVlLlxyXG4gICAgY29uc3QgdW53aW5kX2hlYWRlcjogbnVtYmVyID0gZXguZ2V0QXJnKChpbXBsLmV4cG9ydHMpLl9fY3BwX2V4Y2VwdGlvbiwgMCk7XHJcbiAgICByZXR1cm4gKGltcGwuZXhwb3J0cykuX190aHJvd25fb2JqZWN0X2Zyb21fdW53aW5kX2V4Y2VwdGlvbih1bndpbmRfaGVhZGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3RhY2tTYXZlKGltcGw6IEluc3RhbnRpYXRlZFdhc20pIHtcclxuICAgIHJldHVybiBpbXBsLmV4cG9ydHMuZW1zY3JpcHRlbl9zdGFja19nZXRfY3VycmVudCgpO1xyXG59XHJcbmZ1bmN0aW9uIHN0YWNrQWxsb2MoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgc2l6ZTogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gaW1wbC5leHBvcnRzLl9lbXNjcmlwdGVuX3N0YWNrX2FsbG9jKHNpemUpO1xyXG59XHJcbmZ1bmN0aW9uIHN0YWNrUmVzdG9yZShpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBzdGFja1BvaW50ZXI6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIGltcGwuZXhwb3J0cy5fZW1zY3JpcHRlbl9zdGFja19yZXN0b3JlKHN0YWNrUG9pbnRlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEV4Y2VwdGlvbk1lc3NhZ2VDb21tb24oaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBbc3RyaW5nLCBzdHJpbmddIHtcclxuICAgIGNvbnN0IHNwID0gc3RhY2tTYXZlKGltcGwpO1xyXG4gICAgY29uc3QgdHlwZV9hZGRyX2FkZHIgPSBzdGFja0FsbG9jKGltcGwsIGdldFBvaW50ZXJTaXplKGltcGwpKTtcclxuICAgIGNvbnN0IG1lc3NhZ2VfYWRkcl9hZGRyID0gc3RhY2tBbGxvYyhpbXBsLCBnZXRQb2ludGVyU2l6ZShpbXBsKSk7XHJcbiAgICBpbXBsLmV4cG9ydHMuX19nZXRfZXhjZXB0aW9uX21lc3NhZ2UocHRyLCB0eXBlX2FkZHJfYWRkciwgbWVzc2FnZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgdHlwZV9hZGRyID0gcmVhZFBvaW50ZXIoaW1wbCwgdHlwZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgbWVzc2FnZV9hZGRyID0gcmVhZFBvaW50ZXIoaW1wbCwgbWVzc2FnZV9hZGRyX2FkZHIpO1xyXG4gICAgY29uc3QgdHlwZSA9IHV0ZjhUb1N0cmluZ1ooaW1wbCwgdHlwZV9hZGRyKTtcclxuICAgIGltcGwuZXhwb3J0cy5mcmVlKHR5cGVfYWRkcik7XHJcbiAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XHJcbiAgICBpZiAobWVzc2FnZV9hZGRyKSB7XHJcbiAgICAgICAgbWVzc2FnZSA9IHV0ZjhUb1N0cmluZ1ooaW1wbCwgbWVzc2FnZV9hZGRyKTtcclxuICAgICAgICBpbXBsLmV4cG9ydHMuZnJlZShtZXNzYWdlX2FkZHIpO1xyXG4gICAgfVxyXG4gICAgc3RhY2tSZXN0b3JlKGltcGwsIHNwKTtcclxuICAgIHJldHVybiBbdHlwZSwgbWVzc2FnZV07XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBnZXRFeGNlcHRpb25NZXNzYWdlIH0gZnJvbSBcIi4uL19wcml2YXRlL2V4Y2VwdGlvbi5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWJBc3NlbWJseUV4Y2VwdGlvbkV2ZW50RGV0YWlsIHsgZXhjZXB0aW9uOiBXZWJBc3NlbWJseS5FeGNlcHRpb24gfVxyXG5cclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcclxuZGVjbGFyZSBuYW1lc3BhY2UgV2ViQXNzZW1ibHkge1xyXG4gICAgY2xhc3MgRXhjZXB0aW9uIHtcclxuICAgICAgICBjb25zdHJ1Y3Rvcih0YWc6IG51bWJlciwgcGF5bG9hZDogbnVtYmVyW10sIG9wdGlvbnM/OiB7IHRyYWNlU3RhY2s/OiBib29sZWFuIH0pO1xyXG4gICAgICAgIGdldEFyZyhleGNlcHRpb25UYWc6IG51bWJlciwgaW5kZXg6IG51bWJlcik6IG51bWJlcjtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbXNjcmlwdGVuRXhjZXB0aW9uIGV4dGVuZHMgV2ViQXNzZW1ibHkuRXhjZXB0aW9uIHtcclxuICAgIG1lc3NhZ2U6IFtzdHJpbmcsIHN0cmluZ107XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Rocm93X2V4Y2VwdGlvbl93aXRoX3N0YWNrX3RyYWNlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGV4OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbnN0IHQgPSBuZXcgV2ViQXNzZW1ibHkuRXhjZXB0aW9uKCh0aGlzLmV4cG9ydHMpLl9fY3BwX2V4Y2VwdGlvbiwgW2V4XSwgeyB0cmFjZVN0YWNrOiB0cnVlIH0pIGFzIEVtc2NyaXB0ZW5FeGNlcHRpb247XHJcbiAgICB0Lm1lc3NhZ2UgPSBnZXRFeGNlcHRpb25NZXNzYWdlKHRoaXMsIHQpO1xyXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9vbmx5LXRocm93LWVycm9yXHJcbiAgICB0aHJvdyB0O1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfdHpzZXRfanModGhpczogSW5zdGFudGlhdGVkV2FzbSwgX3RpbWV6b25lOiBudW1iZXIsIF9kYXlsaWdodDogbnVtYmVyLCBfc3RkX25hbWU6IG51bWJlciwgX2RzdF9uYW1lOiBudW1iZXIpOiB2b2lkIHtcclxuICAvLyBUT0RPXHJcbn0iLCAiXHJcbi8vIFRoZXNlIGNvbnN0YW50cyBhcmVuJ3QgZG9uZSBhcyBhbiBlbnVtIGJlY2F1c2UgOTUlIG9mIHRoZW0gYXJlIG5ldmVyIHJlZmVyZW5jZWQsXHJcbi8vIGJ1dCB0aGV5J2QgYWxtb3N0IGNlcnRhaW5seSBuZXZlciBiZSB0cmVlLXNoYWtlbiBvdXQuXHJcblxyXG4vKiogTm8gZXJyb3Igb2NjdXJyZWQuIFN5c3RlbSBjYWxsIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuICovICAgZXhwb3J0IGNvbnN0IEVTVUNDRVNTID0gMDtcclxuLyoqIEFyZ3VtZW50IGxpc3QgdG9vIGxvbmcuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFMkJJRyA9IDE7XHJcbi8qKiBQZXJtaXNzaW9uIGRlbmllZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUFDQ0VTID0gMjtcclxuLyoqIEFkZHJlc3MgaW4gdXNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUREUklOVVNFID0gMztcclxuLyoqIEFkZHJlc3Mgbm90IGF2YWlsYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUREUk5PVEFWQUlMID0gNDtcclxuLyoqIEFkZHJlc3MgZmFtaWx5IG5vdCBzdXBwb3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUZOT1NVUFBPUlQgPSA1O1xyXG4vKiogUmVzb3VyY2UgdW5hdmFpbGFibGUsIG9yIG9wZXJhdGlvbiB3b3VsZCBibG9jay4gKi8gICAgICAgICAgZXhwb3J0IGNvbnN0IEVBR0FJTiA9IDY7XHJcbi8qKiBDb25uZWN0aW9uIGFscmVhZHkgaW4gcHJvZ3Jlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUFMUkVBRFkgPSA3O1xyXG4vKiogQmFkIGZpbGUgZGVzY3JpcHRvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCQURGID0gODtcclxuLyoqIEJhZCBtZXNzYWdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQkFETVNHID0gOTtcclxuLyoqIERldmljZSBvciByZXNvdXJjZSBidXN5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQlVTWSA9IDEwO1xyXG4vKiogT3BlcmF0aW9uIGNhbmNlbGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDQU5DRUxFRCA9IDExO1xyXG4vKiogTm8gY2hpbGQgcHJvY2Vzc2VzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDSElMRCA9IDEyO1xyXG4vKiogQ29ubmVjdGlvbiBhYm9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDT05OQUJPUlRFRCA9IDEzO1xyXG4vKiogQ29ubmVjdGlvbiByZWZ1c2VkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDT05OUkVGVVNFRCA9IDE0O1xyXG4vKiogQ29ubmVjdGlvbiByZXNldC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVDT05OUkVTRVQgPSAxNTtcclxuLyoqIFJlc291cmNlIGRlYWRsb2NrIHdvdWxkIG9jY3VyLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFREVBRExLID0gMTY7XHJcbi8qKiBEZXN0aW5hdGlvbiBhZGRyZXNzIHJlcXVpcmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRURFU1RBRERSUkVRID0gMTc7XHJcbi8qKiBNYXRoZW1hdGljcyBhcmd1bWVudCBvdXQgb2YgZG9tYWluIG9mIGZ1bmN0aW9uLiAqLyAgICAgICAgICBleHBvcnQgY29uc3QgRURPTSA9IDE4O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVEUVVPVCA9IDE5O1xyXG4vKiogRmlsZSBleGlzdHMuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVFWElTVCA9IDIwO1xyXG4vKiogQmFkIGFkZHJlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVGQVVMVCA9IDIxO1xyXG4vKiogRmlsZSB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVGQklHID0gMjI7XHJcbi8qKiBIb3N0IGlzIHVucmVhY2hhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUhPU1RVTlJFQUNIID0gMjM7XHJcbi8qKiBJZGVudGlmaWVyIHJlbW92ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlEUk0gPSAyNDtcclxuLyoqIElsbGVnYWwgYnl0ZSBzZXF1ZW5jZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSUxTRVEgPSAyNTtcclxuLyoqIE9wZXJhdGlvbiBpbiBwcm9ncmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU5QUk9HUkVTUyA9IDI2O1xyXG4vKiogSW50ZXJydXB0ZWQgZnVuY3Rpb24uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTlRSID0gMjc7XHJcbi8qKiBJbnZhbGlkIGFyZ3VtZW50LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlOVkFMID0gMjg7XHJcbi8qKiBJL08gZXJyb3IuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlPID0gMjk7XHJcbi8qKiBTb2NrZXQgaXMgY29ubmVjdGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlTQ09OTiA9IDMwO1xyXG4vKiogSXMgYSBkaXJlY3RvcnkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJU0RJUiA9IDMxO1xyXG4vKiogVG9vIG1hbnkgbGV2ZWxzIG9mIHN5bWJvbGljIGxpbmtzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVMT09QID0gMzI7XHJcbi8qKiBGaWxlIGRlc2NyaXB0b3IgdmFsdWUgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1GSUxFID0gMzM7XHJcbi8qKiBUb28gbWFueSBsaW5rcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1MSU5LID0gMzQ7XHJcbi8qKiBNZXNzYWdlIHRvbyBsYXJnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU1TR1NJWkUgPSAzNTtcclxuLyoqIFJlc2VydmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTVVMVElIT1AgPSAzNjtcclxuLyoqIEZpbGVuYW1lIHRvbyBsb25nLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkFNRVRPT0xPTkcgPSAzNztcclxuLyoqIE5ldHdvcmsgaXMgZG93bi4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkVURE9XTiA9IDM4O1xyXG4vKiogQ29ubmVjdGlvbiBhYm9ydGVkIGJ5IG5ldHdvcmsuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORVRSRVNFVCA9IDM5O1xyXG4vKiogTmV0d29yayB1bnJlYWNoYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORVRVTlJFQUNIID0gNDA7XHJcbi8qKiBUb28gbWFueSBmaWxlcyBvcGVuIGluIHN5c3RlbS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5GSUxFID0gNDE7XHJcbi8qKiBObyBidWZmZXIgc3BhY2UgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PQlVGUyA9IDQyO1xyXG4vKiogTm8gc3VjaCBkZXZpY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0RFViA9IDQzO1xyXG4vKiogTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0VOVCA9IDQ0O1xyXG4vKiogRXhlY3V0YWJsZSBmaWxlIGZvcm1hdCBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0VYRUMgPSA0NTtcclxuLyoqIE5vIGxvY2tzIGF2YWlsYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9MQ0sgPSA0NjtcclxuLyoqIFJlc2VydmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9MSU5LID0gNDc7XHJcbi8qKiBOb3QgZW5vdWdoIHNwYWNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PTUVNID0gNDg7XHJcbi8qKiBObyBtZXNzYWdlIG9mIHRoZSBkZXNpcmVkIHR5cGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PTVNHID0gNDk7XHJcbi8qKiBQcm90b2NvbCBub3QgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PUFJPVE9PUFQgPSA1MDtcclxuLyoqIE5vIHNwYWNlIGxlZnQgb24gZGV2aWNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9TUEMgPSA1MTtcclxuLyoqIEZ1bmN0aW9uIG5vdCBzdXBwb3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9TWVMgPSA1MjtcclxuLyoqIFRoZSBzb2NrZXQgaXMgbm90IGNvbm5lY3RlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UQ09OTiA9IDUzO1xyXG4vKiogTm90IGEgZGlyZWN0b3J5IG9yIGEgc3ltYm9saWMgbGluayB0byBhIGRpcmVjdG9yeS4gKi8gICAgICAgZXhwb3J0IGNvbnN0IEVOT1RESVIgPSA1NDtcclxuLyoqIERpcmVjdG9yeSBub3QgZW1wdHkuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9URU1QVFkgPSA1NTtcclxuLyoqIFN0YXRlIG5vdCByZWNvdmVyYWJsZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UUkVDT1ZFUkFCTEUgPSA1NjtcclxuLyoqIE5vdCBhIHNvY2tldC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UU09DSyA9IDU3O1xyXG4vKiogTm90IHN1cHBvcnRlZCwgb3Igb3BlcmF0aW9uIG5vdCBzdXBwb3J0ZWQgb24gc29ja2V0LiAqLyAgICAgZXhwb3J0IGNvbnN0IEVOT1RTVVAgPSA1ODtcclxuLyoqIEluYXBwcm9wcmlhdGUgSS9PIGNvbnRyb2wgb3BlcmF0aW9uLiAqLyAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UVFkgPSA1OTtcclxuLyoqIE5vIHN1Y2ggZGV2aWNlIG9yIGFkZHJlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTlhJTyA9IDYwO1xyXG4vKiogVmFsdWUgdG9vIGxhcmdlIHRvIGJlIHN0b3JlZCBpbiBkYXRhIHR5cGUuICovICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVPVkVSRkxPVyA9IDYxO1xyXG4vKiogUHJldmlvdXMgb3duZXIgZGllZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVPV05FUkRFQUQgPSA2MjtcclxuLyoqIE9wZXJhdGlvbiBub3QgcGVybWl0dGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUEVSTSA9IDYzO1xyXG4vKiogQnJva2VuIHBpcGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQSVBFID0gNjQ7XHJcbi8qKiBQcm90b2NvbCBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBST1RPID0gNjU7XHJcbi8qKiBQcm90b2NvbCBub3Qgc3VwcG9ydGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBST1RPTk9TVVBQT1JUID0gNjY7XHJcbi8qKiBQcm90b2NvbCB3cm9uZyB0eXBlIGZvciBzb2NrZXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBST1RPVFlQRSA9IDY3O1xyXG4vKiogUmVzdWx0IHRvbyBsYXJnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVSQU5HRSA9IDY4O1xyXG4vKiogUmVhZC1vbmx5IGZpbGUgc3lzdGVtLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVST0ZTID0gNjk7XHJcbi8qKiBJbnZhbGlkIHNlZWsuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVNQSVBFID0gNzA7XHJcbi8qKiBObyBzdWNoIHByb2Nlc3MuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVNSQ0ggPSA3MTtcclxuLyoqIFJlc2VydmVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1RBTEUgPSA3MjtcclxuLyoqIENvbm5lY3Rpb24gdGltZWQgb3V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFVElNRURPVVQgPSA3MztcclxuLyoqIFRleHQgZmlsZSBidXN5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFVFhUQlNZID0gNzQ7XHJcbi8qKiBDcm9zcy1kZXZpY2UgbGluay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVhERVYgPSA3NTtcclxuLyoqIEV4dGVuc2lvbjogQ2FwYWJpbGl0aWVzIGluc3VmZmljaWVudC4gKi8gICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9UQ0FQQUJMRSA9IDc2OyIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVVpbnQ2NChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHZhbHVlOiBiaWdpbnQpOiB2b2lkIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuc2V0QmlnVWludDY0KHB0ciwgdmFsdWUsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBFSU5WQUwsIEVOT1NZUywgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50NjQgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50NjQuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZW51bSBDbG9ja0lkIHtcclxuICAgIFJFQUxUSU1FID0gMCxcclxuICAgIE1PTk9UT05JQyA9IDEsXHJcbiAgICBQUk9DRVNTX0NQVVRJTUVfSUQgPSAyLFxyXG4gICAgVEhSRUFEX0NQVVRJTUVfSUQgPSAzXHJcbn1cclxuXHJcbmNvbnN0IHAgPSAoZ2xvYmFsVGhpcy5wZXJmb3JtYW5jZSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2xvY2tfdGltZV9nZXQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgY2xrX2lkOiBudW1iZXIsIF9wcmVjaXNpb246IG51bWJlciwgb3V0UHRyOiBudW1iZXIpOiBudW1iZXIge1xyXG5cclxuICAgIGxldCBub3dNczogbnVtYmVyO1xyXG4gICAgc3dpdGNoIChjbGtfaWQpIHtcclxuICAgICAgICBjYXNlICtDbG9ja0lkLlJFQUxUSU1FOlxyXG4gICAgICAgICAgICBub3dNcyA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgK0Nsb2NrSWQuTU9OT1RPTklDOlxyXG4gICAgICAgICAgICBpZiAocCA9PSBudWxsKSByZXR1cm4gRU5PU1lTOyAgIC8vIFRPRE86IFBvc3NpYmxlIHRvIGJlIG51bGwgaW4gV29ya2xldHM/XHJcbiAgICAgICAgICAgIG5vd01zID0gcC5ub3coKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSArQ2xvY2tJZC5QUk9DRVNTX0NQVVRJTUVfSUQ6XHJcbiAgICAgICAgY2FzZSArQ2xvY2tJZC5USFJFQURfQ1BVVElNRV9JRDpcclxuICAgICAgICAgICAgcmV0dXJuIEVOT1NZUztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICByZXR1cm4gRUlOVkFMO1xyXG4gICAgfVxyXG4gICAgY29uc3Qgbm93TnMgPSBCaWdJbnQoTWF0aC5yb3VuZChub3dNcyAqIDEwMDAgKiAxMDAwKSk7XHJcbiAgICB3cml0ZVVpbnQ2NCh0aGlzLCBvdXRQdHIsIG5vd05zKTtcclxuXHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn0iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVudmlyb25HZXRFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIEEgbGlzdCBvZiBlbnZpcm9ubWVudCB2YXJpYWJsZSB0dXBsZXM7IGEga2V5IGFuZCBhIHZhbHVlLiBcclxuICAgICAqIFRoaXMgYXJyYXkgaXMgbXV0YWJsZTsgd2hlbiBldmVudCBkaXNwYXRjaCBlbmRzLCB0aGUgZmluYWwgXHJcbiAgICAgKiB2YWx1ZSBvZiB0aGlzIGFycmF5IHdpbGwgYmUgdXNlZCB0byBwb3B1bGF0ZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXHJcbiAgICAgKi9cclxuICAgIHN0cmluZ3M6IFtrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZ11bXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEVudmlyb25HZXRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEVudmlyb25HZXRFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoXCJlbnZpcm9uX2dldFwiLCB7IGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHsgc3RyaW5nczogW10gfSB9KTtcclxuICAgIH1cclxufVxyXG5cclxuY29uc3QgRW52aXJvbkluZm9TeW1ib2wgPSBTeW1ib2woKTtcclxuZXhwb3J0IGludGVyZmFjZSBFbnZpcm9uSW5mbyB7XHJcbiAgICBidWZmZXJTaXplOiBudW1iZXI7XHJcbiAgICBzdHJpbmdzOiBVaW50OEFycmF5W107XHJcbn1cclxuaW50ZXJmYWNlIFdpdGhFbnZpcm9uSW5mbyB7XHJcbiAgICBbRW52aXJvbkluZm9TeW1ib2xdOiBFbnZpcm9uSW5mbztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb24oaW1wbDogSW5zdGFudGlhdGVkV2FzbSk6IEVudmlyb25JbmZvIHtcclxuICAgIHJldHVybiAoaW1wbCBhcyB1bmtub3duIGFzIFdpdGhFbnZpcm9uSW5mbylbRW52aXJvbkluZm9TeW1ib2xdID8/PSAoKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHQgPSBuZXcgVGV4dEVuY29kZXIoKTtcclxuICAgICAgICBjb25zdCBlID0gbmV3IEVudmlyb25HZXRFdmVudCgpO1xyXG4gICAgICAgIGltcGwuZGlzcGF0Y2hFdmVudChlKTtcclxuICAgICAgICBjb25zdCBzdHJpbmdzID0gZS5kZXRhaWwuc3RyaW5ncztcclxuICAgICAgICBsZXQgYnVmZmVyU2l6ZSA9IDA7XHJcbiAgICAgICAgY29uc3QgYnVmZmVyczogVWludDhBcnJheVtdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2Ygc3RyaW5ncykge1xyXG4gICAgICAgICAgICBjb25zdCB1dGY4ID0gdC5lbmNvZGUoYCR7a2V5fT0ke3ZhbHVlfVxceDAwYCk7XHJcbiAgICAgICAgICAgIGJ1ZmZlclNpemUgKz0gdXRmOC5sZW5ndGggKyAxO1xyXG4gICAgICAgICAgICBidWZmZXJzLnB1c2godXRmOCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IGJ1ZmZlclNpemUsIHN0cmluZ3M6IGJ1ZmZlcnMgfVxyXG4gICAgfSkoKVxyXG5cclxufVxyXG5cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29weVRvV2FzbShpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgZGVzdGluYXRpb25BZGRyZXNzOiBudW1iZXIsIHNvdXJjZURhdGE6IFVpbnQ4QXJyYXkgfCBJbnQ4QXJyYXkpOiB2b2lkIHtcclxuICAgIChuZXcgVWludDhBcnJheShpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LmJ1ZmZlciwgZGVzdGluYXRpb25BZGRyZXNzLCBzb3VyY2VEYXRhLmJ5dGVMZW5ndGgpKS5zZXQoc291cmNlRGF0YSk7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBzZXRQb2ludGVyIH0gZnJvbSBcIi4vcG9pbnRlci5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgYHdyaXRlVWludDMyYCwgYnV0IHR5cGVkIGZvciBwb2ludGVycywgYW5kIGZ1dHVyZS1wcm9vZnMgYWdhaW5zdCA2NC1iaXQgYXJjaGl0ZWN0dXJlcy5cclxuICogXHJcbiAqIFRoaXMgaXMgKm5vdCogdGhlIHNhbWUgYXMgZGVyZWZlcmVuY2luZyBhIHBvaW50ZXIuIFRoaXMgaXMgYWJvdXQgd3JpdGluZyBhIHBvaW50ZXIncyBudW1lcmljYWwgdmFsdWUgdG8gYSBzcGVjaWZpZWQgYWRkcmVzcyBpbiBtZW1vcnkuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVQb2ludGVyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3W3NldFBvaW50ZXJdKHB0ciwgdmFsdWUgYXMgbmV2ZXIsIHRydWUpOyB9XHJcbiIsICJpbXBvcnQgeyBnZXRFbnZpcm9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2Vudmlyb24uanNcIjtcclxuaW1wb3J0IHsgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHsgY29weVRvV2FzbSB9IGZyb20gXCIuLi91dGlsL2NvcHktdG8td2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVQb2ludGVyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVudmlyb25fZ2V0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGVudmlyb246IG51bWJlciwgZW52aXJvbkJ1ZmZlcjogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHsgc3RyaW5ncyB9ID0gZ2V0RW52aXJvbih0aGlzKTtcclxuXHJcbiAgICBsZXQgY3VycmVudEJ1ZmZlclB0ciA9IGVudmlyb25CdWZmZXI7XHJcbiAgICBsZXQgY3VycmVudEVudmlyb25QdHIgPSBlbnZpcm9uO1xyXG4gICAgZm9yIChjb25zdCBzdHJpbmcgb2Ygc3RyaW5ncykge1xyXG4gICAgICAgIHdyaXRlUG9pbnRlcih0aGlzLCBjdXJyZW50RW52aXJvblB0ciwgY3VycmVudEJ1ZmZlclB0cik7XHJcbiAgICAgICAgY29weVRvV2FzbSh0aGlzLCBjdXJyZW50QnVmZmVyUHRyLCBzdHJpbmcpO1xyXG4gICAgICAgIGN1cnJlbnRCdWZmZXJQdHIgKz0gc3RyaW5nLmJ5dGVMZW5ndGggKyAxO1xyXG4gICAgICAgIGN1cnJlbnRFbnZpcm9uUHRyICs9IGdldFBvaW50ZXJTaXplKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufVxyXG4iLCAiaW1wb3J0IHsgZ2V0RW52aXJvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbnZpcm9uLmpzXCI7XHJcbmltcG9ydCB7IEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVudmlyb25fc2l6ZXNfZ2V0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGVudmlyb25Db3VudE91dHB1dDogbnVtYmVyLCBlbnZpcm9uU2l6ZU91dHB1dDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHsgYnVmZmVyU2l6ZSwgc3RyaW5ncyB9ID0gZ2V0RW52aXJvbih0aGlzKTtcclxuXHJcbiAgICB3cml0ZVVpbnQzMih0aGlzLCBlbnZpcm9uQ291bnRPdXRwdXQsIHN0cmluZ3MubGVuZ3RoKTtcclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25TaXplT3V0cHV0LCBidWZmZXJTaXplKTtcclxuXHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yQ2xvc2VFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqIFxyXG4gICAgICogSXQncyBtb3JlLW9yLWxlc3MgW3VuaXZlcnNhbGx5IGV4cGVjdGVkXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdGFuZGFyZF9zdHJlYW0pIHRoYXQgMCBpcyBmb3IgaW5wdXQsIDEgZm9yIG91dHB1dCwgYW5kIDIgZm9yIGVycm9ycyxcclxuICAgICAqIHNvIHlvdSBjYW4gbWFwIDEgdG8gYGNvbnNvbGUubG9nYCBhbmQgMiB0byBgY29uc29sZS5lcnJvcmAuIFxyXG4gICAgICovXHJcbiAgICByZWFkb25seSBmaWxlRGVzY3JpcHRvcjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9jbG9zZVwiLCB7IGNhbmNlbGFibGU6IHRydWUsIGRldGFpbDogeyBmaWxlRGVzY3JpcHRvciB9IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogUE9TSVggY2xvc2UgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX2Nsb3NlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvcik6IHZvaWQge1xyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50KGZkKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgLy8gVE9ETyhtYXliZT8pOiBkZWZhdWx0IGJlaGF2aW9yXHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkUG9pbnRlciB9IGZyb20gXCIuLi91dGlsL3JlYWQtcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW92ZWMge1xyXG4gICAgYnVmZmVyU3RhcnQ6IG51bWJlcjtcclxuICAgIGJ1ZmZlckxlbmd0aDogbnVtYmVyO1xyXG4gICAgdWludDg6IFVpbnQ4QXJyYXk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShpbmZvOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IElvdmVjIHtcclxuICAgIGNvbnN0IGJ1ZmZlclN0YXJ0ID0gcmVhZFBvaW50ZXIoaW5mbywgcHRyKTtcclxuICAgIGNvbnN0IGJ1ZmZlckxlbmd0aCA9IHJlYWRVaW50MzIoaW5mbywgcHRyICsgZ2V0UG9pbnRlclNpemUoaW5mbykpO1xyXG4gICAgY29uc3QgdWludDggPSBuZXcgVWludDhBcnJheShpbmZvLmNhY2hlZE1lbW9yeVZpZXcuYnVmZmVyLCBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYnVmZmVyU3RhcnQsXHJcbiAgICAgICAgYnVmZmVyTGVuZ3RoLFxyXG4gICAgICAgIHVpbnQ4XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUFycmF5KGluZm86IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyLCBjb3VudDogbnVtYmVyKTogSW92ZWNbXSB7XHJcbiAgICBjb25zdCBzaXplb2ZTdHJ1Y3QgPSBnZXRQb2ludGVyU2l6ZShpbmZvKSArIDQ7XHJcbiAgICBjb25zdCByZXQ6IElvdmVjW10gPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7ICsraSkge1xyXG4gICAgICAgIHJldC5wdXNoKHBhcnNlKGluZm8sIHB0ciArIChpICogc2l6ZW9mU3RydWN0KSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJldDtcclxufVxyXG4iLCAiaW1wb3J0IHsgcGFyc2VBcnJheSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9pb3ZlYy5qc1wiO1xyXG5pbXBvcnQgeyBFQkFERiwgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVNpemVUIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtc2l6ZXQuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JSZWFkRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKiBcclxuICAgICAqIEl0J3MgbW9yZS1vci1sZXNzIFt1bml2ZXJzYWxseSBleHBlY3RlZF0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3RhbmRhcmRfc3RyZWFtKSB0aGF0IDAgaXMgZm9yIGlucHV0LCAxIGZvciBvdXRwdXQsIGFuZCAyIGZvciBlcnJvcnMsXHJcbiAgICAgKiBzbyB5b3UgY2FuIG1hcCAxIHRvIGBjb25zb2xlLmxvZ2AgYW5kIDIgdG8gYGNvbnNvbGUuZXJyb3JgLCB3aXRoIG90aGVycyBoYW5kbGVkIHdpdGggdGhlIHZhcmlvdXMgZmlsZS1vcGVuaW5nIGNhbGxzLiBcclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkYXRhIHlvdSB3YW50IHRvIHdyaXRlIHRvIHRoaXMgZmlsZURlc2NyaXB0b3IgaWYgYHByZXZlbnREZWZhdWx0YCBpcyBjYWxsZWQuXHJcbiAgICAgKiBcclxuICAgICAqIElmIGl0IGlzIGxvbmdlciB0aGFuIHRoZSBidWZmZXJzIGFsbG93LCB0aGVuIHRoZSBuZXh0IHRpbWVcclxuICAgICAqIHRoaXMgZXZlbnQgaXMgZGlzcGF0Y2hlZCwgYGRhdGFgIHdpbGwgYmUgcHJlLWZpbGxlZCB3aXRoXHJcbiAgICAgKiB3aGF0ZXZlciB3YXMgbGVmdG92ZXIuIFlvdSBjYW4gdGhlbiBhZGQgbW9yZSBpZiB5b3Ugd2FudC5cclxuICAgICAqIFxyXG4gICAgICogT25jZSBhbGwgb2YgYGRhdGFgIGhhcyBiZWVuIHJlYWQgKGtlZXBpbmcgaW4gbWluZCBob3cgbmV3bGluZXNcclxuICAgICAqIGNhbiBcInBhdXNlXCIgdGhlIHJlYWRpbmcgb2YgYGRhdGFgIHVudGlsIHNvbWUgdGltZSBpbiB0aGUgZnV0dXJlXHJcbiAgICAgKiBhbmQgb3RoZXIgZm9ybWF0dGVkIGlucHV0IHF1aXJrcyksIGluY2x1ZGluZyBpZiBubyBkYXRhIGlzIGV2ZXJcclxuICAgICAqIGFkZGVkIGluIHRoZSBmaXJzdCBwbGFjZSwgaXQncyB1bmRlcnN0b29kIHRvIGJlIEVPRi5cclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgZGF0YTogKFVpbnQ4QXJyYXkgfCBzdHJpbmcpW107XHJcbn1cclxuXHJcblxyXG5jb25zdCBGZFJlYWRJbmZvU3ltYm9sID0gU3ltYm9sKCk7XHJcbmludGVyZmFjZSBGZFJlYWRJbmZvIHtcclxuICAgIGRhdGE6IChVaW50OEFycmF5IHwgc3RyaW5nKVtdO1xyXG59XHJcbmludGVyZmFjZSBXaXRoRmRSZWFkSW5mbyB7XHJcbiAgICBbRmRSZWFkSW5mb1N5bWJvbF06IEZkUmVhZEluZm87XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50RGV0YWlsPiB7XHJcblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIsIGRhdGE6IChVaW50OEFycmF5IHwgc3RyaW5nKVtdKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9yZWFkXCIsIHtcclxuICAgICAgICAgICAgYnViYmxlczogZmFsc2UsXHJcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIGRldGFpbDoge1xyXG4gICAgICAgICAgICAgICAgZmlsZURlc2NyaXB0b3IsXHJcbiAgICAgICAgICAgICAgICBkYXRhXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqIFBPU0lYIHJlYWR2ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmZF9yZWFkKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgbGV0IG5Xcml0dGVuID0gMDtcclxuICAgIGNvbnN0IGJ1ZmZlcnMgPSBwYXJzZUFycmF5KHRoaXMsIGlvdiwgaW92Y250KTtcclxuXHJcbiAgICBjb25zdCB0aGlzMiA9ICgodGhpcyBhcyB1bmtub3duIGFzIFdpdGhGZFJlYWRJbmZvKVtGZFJlYWRJbmZvU3ltYm9sXSA/Pz0geyBkYXRhOiBbXSB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvclJlYWRFdmVudChmZCwgdGhpczIuZGF0YSk7XHJcbiAgICBpZiAodGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KSkge1xyXG4gICAgICAgIGlmIChmZCA9PT0gMCkge1xyXG4gICAgICAgICAgICBpZiAoZXZlbnQuZGV0YWlsLmRhdGEubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgZm9yIHN0ZGluLS11c2Ugd2luZG93LnByb21wdC5cclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFdBU00gcHJvbWlzZXMgd2hlbiB0aG9zZSBhcmUgYXZhaWxhYmxlXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmFzc2VydChldmVudC5kZXRhaWwuZGF0YS5sZW5ndGggPT0gMCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdHIgPSAod2luZG93LnByb21wdCgpID8/IFwiXCIpICsgXCJcXG5cIjtcclxuICAgICAgICAgICAgICAgIGV2ZW50LmRldGFpbC5kYXRhLnB1c2goc3RyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIEVCQURGO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBXcml0ZSB0aGUgdXNlci1wcm92aWRlZCBkYXRhIHRvIHRoZSBidWZmZXJcclxuICAgIGxldCBvdXRCdWZmSW5kZXggPSAwO1xyXG4gICAgbGV0IGluQnVmZkluZGV4ID0gMDtcclxuICAgIGxldCBvdXRCdWZmOiBVaW50OEFycmF5ID0gYnVmZmVyc1tvdXRCdWZmSW5kZXhdLnVpbnQ4O1xyXG4gICAgbGV0IGluQnVmZjogVWludDhBcnJheSB8IHN0cmluZyA9IGV2ZW50LmRldGFpbC5kYXRhW2luQnVmZkluZGV4XTtcclxuXHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIGluQnVmZiA9PSBcInN0cmluZ1wiKVxyXG4gICAgICAgICAgICBpbkJ1ZmYgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoaW5CdWZmKTtcclxuXHJcbiAgICAgICAgaWYgKG91dEJ1ZmYgPT0gbnVsbCB8fCBpbkJ1ZmYgPT0gbnVsbClcclxuICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIC8vIFdyaXRlIHdoYXQgd2UgY2FuIGZyb20gaW5CdWZmIHRvIG91dEJ1ZmYuXHJcblxyXG4gICAgICAgIGNvbnN0IGxlbmd0aFJlbWFpbmluZ1RvV3JpdGUgPSBpbkJ1ZmYuYnl0ZUxlbmd0aDtcclxuICAgICAgICBjb25zdCBsZW5ndGhBdmFpbGFibGVUb1dyaXRlID0gb3V0QnVmZi5ieXRlTGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGxlbmd0aFRvV3JpdGUgPSBNYXRoLm1pbihsZW5ndGhBdmFpbGFibGVUb1dyaXRlLCBsZW5ndGhSZW1haW5pbmdUb1dyaXRlKTtcclxuICAgICAgICBvdXRCdWZmLnNldChpbkJ1ZmYuc3ViYXJyYXkoMCwgbGVuZ3RoVG9Xcml0ZSkpO1xyXG5cclxuICAgICAgICAvLyBOb3cgXCJkaXNjYXJkXCIgd2hhdCB3ZSB3cm90ZVxyXG4gICAgICAgIC8vICh0aGlzIGRvZXNuJ3QgYWN0dWFsbHkgZG8gYW55IGhlYXZ5IG1lbW9yeSBtb3ZlcyBvciBhbnl0aGluZyxcclxuICAgICAgICAvLyBpdCdzIGp1c3QgY3JlYXRpbmcgbmV3IHZpZXdzIG92ZXIgdGhlIHNhbWUgYEFycmF5QnVmZmVyYHMpLlxyXG4gICAgICAgIGluQnVmZiA9IGluQnVmZi5zdWJhcnJheShsZW5ndGhUb1dyaXRlKTtcclxuICAgICAgICBvdXRCdWZmID0gb3V0QnVmZi5zdWJhcnJheShsZW5ndGhUb1dyaXRlKTtcclxuXHJcbiAgICAgICAgLy8gTm93IHNlZSB3aGVyZSB3ZSdyZSBhdCB3aXRoIGVhY2ggYnVmZmVyLlxyXG4gICAgICAgIC8vIElmIHdlIHJhbiBvdXQgb2YgaW5wdXQgZGF0YSwgbW92ZSB0byB0aGUgbmV4dCBpbnB1dCBidWZmZXIuXHJcbiAgICAgICAgaWYgKGxlbmd0aFJlbWFpbmluZ1RvV3JpdGUgPCBsZW5ndGhBdmFpbGFibGVUb1dyaXRlKSB7XHJcbiAgICAgICAgICAgICsraW5CdWZmSW5kZXg7XHJcbiAgICAgICAgICAgIGluQnVmZiA9IGV2ZW50LmRldGFpbC5kYXRhW2luQnVmZkluZGV4XTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIElmIHdlIHJhbiBvdXQgb2Ygb3V0cHV0IHNwYWNlLCBtb3ZlIHRvIHRoZSBuZXh0IG91dHB1dCBidWZmZXIuXHJcbiAgICAgICAgaWYgKGxlbmd0aEF2YWlsYWJsZVRvV3JpdGUgPCBsZW5ndGhSZW1haW5pbmdUb1dyaXRlKSB7XHJcbiAgICAgICAgICAgICsrb3V0QnVmZkluZGV4O1xyXG4gICAgICAgICAgICBvdXRCdWZmID0gYnVmZmVyc1tvdXRCdWZmSW5kZXhdPy51aW50ODtcclxuICAgICAgICB9XHJcbiAgICAgICAgbldyaXR0ZW4gKz0gbGVuZ3RoVG9Xcml0ZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkOiAoc3RyaW5nIHwgVWludDhBcnJheSlbXSA9IFtdO1xyXG4gICAgaWYgKGluQnVmZiAmJiBpbkJ1ZmYuYnl0ZUxlbmd0aClcclxuICAgICAgICBkLnB1c2goaW5CdWZmKTtcclxuICAgIGlmIChldmVudC5kZXRhaWwuZGF0YS5sZW5ndGggPiAwKVxyXG4gICAgICAgIGQucHVzaCguLi5ldmVudC5kZXRhaWwuZGF0YS5zbGljZShpbkJ1ZmZJbmRleCArIDEpKTtcclxuXHJcbiAgICB0aGlzMi5kYXRhID0gZDtcclxuXHJcbiAgICB3cml0ZVNpemVUKHRoaXMsIHBudW0sIG5Xcml0dGVuKTtcclxuXHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn1cclxuIiwgImltcG9ydCB7IEVCQURGLCBFSU5WQUwsIEVPVkVSRkxPVywgRVNQSVBFLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlUG9pbnRlciB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JTZWVrRXZlbnREZXRhaWwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgW2ZpbGUgZGVzY3JpcHRvcl0oaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlsZV9kZXNjcmlwdG9yKSwgYSAwLWluZGV4ZWQgbnVtYmVyIGRlc2NyaWJpbmcgd2hlcmUgdGhlIGRhdGEgaXMgZ29pbmcgdG8vY29taW5nIGZyb20uXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgbnVtYmVyIG9mIGJ5dGVzIHRvIG1vdmUgdGhlIGN1cnJlbnQgcG9zaXRpb24gYnlcclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgb2Zmc2V0OiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFxyXG4gICAgICogV2hldGhlciB0byBtb3ZlIC4uLlxyXG4gICAgICogKiAuLi50byBhbiBhYnNvbHV0ZSBwb3NpdGlvbiAoV0hFTkNFX1NFVClcclxuICAgICAqICogLi4ucmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgcG9zaXRpb24gKFdIRU5DRV9DVVIpXHJcbiAgICAgKiAqIC4uLnJlbGF0aXZlIHRvIHRoZSBlbmQgb2YgdGhlIGZpbGUgKFdIRU5DRV9FTkQpXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IHdoZW5jZTogU2Vla1doZW5jZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIElmIHlvdSBzZXQgdGhpcyB2YWx1ZSBhbmQgY2FsbCBgcHJldmVudERlZmF1bHRgLCBpdCB3aWxsIGJlIHJldHVybmVkIGJ5IGBmZF9zZWVrYC4gT3RoZXJ3aXNlIEVTVUNDRVNTIHdpbGwgYmUgcmV0dXJuZWRcclxuICAgICAqL1xyXG4gICAgZXJyb3I/OiBGaWxlU2Vla0Vycm9ycztcclxuXHJcbiAgICAvKipcclxuICAgICAqIElmIGBwcmV2ZW50RGVmYXVsdGAgaXMgY2FsbGVkLCB0aGlzIG11c3QgYmUgc2V0IHRvIHRoZSBuZXcgcG9zaXRpb24gaW4gdGhlIGZpbGUgKG9yIGBlcnJvcmAgbXVzdCBiZSBzZXQpLlxyXG4gICAgICovXHJcbiAgICBuZXdQb3NpdGlvbjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBGaWxlU2Vla0Vycm9ycyA9IHR5cGVvZiBFU1BJUEUgfCB0eXBlb2YgRUJBREYgfCB0eXBlb2YgRUlOVkFMIHwgdHlwZW9mIEVPVkVSRkxPVyB8IHR5cGVvZiBFU1VDQ0VTUztcclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvclNlZWtFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyLCBvZmZzZXQ6IG51bWJlciwgd2hlbmNlOiBTZWVrV2hlbmNlKSB7XHJcbiAgICAgICAgc3VwZXIoXCJmZF9zZWVrXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yLCBvZmZzZXQsIHdoZW5jZSwgbmV3UG9zaXRpb246IDAsIGVycm9yOiB1bmRlZmluZWQgfSB9KTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFdIRU5DRV9TRVQgPSAwO1xyXG5leHBvcnQgY29uc3QgV0hFTkNFX0NVUiA9IDE7XHJcbmV4cG9ydCBjb25zdCBXSEVOQ0VfRU5EID0gMjtcclxuZXhwb3J0IHR5cGUgU2Vla1doZW5jZSA9IHR5cGVvZiBXSEVOQ0VfU0VUIHwgdHlwZW9mIFdIRU5DRV9DVVIgfCB0eXBlb2YgV0hFTkNFX0VORDtcclxuXHJcbi8qKiBQT1NJWCBsc2VlayAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfc2Vlayh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBmZDogRmlsZURlc2NyaXB0b3IsIG9mZnNldDogbnVtYmVyLCB3aGVuY2U6IFNlZWtXaGVuY2UsIG9mZnNldE91dDogbnVtYmVyKTogRmlsZVNlZWtFcnJvcnMge1xyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JTZWVrRXZlbnQoZmQsIG9mZnNldCwgd2hlbmNlKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgc3dpdGNoIChmZCkge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgY2FzZSAyOiByZXR1cm4gRVNQSVBFO1xyXG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gRUJBREY7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgd3JpdGVQb2ludGVyKHRoaXMsIG9mZnNldE91dCwgZXZlbnQuZGV0YWlsLm5ld1Bvc2l0aW9uKTtcclxuICAgICAgICByZXR1cm4gZXZlbnQuZGV0YWlsLmVycm9yID8/IEVTVUNDRVNTO1xyXG4gICAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyBwYXJzZUFycmF5IH0gZnJvbSBcIi4uL19wcml2YXRlL2lvdmVjLmpzXCI7XHJcbmltcG9ydCB7IEVCQURGLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlVWludDMyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtdWludDMyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVEZXNjcmlwdG9yV3JpdGVFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqIFxyXG4gICAgICogSXQncyBtb3JlLW9yLWxlc3MgW3VuaXZlcnNhbGx5IGV4cGVjdGVkXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdGFuZGFyZF9zdHJlYW0pIHRoYXQgMCBpcyBmb3IgaW5wdXQsIDEgZm9yIG91dHB1dCwgYW5kIDIgZm9yIGVycm9ycyxcclxuICAgICAqIHNvIHlvdSBjYW4gbWFwIDEgdG8gYGNvbnNvbGUubG9nYCBhbmQgMiB0byBgY29uc29sZS5lcnJvcmAsIHdpdGggb3RoZXJzIGhhbmRsZWQgd2l0aCB0aGUgdmFyaW91cyBmaWxlLW9wZW5pbmcgY2FsbHMuIFxyXG4gICAgICovXHJcbiAgICByZWFkb25seSBmaWxlRGVzY3JpcHRvcjogbnVtYmVyO1xyXG5cclxuICAgIHJlYWRvbmx5IGRhdGE6IFVpbnQ4QXJyYXlbXTtcclxuXHJcbiAgICBhc1N0cmluZyhsYWJlbDogc3RyaW5nKTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZURlc2NyaXB0b3JXcml0ZUV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JXcml0ZUV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcihmaWxlRGVzY3JpcHRvcjogbnVtYmVyLCBkYXRhOiBVaW50OEFycmF5W10pIHtcclxuICAgICAgICBzdXBlcihcImZkX3dyaXRlXCIsIHtcclxuICAgICAgICAgICAgYnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IHRydWUsIGRldGFpbDoge1xyXG4gICAgICAgICAgICAgICAgZGF0YSxcclxuICAgICAgICAgICAgICAgIGZpbGVEZXNjcmlwdG9yLFxyXG4gICAgICAgICAgICAgICAgYXNTdHJpbmcobGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS5tYXAoKGQsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWQgPSB0eXBlb2YgZCA9PSBcInN0cmluZ1wiID8gZCA6IGdldFRleHREZWNvZGVyKGxhYmVsKS5kZWNvZGUoZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWNvZGVkID09IFwiXFwwXCIgJiYgaW5kZXggPT0gdGhpcy5kYXRhLmxlbmd0aCAtIDEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlY29kZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkuam9pbihcIlwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVuaGFuZGxlZEZpbGVXcml0ZUV2ZW50IGV4dGVuZHMgRXJyb3Ige1xyXG4gICAgY29uc3RydWN0b3IoZmQ6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKGBVbmhhbmRsZWQgd3JpdGUgdG8gZmlsZSBkZXNjcmlwdG9yICMke2ZkfS5gKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbi8qKiBQT1NJWCB3cml0ZXYgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX3dyaXRlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvciwgaW92OiBudW1iZXIsIGlvdmNudDogbnVtYmVyLCBwbnVtOiBudW1iZXIpOiB0eXBlb2YgRVNVQ0NFU1MgfCB0eXBlb2YgRUJBREYge1xyXG5cclxuICAgIGxldCBuV3JpdHRlbiA9IDA7XHJcbiAgICBjb25zdCBnZW4gPSBwYXJzZUFycmF5KHRoaXMsIGlvdiwgaW92Y250KTtcclxuXHJcbiAgICAvLyBHZXQgYWxsIHRoZSBkYXRhIHRvIHdyaXRlIGluIGl0cyBzZXBhcmF0ZSBidWZmZXJzXHJcbiAgICBjb25zdCBhc1R5cGVkQXJyYXlzID0gZ2VuLm1hcCgoeyBidWZmZXJTdGFydCwgYnVmZmVyTGVuZ3RoIH0pID0+IHtcclxuICAgICAgICBuV3JpdHRlbiArPSBidWZmZXJMZW5ndGg7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuY2FjaGVkTWVtb3J5Vmlldy5idWZmZXIsIGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRmlsZURlc2NyaXB0b3JXcml0ZUV2ZW50KGZkLCBhc1R5cGVkQXJyYXlzKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgY29uc3Qgc3RyID0gZXZlbnQuZGV0YWlsLmFzU3RyaW5nKFwidXRmLThcIik7XHJcbiAgICAgICAgaWYgKGZkID09IDEpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHN0cik7XHJcbiAgICAgICAgZWxzZSBpZiAoZmQgPT0gMilcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihzdHIpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIEVCQURGO1xyXG4gICAgfVxyXG5cclxuICAgIHdyaXRlVWludDMyKHRoaXMsIHBudW0sIG5Xcml0dGVuKTtcclxuXHJcbiAgICByZXR1cm4gRVNVQ0NFU1M7XHJcbn1cclxuXHJcblxyXG5jb25zdCB0ZXh0RGVjb2RlcnMgPSBuZXcgTWFwPHN0cmluZywgVGV4dERlY29kZXI+KCk7XHJcbmZ1bmN0aW9uIGdldFRleHREZWNvZGVyKGxhYmVsOiBzdHJpbmcpIHtcclxuICAgIGxldCByZXQ6IFRleHREZWNvZGVyIHwgdW5kZWZpbmVkID0gdGV4dERlY29kZXJzLmdldChsYWJlbCk7XHJcbiAgICBpZiAoIXJldCkge1xyXG4gICAgICAgIHJldCA9IG5ldyBUZXh0RGVjb2RlcihsYWJlbCk7XHJcbiAgICAgICAgdGV4dERlY29kZXJzLnNldChsYWJlbCwgcmV0KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0O1xyXG59IiwgImltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9jRXhpdEV2ZW50RGV0YWlsIHtcclxuICAgIC8qKiBcclxuICAgICAqIFRoZSB2YWx1ZSBwYXNzZWQgdG8gYHN0ZDo6ZXhpdGAgXHJcbiAgICAgKiAoYW5kL29yIHRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYWluYCkgXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IGNvZGU6IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoaXMgZXZlbnQgaXMgY2FsbGVkIHdoZW4gYHN0ZDo6ZXhpdGAgaXMgY2FsbGVkLCBpbmNsdWRpbmcgd2hlblxyXG4gKiBgbWFpbmAgZW5kcywgaWYgeW91IGhhdmUgb25lLlxyXG4gKiBcclxuICogV2hhdCB5b3UgY2hvb3NlIHRvIGRvIHdpdGggdGhpcyBldmVudCBpcyB1cCB0byB5b3UsIGJ1dFxyXG4gKiBrbm93IHRoYXQgdGhlIG5leHQgV0FTTSBpbnN0cnVjdGlvbiBvbmNlIGV2ZW50IGRpc3BhdGNoIGVuZHMgaXMgYHVucmVhY2hhYmxlYC5cclxuICogXHJcbiAqIEl0J3MgcmVjb21tZW5kZWQgdG8gdGhyb3cgeW91ciBvd24gYEVycm9yYCwgd2hpY2ggaXMgd2hhdCBFbXNjcmlwdGVuIGRvZXMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUHJvY0V4aXRFdmVudCBleHRlbmRzIEN1c3RvbUV2ZW50PFByb2NFeGl0RXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjb2RlOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcInByb2NfZXhpdFwiLCB7IGJ1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiBmYWxzZSwgZGV0YWlsOiB7IGNvZGUgfSB9KTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByb2NfZXhpdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBjb2RlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgUHJvY0V4aXRFdmVudChjb2RlKSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGFsaWduZmF1bHQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvYWxpZ25mYXVsdC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfYm9vbC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9jb25zdGFudC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLCBfZW12YWxfZGVjcmVmLCBfZW12YWxfdGFrZV92YWx1ZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZW12YWwuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9lbnVtLCBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUsIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9lbnVtLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlciB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlci5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZyB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZS5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX2FycmF5LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfdmFsdWVfb2JqZWN0LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCwgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZvaWQuanNcIjtcclxuaW1wb3J0IHsgZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoLmpzXCI7XHJcbmltcG9ydCB7IHNlZ2ZhdWx0IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L3NlZ2ZhdWx0LmpzXCI7XHJcbmltcG9ydCB7IF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UuanNcIjtcclxuaW1wb3J0IHsgX3R6c2V0X2pzIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L3R6c2V0X2pzLmpzXCI7XHJcbmltcG9ydCB7IGNsb2NrX3RpbWVfZ2V0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9jbG9ja190aW1lX2dldC5qc1wiO1xyXG5pbXBvcnQgeyBlbnZpcm9uX2dldCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9nZXQuanNcIjtcclxuaW1wb3J0IHsgZW52aXJvbl9zaXplc19nZXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Vudmlyb25fc2l6ZXNfZ2V0LmpzXCI7XHJcbmltcG9ydCB7IGZkX2Nsb3NlIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9jbG9zZS5qc1wiO1xyXG5pbXBvcnQgeyBmZF9yZWFkIH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF9yZWFkLmpzXCI7XHJcbmltcG9ydCB7IGZkX3NlZWsgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3NlZWsuanNcIjtcclxuaW1wb3J0IHsgZmRfd3JpdGUgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3dyaXRlLmpzXCI7XHJcbmltcG9ydCB7IHByb2NfZXhpdCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvcHJvY19leGl0LmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTdHJ1Y3RUZXN0IHtcclxuICAgIHN0cmluZzogc3RyaW5nO1xyXG4gICAgbnVtYmVyOiBudW1iZXI7XHJcbiAgICB0cmlwbGU6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcclxufVxyXG5cclxuZXhwb3J0IGRlY2xhcmUgY2xhc3MgVGVzdENsYXNzIGltcGxlbWVudHMgRGlzcG9zYWJsZSB7XHJcbiAgICBwdWJsaWMgeDogbnVtYmVyO1xyXG4gICAgcHVibGljIHk6IHN0cmluZztcclxuICAgIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogc3RyaW5nKTtcclxuICAgIGluY3JlbWVudFgoKTogVGVzdENsYXNzO1xyXG5cclxuICAgIGdldFgoKTogbnVtYmVyO1xyXG4gICAgc2V0WCh4OiBudW1iZXIpOiB2b2lkO1xyXG5cclxuICAgIHN0YXRpYyBnZXRTdHJpbmdGcm9tSW5zdGFuY2UoaW5zdGFuY2U6IFRlc3RDbGFzcyk6IHN0cmluZztcclxuXHJcbiAgICBzdGF0aWMgY3JlYXRlKCk6IFRlc3RDbGFzcztcclxuXHJcbiAgICBzdGF0aWMgaWRlbnRpdHlDb25zdFBvaW50ZXIoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuICAgIHN0YXRpYyBpZGVudGl0eVBvaW50ZXIoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuICAgIHN0YXRpYyBpZGVudGl0eVJlZmVyZW5jZShpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5Q29uc3RSZWZlcmVuY2UoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuICAgIHN0YXRpYyBpZGVudGl0eUNvcHkoaW5wdXQ6IFRlc3RDbGFzcyk6IFRlc3RDbGFzcztcclxuXHJcbiAgICBbU3ltYm9sLmRpc3Bvc2VdKCk6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1ib3VuZFR5cGVzIHtcclxuXHJcbiAgICBpZGVudGl0eV91OChuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV9pOChuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV91MTYobjogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgaWRlbnRpdHlfaTE2KG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X3UzMihuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV9pMzIobjogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgaWRlbnRpdHlfdTY0KG46IGJpZ2ludCk6IGJpZ2ludDtcclxuICAgIGlkZW50aXR5X2k2NChuOiBiaWdpbnQpOiBiaWdpbnQ7XHJcbiAgICBpZGVudGl0eV9zdHJpbmcobjogc3RyaW5nKTogc3RyaW5nO1xyXG4gICAgaWRlbnRpdHlfd3N0cmluZyhuOiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV9vbGRfZW51bShuOiBhbnkpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV9uZXdfZW51bShuOiBhbnkpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV9zdHJ1Y3RfcG9pbnRlcihuOiBTdHJ1Y3RUZXN0KTogU3RydWN0VGVzdDtcclxuICAgIHN0cnVjdF9jcmVhdGUoKTogU3RydWN0VGVzdDtcclxuICAgIHN0cnVjdF9jb25zdW1lKG46IFN0cnVjdFRlc3QpOiB2b2lkO1xyXG4gICAgaWRlbnRpdHlfc3RydWN0X2NvcHkobjogU3RydWN0VGVzdCk6IFN0cnVjdFRlc3Q7XHJcbiAgICB0ZXN0Q2xhc3NBcnJheSgpOiBudW1iZXI7XHJcbiAgICBub3dTdGVhZHkoKTogbnVtYmVyO1xyXG4gICAgbm93U3lzdGVtKCk6IG51bWJlcjtcclxuICAgIHRocm93c0V4Y2VwdGlvbigpOiBuZXZlcjtcclxuICAgIGNhdGNoZXNFeGNlcHRpb24oKTogbmV2ZXI7XHJcbiAgICBnZXRlbnYoa2V5OiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV9zdGRvdXQoKTogdm9pZDtcclxuICAgIHJldHVybl9zdGRpbigpOiBzdHJpbmc7XHJcblxyXG4gICAgVGVzdENsYXNzOiB0eXBlb2YgVGVzdENsYXNzO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEtub3duSW5zdGFuY2VFeHBvcnRzIHtcclxuICAgIHByaW50VGVzdCgpOiBudW1iZXI7XHJcbiAgICByZXZlcnNlSW5wdXQoKTogbnVtYmVyO1xyXG4gICAgZ2V0UmFuZG9tTnVtYmVyKCk6IG51bWJlcjtcclxuICAgIGdldEtleSgpOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZSh3aGVyZTogc3RyaW5nLCB1bmluc3RhbnRpYXRlZD86IEFycmF5QnVmZmVyKTogUHJvbWlzZTxJbnN0YW50aWF0ZWRXYXNtPEtub3duSW5zdGFuY2VFeHBvcnRzLCBFbWJvdW5kVHlwZXM+PiB7XHJcblxyXG4gICAgbGV0IHdhc20gPSBuZXcgSW5zdGFudGlhdGVkV2FzbTxLbm93bkluc3RhbmNlRXhwb3J0cywgRW1ib3VuZFR5cGVzPigpO1xyXG4gICAgd2FzbS5hZGRFdmVudExpc3RlbmVyKFwiZW52aXJvbl9nZXRcIiwgZSA9PiB7XHJcbiAgICAgICAgZS5kZXRhaWwuc3RyaW5ncyA9IFtcclxuICAgICAgICAgICAgW1wia2V5XzFcIiwgXCJ2YWx1ZV8xXCJdLFxyXG4gICAgICAgICAgICBbXCJrZXlfMlwiLCBcInZhbHVlXzJcIl0sXHJcbiAgICAgICAgICAgIFtcImtleV8zXCIsIFwidmFsdWVfM1wiXVxyXG4gICAgICAgIF1cclxuICAgIH0pO1xyXG4gICAgLyp3YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJmZF9yZWFkXCIsIGUgPT4ge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBsZXQgc3RyID0gXCJUaGlzX2lzX2FfdGVzdF9zdHJpbmdcXG5cIjtcclxuICAgICAgICBsZXQgcG9zID0gMDtcclxuICAgICAgICBlLmRldGFpbC53cml0ZSA9IChpbnB1dCkgPT4ge1xyXG4gICAgICAgICAgICBkZWJ1Z2dlcjtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gKG5ldyBUZXh0RW5jb2RlcikuZW5jb2RlSW50byhzdHIuc3Vic3RyaW5nKHBvcyksIGlucHV0KTtcclxuICAgICAgICAgICAgcG9zICs9IHJlc3VsdC5yZWFkO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LndyaXR0ZW47XHJcbiAgICAgICAgfVxyXG4gICAgfSk7Ki9cclxuICAgIGF3YWl0IHdhc20uaW5zdGFudGlhdGUodW5pbnN0YW50aWF0ZWQgPz8gZmV0Y2gobmV3IFVSTChcIndhc20ud2FzbVwiLCBpbXBvcnQubWV0YS51cmwpKSwge1xyXG4gICAgICAgIGVudjoge1xyXG4gICAgICAgICAgICBfX3Rocm93X2V4Y2VwdGlvbl93aXRoX3N0YWNrX3RyYWNlLFxyXG4gICAgICAgICAgICBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5X2VsZW1lbnQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfZmluYWxpemVfdmFsdWVfYXJyYXksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0X2ZpZWxkLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCxcclxuICAgICAgICAgICAgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZW51bSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9lbnVtX3ZhbHVlLFxyXG4gICAgICAgICAgICBfZW12YWxfdGFrZV92YWx1ZSxcclxuICAgICAgICAgICAgX2VtdmFsX2RlY3JlZixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl91c2VyX3R5cGUsXHJcbiAgICAgICAgICAgIF90enNldF9qcyxcclxuICAgICAgICAgICAgc2VnZmF1bHQsXHJcbiAgICAgICAgICAgIGFsaWduZmF1bHQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB3YXNpX3NuYXBzaG90X3ByZXZpZXcxOiB7XHJcbiAgICAgICAgICAgIGZkX2Nsb3NlLFxyXG4gICAgICAgICAgICBmZF9yZWFkLFxyXG4gICAgICAgICAgICBmZF9zZWVrLFxyXG4gICAgICAgICAgICBmZF93cml0ZSxcclxuICAgICAgICAgICAgZW52aXJvbl9nZXQsXHJcbiAgICAgICAgICAgIGVudmlyb25fc2l6ZXNfZ2V0LFxyXG4gICAgICAgICAgICBwcm9jX2V4aXQsXHJcbiAgICAgICAgICAgIGNsb2NrX3RpbWVfZ2V0XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgd2FzbS5hZGRFdmVudExpc3RlbmVyKFwiZmRfd3JpdGVcIiwgZSA9PiB7XHJcbiAgICAgICAgaWYgKGUuZGV0YWlsLmZpbGVEZXNjcmlwdG9yID09IDEpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGUuZGV0YWlsLmFzU3RyaW5nKFwidXRmLThcIik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3doZXJlfTogJHt2YWx1ZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gd2FzbTtcclxufVxyXG4iLCAiaW1wb3J0IFwiLi93b3JrbGV0LXBvbHlmaWxsLmpzXCI7XHJcblxyXG4vL2ltcG9ydCBcImNvcmUtanNcIjtcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBDb21saW5rIGZyb20gXCJjb21saW5rXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vZGlzdC9pbnN0YW50aWF0ZWQtd2FzaS5qc1wiO1xyXG5pbXBvcnQgeyBpbnN0YW50aWF0ZSwgS25vd25JbnN0YW5jZUV4cG9ydHMgfSBmcm9tIFwiLi9pbnN0YW50aWF0ZS5qc1wiO1xyXG5cclxuXHJcblxyXG4vLyBUZXN0aW5nIGFuIGF1ZGlvIHdvcmtsZXQgaXMgYSBsaXR0bGUgdG91Z2ggYmVjYXVzZVxyXG4vLyB0aGV5IGRvbid0IGhhdmUgYGZldGNoYCwgZG9uJ3QgaGF2ZSBgRXZlbnRgIChpbiBzb21lIGVudmlyb25tZW50cyksIGV0Yy4uLlxyXG5cclxubGV0IHsgcHJvbWlzZTogdW5pbnN0YW50aWF0ZWRXYXNtLCByZXNvbHZlOiByZXNvbHZlVW5pbnN0YW50aWF0ZWRXYXNtIH0gPSBQcm9taXNlLndpdGhSZXNvbHZlcnM8QXJyYXlCdWZmZXI+KCk7XHJcblxyXG5cclxuXHJcbmxldCB3YXNtOiBJbnN0YW50aWF0ZWRXYXNtPEtub3duSW5zdGFuY2VFeHBvcnRzPiA9IG51bGwhO1xyXG5cclxudW5pbnN0YW50aWF0ZWRXYXNtLnRoZW4oYmluYXJ5ID0+IGluc3RhbnRpYXRlKFwiV29ya2xldFwiLCBiaW5hcnkpLnRoZW4odyA9PiB3YXNtID0gdykpO1xyXG5cclxucmVnaXN0ZXJQcm9jZXNzb3IoXCJyYW5kb20tbm9pc2UtcHJvY2Vzc29yXCIsIGNsYXNzIFJhbmRvbU5vaXNlUHJvY2Vzc29yIGV4dGVuZHMgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgQ29tbGluay5leHBvc2Uoe1xyXG4gICAgICAgICAgICBwcm92aWRlV2FzbShkYXRhOiBBcnJheUJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVVuaW5zdGFudGlhdGVkV2FzbShkYXRhKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXhlY3V0ZShzdHI6IHN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJ3YXNtXCIsIHN0cikpKHdhc20pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgdGhpcy5wb3J0KTtcclxuICAgIH1cclxuICAgIHByb2Nlc3MoaW5wdXRzOiBGbG9hdDMyQXJyYXlbXVtdLCBvdXRwdXRzOiBGbG9hdDMyQXJyYXlbXVtdLCBwYXJhbWV0ZXJzOiBSZWNvcmQ8c3RyaW5nLCBGbG9hdDMyQXJyYXk+KSB7XHJcbiAgICAgICAgaWYgKHdhc20pIHtcclxuICAgICAgICAgICAgb3V0cHV0c1swXS5mb3JFYWNoKChjaGFubmVsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5uZWwubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsW2ldID0gKHdhc20uZXhwb3J0cy5nZXRSYW5kb21OdW1iZXIoKSAqIDIgLSAxKSAvIDEwMDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxufSk7XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5pbnRlcmZhY2UgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yIHtcclxuICAgIHJlYWRvbmx5IHBvcnQ6IE1lc3NhZ2VQb3J0O1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQXVkaW9Xb3JrbGV0UHJvY2Vzc29ySW1wbCBleHRlbmRzIEF1ZGlvV29ya2xldFByb2Nlc3NvciB7XHJcbiAgICBwcm9jZXNzKFxyXG4gICAgICAgIGlucHV0czogRmxvYXQzMkFycmF5W11bXSxcclxuICAgICAgICBvdXRwdXRzOiBGbG9hdDMyQXJyYXlbXVtdLFxyXG4gICAgICAgIHBhcmFtZXRlcnM6IFJlY29yZDxzdHJpbmcsIEZsb2F0MzJBcnJheT5cclxuICAgICk6IGJvb2xlYW47XHJcbn1cclxuXHJcbmRlY2xhcmUgdmFyIEF1ZGlvV29ya2xldFByb2Nlc3Nvcjoge1xyXG4gICAgcHJvdG90eXBlOiBBdWRpb1dvcmtsZXRQcm9jZXNzb3I7XHJcbiAgICBuZXcob3B0aW9ucz86IEF1ZGlvV29ya2xldE5vZGVPcHRpb25zKTogQXVkaW9Xb3JrbGV0UHJvY2Vzc29yO1xyXG59O1xyXG5cclxudHlwZSBBdWRpb1BhcmFtRGVzY3JpcHRvciA9IHtcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIGF1dG9tYXRpb25SYXRlOiBBdXRvbWF0aW9uUmF0ZSxcclxuICAgIG1pblZhbHVlOiBudW1iZXIsXHJcbiAgICBtYXhWYWx1ZTogbnVtYmVyLFxyXG4gICAgZGVmYXVsdFZhbHVlOiBudW1iZXJcclxufVxyXG5cclxuaW50ZXJmYWNlIEF1ZGlvV29ya2xldFByb2Nlc3NvckNvbnN0cnVjdG9yIHtcclxuICAgIG5ldyhvcHRpb25zPzogQXVkaW9Xb3JrbGV0Tm9kZU9wdGlvbnMpOiBBdWRpb1dvcmtsZXRQcm9jZXNzb3JJbXBsO1xyXG4gICAgcGFyYW1ldGVyRGVzY3JpcHRvcnM/OiBBdWRpb1BhcmFtRGVzY3JpcHRvcltdO1xyXG59XHJcblxyXG5kZWNsYXJlIGZ1bmN0aW9uIHJlZ2lzdGVyUHJvY2Vzc29yKFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgcHJvY2Vzc29yQ3RvcjogQXVkaW9Xb3JrbGV0UHJvY2Vzc29yQ29uc3RydWN0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
