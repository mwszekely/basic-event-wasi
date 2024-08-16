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

// stage/index.ts
var wasm = await instantiate("Main");
document.getElementById("ready-main").innerHTML = "\u2714\uFE0F";
var structTest = {
  string: "Test string of a length long enough to hopefully cause issues if something goes wrong",
  number: 65535,
  triple: [10, 100, 1e3]
};
var mainElement = document.getElementById("main");
var workerElement = document.getElementById("worker");
var workletElement = document.getElementById("worklet");
var w = new Worker("./js/worker.js", { type: "module" });
var worker = wrap(w);
document.getElementById("ready-worker").innerHTML = "\u2714\uFE0F";
globalThis._worker = worker;
globalThis._wasm = wasm;
var cls = new wasm.embind.TestClass(5, "test");
cls.x = 10;
cls.getX();
cls[Symbol.dispose]();
wasm.embind.struct_consume(structTest);
var s = wasm.embind.struct_create();
wasm.embind.identity_string("test string");
globalThis._memoryGrowth = 0;
wasm.addEventListener("MemoryGrowthEvent", () => {
  globalThis._memoryGrowth += 1;
});
await new Promise((resolve) => setTimeout(resolve, 250));
mainElement.innerText = wasm.exports.getKey().toString(16).toUpperCase();
workerElement.innerText = `${await worker.execute("return wasm.exports.getKey().toString(16).toUpperCase()")}`;
(async () => {
  await new Promise((resolve2) => setTimeout(resolve2, 250));
  const { promise, resolve } = Promise.withResolvers();
  window.addEventListener("click", (e) => {
    resolve();
  }, { once: true });
  await promise;
  const audioContext = new AudioContext();
  const sourceNodeL = audioContext.createConstantSource();
  const sourceNodeR = audioContext.createConstantSource();
  const mergerNode = audioContext.createChannelMerger(2);
  await audioContext.resume();
  await audioContext.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
  const randomNoiseNode = new AudioWorkletNode(
    audioContext,
    "random-noise-processor"
  );
  const c = wrap(randomNoiseNode.port);
  document.getElementById("ready-worklet").innerHTML = "\u2714\uFE0F";
  document.getElementById("ready").innerHTML = "\u2714\uFE0F";
  sourceNodeL.connect(mergerNode, 0, 0);
  sourceNodeR.connect(mergerNode, 0, 1);
  mergerNode.connect(randomNoiseNode);
  randomNoiseNode.connect(audioContext.destination);
  const ab = await (await fetch(new URL("./wasm.wasm", import.meta.url))).arrayBuffer();
  await c.provideWasm(ab);
  await new Promise((resolve2) => setTimeout(resolve2, 250));
  workletElement.innerText = `${await c.execute("return wasm.exports.getKey().toString(16).toUpperCase()")}`;
})();
/*! Bundled license information:

comlink/dist/esm/comlink.mjs:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL2NvbWxpbmtANC40LjEvbm9kZV9tb2R1bGVzL2NvbWxpbmsvc3JjL2NvbWxpbmsudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC11aW50MzIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcmVhZC11aW50OC50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc20udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9hbGlnbmZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXR5cGUtaW5mby50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9jbGFzcy50cyIsICIuLi8uLi8uLi8uLi9zcmMvX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvaXMtNjQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcG9pbnRlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXBvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VtdmFsLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlci50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldy50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9zaXpldC50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC9yZWFkLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXNpemV0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXVpbnQxNi50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50MzIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvd3JpdGUtdWludDgudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcudHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L2VtYmluZF9yZWdpc3Rlcl92b2lkLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lbnYvZW1zY3JpcHRlbl9ub3RpZnlfbWVtb3J5X2dyb3d0aC50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3NlZ2ZhdWx0LnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9fcHJpdmF0ZS9leGNlcHRpb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvZW52L3R6c2V0X2pzLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy9lcnJuby50cyIsICIuLi8uLi8uLi8uLi9zcmMvdXRpbC93cml0ZS11aW50NjQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvY2xvY2tfdGltZV9nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2Vudmlyb24udHMiLCAiLi4vLi4vLi4vLi4vc3JjL3V0aWwvY29weS10by13YXNtLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy91dGlsL3dyaXRlLXBvaW50ZXIudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9zaXplc19nZXQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfY2xvc2UudHMiLCAiLi4vLi4vLi4vLi4vc3JjL19wcml2YXRlL2lvdmVjLnRzIiwgIi4uLy4uLy4uLy4uL3NyYy93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3JlYWQudHMiLCAiLi4vLi4vLi4vLi4vc3JjL3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfc2Vlay50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9mZF93cml0ZS50cyIsICIuLi8uLi8uLi8uLi9zcmMvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9wcm9jX2V4aXQudHMiLCAiLi4vLi4vaW5zdGFudGlhdGUudHMiLCAiLi4vLi4vaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG4gKi9cblxuaW1wb3J0IHtcbiAgRW5kcG9pbnQsXG4gIEV2ZW50U291cmNlLFxuICBNZXNzYWdlLFxuICBNZXNzYWdlVHlwZSxcbiAgUG9zdE1lc3NhZ2VXaXRoT3JpZ2luLFxuICBXaXJlVmFsdWUsXG4gIFdpcmVWYWx1ZVR5cGUsXG59IGZyb20gXCIuL3Byb3RvY29sXCI7XG5leHBvcnQgdHlwZSB7IEVuZHBvaW50IH07XG5cbmV4cG9ydCBjb25zdCBwcm94eU1hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsucHJveHlcIik7XG5leHBvcnQgY29uc3QgY3JlYXRlRW5kcG9pbnQgPSBTeW1ib2woXCJDb21saW5rLmVuZHBvaW50XCIpO1xuZXhwb3J0IGNvbnN0IHJlbGVhc2VQcm94eSA9IFN5bWJvbChcIkNvbWxpbmsucmVsZWFzZVByb3h5XCIpO1xuZXhwb3J0IGNvbnN0IGZpbmFsaXplciA9IFN5bWJvbChcIkNvbWxpbmsuZmluYWxpemVyXCIpO1xuXG5jb25zdCB0aHJvd01hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsudGhyb3duXCIpO1xuXG4vKipcbiAqIEludGVyZmFjZSBvZiB2YWx1ZXMgdGhhdCB3ZXJlIG1hcmtlZCB0byBiZSBwcm94aWVkIHdpdGggYGNvbWxpbmsucHJveHkoKWAuXG4gKiBDYW4gYWxzbyBiZSBpbXBsZW1lbnRlZCBieSBjbGFzc2VzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb3h5TWFya2VkIHtcbiAgW3Byb3h5TWFya2VyXTogdHJ1ZTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHR5cGUgYW5kIHdyYXBzIGl0IGluIGEgUHJvbWlzZSwgaWYgaXQgbm90IGFscmVhZHkgaXMgb25lLlxuICogVGhpcyBpcyB0byBhdm9pZCBgUHJvbWlzZTxQcm9taXNlPFQ+PmAuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgVW5wcm9taXNpZnk8VD5gLlxuICovXG50eXBlIFByb21pc2lmeTxUPiA9IFQgZXh0ZW5kcyBQcm9taXNlPHVua25vd24+ID8gVCA6IFByb21pc2U8VD47XG4vKipcbiAqIFRha2VzIGEgdHlwZSB0aGF0IG1heSBiZSBQcm9taXNlIGFuZCB1bndyYXBzIHRoZSBQcm9taXNlIHR5cGUuXG4gKiBJZiBgUGAgaXMgbm90IGEgUHJvbWlzZSwgaXQgcmV0dXJucyBgUGAuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUHJvbWlzaWZ5PFQ+YC5cbiAqL1xudHlwZSBVbnByb21pc2lmeTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IFA7XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIHByb3BlcnR5IGFuZCByZXR1cm5zIHRoZSB0eXBlIHRoYXQgaXMgdmlzaWJsZSB0byB0aGUgbG9jYWwgdGhyZWFkIG9uIHRoZSBwcm94eS5cbiAqXG4gKiBOb3RlOiBUaGlzIG5lZWRzIHRvIGJlIGl0cyBvd24gdHlwZSBhbGlhcywgb3RoZXJ3aXNlIGl0IHdpbGwgbm90IGRpc3RyaWJ1dGUgb3ZlciB1bmlvbnMuXG4gKiBTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svYWR2YW5jZWQtdHlwZXMuaHRtbCNkaXN0cmlidXRpdmUtY29uZGl0aW9uYWwtdHlwZXNcbiAqL1xudHlwZSBSZW1vdGVQcm9wZXJ0eTxUPiA9XG4gIC8vIElmIHRoZSB2YWx1ZSBpcyBhIG1ldGhvZCwgY29tbGluayB3aWxsIHByb3h5IGl0IGF1dG9tYXRpY2FsbHkuXG4gIC8vIE9iamVjdHMgYXJlIG9ubHkgcHJveGllZCBpZiB0aGV5IGFyZSBtYXJrZWQgdG8gYmUgcHJveGllZC5cbiAgLy8gT3RoZXJ3aXNlLCB0aGUgcHJvcGVydHkgaXMgY29udmVydGVkIHRvIGEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRoZSBjbG9uZWQgdmFsdWUuXG4gIFQgZXh0ZW5kcyBGdW5jdGlvbiB8IFByb3h5TWFya2VkID8gUmVtb3RlPFQ+IDogUHJvbWlzaWZ5PFQ+O1xuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHByb3BlcnR5IGFzIGEgcmVtb3RlIHRocmVhZCB3b3VsZCBzZWUgaXQgdGhyb3VnaCBhIHByb3h5IChlLmcuIHdoZW4gcGFzc2VkIGluIGFzIGEgZnVuY3Rpb25cbiAqIGFyZ3VtZW50KSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGF0IHRoZSBsb2NhbCB0aHJlYWQgaGFzIHRvIHN1cHBseS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnZlcnNlIG9mIGBSZW1vdGVQcm9wZXJ0eTxUPmAuXG4gKlxuICogTm90ZTogVGhpcyBuZWVkcyB0byBiZSBpdHMgb3duIHR5cGUgYWxpYXMsIG90aGVyd2lzZSBpdCB3aWxsIG5vdCBkaXN0cmlidXRlIG92ZXIgdW5pb25zLiBTZWVcbiAqIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL2FkdmFuY2VkLXR5cGVzLmh0bWwjZGlzdHJpYnV0aXZlLWNvbmRpdGlvbmFsLXR5cGVzXG4gKi9cbnR5cGUgTG9jYWxQcm9wZXJ0eTxUPiA9IFQgZXh0ZW5kcyBGdW5jdGlvbiB8IFByb3h5TWFya2VkXG4gID8gTG9jYWw8VD5cbiAgOiBVbnByb21pc2lmeTxUPjtcblxuLyoqXG4gKiBQcm94aWVzIGBUYCBpZiBpdCBpcyBhIGBQcm94eU1hcmtlZGAsIGNsb25lcyBpdCBvdGhlcndpc2UgKGFzIGhhbmRsZWQgYnkgc3RydWN0dXJlZCBjbG9uaW5nIGFuZCB0cmFuc2ZlciBoYW5kbGVycykuXG4gKi9cbmV4cG9ydCB0eXBlIFByb3h5T3JDbG9uZTxUPiA9IFQgZXh0ZW5kcyBQcm94eU1hcmtlZCA/IFJlbW90ZTxUPiA6IFQ7XG4vKipcbiAqIEludmVyc2Ugb2YgYFByb3h5T3JDbG9uZTxUPmAuXG4gKi9cbmV4cG9ydCB0eXBlIFVucHJveHlPckNsb25lPFQ+ID0gVCBleHRlbmRzIFJlbW90ZU9iamVjdDxQcm94eU1hcmtlZD5cbiAgPyBMb2NhbDxUPlxuICA6IFQ7XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIG9iamVjdCBpbiB0aGUgb3RoZXIgdGhyZWFkIGFuZCByZXR1cm5zIHRoZSB0eXBlIGFzIGl0IGlzIHZpc2libGUgdG8gdGhlIGxvY2FsIHRocmVhZFxuICogd2hlbiBwcm94aWVkIHdpdGggYENvbWxpbmsucHJveHkoKWAuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBoYW5kbGUgY2FsbCBzaWduYXR1cmVzLCB3aGljaCBpcyBoYW5kbGVkIGJ5IHRoZSBtb3JlIGdlbmVyYWwgYFJlbW90ZTxUPmAgdHlwZS5cbiAqXG4gKiBAdGVtcGxhdGUgVCBUaGUgcmF3IHR5cGUgb2YgYSByZW1vdGUgb2JqZWN0IGFzIHNlZW4gaW4gdGhlIG90aGVyIHRocmVhZC5cbiAqL1xuZXhwb3J0IHR5cGUgUmVtb3RlT2JqZWN0PFQ+ID0geyBbUCBpbiBrZXlvZiBUXTogUmVtb3RlUHJvcGVydHk8VFtQXT4gfTtcbi8qKlxuICogVGFrZXMgdGhlIHR5cGUgb2YgYW4gb2JqZWN0IGFzIGEgcmVtb3RlIHRocmVhZCB3b3VsZCBzZWUgaXQgdGhyb3VnaCBhIHByb3h5IChlLmcuIHdoZW4gcGFzc2VkIGluIGFzIGEgZnVuY3Rpb25cbiAqIGFyZ3VtZW50KSBhbmQgcmV0dXJucyB0aGUgdHlwZSB0aGF0IHRoZSBsb2NhbCB0aHJlYWQgaGFzIHRvIHN1cHBseS5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IGhhbmRsZSBjYWxsIHNpZ25hdHVyZXMsIHdoaWNoIGlzIGhhbmRsZWQgYnkgdGhlIG1vcmUgZ2VuZXJhbCBgTG9jYWw8VD5gIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW52ZXJzZSBvZiBgUmVtb3RlT2JqZWN0PFQ+YC5cbiAqXG4gKiBAdGVtcGxhdGUgVCBUaGUgdHlwZSBvZiBhIHByb3hpZWQgb2JqZWN0LlxuICovXG5leHBvcnQgdHlwZSBMb2NhbE9iamVjdDxUPiA9IHsgW1AgaW4ga2V5b2YgVF06IExvY2FsUHJvcGVydHk8VFtQXT4gfTtcblxuLyoqXG4gKiBBZGRpdGlvbmFsIHNwZWNpYWwgY29tbGluayBtZXRob2RzIGF2YWlsYWJsZSBvbiBlYWNoIHByb3h5IHJldHVybmVkIGJ5IGBDb21saW5rLndyYXAoKWAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJveHlNZXRob2RzIHtcbiAgW2NyZWF0ZUVuZHBvaW50XTogKCkgPT4gUHJvbWlzZTxNZXNzYWdlUG9ydD47XG4gIFtyZWxlYXNlUHJveHldOiAoKSA9PiB2b2lkO1xufVxuXG4vKipcbiAqIFRha2VzIHRoZSByYXcgdHlwZSBvZiBhIHJlbW90ZSBvYmplY3QsIGZ1bmN0aW9uIG9yIGNsYXNzIGluIHRoZSBvdGhlciB0aHJlYWQgYW5kIHJldHVybnMgdGhlIHR5cGUgYXMgaXQgaXMgdmlzaWJsZSB0b1xuICogdGhlIGxvY2FsIHRocmVhZCBmcm9tIHRoZSBwcm94eSByZXR1cm4gdmFsdWUgb2YgYENvbWxpbmsud3JhcCgpYCBvciBgQ29tbGluay5wcm94eSgpYC5cbiAqL1xuZXhwb3J0IHR5cGUgUmVtb3RlPFQ+ID1cbiAgLy8gSGFuZGxlIHByb3BlcnRpZXNcbiAgUmVtb3RlT2JqZWN0PFQ+ICZcbiAgICAvLyBIYW5kbGUgY2FsbCBzaWduYXR1cmUgKGlmIHByZXNlbnQpXG4gICAgKFQgZXh0ZW5kcyAoLi4uYXJnczogaW5mZXIgVEFyZ3VtZW50cykgPT4gaW5mZXIgVFJldHVyblxuICAgICAgPyAoXG4gICAgICAgICAgLi4uYXJnczogeyBbSSBpbiBrZXlvZiBUQXJndW1lbnRzXTogVW5wcm94eU9yQ2xvbmU8VEFyZ3VtZW50c1tJXT4gfVxuICAgICAgICApID0+IFByb21pc2lmeTxQcm94eU9yQ2xvbmU8VW5wcm9taXNpZnk8VFJldHVybj4+PlxuICAgICAgOiB1bmtub3duKSAmXG4gICAgLy8gSGFuZGxlIGNvbnN0cnVjdCBzaWduYXR1cmUgKGlmIHByZXNlbnQpXG4gICAgLy8gVGhlIHJldHVybiBvZiBjb25zdHJ1Y3Qgc2lnbmF0dXJlcyBpcyBhbHdheXMgcHJveGllZCAod2hldGhlciBtYXJrZWQgb3Igbm90KVxuICAgIChUIGV4dGVuZHMgeyBuZXcgKC4uLmFyZ3M6IGluZmVyIFRBcmd1bWVudHMpOiBpbmZlciBUSW5zdGFuY2UgfVxuICAgICAgPyB7XG4gICAgICAgICAgbmV3IChcbiAgICAgICAgICAgIC4uLmFyZ3M6IHtcbiAgICAgICAgICAgICAgW0kgaW4ga2V5b2YgVEFyZ3VtZW50c106IFVucHJveHlPckNsb25lPFRBcmd1bWVudHNbSV0+O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk6IFByb21pc2lmeTxSZW1vdGU8VEluc3RhbmNlPj47XG4gICAgICAgIH1cbiAgICAgIDogdW5rbm93bikgJlxuICAgIC8vIEluY2x1ZGUgYWRkaXRpb25hbCBzcGVjaWFsIGNvbWxpbmsgbWV0aG9kcyBhdmFpbGFibGUgb24gdGhlIHByb3h5LlxuICAgIFByb3h5TWV0aG9kcztcblxuLyoqXG4gKiBFeHByZXNzZXMgdGhhdCBhIHR5cGUgY2FuIGJlIGVpdGhlciBhIHN5bmMgb3IgYXN5bmMuXG4gKi9cbnR5cGUgTWF5YmVQcm9taXNlPFQ+ID0gUHJvbWlzZTxUPiB8IFQ7XG5cbi8qKlxuICogVGFrZXMgdGhlIHJhdyB0eXBlIG9mIGEgcmVtb3RlIG9iamVjdCwgZnVuY3Rpb24gb3IgY2xhc3MgYXMgYSByZW1vdGUgdGhyZWFkIHdvdWxkIHNlZSBpdCB0aHJvdWdoIGEgcHJveHkgKGUuZy4gd2hlblxuICogcGFzc2VkIGluIGFzIGEgZnVuY3Rpb24gYXJndW1lbnQpIGFuZCByZXR1cm5zIHRoZSB0eXBlIHRoZSBsb2NhbCB0aHJlYWQgaGFzIHRvIHN1cHBseS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnZlcnNlIG9mIGBSZW1vdGU8VD5gLiBJdCB0YWtlcyBhIGBSZW1vdGU8VD5gIGFuZCByZXR1cm5zIGl0cyBvcmlnaW5hbCBpbnB1dCBgVGAuXG4gKi9cbmV4cG9ydCB0eXBlIExvY2FsPFQ+ID1cbiAgLy8gT21pdCB0aGUgc3BlY2lhbCBwcm94eSBtZXRob2RzICh0aGV5IGRvbid0IG5lZWQgdG8gYmUgc3VwcGxpZWQsIGNvbWxpbmsgYWRkcyB0aGVtKVxuICBPbWl0PExvY2FsT2JqZWN0PFQ+LCBrZXlvZiBQcm94eU1ldGhvZHM+ICZcbiAgICAvLyBIYW5kbGUgY2FsbCBzaWduYXR1cmVzIChpZiBwcmVzZW50KVxuICAgIChUIGV4dGVuZHMgKC4uLmFyZ3M6IGluZmVyIFRBcmd1bWVudHMpID0+IGluZmVyIFRSZXR1cm5cbiAgICAgID8gKFxuICAgICAgICAgIC4uLmFyZ3M6IHsgW0kgaW4ga2V5b2YgVEFyZ3VtZW50c106IFByb3h5T3JDbG9uZTxUQXJndW1lbnRzW0ldPiB9XG4gICAgICAgICkgPT4gLy8gVGhlIHJhdyBmdW5jdGlvbiBjb3VsZCBlaXRoZXIgYmUgc3luYyBvciBhc3luYywgYnV0IGlzIGFsd2F5cyBwcm94aWVkIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgTWF5YmVQcm9taXNlPFVucHJveHlPckNsb25lPFVucHJvbWlzaWZ5PFRSZXR1cm4+Pj5cbiAgICAgIDogdW5rbm93bikgJlxuICAgIC8vIEhhbmRsZSBjb25zdHJ1Y3Qgc2lnbmF0dXJlIChpZiBwcmVzZW50KVxuICAgIC8vIFRoZSByZXR1cm4gb2YgY29uc3RydWN0IHNpZ25hdHVyZXMgaXMgYWx3YXlzIHByb3hpZWQgKHdoZXRoZXIgbWFya2VkIG9yIG5vdClcbiAgICAoVCBleHRlbmRzIHsgbmV3ICguLi5hcmdzOiBpbmZlciBUQXJndW1lbnRzKTogaW5mZXIgVEluc3RhbmNlIH1cbiAgICAgID8ge1xuICAgICAgICAgIG5ldyAoXG4gICAgICAgICAgICAuLi5hcmdzOiB7XG4gICAgICAgICAgICAgIFtJIGluIGtleW9mIFRBcmd1bWVudHNdOiBQcm94eU9yQ2xvbmU8VEFyZ3VtZW50c1tJXT47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTogLy8gVGhlIHJhdyBjb25zdHJ1Y3RvciBjb3VsZCBlaXRoZXIgYmUgc3luYyBvciBhc3luYywgYnV0IGlzIGFsd2F5cyBwcm94aWVkIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICBNYXliZVByb21pc2U8TG9jYWw8VW5wcm9taXNpZnk8VEluc3RhbmNlPj4+O1xuICAgICAgICB9XG4gICAgICA6IHVua25vd24pO1xuXG5jb25zdCBpc09iamVjdCA9ICh2YWw6IHVua25vd24pOiB2YWwgaXMgb2JqZWN0ID0+XG4gICh0eXBlb2YgdmFsID09PSBcIm9iamVjdFwiICYmIHZhbCAhPT0gbnVsbCkgfHwgdHlwZW9mIHZhbCA9PT0gXCJmdW5jdGlvblwiO1xuXG4vKipcbiAqIEN1c3RvbWl6ZXMgdGhlIHNlcmlhbGl6YXRpb24gb2YgY2VydGFpbiB2YWx1ZXMgYXMgZGV0ZXJtaW5lZCBieSBgY2FuSGFuZGxlKClgLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIFRoZSBpbnB1dCB0eXBlIGJlaW5nIGhhbmRsZWQgYnkgdGhpcyB0cmFuc2ZlciBoYW5kbGVyLlxuICogQHRlbXBsYXRlIFMgVGhlIHNlcmlhbGl6ZWQgdHlwZSBzZW50IG92ZXIgdGhlIHdpcmUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmZXJIYW5kbGVyPFQsIFM+IHtcbiAgLyoqXG4gICAqIEdldHMgY2FsbGVkIGZvciBldmVyeSB2YWx1ZSB0byBkZXRlcm1pbmUgd2hldGhlciB0aGlzIHRyYW5zZmVyIGhhbmRsZXJcbiAgICogc2hvdWxkIHNlcmlhbGl6ZSB0aGUgdmFsdWUsIHdoaWNoIGluY2x1ZGVzIGNoZWNraW5nIHRoYXQgaXQgaXMgb2YgdGhlIHJpZ2h0XG4gICAqIHR5cGUgKGJ1dCBjYW4gcGVyZm9ybSBjaGVja3MgYmV5b25kIHRoYXQgYXMgd2VsbCkuXG4gICAqL1xuICBjYW5IYW5kbGUodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBUO1xuXG4gIC8qKlxuICAgKiBHZXRzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZSBpZiBgY2FuSGFuZGxlKClgIHJldHVybmVkIGB0cnVlYCB0byBwcm9kdWNlIGFcbiAgICogdmFsdWUgdGhhdCBjYW4gYmUgc2VudCBpbiBhIG1lc3NhZ2UsIGNvbnNpc3Rpbmcgb2Ygc3RydWN0dXJlZC1jbG9uZWFibGVcbiAgICogdmFsdWVzIGFuZC9vciB0cmFuc2ZlcnJhYmxlIG9iamVjdHMuXG4gICAqL1xuICBzZXJpYWxpemUodmFsdWU6IFQpOiBbUywgVHJhbnNmZXJhYmxlW11dO1xuXG4gIC8qKlxuICAgKiBHZXRzIGNhbGxlZCB0byBkZXNlcmlhbGl6ZSBhbiBpbmNvbWluZyB2YWx1ZSB0aGF0IHdhcyBzZXJpYWxpemVkIGluIHRoZVxuICAgKiBvdGhlciB0aHJlYWQgd2l0aCB0aGlzIHRyYW5zZmVyIGhhbmRsZXIgKGtub3duIHRocm91Z2ggdGhlIG5hbWUgaXQgd2FzXG4gICAqIHJlZ2lzdGVyZWQgdW5kZXIpLlxuICAgKi9cbiAgZGVzZXJpYWxpemUodmFsdWU6IFMpOiBUO1xufVxuXG4vKipcbiAqIEludGVybmFsIHRyYW5zZmVyIGhhbmRsZSB0byBoYW5kbGUgb2JqZWN0cyBtYXJrZWQgdG8gcHJveHkuXG4gKi9cbmNvbnN0IHByb3h5VHJhbnNmZXJIYW5kbGVyOiBUcmFuc2ZlckhhbmRsZXI8b2JqZWN0LCBNZXNzYWdlUG9ydD4gPSB7XG4gIGNhbkhhbmRsZTogKHZhbCk6IHZhbCBpcyBQcm94eU1hcmtlZCA9PlxuICAgIGlzT2JqZWN0KHZhbCkgJiYgKHZhbCBhcyBQcm94eU1hcmtlZClbcHJveHlNYXJrZXJdLFxuICBzZXJpYWxpemUob2JqKSB7XG4gICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIGV4cG9zZShvYmosIHBvcnQxKTtcbiAgICByZXR1cm4gW3BvcnQyLCBbcG9ydDJdXTtcbiAgfSxcbiAgZGVzZXJpYWxpemUocG9ydCkge1xuICAgIHBvcnQuc3RhcnQoKTtcbiAgICByZXR1cm4gd3JhcChwb3J0KTtcbiAgfSxcbn07XG5cbmludGVyZmFjZSBUaHJvd25WYWx1ZSB7XG4gIFt0aHJvd01hcmtlcl06IHVua25vd247IC8vIGp1c3QgbmVlZHMgdG8gYmUgcHJlc2VudFxuICB2YWx1ZTogdW5rbm93bjtcbn1cbnR5cGUgU2VyaWFsaXplZFRocm93blZhbHVlID1cbiAgfCB7IGlzRXJyb3I6IHRydWU7IHZhbHVlOiBFcnJvciB9XG4gIHwgeyBpc0Vycm9yOiBmYWxzZTsgdmFsdWU6IHVua25vd24gfTtcblxuLyoqXG4gKiBJbnRlcm5hbCB0cmFuc2ZlciBoYW5kbGVyIHRvIGhhbmRsZSB0aHJvd24gZXhjZXB0aW9ucy5cbiAqL1xuY29uc3QgdGhyb3dUcmFuc2ZlckhhbmRsZXI6IFRyYW5zZmVySGFuZGxlcjxcbiAgVGhyb3duVmFsdWUsXG4gIFNlcmlhbGl6ZWRUaHJvd25WYWx1ZVxuPiA9IHtcbiAgY2FuSGFuZGxlOiAodmFsdWUpOiB2YWx1ZSBpcyBUaHJvd25WYWx1ZSA9PlxuICAgIGlzT2JqZWN0KHZhbHVlKSAmJiB0aHJvd01hcmtlciBpbiB2YWx1ZSxcbiAgc2VyaWFsaXplKHsgdmFsdWUgfSkge1xuICAgIGxldCBzZXJpYWxpemVkOiBTZXJpYWxpemVkVGhyb3duVmFsdWU7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIHNlcmlhbGl6ZWQgPSB7XG4gICAgICAgIGlzRXJyb3I6IHRydWUsXG4gICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgbWVzc2FnZTogdmFsdWUubWVzc2FnZSxcbiAgICAgICAgICBuYW1lOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgIHN0YWNrOiB2YWx1ZS5zdGFjayxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlcmlhbGl6ZWQgPSB7IGlzRXJyb3I6IGZhbHNlLCB2YWx1ZSB9O1xuICAgIH1cbiAgICByZXR1cm4gW3NlcmlhbGl6ZWQsIFtdXTtcbiAgfSxcbiAgZGVzZXJpYWxpemUoc2VyaWFsaXplZCkge1xuICAgIGlmIChzZXJpYWxpemVkLmlzRXJyb3IpIHtcbiAgICAgIHRocm93IE9iamVjdC5hc3NpZ24oXG4gICAgICAgIG5ldyBFcnJvcihzZXJpYWxpemVkLnZhbHVlLm1lc3NhZ2UpLFxuICAgICAgICBzZXJpYWxpemVkLnZhbHVlXG4gICAgICApO1xuICAgIH1cbiAgICB0aHJvdyBzZXJpYWxpemVkLnZhbHVlO1xuICB9LFxufTtcblxuLyoqXG4gKiBBbGxvd3MgY3VzdG9taXppbmcgdGhlIHNlcmlhbGl6YXRpb24gb2YgY2VydGFpbiB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB0cmFuc2ZlckhhbmRsZXJzID0gbmV3IE1hcDxcbiAgc3RyaW5nLFxuICBUcmFuc2ZlckhhbmRsZXI8dW5rbm93biwgdW5rbm93bj5cbj4oW1xuICBbXCJwcm94eVwiLCBwcm94eVRyYW5zZmVySGFuZGxlcl0sXG4gIFtcInRocm93XCIsIHRocm93VHJhbnNmZXJIYW5kbGVyXSxcbl0pO1xuXG5mdW5jdGlvbiBpc0FsbG93ZWRPcmlnaW4oXG4gIGFsbG93ZWRPcmlnaW5zOiAoc3RyaW5nIHwgUmVnRXhwKVtdLFxuICBvcmlnaW46IHN0cmluZ1xuKTogYm9vbGVhbiB7XG4gIGZvciAoY29uc3QgYWxsb3dlZE9yaWdpbiBvZiBhbGxvd2VkT3JpZ2lucykge1xuICAgIGlmIChvcmlnaW4gPT09IGFsbG93ZWRPcmlnaW4gfHwgYWxsb3dlZE9yaWdpbiA9PT0gXCIqXCIpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoYWxsb3dlZE9yaWdpbiBpbnN0YW5jZW9mIFJlZ0V4cCAmJiBhbGxvd2VkT3JpZ2luLnRlc3Qob3JpZ2luKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4cG9zZShcbiAgb2JqOiBhbnksXG4gIGVwOiBFbmRwb2ludCA9IGdsb2JhbFRoaXMgYXMgYW55LFxuICBhbGxvd2VkT3JpZ2luczogKHN0cmluZyB8IFJlZ0V4cClbXSA9IFtcIipcIl1cbikge1xuICBlcC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBjYWxsYmFjayhldjogTWVzc2FnZUV2ZW50KSB7XG4gICAgaWYgKCFldiB8fCAhZXYuZGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWlzQWxsb3dlZE9yaWdpbihhbGxvd2VkT3JpZ2lucywgZXYub3JpZ2luKSkge1xuICAgICAgY29uc29sZS53YXJuKGBJbnZhbGlkIG9yaWdpbiAnJHtldi5vcmlnaW59JyBmb3IgY29tbGluayBwcm94eWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7IGlkLCB0eXBlLCBwYXRoIH0gPSB7XG4gICAgICBwYXRoOiBbXSBhcyBzdHJpbmdbXSxcbiAgICAgIC4uLihldi5kYXRhIGFzIE1lc3NhZ2UpLFxuICAgIH07XG4gICAgY29uc3QgYXJndW1lbnRMaXN0ID0gKGV2LmRhdGEuYXJndW1lbnRMaXN0IHx8IFtdKS5tYXAoZnJvbVdpcmVWYWx1ZSk7XG4gICAgbGV0IHJldHVyblZhbHVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLnNsaWNlKDAsIC0xKS5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gb2JqW3Byb3BdLCBvYmopO1xuICAgICAgY29uc3QgcmF3VmFsdWUgPSBwYXRoLnJlZHVjZSgob2JqLCBwcm9wKSA9PiBvYmpbcHJvcF0sIG9iaik7XG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5HRVQ6XG4gICAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSByYXdWYWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuU0VUOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHBhcmVudFtwYXRoLnNsaWNlKC0xKVswXV0gPSBmcm9tV2lyZVZhbHVlKGV2LmRhdGEudmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5BUFBMWTpcbiAgICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHJhd1ZhbHVlLmFwcGx5KHBhcmVudCwgYXJndW1lbnRMaXN0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuQ09OU1RSVUNUOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbmV3IHJhd1ZhbHVlKC4uLmFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHByb3h5KHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuRU5EUE9JTlQ6XG4gICAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICAgICAgZXhwb3NlKG9iaiwgcG9ydDIpO1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cmFuc2Zlcihwb3J0MSwgW3BvcnQxXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLlJFTEVBU0U6XG4gICAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGNhdGNoICh2YWx1ZSkge1xuICAgICAgcmV0dXJuVmFsdWUgPSB7IHZhbHVlLCBbdGhyb3dNYXJrZXJdOiAwIH07XG4gICAgfVxuICAgIFByb21pc2UucmVzb2x2ZShyZXR1cm5WYWx1ZSlcbiAgICAgIC5jYXRjaCgodmFsdWUpID0+IHtcbiAgICAgICAgcmV0dXJuIHsgdmFsdWUsIFt0aHJvd01hcmtlcl06IDAgfTtcbiAgICAgIH0pXG4gICAgICAudGhlbigocmV0dXJuVmFsdWUpID0+IHtcbiAgICAgICAgY29uc3QgW3dpcmVWYWx1ZSwgdHJhbnNmZXJhYmxlc10gPSB0b1dpcmVWYWx1ZShyZXR1cm5WYWx1ZSk7XG4gICAgICAgIGVwLnBvc3RNZXNzYWdlKHsgLi4ud2lyZVZhbHVlLCBpZCB9LCB0cmFuc2ZlcmFibGVzKTtcbiAgICAgICAgaWYgKHR5cGUgPT09IE1lc3NhZ2VUeXBlLlJFTEVBU0UpIHtcbiAgICAgICAgICAvLyBkZXRhY2ggYW5kIGRlYWN0aXZlIGFmdGVyIHNlbmRpbmcgcmVsZWFzZSByZXNwb25zZSBhYm92ZS5cbiAgICAgICAgICBlcC5yZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYWxsYmFjayBhcyBhbnkpO1xuICAgICAgICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICAgICAgICAgIGlmIChmaW5hbGl6ZXIgaW4gb2JqICYmIHR5cGVvZiBvYmpbZmluYWxpemVyXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBvYmpbZmluYWxpemVyXSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgLy8gU2VuZCBTZXJpYWxpemF0aW9uIEVycm9yIFRvIENhbGxlclxuICAgICAgICBjb25zdCBbd2lyZVZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHtcbiAgICAgICAgICB2YWx1ZTogbmV3IFR5cGVFcnJvcihcIlVuc2VyaWFsaXphYmxlIHJldHVybiB2YWx1ZVwiKSxcbiAgICAgICAgICBbdGhyb3dNYXJrZXJdOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgZXAucG9zdE1lc3NhZ2UoeyAuLi53aXJlVmFsdWUsIGlkIH0sIHRyYW5zZmVyYWJsZXMpO1xuICAgICAgfSk7XG4gIH0gYXMgYW55KTtcbiAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgZXAuc3RhcnQoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc01lc3NhZ2VQb3J0KGVuZHBvaW50OiBFbmRwb2ludCk6IGVuZHBvaW50IGlzIE1lc3NhZ2VQb3J0IHtcbiAgcmV0dXJuIGVuZHBvaW50LmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTWVzc2FnZVBvcnRcIjtcbn1cblxuZnVuY3Rpb24gY2xvc2VFbmRQb2ludChlbmRwb2ludDogRW5kcG9pbnQpIHtcbiAgaWYgKGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQpKSBlbmRwb2ludC5jbG9zZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JhcDxUPihlcDogRW5kcG9pbnQsIHRhcmdldD86IGFueSk6IFJlbW90ZTxUPiB7XG4gIHJldHVybiBjcmVhdGVQcm94eTxUPihlcCwgW10sIHRhcmdldCkgYXMgYW55O1xufVxuXG5mdW5jdGlvbiB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1JlbGVhc2VkOiBib29sZWFuKSB7XG4gIGlmIChpc1JlbGVhc2VkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUHJveHkgaGFzIGJlZW4gcmVsZWFzZWQgYW5kIGlzIG5vdCB1c2VhYmxlXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbGVhc2VFbmRwb2ludChlcDogRW5kcG9pbnQpIHtcbiAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICB0eXBlOiBNZXNzYWdlVHlwZS5SRUxFQVNFLFxuICB9KS50aGVuKCgpID0+IHtcbiAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgfSk7XG59XG5cbmludGVyZmFjZSBGaW5hbGl6YXRpb25SZWdpc3RyeTxUPiB7XG4gIG5ldyAoY2I6IChoZWxkVmFsdWU6IFQpID0+IHZvaWQpOiBGaW5hbGl6YXRpb25SZWdpc3RyeTxUPjtcbiAgcmVnaXN0ZXIoXG4gICAgd2Vha0l0ZW06IG9iamVjdCxcbiAgICBoZWxkVmFsdWU6IFQsXG4gICAgdW5yZWdpc3RlclRva2VuPzogb2JqZWN0IHwgdW5kZWZpbmVkXG4gICk6IHZvaWQ7XG4gIHVucmVnaXN0ZXIodW5yZWdpc3RlclRva2VuOiBvYmplY3QpOiB2b2lkO1xufVxuZGVjbGFyZSB2YXIgRmluYWxpemF0aW9uUmVnaXN0cnk6IEZpbmFsaXphdGlvblJlZ2lzdHJ5PEVuZHBvaW50PjtcblxuY29uc3QgcHJveHlDb3VudGVyID0gbmV3IFdlYWtNYXA8RW5kcG9pbnQsIG51bWJlcj4oKTtcbmNvbnN0IHByb3h5RmluYWxpemVycyA9XG4gIFwiRmluYWxpemF0aW9uUmVnaXN0cnlcIiBpbiBnbG9iYWxUaGlzICYmXG4gIG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoZXA6IEVuZHBvaW50KSA9PiB7XG4gICAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgLSAxO1xuICAgIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgICBpZiAobmV3Q291bnQgPT09IDApIHtcbiAgICAgIHJlbGVhc2VFbmRwb2ludChlcCk7XG4gICAgfVxuICB9KTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJQcm94eShwcm94eTogb2JqZWN0LCBlcDogRW5kcG9pbnQpIHtcbiAgY29uc3QgbmV3Q291bnQgPSAocHJveHlDb3VudGVyLmdldChlcCkgfHwgMCkgKyAxO1xuICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gIGlmIChwcm94eUZpbmFsaXplcnMpIHtcbiAgICBwcm94eUZpbmFsaXplcnMucmVnaXN0ZXIocHJveHksIGVwLCBwcm94eSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdW5yZWdpc3RlclByb3h5KHByb3h5OiBvYmplY3QpIHtcbiAgaWYgKHByb3h5RmluYWxpemVycykge1xuICAgIHByb3h5RmluYWxpemVycy51bnJlZ2lzdGVyKHByb3h5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVQcm94eTxUPihcbiAgZXA6IEVuZHBvaW50LFxuICBwYXRoOiAoc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sKVtdID0gW10sXG4gIHRhcmdldDogb2JqZWN0ID0gZnVuY3Rpb24gKCkge31cbik6IFJlbW90ZTxUPiB7XG4gIGxldCBpc1Byb3h5UmVsZWFzZWQgPSBmYWxzZTtcbiAgY29uc3QgcHJveHkgPSBuZXcgUHJveHkodGFyZ2V0LCB7XG4gICAgZ2V0KF90YXJnZXQsIHByb3ApIHtcbiAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICBpZiAocHJvcCA9PT0gcmVsZWFzZVByb3h5KSB7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgdW5yZWdpc3RlclByb3h5KHByb3h5KTtcbiAgICAgICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgICAgICAgIGlzUHJveHlSZWxlYXNlZCA9IHRydWU7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAocHJvcCA9PT0gXCJ0aGVuXCIpIHtcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHsgdGhlbjogKCkgPT4gcHJveHkgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByID0gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShlcCwge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLkdFVCxcbiAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHIudGhlbi5iaW5kKHIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBbLi4ucGF0aCwgcHJvcF0pO1xuICAgIH0sXG4gICAgc2V0KF90YXJnZXQsIHByb3AsIHJhd1ZhbHVlKSB7XG4gICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgLy8gRklYTUU6IEVTNiBQcm94eSBIYW5kbGVyIGBzZXRgIG1ldGhvZHMgYXJlIHN1cHBvc2VkIHRvIHJldHVybiBhXG4gICAgICAvLyBib29sZWFuLiBUbyBzaG93IGdvb2Qgd2lsbCwgd2UgcmV0dXJuIHRydWUgYXN5bmNocm9ub3VzbHkgXHUwMEFGXFxfKFx1MzBDNClfL1x1MDBBRlxuICAgICAgY29uc3QgW3ZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHJhd1ZhbHVlKTtcbiAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKFxuICAgICAgICBlcCxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IE1lc3NhZ2VUeXBlLlNFVCxcbiAgICAgICAgICBwYXRoOiBbLi4ucGF0aCwgcHJvcF0ubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzXG4gICAgICApLnRoZW4oZnJvbVdpcmVWYWx1ZSkgYXMgYW55O1xuICAgIH0sXG4gICAgYXBwbHkoX3RhcmdldCwgX3RoaXNBcmcsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgIGNvbnN0IGxhc3QgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoKGxhc3QgYXMgYW55KSA9PT0gY3JlYXRlRW5kcG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5FTkRQT0lOVCxcbiAgICAgICAgfSkudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgIH1cbiAgICAgIC8vIFdlIGp1c3QgcHJldGVuZCB0aGF0IGBiaW5kKClgIGRpZG5cdTIwMTl0IGhhcHBlbi5cbiAgICAgIGlmIChsYXN0ID09PSBcImJpbmRcIikge1xuICAgICAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIHBhdGguc2xpY2UoMCwgLTEpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoXG4gICAgICAgIGVwLFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogTWVzc2FnZVR5cGUuQVBQTFksXG4gICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzXG4gICAgICApLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgfSxcbiAgICBjb25zdHJ1Y3QoX3RhcmdldCwgcmF3QXJndW1lbnRMaXN0KSB7XG4gICAgICB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1Byb3h5UmVsZWFzZWQpO1xuICAgICAgY29uc3QgW2FyZ3VtZW50TGlzdCwgdHJhbnNmZXJhYmxlc10gPSBwcm9jZXNzQXJndW1lbnRzKHJhd0FyZ3VtZW50TGlzdCk7XG4gICAgICByZXR1cm4gcmVxdWVzdFJlc3BvbnNlTWVzc2FnZShcbiAgICAgICAgZXAsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBNZXNzYWdlVHlwZS5DT05TVFJVQ1QsXG4gICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICB9LFxuICAgICAgICB0cmFuc2ZlcmFibGVzXG4gICAgICApLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgfSxcbiAgfSk7XG4gIHJlZ2lzdGVyUHJveHkocHJveHksIGVwKTtcbiAgcmV0dXJuIHByb3h5IGFzIGFueTtcbn1cblxuZnVuY3Rpb24gbXlGbGF0PFQ+KGFycjogKFQgfCBUW10pW10pOiBUW10ge1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgYXJyKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc0FyZ3VtZW50cyhhcmd1bWVudExpc3Q6IGFueVtdKTogW1dpcmVWYWx1ZVtdLCBUcmFuc2ZlcmFibGVbXV0ge1xuICBjb25zdCBwcm9jZXNzZWQgPSBhcmd1bWVudExpc3QubWFwKHRvV2lyZVZhbHVlKTtcbiAgcmV0dXJuIFtwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzBdKSwgbXlGbGF0KHByb2Nlc3NlZC5tYXAoKHYpID0+IHZbMV0pKV07XG59XG5cbmNvbnN0IHRyYW5zZmVyQ2FjaGUgPSBuZXcgV2Vha01hcDxhbnksIFRyYW5zZmVyYWJsZVtdPigpO1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZmVyPFQ+KG9iajogVCwgdHJhbnNmZXJzOiBUcmFuc2ZlcmFibGVbXSk6IFQge1xuICB0cmFuc2ZlckNhY2hlLnNldChvYmosIHRyYW5zZmVycyk7XG4gIHJldHVybiBvYmo7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm94eTxUIGV4dGVuZHMge30+KG9iajogVCk6IFQgJiBQcm94eU1hcmtlZCB7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKG9iaiwgeyBbcHJveHlNYXJrZXJdOiB0cnVlIH0pIGFzIGFueTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpbmRvd0VuZHBvaW50KFxuICB3OiBQb3N0TWVzc2FnZVdpdGhPcmlnaW4sXG4gIGNvbnRleHQ6IEV2ZW50U291cmNlID0gZ2xvYmFsVGhpcyxcbiAgdGFyZ2V0T3JpZ2luID0gXCIqXCJcbik6IEVuZHBvaW50IHtcbiAgcmV0dXJuIHtcbiAgICBwb3N0TWVzc2FnZTogKG1zZzogYW55LCB0cmFuc2ZlcmFibGVzOiBUcmFuc2ZlcmFibGVbXSkgPT5cbiAgICAgIHcucG9zdE1lc3NhZ2UobXNnLCB0YXJnZXRPcmlnaW4sIHRyYW5zZmVyYWJsZXMpLFxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGNvbnRleHQucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICB9O1xufVxuXG5mdW5jdGlvbiB0b1dpcmVWYWx1ZSh2YWx1ZTogYW55KTogW1dpcmVWYWx1ZSwgVHJhbnNmZXJhYmxlW11dIHtcbiAgZm9yIChjb25zdCBbbmFtZSwgaGFuZGxlcl0gb2YgdHJhbnNmZXJIYW5kbGVycykge1xuICAgIGlmIChoYW5kbGVyLmNhbkhhbmRsZSh2YWx1ZSkpIHtcbiAgICAgIGNvbnN0IFtzZXJpYWxpemVkVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gaGFuZGxlci5zZXJpYWxpemUodmFsdWUpO1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IFdpcmVWYWx1ZVR5cGUuSEFORExFUixcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIHZhbHVlOiBzZXJpYWxpemVkVmFsdWUsXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZmVyYWJsZXMsXG4gICAgICBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIHR5cGU6IFdpcmVWYWx1ZVR5cGUuUkFXLFxuICAgICAgdmFsdWUsXG4gICAgfSxcbiAgICB0cmFuc2ZlckNhY2hlLmdldCh2YWx1ZSkgfHwgW10sXG4gIF07XG59XG5cbmZ1bmN0aW9uIGZyb21XaXJlVmFsdWUodmFsdWU6IFdpcmVWYWx1ZSk6IGFueSB7XG4gIHN3aXRjaCAodmFsdWUudHlwZSkge1xuICAgIGNhc2UgV2lyZVZhbHVlVHlwZS5IQU5ETEVSOlxuICAgICAgcmV0dXJuIHRyYW5zZmVySGFuZGxlcnMuZ2V0KHZhbHVlLm5hbWUpIS5kZXNlcmlhbGl6ZSh2YWx1ZS52YWx1ZSk7XG4gICAgY2FzZSBXaXJlVmFsdWVUeXBlLlJBVzpcbiAgICAgIHJldHVybiB2YWx1ZS52YWx1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKFxuICBlcDogRW5kcG9pbnQsXG4gIG1zZzogTWVzc2FnZSxcbiAgdHJhbnNmZXJzPzogVHJhbnNmZXJhYmxlW11cbik6IFByb21pc2U8V2lyZVZhbHVlPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGlkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgZXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gbChldjogTWVzc2FnZUV2ZW50KSB7XG4gICAgICBpZiAoIWV2LmRhdGEgfHwgIWV2LmRhdGEuaWQgfHwgZXYuZGF0YS5pZCAhPT0gaWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXAucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbCBhcyBhbnkpO1xuICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICB9IGFzIGFueSk7XG4gICAgaWYgKGVwLnN0YXJ0KSB7XG4gICAgICBlcC5zdGFydCgpO1xuICAgIH1cbiAgICBlcC5wb3N0TWVzc2FnZSh7IGlkLCAuLi5tc2cgfSwgdHJhbnNmZXJzKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpOiBzdHJpbmcge1xuICByZXR1cm4gbmV3IEFycmF5KDQpXG4gICAgLmZpbGwoMClcbiAgICAubWFwKCgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKS50b1N0cmluZygxNikpXG4gICAgLmpvaW4oXCItXCIpO1xufVxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRVaW50MzIoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogbnVtYmVyIHsgcmV0dXJuIGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuZ2V0VWludDMyKHB0ciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRVaW50OChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5nZXRVaW50OChwdHIpOyB9XHJcbiIsICJpbXBvcnQgeyByZWFkVWludDE2IH0gZnJvbSBcIi4uL3V0aWwvcmVhZC11aW50MTYuanNcIjtcclxuaW1wb3J0IHsgcmVhZFVpbnQzMiB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDMyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50OCB9IGZyb20gXCIuLi91dGlsL3JlYWQtdWludDguanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG4vKipcclxuICogVE9ETzogQ2FuJ3QgQysrIGlkZW50aWZpZXJzIGluY2x1ZGUgbm9uLUFTQ0lJIGNoYXJhY3RlcnM/IFxyXG4gKiBXaHkgZG8gYWxsIHRoZSB0eXBlIGRlY29kaW5nIGZ1bmN0aW9ucyB1c2UgdGhpcz9cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkTGF0aW4xU3RyaW5nKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGxldCByZXQgPSBcIlwiO1xyXG4gICAgbGV0IG5leHRCeXRlOiBudW1iZXJcclxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25kLWFzc2lnblxyXG4gICAgd2hpbGUgKG5leHRCeXRlID0gcmVhZFVpbnQ4KGltcGwsIHB0cisrKSkge1xyXG4gICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHRCeXRlKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbi8vIE5vdGU6IEluIFdvcmtsZXRzLCBgVGV4dERlY29kZXJgIGFuZCBgVGV4dEVuY29kZXJgIG5lZWQgYSBwb2x5ZmlsbC5cclxuY29uc3QgdXRmOERlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKTtcclxuY29uc3QgdXRmMTZEZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKFwidXRmLTE2bGVcIik7XHJcbmNvbnN0IHV0ZjhFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIG51bGwtdGVybWluYXRlZCBVVEYtOCBzdHJpbmcuIElmIHlvdSBrbm93IHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgeW91IGNhbiBzYXZlIHRpbWUgYnkgdXNpbmcgYHV0ZjhUb1N0cmluZ0xgIGluc3RlYWQuXHJcbiAqIFxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIHB0ciBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdXRmOFRvU3RyaW5nWihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzdGFydCA9IHB0cjtcclxuICAgIGxldCBlbmQgPSBzdGFydDtcclxuXHJcbiAgICB3aGlsZSAocmVhZFVpbnQ4KGltcGwsIGVuZCsrKSAhPSAwKTtcclxuXHJcbiAgICByZXR1cm4gdXRmOFRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHV0ZjE2VG9TdHJpbmdaKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gcHRyO1xyXG4gICAgbGV0IGVuZCA9IHN0YXJ0O1xyXG5cclxuICAgIHdoaWxlIChyZWFkVWludDE2KGltcGwsIGVuZCkgIT0gMCkgeyBlbmQgKz0gMjsgfVxyXG5cclxuICAgIHJldHVybiB1dGYxNlRvU3RyaW5nTChpbXBsLCBzdGFydCwgZW5kIC0gc3RhcnQgLSAxKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMzJUb1N0cmluZ1ooaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgc3RhcnQgPSBwdHI7XHJcbiAgICBsZXQgZW5kID0gc3RhcnQ7XHJcblxyXG4gICAgd2hpbGUgKHJlYWRVaW50MzIoaW1wbCwgZW5kKSAhPSAwKSB7IGVuZCArPSA0OyB9XHJcblxyXG4gICAgcmV0dXJuIHV0ZjMyVG9TdHJpbmdMKGltcGwsIHN0YXJ0LCBlbmQgLSBzdGFydCAtIDEpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdXRmOFRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgYnl0ZUNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHV0ZjhEZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCBieXRlQ291bnQpKTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gdXRmMTZUb1N0cmluZ0woaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHdjaGFyQ291bnQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdXRmMTZEZWNvZGVyLmRlY29kZShuZXcgVWludDhBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCB3Y2hhckNvdW50ICogMikpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1dGYzMlRvU3RyaW5nTChpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgd2NoYXJDb3VudDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGNoYXJzID0gKG5ldyBVaW50MzJBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCB3Y2hhckNvdW50KSk7XHJcbiAgICBsZXQgcmV0ID0gXCJcIjtcclxuICAgIGZvciAoY29uc3QgY2ggb2YgY2hhcnMpIHtcclxuICAgICAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjaCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nVG9VdGY4KHN0cmluZzogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xyXG4gICAgcmV0dXJuIHV0ZjhFbmNvZGVyLmVuY29kZShzdHJpbmcpLmJ1ZmZlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmMTYoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICBjb25zdCByZXQgPSBuZXcgVWludDE2QXJyYXkobmV3IEFycmF5QnVmZmVyKHN0cmluZy5sZW5ndGgpKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmV0Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgcmV0W2ldID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0LmJ1ZmZlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVXRmMzIoc3RyaW5nOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XHJcbiAgICBsZXQgdHJ1ZUxlbmd0aCA9IDA7XHJcbiAgICAvLyBUaGUgd29yc3QtY2FzZSBzY2VuYXJpbyBpcyBhIHN0cmluZyBvZiBhbGwgc3Vycm9nYXRlLXBhaXJzLCBzbyBhbGxvY2F0ZSB0aGF0LlxyXG4gICAgLy8gV2UnbGwgc2hyaW5rIGl0IHRvIHRoZSBhY3R1YWwgc2l6ZSBhZnRlcndhcmRzLlxyXG4gICAgY29uc3QgdGVtcCA9IG5ldyBVaW50MzJBcnJheShuZXcgQXJyYXlCdWZmZXIoc3RyaW5nLmxlbmd0aCAqIDQgKiAyKSk7XHJcbiAgICBmb3IgKGNvbnN0IGNoIG9mIHN0cmluZykge1xyXG4gICAgICAgIHRlbXBbdHJ1ZUxlbmd0aF0gPSBjaC5jb2RlUG9pbnRBdCgwKSE7XHJcbiAgICAgICAgKyt0cnVlTGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0ZW1wLmJ1ZmZlci5zbGljZSgwLCB0cnVlTGVuZ3RoICogNCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVc2VkIHdoZW4gc2VuZGluZyBzdHJpbmdzIGZyb20gSlMgdG8gV0FTTS5cclxuICogXHJcbiAqIFxyXG4gKiBAcGFyYW0gc3RyIFxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsZW5ndGhCeXRlc1VURjgoc3RyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgbGV0IGxlbiA9IDA7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIGNvbnN0IGMgPSBzdHIuY29kZVBvaW50QXQoaSkhO1xyXG4gICAgICAgIGlmIChjIDw9IDB4N0YpXHJcbiAgICAgICAgICAgIGxlbisrO1xyXG4gICAgICAgIGVsc2UgaWYgKGMgPD0gMHg3RkYpXHJcbiAgICAgICAgICAgIGxlbiArPSAyO1xyXG4gICAgICAgIGVsc2UgaWYgKGMgPD0gMHg3RkZGKVxyXG4gICAgICAgICAgICBsZW4gKz0gMztcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbGVuICs9IDQ7XHJcbiAgICAgICAgICAgICsraTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVuO1xyXG59IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyByZWFkTGF0aW4xU3RyaW5nIH0gZnJvbSBcIi4uL3N0cmluZy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVyaW5nIGEgdHlwZSBpcyBhbiBhc3luYyBmdW5jdGlvbiBjYWxsZWQgYnkgYSBzeW5jIGZ1bmN0aW9uLiBUaGlzIGhhbmRsZXMgdGhlIGNvbnZlcnNpb24sIGFkZGluZyB0aGUgcHJvbWlzZSB0byBgQWxsRW1iaW5kUHJvbWlzZXNgLlxyXG4gKiBcclxuICogQWxzbywgYmVjYXVzZSBldmVyeSBzaW5nbGUgcmVnaXN0cmF0aW9uIGNvbWVzIHdpdGggYSBuYW1lIHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkLCB0aGlzIGFsc28gcGFyc2VzIHRoYXQgbmFtZSBmb3IgeW91LlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXIoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgbmFtZVB0cjogbnVtYmVyLCBmdW5jOiAobmFtZTogc3RyaW5nKSA9PiAodm9pZCB8IFByb21pc2U8dm9pZD4pKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUoaW1wbCwgcmVhZExhdGluMVN0cmluZyhpbXBsLCBuYW1lUHRyKSwgZnVuYyk7XHJcbn1cclxuXHJcbi8qKiBcclxuICogU2FtZSBhcyBgX2VtYmluZF9yZWdpc3RlcmAsIGJ1dCBmb3Iga25vd24gKG9yIHN5bnRoZXRpYykgbmFtZXMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9rbm93bl9uYW1lKF9pbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBuYW1lOiBzdHJpbmcsIGZ1bmM6IChuYW1lOiBzdHJpbmcpID0+ICh2b2lkIHwgUHJvbWlzZTx2b2lkPikpOiB2b2lkIHtcclxuXHJcbiAgICBjb25zdCBwcm9taXNlOiBQcm9taXNlPHZvaWQ+ID0gKGFzeW5jICgpID0+IHtcclxuICAgICAgICBsZXQgaGFuZGxlID0gMDtcclxuICAgICAgICAvLyBGdW4gZmFjdDogc2V0VGltZW91dCBkb2Vzbid0IGV4aXN0IGluIFdvcmtsZXRzISBcclxuICAgICAgICAvLyBJIGd1ZXNzIGl0IHZhZ3VlbHkgbWFrZXMgc2Vuc2UgaW4gYSBcImRldGVybWluaXNtIGlzIGdvb2RcIiB3YXksIFxyXG4gICAgICAgIC8vIGJ1dCBpdCBhbHNvIHNlZW1zIGdlbmVyYWxseSB1c2VmdWwgdGhlcmU/XHJcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKVxyXG4gICAgICAgICAgICBoYW5kbGUgPSBzZXRUaW1lb3V0KCgpID0+IHsgY29uc29sZS53YXJuKGBUaGUgZnVuY3Rpb24gXCIke25hbWV9XCIgdXNlcyBhbiB1bnN1cHBvcnRlZCBhcmd1bWVudCBvciByZXR1cm4gdHlwZSwgYXMgaXRzIGRlcGVuZGVuY2llcyBhcmUgbm90IHJlc29sdmluZy4gSXQncyB1bmxpa2VseSB0aGUgZW1iaW5kIHByb21pc2Ugd2lsbCByZXNvbHZlLmApOyB9LCAxMDAwKTtcclxuICAgICAgICBhd2FpdCBmdW5jKG5hbWUpO1xyXG4gICAgICAgIGlmIChoYW5kbGUpXHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xyXG4gICAgfSkoKTtcclxuXHJcbiAgICBBbGxFbWJpbmRQcm9taXNlcy5wdXNoKHByb21pc2UpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXdhaXRBbGxFbWJpbmQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChBbGxFbWJpbmRQcm9taXNlcyk7XHJcbn1cclxuXHJcbmNvbnN0IEFsbEVtYmluZFByb21pc2VzID0gbmV3IEFycmF5PFByb21pc2U8dm9pZD4+KCk7XHJcblxyXG4iLCAiaW1wb3J0IHsgYXdhaXRBbGxFbWJpbmQgfSBmcm9tIFwiLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFdmVudFR5cGVzTWFwIH0gZnJvbSBcIi4vX3ByaXZhdGUvZXZlbnQtdHlwZXMtbWFwLmpzXCI7XHJcbmltcG9ydCB7IHR5cGUgS25vd25FeHBvcnRzLCB0eXBlIEtub3duSW1wb3J0cyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IHR5cGUgUm9sbHVwV2FzbVByb21pc2U8SSBleHRlbmRzIEtub3duSW1wb3J0cyA9IEtub3duSW1wb3J0cz4gPSAoaW1wb3J0cz86IEkpID0+IFByb21pc2U8V2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2U+O1xyXG5cclxuXHJcblxyXG5pbnRlcmZhY2UgSW5zdGFudGlhdGVkV2FzbUV2ZW50VGFyZ2V0IGV4dGVuZHMgRXZlbnRUYXJnZXQge1xyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcjxLIGV4dGVuZHMga2V5b2YgRXZlbnRUeXBlc01hcD4odHlwZTogSywgbGlzdGVuZXI6ICh0aGlzOiBGaWxlUmVhZGVyLCBldjogRXZlbnRUeXBlc01hcFtLXSkgPT4gdW5rbm93biwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHZvaWQ7XHJcbiAgICBhZGRFdmVudExpc3RlbmVyKHR5cGU6IHN0cmluZywgY2FsbGJhY2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgfCBudWxsLCBvcHRpb25zPzogRXZlbnRMaXN0ZW5lck9wdGlvbnMgfCBib29sZWFuKTogdm9pZDtcclxufVxyXG5cclxuXHJcbi8vICBUaGlzIHJlYXNzaWdubWVudCBpcyBhIFR5cGVzY3JpcHQgaGFjayB0byBhZGQgY3VzdG9tIHR5cGVzIHRvIGFkZEV2ZW50TGlzdGVuZXIuLi5cclxuY29uc3QgRXZlbnRUYXJnZXRXID0gRXZlbnRUYXJnZXQgYXMgeyBuZXcoKTogSW5zdGFudGlhdGVkV2FzbUV2ZW50VGFyZ2V0OyBwcm90b3R5cGU6IEluc3RhbnRpYXRlZFdhc21FdmVudFRhcmdldCB9O1xyXG5cclxuLyoqXHJcbiAqIEV4dGVuc2lvbiBvZiBgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2VgIHRoYXQgaXMgYWxzbyBhbiBgRXZlbnRUYXJnZXRgIGZvciBhbGwgV0FTSSBcImV2ZW50XCJzICh3aGljaCwgeWVzLCBpcyB3aHkgdGhpcyBpcyBhbiBlbnRpcmUgYGNsYXNzYCkuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0LCBFbWJpbmQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+IGV4dGVuZHMgRXZlbnRUYXJnZXRXIGltcGxlbWVudHMgV2ViQXNzZW1ibHkuV2ViQXNzZW1ibHlJbnN0YW50aWF0ZWRTb3VyY2Uge1xyXG4gICAgLyoqIFRoZSBgV2ViQXNzZW1ibHkuTW9kdWxlYCB0aGlzIGluc3RhbmNlIHdhcyBidWlsdCBmcm9tLiBSYXJlbHkgdXNlZnVsIGJ5IGl0c2VsZi4gKi9cclxuICAgIHB1YmxpYyBtb2R1bGU6IFdlYkFzc2VtYmx5Lk1vZHVsZTtcclxuXHJcbiAgICAvKiogVGhlIGBXZWJBc3NlbWJseS5Nb2R1bGVgIHRoaXMgaW5zdGFuY2Ugd2FzIGJ1aWx0IGZyb20uIFJhcmVseSB1c2VmdWwgYnkgaXRzZWxmLiAqL1xyXG4gICAgcHVibGljIGluc3RhbmNlOiBXZWJBc3NlbWJseS5JbnN0YW5jZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbnRhaW5zIGV2ZXJ5dGhpbmcgZXhwb3J0ZWQgdXNpbmcgZW1iaW5kLlxyXG4gICAgICogXHJcbiAgICAgKiBUaGVzZSBhcmUgc2VwYXJhdGUgZnJvbSByZWd1bGFyIGV4cG9ydHMgb24gYGluc3RhbmNlLmV4cG9ydGAuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBlbWJpbmQ6IEVtYmluZDtcclxuXHJcbiAgICAvKiogXHJcbiAgICAgKiBUaGUgXCJyYXdcIiBXQVNNIGV4cG9ydHMuIE5vbmUgYXJlIHByZWZpeGVkIHdpdGggXCJfXCIuXHJcbiAgICAgKiBcclxuICAgICAqIE5vIGNvbnZlcnNpb24gaXMgcGVyZm9ybWVkIG9uIHRoZSB0eXBlcyBoZXJlOyBldmVyeXRoaW5nIHRha2VzIG9yIHJldHVybnMgYSBudW1iZXIuXHJcbiAgICAgKiBcclxuICAgICAqL1xyXG4gICAgcHVibGljIGV4cG9ydHM6IEV4cG9ydHMgJiBLbm93bkV4cG9ydHM7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBgZXhwb3J0cy5tZW1vcnlgLCBidXQgdXBkYXRlZCB3aGVuL2lmIG1vcmUgbWVtb3J5IGlzIGFsbG9jYXRlZC5cclxuICAgICAqIFxyXG4gICAgICogR2VuZXJhbGx5IHNwZWFraW5nLCBpdCdzIG1vcmUgY29udmVuaWVudCB0byB1c2UgdGhlIGdlbmVyYWwtcHVycG9zZSBgcmVhZFVpbnQzMmAgZnVuY3Rpb25zLFxyXG4gICAgICogc2luY2UgdGhleSBhY2NvdW50IGZvciBgRGF0YVZpZXdgIGJlaW5nIGJpZy1lbmRpYW4gYnkgZGVmYXVsdC5cclxuICAgICAqL1xyXG4gICAgcHVibGljIGNhY2hlZE1lbW9yeVZpZXc6IERhdGFWaWV3O1xyXG5cclxuICAgIC8qKiBcclxuICAgICAqICoqSU1QT1JUQU5UKio6IFVudGlsIGBpbml0aWFsaXplYCBpcyBjYWxsZWQsIG5vIFdBU00tcmVsYXRlZCBtZXRob2RzL2ZpZWxkcyBjYW4gYmUgdXNlZC4gXHJcbiAgICAgKiBcclxuICAgICAqIGBhZGRFdmVudExpc3RlbmVyYCBhbmQgb3RoZXIgYEV2ZW50VGFyZ2V0YCBtZXRob2RzIGFyZSBmaW5lLCB0aG91Z2gsIGFuZCBpbiBmYWN0IGFyZSByZXF1aXJlZCBmb3IgZXZlbnRzIHRoYXQgb2NjdXIgZHVyaW5nIGBfaW5pdGlhbGl6ZWAgb3IgYF9zdGFydGAuXHJcbiAgICAgKiBcclxuICAgICAqIElmIHlvdSBkb24ndCBjYXJlIGFib3V0IGV2ZW50cyBkdXJpbmcgaW5pdGlhbGl6YXRpb24sIHlvdSBjYW4gYWxzbyBqdXN0IGNhbGwgYEluc3RhbnRpYXRlZFdhc20uaW5zdGFudGlhdGVgLCB3aGljaCBpcyBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IGRvZXMgYm90aCBpbiBvbmUgc3RlcC5cclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLm1vZHVsZSA9IHRoaXMuaW5zdGFuY2UgPSB0aGlzLmV4cG9ydHMgPSB0aGlzLmNhY2hlZE1lbW9yeVZpZXcgPSBudWxsIVxyXG4gICAgICAgIHRoaXMuZW1iaW5kID0ge30gYXMgbmV2ZXI7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5zdGFudGlhdGVzIGEgV0FTTSBtb2R1bGUgd2l0aCB0aGUgc3BlY2lmaWVkIFdBU0kgaW1wb3J0cy5cclxuICAgICAqIFxyXG4gICAgICogYGlucHV0YCBjYW4gYmUgYW55IG9uZSBvZjpcclxuICAgICAqIFxyXG4gICAgICogKiBgUmVzcG9uc2VgIG9yIGBQcm9taXNlPFJlc3BvbnNlPmAgKGZyb20gZS5nLiBgZmV0Y2hgKS4gVXNlcyBgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmdgLlxyXG4gICAgICogKiBgQXJyYXlCdWZmZXJgIHJlcHJlc2VudGluZyB0aGUgV0FTTSBpbiBiaW5hcnkgZm9ybSwgb3IgYSBgV2ViQXNzZW1ibHkuTW9kdWxlYC4gXHJcbiAgICAgKiAqIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyAxIGFyZ3VtZW50IG9mIHR5cGUgYFdlYkFzc2VtYmx5LkltcG9ydHNgIGFuZCByZXR1cm5zIGEgYFdlYkFzc2VtYmx5LldlYkFzc2VtYmx5SW5zdGFudGlhdGVkU291cmNlYC4gVGhpcyBpcyB0aGUgdHlwZSB0aGF0IGBAcm9sbHVwL3BsdWdpbi13YXNtYCByZXR1cm5zIHdoZW4gYnVuZGxpbmcgYSBwcmUtYnVpbHQgV0FTTSBiaW5hcnkuXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB3YXNtRmV0Y2hQcm9taXNlIFxyXG4gICAgICogQHBhcmFtIHVuYm91bmRJbXBvcnRzIFxyXG4gICAgICovXHJcbiAgICBhc3luYyBpbnN0YW50aWF0ZSh3YXNtRGF0YU9yRmV0Y2hlcjogUm9sbHVwV2FzbVByb21pc2UgfCBXZWJBc3NlbWJseS5Nb2R1bGUgfCBCdWZmZXJTb3VyY2UgfCBSZXNwb25zZSB8IFByb21pc2VMaWtlPFJlc3BvbnNlPiwgeyB3YXNpX3NuYXBzaG90X3ByZXZpZXcxLCBlbnYsIC4uLnVuYm91bmRJbXBvcnRzIH06IEtub3duSW1wb3J0cyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIC8vIChUaGVzZSBhcmUganVzdCB1cCBoZXJlIHRvIG5vdCBnZXQgaW4gdGhlIHdheSBvZiB0aGUgY29tbWVudHMpXHJcbiAgICAgICAgbGV0IG1vZHVsZTogV2ViQXNzZW1ibHkuTW9kdWxlO1xyXG4gICAgICAgIGxldCBpbnN0YW5jZTogV2ViQXNzZW1ibHkuSW5zdGFuY2U7XHJcblxyXG5cclxuICAgICAgICAvLyBUaGVyZSdzIGEgYml0IG9mIHNvbmcgYW5kIGRhbmNlIHRvIGdldCBhcm91bmQgdGhlIGZhY3QgdGhhdDpcclxuICAgICAgICAvLyAxLiBXQVNNIG5lZWRzIGl0cyBXQVNJIGltcG9ydHMgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLlxyXG4gICAgICAgIC8vIDIuIFdBU0kgbmVlZHMgaXRzIFdBU00gYEluc3RhbmNlYCBpbiBvcmRlciB0byBmdW5jdGlvbi5cclxuXHJcbiAgICAgICAgLy8gRmlyc3QsIGJpbmQgYWxsIG9mIG91ciBpbXBvcnRzIHRvIHRoZSBzYW1lIG9iamVjdCwgXHJcbiAgICAgICAgLy8gd2hpY2ggYWxzbyBoYXBwZW5zIHRvIGJlIHRoZSBJbnN0YW50aWF0ZWRXYXNtIHdlJ3JlIHJldHVybmluZyAoYnV0IGNvdWxkIHRoZW9yZXRpY2FsbHkgYmUgc29tZXRoaW5nIGVsc2UpLlxyXG4gICAgICAgIC8vIFRoaXMgaXMgaG93IHRoZXknbGwgYmUgYWJsZSB0byBhY2Nlc3MgbWVtb3J5IGFuZCBjb21tdW5pY2F0ZSB3aXRoIGVhY2ggb3RoZXIuXHJcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IHtcclxuICAgICAgICAgICAgd2FzaV9zbmFwc2hvdF9wcmV2aWV3MTogYmluZEFsbEZ1bmNzKHRoaXMsIHdhc2lfc25hcHNob3RfcHJldmlldzEpLFxyXG4gICAgICAgICAgICBlbnY6IGJpbmRBbGxGdW5jcyh0aGlzLCBlbnYpLFxyXG4gICAgICAgICAgICAuLi51bmJvdW5kSW1wb3J0c1xyXG4gICAgICAgIH0gYXMgS25vd25JbXBvcnRzICYgV2ViQXNzZW1ibHkuSW1wb3J0cztcclxuXHJcbiAgICAgICAgLy8gV2UgaGF2ZSB0aG9zZSBpbXBvcnRzLCBhbmQgdGhleSd2ZSBiZWVuIGJvdW5kIHRvIHRoZSB0by1iZS1pbnN0YW50aWF0ZWQgV0FTTS5cclxuICAgICAgICAvLyBOb3cgcGFzcyB0aG9zZSBib3VuZCBpbXBvcnRzIHRvIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlIChvciB3aGF0ZXZlciB0aGUgdXNlciBzcGVjaWZpZWQpXHJcbiAgICAgICAgaWYgKHdhc21EYXRhT3JGZXRjaGVyIGluc3RhbmNlb2YgV2ViQXNzZW1ibHkuTW9kdWxlKSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlID0gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUod2FzbURhdGFPckZldGNoZXIsIGltcG9ydHMpXHJcbiAgICAgICAgICAgIG1vZHVsZSA9IHdhc21EYXRhT3JGZXRjaGVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh3YXNtRGF0YU9yRmV0Y2hlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IEFycmF5QnVmZmVyLmlzVmlldyh3YXNtRGF0YU9yRmV0Y2hlcikpXHJcbiAgICAgICAgICAgICh7IGluc3RhbmNlLCBtb2R1bGUgfSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKHdhc21EYXRhT3JGZXRjaGVyLCBpbXBvcnRzKSk7XHJcbiAgICAgICAgZWxzZSBpZiAoaXNSZXNwb25zZSh3YXNtRGF0YU9yRmV0Y2hlcikpXHJcbiAgICAgICAgICAgICh7IGluc3RhbmNlLCBtb2R1bGUgfSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKHdhc21EYXRhT3JGZXRjaGVyLCBpbXBvcnRzKSk7XHJcblxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgKHsgaW5zdGFuY2UsIG1vZHVsZSB9ID0gYXdhaXQgd2FzbURhdGFPckZldGNoZXIoaW1wb3J0cykpO1xyXG5cclxuXHJcbiAgICAgICAgLy8gRG8gdGhlIHN0dWZmIHdlIGNvdWxkbid0IGRvIGluIHRoZSBgSW5zdGFudGlhdGVkV2FzbWAgY29uc3RydWN0b3IgYmVjYXVzZSB3ZSBkaWRuJ3QgaGF2ZSB0aGVzZSB0aGVuOlxyXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgICB0aGlzLm1vZHVsZSA9IG1vZHVsZTtcclxuICAgICAgICB0aGlzLmV4cG9ydHMgPSB0aGlzLmluc3RhbmNlLmV4cG9ydHMgYXMgRXhwb3J0cyBhcyBFeHBvcnRzICYgS25vd25FeHBvcnRzO1xyXG4gICAgICAgIHRoaXMuY2FjaGVkTWVtb3J5VmlldyA9IG5ldyBEYXRhVmlldyh0aGlzLmV4cG9ydHMubWVtb3J5LmJ1ZmZlcik7XHJcblxyXG4gICAgICAgIC8vIEFsbW9zdCBkb25lIC0tIG5vdyBydW4gV0FTSSdzIGBfc3RhcnRgIG9yIGBfaW5pdGlhbGl6ZWAgZnVuY3Rpb24uXHJcbiAgICAgICAgY29uc29sZS5hc3NlcnQoKFwiX2luaXRpYWxpemVcIiBpbiB0aGlzLmluc3RhbmNlLmV4cG9ydHMpICE9IChcIl9zdGFydFwiIGluIHRoaXMuaW5zdGFuY2UuZXhwb3J0cyksIGBFeHBlY3RlZCBlaXRoZXIgX2luaXRpYWxpemUgWE9SIF9zdGFydCB0byBiZSBleHBvcnRlZCBmcm9tIHRoaXMgV0FTTS5gKTtcclxuICAgICAgICAodGhpcy5leHBvcnRzLl9pbml0aWFsaXplID8/IHRoaXMuZXhwb3J0cy5fc3RhcnQpPy4oKTtcclxuXHJcbiAgICAgICAgLy8gV2FpdCBmb3IgYWxsIEVtYmluZCBjYWxscyB0byByZXNvbHZlICh0aGV5IGBhd2FpdGAgZWFjaCBvdGhlciBiYXNlZCBvbiB0aGUgZGVwZW5kZW5jaWVzIHRoZXkgbmVlZCwgYW5kIHRoaXMgcmVzb2x2ZXMgd2hlbiBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgdG9vKVxyXG4gICAgICAgIGF3YWl0IGF3YWl0QWxsRW1iaW5kKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGFzeW5jIGluc3RhbnRpYXRlPEV4cG9ydHMgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3QsIEVtYmluZCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4od2FzbURhdGFPckZldGNoZXI6IFJvbGx1cFdhc21Qcm9taXNlIHwgV2ViQXNzZW1ibHkuTW9kdWxlIHwgQnVmZmVyU291cmNlIHwgUmVzcG9uc2UgfCBQcm9taXNlTGlrZTxSZXNwb25zZT4sIHVuYm91bmRJbXBvcnRzOiBLbm93bkltcG9ydHMsIGV2ZW50TGlzdGVuZXJzOiBQYXJhbWV0ZXJzPEluc3RhbnRpYXRlZFdhc208RXhwb3J0cywgRW1iaW5kPltcImFkZEV2ZW50TGlzdGVuZXJcIl0+W10gPSBbXSk6IFByb21pc2U8SW5zdGFudGlhdGVkV2FzbTxFeHBvcnRzLCBFbWJpbmQ+PiB7XHJcbiAgICAgICAgY29uc3QgcmV0ID0gbmV3IEluc3RhbnRpYXRlZFdhc208RXhwb3J0cywgRW1iaW5kPigpO1xyXG4gICAgICAgIGZvciAoY29uc3QgYXJncyBvZiBldmVudExpc3RlbmVycylcclxuICAgICAgICAgICAgcmV0LmFkZEV2ZW50TGlzdGVuZXIoLi4uYXJncyk7XHJcbiAgICAgICAgYXdhaXQgcmV0Lmluc3RhbnRpYXRlKHdhc21EYXRhT3JGZXRjaGVyLCB1bmJvdW5kSW1wb3J0cyk7XHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgIH1cclxufVxyXG5cclxuLy8gR2l2ZW4gYW4gb2JqZWN0LCBiaW5kcyBlYWNoIGZ1bmN0aW9uIGluIHRoYXQgb2JqZWN0IHRvIHAgKHNoYWxsb3dseSkuXHJcbmZ1bmN0aW9uIGJpbmRBbGxGdW5jczxSIGV4dGVuZHMgb2JqZWN0PihwOiBJbnN0YW50aWF0ZWRXYXNtLCByOiBSKTogUiB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKE9iamVjdC5lbnRyaWVzKHIpLm1hcCgoW2tleSwgZnVuY10pID0+IHsgcmV0dXJuIFtrZXksICh0eXBlb2YgZnVuYyA9PSBcImZ1bmN0aW9uXCIgPyAoZnVuYyBhcyAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKS5iaW5kKHApIDogZnVuYyldIGFzIGNvbnN0OyB9KSkgYXMgUjtcclxufVxyXG5cclxuLy8gU2VwYXJhdGVkIG91dCBmb3IgdHlwZSByZWFzb25zIGR1ZSB0byBcIlJlc3BvbnNlXCIgbm90IGV4aXN0aW5nIGluIGxpbWl0ZWQgV29ya2xldC1saWtlIGVudmlyb25tZW50cy5cclxuZnVuY3Rpb24gaXNSZXNwb25zZShhcmc6IG9iamVjdCk6IGFyZyBpcyBSZXNwb25zZSB8IFByb21pc2VMaWtlPFJlc3BvbnNlPiB7IHJldHVybiBcInRoZW5cIiBpbiBhcmcgfHwgKFwiUmVzcG9uc2VcIiBpbiBnbG9iYWxUaGlzICYmIGFyZyBpbnN0YW5jZW9mIFJlc3BvbnNlKTsgfVxyXG5cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFsaWduZmF1bHRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKFwiQWxpZ25tZW50IGZhdWx0XCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBVc2VkIGJ5IFNBRkVfSEVBUFxyXG5leHBvcnQgZnVuY3Rpb24gYWxpZ25mYXVsdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtKTogbmV2ZXIge1xyXG4gICAgdGhyb3cgbmV3IEFsaWduZmF1bHRFcnJvcigpO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgVHlwZUlELCBXaXJlVHlwZXMgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPFQ+IGV4dGVuZHMgUHJvbWlzZVdpdGhSZXNvbHZlcnM8VD4ge1xyXG4gICAgcmVzb2x2ZWRWYWx1ZTogVDtcclxufVxyXG5jb25zdCBEZXBlbmRlbmNpZXNUb1dhaXRGb3I6IE1hcDxUeXBlSUQsIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPj4gPSBuZXcgTWFwPFR5cGVJRCwgUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU+PigpO1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIHBhcnNlZCB0eXBlIGluZm8sIGNvbnZlcnRlcnMsIGV0Yy4gZm9yIHRoZSBnaXZlbiBDKysgUlRUSSBUeXBlSUQgcG9pbnRlci5cclxuICpcclxuICogUGFzc2luZyBhIG51bGwgdHlwZSBJRCBpcyBmaW5lIGFuZCB3aWxsIGp1c3QgcmVzdWx0IGluIGEgYG51bGxgIGF0IHRoYXQgc3BvdCBpbiB0aGUgcmV0dXJuZWQgYXJyYXkuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VHlwZUluZm88RSBleHRlbmRzIChFbWJvdW5kUmVnaXN0ZXJlZFR5cGUgfCBudWxsIHwgdW5kZWZpbmVkKVtdPiguLi50eXBlSWRzOiBudW1iZXJbXSk6IFByb21pc2U8RT4ge1xyXG5cclxuICAgIHJldHVybiBhd2FpdCAoUHJvbWlzZS5hbGw8Tm9uTnVsbGFibGU8RVtudW1iZXJdPj4odHlwZUlkcy5tYXAoYXN5bmMgKHR5cGVJZCk6IFByb21pc2U8Tm9uTnVsbGFibGU8RVtudW1iZXJdPj4gPT4ge1xyXG4gICAgICAgIGlmICghdHlwZUlkKVxyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwhKTtcclxuXHJcbiAgICAgICAgY29uc3Qgd2l0aFJlc29sdmVycyA9IGdldERlcGVuZGVuY3lSZXNvbHZlcnModHlwZUlkKTtcclxuICAgICAgICByZXR1cm4gYXdhaXQgKHdpdGhSZXNvbHZlcnMucHJvbWlzZSBhcyBQcm9taXNlPE5vbk51bGxhYmxlPEVbbnVtYmVyXT4+KTtcclxuICAgIH0pKSBhcyB1bmtub3duIGFzIFByb21pc2U8RT4pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVwZW5kZW5jeVJlc29sdmVyczxXaXJlVHlwZSBleHRlbmRzIFdpcmVUeXBlcywgVD4odHlwZUlkOiBudW1iZXIpOiBQcm9taXNlV2l0aFJlc29sdmVyc0FuZFZhbHVlPEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZSwgVD4+IHtcclxuICAgIGxldCB3aXRoUmVzb2x2ZXJzID0gRGVwZW5kZW5jaWVzVG9XYWl0Rm9yLmdldCh0eXBlSWQpIGFzIFByb21pc2VXaXRoUmVzb2x2ZXJzQW5kVmFsdWU8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdpcmVUeXBlLCBUPj4gfCB1bmRlZmluZWQ7XHJcbiAgICBpZiAod2l0aFJlc29sdmVycyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgIERlcGVuZGVuY2llc1RvV2FpdEZvci5zZXQodHlwZUlkLCB3aXRoUmVzb2x2ZXJzID0geyByZXNvbHZlZFZhbHVlOiB1bmRlZmluZWQhLCAuLi5Qcm9taXNlLndpdGhSZXNvbHZlcnM8RW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdpcmVUeXBlcywgdW5rbm93bj4+KCkgfSBzYXRpc2ZpZXMgUHJvbWlzZVdpdGhSZXNvbHZlcnNBbmRWYWx1ZTxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU+IGFzIG5ldmVyKTtcclxuICAgIHJldHVybiB3aXRoUmVzb2x2ZXJzO1xyXG59XHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgZ2V0RGVwZW5kZW5jeVJlc29sdmVycyB9IGZyb20gXCIuL2dldC10eXBlLWluZm8uanNcIjtcclxuaW1wb3J0IHR5cGUgeyBFbWJvdW5kUmVnaXN0ZXJlZFR5cGUsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG4vKipcclxuICogQ29udmVuaWVuY2UgZnVuY3Rpb24gdG8gc2V0IGEgdmFsdWUgb24gdGhlIGBlbWJpbmRgIG9iamVjdC4gIE5vdCBzdHJpY3RseSBuZWNlc3NhcnkgdG8gY2FsbC5cclxuICogQHBhcmFtIGltcGwgXHJcbiAqIEBwYXJhbSBuYW1lIFxyXG4gKiBAcGFyYW0gdmFsdWUgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJFbWJvdW5kPFQ+KGltcGw6IEluc3RhbnRpYXRlZFdhc20sIG5hbWU6IHN0cmluZywgdmFsdWU6IFQpOiB2b2lkIHtcclxuICAgIGltcGwuZW1iaW5kW25hbWUgYXMgbmV2ZXJdID0gdmFsdWUgYXMgbmV2ZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsIHdoZW4gYSB0eXBlIGlzIHJlYWR5IHRvIGJlIHVzZWQgYnkgb3RoZXIgdHlwZXMuXHJcbiAqIFxyXG4gKiBGb3IgdGhpbmdzIGxpa2UgYGludGAgb3IgYGJvb2xgLCB0aGlzIGNhbiBqdXN0IGJlIGNhbGxlZCBpbW1lZGlhdGVseSB1cG9uIHJlZ2lzdHJhdGlvbi5cclxuICogQHBhcmFtIGluZm8gXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmluYWxpemVUeXBlPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPihfaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgbmFtZTogc3RyaW5nLCBwYXJzZWRUeXBlSW5mbzogT21pdDxFbWJvdW5kUmVnaXN0ZXJlZFR5cGU8V1QsIFQ+LCBcIm5hbWVcIj4pOiB2b2lkIHtcclxuICAgIGNvbnN0IGluZm8gPSB7IG5hbWUsIC4uLnBhcnNlZFR5cGVJbmZvIH07XHJcbiAgICBjb25zdCB3aXRoUmVzb2x2ZXJzID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVyczxXVCwgVD4oaW5mby50eXBlSWQpO1xyXG4gICAgd2l0aFJlc29sdmVycy5yZXNvbHZlKHdpdGhSZXNvbHZlcnMucmVzb2x2ZWRWYWx1ZSA9IGluZm8pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBfc2l6ZTogbnVtYmVyLCBtaW5SYW5nZTogYmlnaW50LCBfbWF4UmFuZ2U6IGJpZ2ludCk6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBpc1Vuc2lnbmVkID0gKG1pblJhbmdlID09PSAwbik7XHJcbiAgICAgICAgY29uc3QgZnJvbVdpcmVUeXBlID0gaXNVbnNpZ25lZCA/IGZyb21XaXJlVHlwZVVuc2lnbmVkIDogZnJvbVdpcmVUeXBlU2lnbmVkO1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8YmlnaW50LCBiaWdpbnQ+KHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGUsXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IHZhbHVlID0+ICh7IHdpcmVWYWx1ZTogdmFsdWUsIGpzVmFsdWU6IHZhbHVlIH0pLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZyb21XaXJlVHlwZVNpZ25lZCh3aXJlVmFsdWU6IGJpZ2ludCkgeyByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6IEJpZ0ludCh3aXJlVmFsdWUpIH07IH1cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlVW5zaWduZWQod2lyZVZhbHVlOiBiaWdpbnQpIHsgcmV0dXJuIHsgd2lyZVZhbHVlLCBqc1ZhbHVlOiBCaWdJbnQod2lyZVZhbHVlKSAmIDB4RkZGRl9GRkZGX0ZGRkZfRkZGRm4gfSB9IiwgIlxyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfYm9vbCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgdHJ1ZVZhbHVlOiAxLCBmYWxzZVZhbHVlOiAwKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIG5hbWUgPT4ge1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyIHwgYm9vbGVhbiwgYm9vbGVhbj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHdpcmVWYWx1ZSkgPT4geyByZXR1cm4geyBqc1ZhbHVlOiAhIXdpcmVWYWx1ZSwgd2lyZVZhbHVlIH07IH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChvKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZTogbyA/IHRydWVWYWx1ZSA6IGZhbHNlVmFsdWUsIGpzVmFsdWU6IG8gfTsgfSxcclxuICAgICAgICB9KVxyXG4gICAgfSlcclxufVxyXG4iLCAiXHJcbi8qIGVzbGludCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWZ1bmN0aW9uLXR5cGU6IFwib2ZmXCIgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmFtZUZ1bmN0aW9uPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bikgfCBGdW5jdGlvbj4obmFtZTogc3RyaW5nLCBib2R5OiBUKTogVCB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGJvZHksICduYW1lJywgeyB2YWx1ZTogbmFtZSB9KTtcclxufVxyXG4iLCAiLy8gVGhlc2UgYXJlIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGhhdmUgYmVlbiByZWdpc3RlcmVkLCBhY2Nlc3NlZCBieSB0aGVpciBSVFRJIFR5cGVJZFxyXG4vLyBJdCdzIG9mZiBpbiBpdHMgb3duIGZpbGUgdG8ga2VlcCBpdCBwcml2YXRlLlxyXG5leHBvcnQgY29uc3QgRW1ib3VuZENsYXNzZXM6IFJlY29yZDxudW1iZXIsIHR5cGVvZiBFbWJvdW5kQ2xhc3M+ID0ge307XHJcblxyXG5cclxuLy8gVGhpcyBpcyBhIHJ1bm5pbmcgbGlzdCBvZiBhbGwgdGhlIGluc3RhbnRpYXRlZCBjbGFzc2VzLCBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuY29uc3QgSW5zdGFudGlhdGVkQ2xhc3NlcyA9IG5ldyBNYXA8bnVtYmVyLCBXZWFrUmVmPEVtYm91bmRDbGFzcz4+KCk7XHJcblxyXG4vLyBUaGlzIGtlZXBzIHRyYWNrIG9mIGFsbCBkZXN0cnVjdG9ycyBieSB0aGVpciBgdGhpc2AgcG9pbnRlci5cclxuLy8gVXNlZCBmb3IgRmluYWxpemF0aW9uUmVnaXN0cnkgYW5kIHRoZSBkZXN0cnVjdG9yIGl0c2VsZi5cclxuY29uc3QgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkID0gbmV3IE1hcDxudW1iZXIsICgpID0+IHZvaWQ+KCk7XHJcblxyXG4vLyBVc2VkIHRvIGVuc3VyZSBubyBvbmUgYnV0IHRoZSB0eXBlIGNvbnZlcnRlcnMgY2FuIHVzZSB0aGUgc2VjcmV0IHBvaW50ZXIgY29uc3RydWN0b3IuXHJcbmV4cG9ydCBjb25zdCBTZWNyZXQ6IHN5bWJvbCA9IFN5bWJvbCgpO1xyXG5leHBvcnQgY29uc3QgU2VjcmV0Tm9EaXNwb3NlOiBzeW1ib2wgPSBTeW1ib2woKTtcclxuXHJcbi8vIFRPRE86IEknbSBub3QgY29udmluY2VkIHRoaXMgaXMgYSBnb29kIGlkZWEsIFxyXG4vLyB0aG91Z2ggSSBzdXBwb3NlIHRoZSB3YXJuaW5nIGlzIHVzZWZ1bCBpbiBkZXRlcm1pbmlzdGljIGVudmlyb25tZW50c1xyXG4vLyB3aGVyZSB5b3UgY2FuIGJyZWFrIG9uIGEgY2xhc3MgaGF2aW5nIGEgY2VydGFpbiBgdGhpc2AgcG9pbnRlci5cclxuLy8gVGhhdCBzYWlkIEknbSBwcmV0dHkgc3VyZSBvbmx5IEpTIGhlYXAgcHJlc3N1cmUgd2lsbCBpbnZva2UgYSBjYWxsYmFjaywgXHJcbi8vIG1ha2luZyBpdCBraW5kIG9mIHBvaW50bGVzcyBmb3IgQysrIGNsZWFudXAsIHdoaWNoIGhhcyBubyBpbnRlcmFjdGlvbiB3aXRoIHRoZSBKUyBoZWFwLlxyXG5jb25zdCByZWdpc3RyeSA9IG5ldyBGaW5hbGl6YXRpb25SZWdpc3RyeSgoX3RoaXM6IG51bWJlcikgPT4ge1xyXG4gICAgY29uc3QgZGVzdHJ1Y3RvciA9IERlc3RydWN0b3JzWWV0VG9CZUNhbGxlZC5nZXQoX3RoaXMpO1xyXG4gICAgaWYgKGRlc3RydWN0b3IpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oYFdBU00gY2xhc3MgYXQgYWRkcmVzcyAke190aGlzfSB3YXMgbm90IHByb3Blcmx5IGRpc3Bvc2VkLmApO1xyXG4gICAgICAgIGRlc3RydWN0b3IoKTtcclxuICAgICAgICBEZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZGVsZXRlKF90aGlzKTtcclxuICAgIH1cclxufSk7XHJcblxyXG4vKipcclxuICogQmFzZSBjbGFzcyBmb3IgYWxsIEVtYmluZC1lbmFibGVkIGNsYXNzZXMuXHJcbiAqXHJcbiAqIEluIGdlbmVyYWwsIGlmIHR3byAocXVvdGUtdW5xdW90ZSkgXCJpbnN0YW5jZXNcIiBvZiB0aGlzIGNsYXNzIGhhdmUgdGhlIHNhbWUgYF90aGlzYCBwb2ludGVyLFxyXG4gKiB0aGVuIHRoZXkgd2lsbCBjb21wYXJlIGVxdWFsbHkgd2l0aCBgPT1gLCBhcyBpZiBjb21wYXJpbmcgYWRkcmVzc2VzIGluIEMrKy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBFbWJvdW5kQ2xhc3Mge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHRyYW5zZm9ybWVkIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRoYXQgdGFrZXMgSlMgYXJndW1lbnRzIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoaXMgY2xhc3NcclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9jb25zdHJ1Y3RvcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gRW1ib3VuZENsYXNzO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXNzaWduZWQgYnkgdGhlIGRlcml2ZWQgY2xhc3Mgd2hlbiB0aGF0IGNsYXNzIGlzIHJlZ2lzdGVyZWQuXHJcbiAgICAgKlxyXG4gICAgICogVGhpcyBvbmUgaXMgbm90IHRyYW5zZm9ybWVkIGJlY2F1c2UgaXQgb25seSB0YWtlcyBhIHBvaW50ZXIgYW5kIHJldHVybnMgbm90aGluZy5cclxuICAgICAqL1xyXG4gICAgc3RhdGljIF9kZXN0cnVjdG9yOiAoX3RoaXM6IG51bWJlcikgPT4gdm9pZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBwb2ludGVyIHRvIHRoZSBjbGFzcyBpbiBXQVNNIG1lbW9yeTsgdGhlIHNhbWUgYXMgdGhlIEMrKyBgdGhpc2AgcG9pbnRlci5cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIF90aGlzITogbnVtYmVyO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IHVua25vd25bXSkge1xyXG4gICAgICAgIGNvbnN0IENyZWF0ZWRGcm9tV2FzbSA9IChhcmdzLmxlbmd0aCA9PT0gMiAmJiAoYXJnc1swXSA9PT0gU2VjcmV0IHx8IGFyZ3NbMF0gPT0gU2VjcmV0Tm9EaXNwb3NlKSAmJiB0eXBlb2YgYXJnc1sxXSA9PT0gJ251bWJlcicpO1xyXG5cclxuICAgICAgICBpZiAoIUNyZWF0ZWRGcm9tV2FzbSkge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBKUy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogVW5saWtlIGEgbm9ybWFsIGNvbnN0cnVjdG9yLCB3ZSBkZWxlZ2F0ZSB0aGUgY2xhc3MgY3JlYXRpb24gdG9cclxuICAgICAgICAgICAgICogYSBjb21iaW5hdGlvbiBvZiBfY29uc3RydWN0b3IgYW5kIGBmcm9tV2lyZVR5cGVgLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBgX2NvbnN0cnVjdG9yYCB3aWxsIGNhbGwgdGhlIEMrKyBjb2RlIHRoYXQgYWxsb2NhdGVzIG1lbW9yeSxcclxuICAgICAgICAgICAgICogaW5pdGlhbGl6ZXMgdGhlIGNsYXNzLCBhbmQgcmV0dXJucyBpdHMgYHRoaXNgIHBvaW50ZXIsXHJcbiAgICAgICAgICAgICAqIHdoaWxlIGBmcm9tV2lyZVR5cGVgLCBjYWxsZWQgYXMgcGFydCBvZiB0aGUgZ2x1ZS1jb2RlIHByb2Nlc3MsXHJcbiAgICAgICAgICAgICAqIHdpbGwgYWN0dWFsbHkgaW5zdGFudGlhdGUgdGhpcyBjbGFzcy5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogKEluIG90aGVyIHdvcmRzLCB0aGlzIHBhcnQgcnVucyBmaXJzdCwgdGhlbiB0aGUgYGVsc2VgIGJlbG93IHJ1bnMpXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3LnRhcmdldC5fY29uc3RydWN0b3IoLi4uYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGNhbGwgdG8gY3JlYXRlIHRoaXMgY2xhc3MgZnJvbSBDKysuXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFdlIGdldCBoZXJlIHZpYSBgZnJvbVdpcmVUeXBlYCwgbWVhbmluZyB0aGF0IHRoZVxyXG4gICAgICAgICAgICAgKiBjbGFzcyBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZCBpbiBDKyssIGFuZCB3ZVxyXG4gICAgICAgICAgICAgKiBqdXN0IG5lZWQgb3VyIFwiaGFuZGxlXCIgdG8gaXQgaW4gSlMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBfdGhpcyA9IGFyZ3NbMV0gYXMgbnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB3ZSBoYXZlbid0IGluc3RhbnRpYXRlZCB0aGlzIGNsYXNzIHlldC5cclxuICAgICAgICAgICAgLy8gV2Ugd2FudCBhbGwgY2xhc3NlcyB3aXRoIHRoZSBzYW1lIGB0aGlzYCBwb2ludGVyIHRvIFxyXG4gICAgICAgICAgICAvLyBhY3R1YWxseSAqYmUqIHRoZSBzYW1lLlxyXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IEluc3RhbnRpYXRlZENsYXNzZXMuZ2V0KF90aGlzKT8uZGVyZWYoKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUsIHRoZW4gY29uZ3JhdHVsYXRpb25zLCB0aGlzLWluc3RhbnRpYXRpb24tb2YtdGhpcy1jbGFzcywgXHJcbiAgICAgICAgICAgIC8vIHlvdSdyZSBhY3R1YWxseSB0aGUgb25lIHRvIGJlIGluc3RhbnRpYXRlZC4gTm8gbW9yZSBoYWNreSBjb25zdHJ1Y3RvciByZXR1cm5zLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBDb25zaWRlciB0aGlzIHRoZSBcImFjdHVhbFwiIGNvbnN0cnVjdG9yIGNvZGUsIEkgc3VwcG9zZS5cclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IF90aGlzO1xyXG4gICAgICAgICAgICBJbnN0YW50aWF0ZWRDbGFzc2VzLnNldChfdGhpcywgbmV3IFdlYWtSZWYodGhpcykpO1xyXG4gICAgICAgICAgICByZWdpc3RyeS5yZWdpc3Rlcih0aGlzLCBfdGhpcyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSAhPSBTZWNyZXROb0Rpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0b3IgPSBuZXcudGFyZ2V0Ll9kZXN0cnVjdG9yO1xyXG4gICAgICAgICAgICAgICAgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLnNldChfdGhpcywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RydWN0b3IoX3RoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIEluc3RhbnRpYXRlZENsYXNzZXMuZGVsZXRlKF90aGlzKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBbU3ltYm9sLmRpc3Bvc2VdKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIE9ubHkgcnVuIHRoZSBkZXN0cnVjdG9yIGlmIHdlIG91cnNlbHZlcyBjb25zdHJ1Y3RlZCB0aGlzIGNsYXNzIChhcyBvcHBvc2VkIHRvIGBpbnNwZWN0YGluZyBpdClcclxuICAgICAgICBjb25zdCBkZXN0cnVjdG9yID0gRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmdldCh0aGlzLl90aGlzKTtcclxuICAgICAgICBpZiAoZGVzdHJ1Y3Rvcikge1xyXG4gICAgICAgICAgICBEZXN0cnVjdG9yc1lldFRvQmVDYWxsZWQuZ2V0KHRoaXMuX3RoaXMpPy4oKTtcclxuICAgICAgICAgICAgRGVzdHJ1Y3RvcnNZZXRUb0JlQ2FsbGVkLmRlbGV0ZSh0aGlzLl90aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5fdGhpcyA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKiogXHJcbiAqIEluc3RlYWQgb2YgaW5zdGFudGlhdGluZyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzLCBcclxuICogeW91IGNhbiBpbnNwZWN0IGFuIGV4aXN0aW5nIHBvaW50ZXIgaW5zdGVhZC5cclxuICpcclxuICogVGhpcyBpcyBtYWlubHkgaW50ZW5kZWQgZm9yIHNpdHVhdGlvbnMgdGhhdCBFbWJpbmQgZG9lc24ndCBzdXBwb3J0LFxyXG4gKiBsaWtlIGFycmF5LW9mLXN0cnVjdHMtYXMtYS1wb2ludGVyLlxyXG4gKiBcclxuICogQmUgYXdhcmUgdGhhdCB0aGVyZSdzIG5vIGxpZmV0aW1lIHRyYWNraW5nIGludm9sdmVkLCBzb1xyXG4gKiBtYWtlIHN1cmUgeW91IGRvbid0IGtlZXAgdGhpcyB2YWx1ZSBhcm91bmQgYWZ0ZXIgdGhlXHJcbiAqIHBvaW50ZXIncyBiZWVuIGludmFsaWRhdGVkLiBcclxuICogXHJcbiAqICoqRG8gbm90IGNhbGwgW1N5bWJvbC5kaXNwb3NlXSoqIG9uIGFuIGluc3BlY3RlZCBjbGFzcyxcclxuICogc2luY2UgdGhlIGFzc3VtcHRpb24gaXMgdGhhdCB0aGUgQysrIGNvZGUgb3ducyB0aGF0IHBvaW50ZXJcclxuICogYW5kIHdlJ3JlIGp1c3QgbG9va2luZyBhdCBpdCwgc28gZGVzdHJveWluZyBpdCB3b3VsZCBiZSBydWRlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluc3BlY3RDbGFzc0J5UG9pbnRlcjxUPihwb2ludGVyOiBudW1iZXIpOiBUIHtcclxuICAgIHJldHVybiBuZXcgRW1ib3VuZENsYXNzKFNlY3JldE5vRGlzcG9zZSwgcG9pbnRlcikgYXMgVDtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuXHJcbi8qIGVzbGludCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWZ1bmN0aW9uLXR5cGU6IFwib2ZmXCIgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFRhYmxlRnVuY3Rpb248VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKSB8IEZ1bmN0aW9uPihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBfc2lnbmF0dXJlUHRyOiBudW1iZXIsIGZ1bmN0aW9uSW5kZXg6IG51bWJlcik6IFQge1xyXG4gICAgY29uc3QgZnAgPSBpbXBsLmV4cG9ydHMuX19pbmRpcmVjdF9mdW5jdGlvbl90YWJsZS5nZXQoZnVuY3Rpb25JbmRleCkgYXMgVDtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KHR5cGVvZiBmcCA9PSBcImZ1bmN0aW9uXCIpO1xyXG4gICAgcmV0dXJuIGZwO1xyXG59IiwgImltcG9ydCB7IHJlbmFtZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtbmFtZWQtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzLCBFbWJvdW5kQ2xhc3NlcywgU2VjcmV0IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9lbWJvdW5kLWNsYXNzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgV2lyZUNvbnZlcnNpb25SZXN1bHQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5leHBvcnQgeyBpbnNwZWN0Q2xhc3NCeVBvaW50ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyhcclxuICAgIHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICByYXdUeXBlOiBudW1iZXIsXHJcbiAgICByYXdQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgcmF3Q29uc3RQb2ludGVyVHlwZTogbnVtYmVyLFxyXG4gICAgX2Jhc2VDbGFzc1Jhd1R5cGU6IG51bWJlcixcclxuICAgIF9nZXRBY3R1YWxUeXBlU2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBfZ2V0QWN0dWFsVHlwZVB0cjogbnVtYmVyLFxyXG4gICAgX3VwY2FzdFNpZ25hdHVyZTogbnVtYmVyLFxyXG4gICAgX3VwY2FzdFB0cjogbnVtYmVyLFxyXG4gICAgX2Rvd25jYXN0U2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBfZG93bmNhc3RQdHI6IG51bWJlcixcclxuICAgIG5hbWVQdHI6IG51bWJlcixcclxuICAgIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlcixcclxuICAgIHJhd0Rlc3RydWN0b3JQdHI6IG51bWJlcik6IHZvaWQge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTm90ZTogX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyBkb2Vzbid0IGhhdmUgYSBjb3JyZXNwb25kaW5nIGBmaW5hbGl6ZWAgdmVyc2lvbixcclxuICAgICAqIGxpa2UgdmFsdWVfYXJyYXkgYW5kIHZhbHVlX29iamVjdCBoYXZlLCB3aGljaCBpcyBmaW5lIEkgZ3Vlc3M/XHJcbiAgICAgKiBcclxuICAgICAqIEJ1dCBpdCBtZWFucyB0aGF0IHdlIGNhbid0IGp1c3QgY3JlYXRlIGEgY2xhc3MgcHJlLWluc3RhbGxlZCB3aXRoIGV2ZXJ5dGhpbmcgaXQgbmVlZHMtLVxyXG4gICAgICogd2UgbmVlZCB0byBhZGQgbWVtYmVyIGZ1bmN0aW9ucyBhbmQgcHJvcGVydGllcyBhbmQgc3VjaCBhcyB3ZSBnZXQgdGhlbSwgYW5kIHdlXHJcbiAgICAgKiBuZXZlciByZWFsbHkga25vdyB3aGVuIHdlJ3JlIGRvbmUuXHJcbiAgICAgKi9cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIChuYW1lKSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmF3RGVzdHJ1Y3Rvckludm9rZXIgPSBnZXRUYWJsZUZ1bmN0aW9uPChfdGhpczogbnVtYmVyKSA9PiB2b2lkPih0aGlzLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yUHRyKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETyg/KSBJdCdzIHByb2JhYmx5IG5vdCBuZWNlc3NhcnkgdG8gaGF2ZSBFbWJvdW5kQ2xhc3NlcyBhbmQgdGhpcy5lbWJpbmQgYmFzaWNhbGx5IGJlIHRoZSBzYW1lIGV4YWN0IHRoaW5nLlxyXG4gICAgICAgIEVtYm91bmRDbGFzc2VzW3Jhd1R5cGVdID0gdGhpcy5lbWJpbmRbbmFtZSBhcyBuZXZlcl0gPSByZW5hbWVGdW5jdGlvbihuYW1lLFxyXG4gICAgICAgICAgICAvLyBVbmxpa2UgdGhlIGNvbnN0cnVjdG9yLCB0aGUgZGVzdHJ1Y3RvciBpcyBrbm93biBlYXJseSBlbm91Z2ggdG8gYXNzaWduIG5vdy5cclxuICAgICAgICAgICAgLy8gUHJvYmFibHkgYmVjYXVzZSBkZXN0cnVjdG9ycyBjYW4ndCBiZSBvdmVybG9hZGVkIGJ5IGFueXRoaW5nIHNvIHRoZXJlJ3Mgb25seSBldmVyIG9uZS5cclxuICAgICAgICAgICAgLy8gQW55d2F5LCBhc3NpZ24gaXQgdG8gdGhpcyBuZXcgY2xhc3MuXHJcbiAgICAgICAgICAgIGNsYXNzIGV4dGVuZHMgRW1ib3VuZENsYXNzIHtcclxuICAgICAgICAgICAgICAgIHN0YXRpYyBfZGVzdHJ1Y3RvciA9IHJhd0Rlc3RydWN0b3JJbnZva2VyO1xyXG4gICAgICAgICAgICB9KSBhcyBuZXZlcjtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZnJvbVdpcmVUeXBlKF90aGlzOiBudW1iZXIpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIEVtYm91bmRDbGFzcz4geyBjb25zdCBqc1ZhbHVlID0gbmV3IEVtYm91bmRDbGFzc2VzW3Jhd1R5cGVdKFNlY3JldCwgX3RoaXMpOyByZXR1cm4geyB3aXJlVmFsdWU6IF90aGlzLCBqc1ZhbHVlLCBzdGFja0Rlc3RydWN0b3I6ICgpID0+IGpzVmFsdWVbU3ltYm9sLmRpc3Bvc2VdKCkgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gdG9XaXJlVHlwZShqc09iamVjdDogRW1ib3VuZENsYXNzKTogV2lyZUNvbnZlcnNpb25SZXN1bHQ8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IChqc09iamVjdCBhcyBhbnkpLl90aGlzIGFzIG51bWJlcixcclxuICAgICAgICAgICAgICAgIGpzVmFsdWU6IGpzT2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgLy8gTm90ZTogbm8gZGVzdHJ1Y3RvcnMgZm9yIGFueSBvZiB0aGVzZSxcclxuICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgdGhleSdyZSBqdXN0IGZvciB2YWx1ZS10eXBlcy1hcy1vYmplY3QtdHlwZXMuXHJcbiAgICAgICAgICAgICAgICAvLyBBZGRpbmcgaXQgaGVyZSB3b3VsZG4ndCB3b3JrIHByb3Blcmx5LCBiZWNhdXNlIGl0IGFzc3VtZXNcclxuICAgICAgICAgICAgICAgIC8vIHdlIG93biB0aGUgb2JqZWN0ICh3aGVuIGNvbnZlcnRpbmcgZnJvbSBhIEpTIHN0cmluZyB0byBzdGQ6OnN0cmluZywgd2UgZWZmZWN0aXZlbHkgZG8sIGJ1dCBub3QgaGVyZSlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFdpc2ggb3RoZXIgdHlwZXMgaW5jbHVkZWQgcG9pbnRlciBUeXBlSURzIHdpdGggdGhlbSB0b28uLi5cclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+KHRoaXMsIG5hbWUsIHsgdHlwZUlkOiByYXdUeXBlLCBmcm9tV2lyZVR5cGUsIHRvV2lyZVR5cGUgfSk7XHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgRW1ib3VuZENsYXNzPih0aGlzLCBgJHtuYW1lfSpgLCB7IHR5cGVJZDogcmF3UG9pbnRlclR5cGUsIGZyb21XaXJlVHlwZSwgdG9XaXJlVHlwZSB9KTtcclxuICAgICAgICBmaW5hbGl6ZVR5cGU8bnVtYmVyLCBFbWJvdW5kQ2xhc3M+KHRoaXMsIGAke25hbWV9IGNvbnN0KmAsIHsgdHlwZUlkOiByYXdDb25zdFBvaW50ZXJUeXBlLCBmcm9tV2lyZVR5cGUsIHRvV2lyZVR5cGUgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiXHJcbmV4cG9ydCBmdW5jdGlvbiBydW5EZXN0cnVjdG9ycyhkZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10pOiB2b2lkIHtcclxuICAgIHdoaWxlIChkZXN0cnVjdG9ycy5sZW5ndGgpIHtcclxuICAgICAgICBkZXN0cnVjdG9ycy5wb3AoKSEoKTtcclxuICAgIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IHJlbmFtZUZ1bmN0aW9uIH0gZnJvbSBcIi4vY3JlYXRlLW5hbWVkLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4vZGVzdHJ1Y3RvcnMuanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzIH0gZnJvbSBcIi4vZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4vZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4vZ2V0LXR5cGUtaW5mby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZVR5cGVzIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgSlMgZnVuY3Rpb24gdGhhdCBjYWxscyBhIEMrKyBmdW5jdGlvbiwgYWNjb3VudGluZyBmb3IgYHRoaXNgIHR5cGVzIGFuZCBjb250ZXh0LlxyXG4gKiBcclxuICogSXQgY29udmVydHMgYWxsIGFyZ3VtZW50cyBiZWZvcmUgcGFzc2luZyB0aGVtLCBhbmQgY29udmVydHMgdGhlIHJldHVybiB0eXBlIGJlZm9yZSByZXR1cm5pbmcuXHJcbiAqIFxyXG4gKiBAcGFyYW0gaW1wbCBcclxuICogQHBhcmFtIGFyZ1R5cGVJZHMgQWxsIFJUVEkgVHlwZUlkcywgaW4gdGhlIG9yZGVyIG9mIFtSZXRUeXBlLCBUaGlzVHlwZSwgLi4uQXJnVHlwZXNdLiBUaGlzVHlwZSBjYW4gYmUgbnVsbCBmb3Igc3RhbmRhbG9uZSBmdW5jdGlvbnMuXHJcbiAqIEBwYXJhbSBpbnZva2VyU2lnbmF0dXJlIEEgcG9pbnRlciB0byB0aGUgc2lnbmF0dXJlIHN0cmluZy5cclxuICogQHBhcmFtIGludm9rZXJJbmRleCBUaGUgaW5kZXggdG8gdGhlIGludm9rZXIgZnVuY3Rpb24gaW4gdGhlIGBXZWJBc3NlbWJseS5UYWJsZWAuXHJcbiAqIEBwYXJhbSBpbnZva2VyQ29udGV4dCBUaGUgY29udGV4dCBwb2ludGVyIHRvIHVzZSwgaWYgYW55LlxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbi8qIGVzbGludCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWZ1bmN0aW9uLXR5cGU6IFwib2ZmXCIgKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUdsdWVGdW5jdGlvbjxGIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pIHwgRnVuY3Rpb24+KFxyXG4gICAgaW1wbDogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHJldHVyblR5cGVJZDogbnVtYmVyLFxyXG4gICAgYXJnVHlwZUlkczogbnVtYmVyW10sXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXIgfCBudWxsXHJcbik6IFByb21pc2U8Rj4ge1xyXG4gICAgdHlwZSBUID0gUGFyYW1ldGVyczxGICYgKCguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pPjtcclxuICAgIHR5cGUgUiA9IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXaXJlVHlwZXMsIFRbbnVtYmVyXT47XHJcbiAgICB0eXBlIEFyZ1R5cGVzID0gRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdpcmVUeXBlcywgVFtudW1iZXJdPltdO1xyXG5cclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlLCAuLi5hcmdUeXBlc10gPSBhd2FpdCBnZXRUeXBlSW5mbzxbUiwgLi4uQXJnVHlwZXNdPihyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHMpO1xyXG4gICAgY29uc3QgcmF3SW52b2tlciA9IGdldFRhYmxlRnVuY3Rpb248KC4uLmFyZ3M6IFdpcmVUeXBlc1tdKSA9PiBXaXJlVHlwZXM+KGltcGwsIGludm9rZXJTaWduYXR1cmUsIGludm9rZXJJbmRleCk7XHJcblxyXG4gICAgcmV0dXJuIHJlbmFtZUZ1bmN0aW9uKG5hbWUsIGZ1bmN0aW9uICh0aGlzOiBFbWJvdW5kQ2xhc3MsIC4uLmpzQXJnczogdW5rbm93bltdKSB7XHJcbiAgICAgICAgY29uc3Qgd2lyZWRUaGlzID0gdGhpcyA/IHRoaXMuX3RoaXMgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgY29uc3Qgd2lyZWRBcmdzOiBXaXJlVHlwZXNbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHN0YWNrQmFzZWREZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10gPSBbXTsgICAvLyBVc2VkIHRvIHByZXRlbmQgbGlrZSB3ZSdyZSBhIHBhcnQgb2YgdGhlIFdBU00gc3RhY2ssIHdoaWNoIHdvdWxkIGRlc3Ryb3kgdGhlc2Ugb2JqZWN0cyBhZnRlcndhcmRzLlxyXG5cclxuICAgICAgICBpZiAoaW52b2tlckNvbnRleHQpXHJcbiAgICAgICAgICAgIHdpcmVkQXJncy5wdXNoKGludm9rZXJDb250ZXh0KTtcclxuICAgICAgICBpZiAod2lyZWRUaGlzKVxyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaCh3aXJlZFRoaXMpO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IGVhY2ggSlMgYXJndW1lbnQgdG8gaXRzIFdBU00gZXF1aXZhbGVudCAoZ2VuZXJhbGx5IGEgcG9pbnRlciwgb3IgaW50L2Zsb2F0KVxyXG4gICAgICAgIC8vIFRPRE86IFRlc3QgcGVyZm9ybWFuY2UgcmVnYXJkaW5nIGxvb3BpbmcgdGhyb3VnaCBlYWNoIGFyZ3VtZW50IGJlZm9yZSBwYXNzaW5nIGl0IHRvIGEgZnVuY3Rpb24uXHJcbiAgICAgICAgLy8gSSdtIGhvcGluZyB0aGF0IHRoZSBKSVQgY29tcGlsZXIgdW5kZXJzdGFuZHMgdGhhdCBhcmdUeXBlcy5sZW5ndGggbmV2ZXIgY2hhbmdlcyBhbmQgdW5yb2xscyBpdC4uLlxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnVHlwZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGFyZ1R5cGVzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCBhcmcgPSBqc0FyZ3NbaV07XHJcbiAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IHR5cGUudG9XaXJlVHlwZShhcmcpO1xyXG4gICAgICAgICAgICB3aXJlZEFyZ3MucHVzaCh3aXJlVmFsdWUpO1xyXG4gICAgICAgICAgICBpZiAoc3RhY2tEZXN0cnVjdG9yKVxyXG4gICAgICAgICAgICAgICAgc3RhY2tCYXNlZERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmluYWxseSwgY2FsbCB0aGUgXCJyYXdcIiBXQVNNIGZ1bmN0aW9uXHJcbiAgICAgICAgY29uc3Qgd2lyZWRSZXR1cm46IFdpcmVUeXBlcyA9IHJhd0ludm9rZXIoLi4ud2lyZWRBcmdzKTtcclxuXHJcbiAgICAgICAgLy8gU3RpbGwgcHJldGVuZGluZyB3ZSdyZSBhIHBhcnQgb2YgdGhlIHN0YWNrLCBcclxuICAgICAgICAvLyBub3cgZGVzdHJ1Y3QgZXZlcnl0aGluZyB3ZSBcInB1c2hlZFwiIG9udG8gaXQuXHJcbiAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoc3RhY2tCYXNlZERlc3RydWN0b3JzKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB3aGF0ZXZlciB0aGUgV0FTTSBmdW5jdGlvbiByZXR1cm5lZCB0byBhIEpTIHJlcHJlc2VudGF0aW9uXHJcbiAgICAgICAgLy8gSWYgdGhlIG9iamVjdCByZXR1cm5lZCBpcyBEaXNwb3NhYmxlLCB0aGVuIHdlIGxldCB0aGUgdXNlciBkaXNwb3NlIG9mIGl0XHJcbiAgICAgICAgLy8gd2hlbiByZWFkeS5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIE90aGVyd2lzZSAobmFtZWx5IHN0cmluZ3MpLCBkaXNwb3NlIGl0cyBvcmlnaW5hbCByZXByZXNlbnRhdGlvbiBub3cuXHJcbiAgICAgICAgaWYgKHJldHVyblR5cGUgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgY29uc3QgeyBqc1ZhbHVlLCB3aXJlVmFsdWUsIHN0YWNrRGVzdHJ1Y3RvciB9ID0gcmV0dXJuVHlwZS5mcm9tV2lyZVR5cGUod2lyZWRSZXR1cm4pO1xyXG4gICAgICAgIGlmIChzdGFja0Rlc3RydWN0b3IgJiYgIShqc1ZhbHVlICYmIHR5cGVvZiBqc1ZhbHVlID09IFwib2JqZWN0XCIgJiYgKFN5bWJvbC5kaXNwb3NlIGluIGpzVmFsdWUpKSlcclxuICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yKGpzVmFsdWUsIHdpcmVWYWx1ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiBqc1ZhbHVlO1xyXG5cclxuICAgIH0gYXMgRik7XHJcbn1cclxuIiwgIlxyXG5leHBvcnQgdHlwZSBJczY0ID0gZmFsc2U7XHJcbmV4cG9ydCBjb25zdCBJczY0ID0gZmFsc2U7XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBJczY0IH0gZnJvbSBcIi4vaXMtNjQuanNcIjtcclxuXHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IFBvaW50ZXJTaXplOiA0IHwgOCA9IChJczY0ID8gOCA6IDQpO1xyXG5leHBvcnQgY29uc3QgZ2V0UG9pbnRlcjogXCJnZXRCaWdVaW50NjRcIiB8IFwiZ2V0VWludDMyXCIgPSAoSXM2NCA/IFwiZ2V0QmlnVWludDY0XCIgOiBcImdldFVpbnQzMlwiKSBzYXRpc2ZpZXMga2V5b2YgRGF0YVZpZXc7XHJcbmV4cG9ydCBjb25zdCBzZXRQb2ludGVyOiBcInNldEJpZ1VpbnQ2NFwiIHwgXCJzZXRVaW50MzJcIiA9IChJczY0ID8gXCJzZXRCaWdVaW50NjRcIiA6IFwic2V0VWludDMyXCIpIHNhdGlzZmllcyBrZXlvZiBEYXRhVmlldztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQb2ludGVyU2l6ZShfaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20pOiA0IHsgcmV0dXJuIFBvaW50ZXJTaXplIGFzIDQ7IH0iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IGdldFBvaW50ZXIgfSBmcm9tIFwiLi9wb2ludGVyLmpzXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIFNhbWUgYXMgYHJlYWRVaW50MzJgLCBidXQgdHlwZWQgZm9yIHBvaW50ZXJzLCBhbmQgZnV0dXJlLXByb29mcyBhZ2FpbnN0IDY0LWJpdCBhcmNoaXRlY3R1cmVzLlxyXG4gKiBcclxuICogVGhpcyBpcyAqbm90KiB0aGUgc2FtZSBhcyBkZXJlZmVyZW5jaW5nIGEgcG9pbnRlci4gVGhpcyBpcyBhYm91dCByZWFkaW5nIHRoZSBudW1lcmljYWwgdmFsdWUgYXQgYSBnaXZlbiBhZGRyZXNzIHRoYXQgaXMsIGl0c2VsZiwgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgYSBwb2ludGVyLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRQb2ludGVyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IG51bWJlciB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3W2dldFBvaW50ZXJdKHB0ciwgdHJ1ZSkgYXMgbnVtYmVyOyB9XHJcbiIsICJpbXBvcnQgeyBnZXRQb2ludGVyU2l6ZSB9IGZyb20gXCIuLi8uLi91dGlsL3BvaW50ZXIuanNcIjtcclxuaW1wb3J0IHsgcmVhZFBvaW50ZXIgfSBmcm9tIFwiLi4vLi4vdXRpbC9yZWFkLXBvaW50ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmFsbHksIEVtYmluZCBmdW5jdGlvbnMgaW5jbHVkZSBhbiBhcnJheSBvZiBSVFRJIFR5cGVJZHMgaW4gdGhlIGZvcm0gb2ZcclxuICogW1JldFR5cGUsIFRoaXNUeXBlPywgLi4uQXJnVHlwZXNdXHJcbiAqIFxyXG4gKiBUaGlzIHJldHVybnMgdGhhdCBhcnJheSBvZiB0eXBlSWRzIGZvciBhIGdpdmVuIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBcnJheU9mVHlwZXMoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgY291bnQ6IG51bWJlciwgcmF3QXJnVHlwZXNQdHI6IG51bWJlcik6IG51bWJlcltdIHtcclxuICAgIGNvbnN0IHJldDogbnVtYmVyW10gPSBbXTtcclxuICAgIGNvbnN0IHBvaW50ZXJTaXplID0gZ2V0UG9pbnRlclNpemUoaW1wbCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XHJcbiAgICAgICAgcmV0LnB1c2gocmVhZFBvaW50ZXIoaW1wbCwgcmF3QXJnVHlwZXNQdHIgKyBpICogcG9pbnRlclNpemUpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIG1ldGhvZE5hbWVQdHI6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlclNpZ25hdHVyZVB0cjogbnVtYmVyLFxyXG4gICAgaW52b2tlckluZGV4OiBudW1iZXIsXHJcbiAgICBpbnZva2VyQ29udGV4dDogbnVtYmVyLFxyXG4gICAgX2lzQXN5bmM6IG51bWJlclxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBtZXRob2ROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG4gICAgICAgIEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXVtuYW1lIGFzIG5ldmVyXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIGludm9rZXJTaWduYXR1cmVQdHIsIGludm9rZXJJbmRleCwgaW52b2tlckNvbnRleHQpO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgcmVhZEFycmF5T2ZUeXBlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVhZC1hcnJheS1vZi10eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2tub3duX25hbWUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBpbnZva2VySW5kZXg6IG51bWJlcixcclxuICAgIGludm9rZXJDb250ZXh0OiBudW1iZXJcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCBbcmV0dXJuVHlwZUlkLCAuLi5hcmdUeXBlSWRzXSA9IHJlYWRBcnJheU9mVHlwZXModGhpcywgYXJnQ291bnQsIHJhd0FyZ1R5cGVzUHRyKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXJfa25vd25fbmFtZSh0aGlzLCBcIjxjb25zdHJ1Y3Rvcj5cIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXS5fY29uc3RydWN0b3IgPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb24odGhpcywgXCI8Y29uc3RydWN0b3I+XCIsIHJldHVyblR5cGVJZCwgYXJnVHlwZUlkcywgaW52b2tlclNpZ25hdHVyZVB0ciwgaW52b2tlckluZGV4LCBpbnZva2VyQ29udGV4dCk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgY3JlYXRlR2x1ZUZ1bmN0aW9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9jcmVhdGUtZ2x1ZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBFbWJvdW5kQ2xhc3NlcyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZW1ib3VuZC1jbGFzcy5qc1wiO1xyXG5pbXBvcnQgeyByZWFkQXJyYXlPZlR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWFkLWFycmF5LW9mLXR5cGVzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sXHJcbiAgICByYXdDbGFzc1R5cGVJZDogbnVtYmVyLFxyXG4gICAgbWV0aG9kTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgYXJnQ291bnQ6IG51bWJlcixcclxuICAgIHJhd0FyZ1R5cGVzUHRyOiBudW1iZXIsIC8vIFtSZXR1cm5UeXBlLCBUaGlzVHlwZSwgQXJncy4uLl1cclxuICAgIGludm9rZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGludm9rZXJJbmRleDogbnVtYmVyLFxyXG4gICAgaW52b2tlckNvbnRleHQ6IG51bWJlcixcclxuICAgIF9pc1B1cmVWaXJ0dWFsOiBudW1iZXIsXHJcbiAgICBfaXNBc3luYzogbnVtYmVyXHJcbik6IHZvaWQge1xyXG4gICAgY29uc3QgW3JldHVyblR5cGVJZCwgX3RoaXNUeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG4gICAgLy9jb25zb2xlLmFzc2VydCh0aGlzVHlwZUlkICE9IHJhd0NsYXNzVHlwZUlkLGBJbnRlcm5hbCBlcnJvcjsgZXhwZWN0ZWQgdGhlIFJUVEkgcG9pbnRlcnMgZm9yIHRoZSBjbGFzcyB0eXBlIGFuZCBpdHMgcG9pbnRlciB0eXBlIHRvIGJlIGRpZmZlcmVudC5gKTtcclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbWV0aG9kTmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgKEVtYm91bmRDbGFzc2VzW3Jhd0NsYXNzVHlwZUlkXS5wcm90b3R5cGUgYXMgbmV2ZXIpW25hbWVdID0gYXdhaXQgY3JlYXRlR2x1ZUZ1bmN0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICByZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgICAgIGFyZ1R5cGVJZHMsXHJcbiAgICAgICAgICAgIGludm9rZXJTaWduYXR1cmVQdHIsXHJcbiAgICAgICAgICAgIGludm9rZXJJbmRleCxcclxuICAgICAgICAgICAgaW52b2tlckNvbnRleHRcclxuICAgICAgICApO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgImltcG9ydCB7IGNyZWF0ZUdsdWVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvY3JlYXRlLWdsdWUtZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgRW1ib3VuZENsYXNzZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2VtYm91bmQtY2xhc3MuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHkoXHJcbiAgICB0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLFxyXG4gICAgcmF3Q2xhc3NUeXBlSWQ6IG51bWJlcixcclxuICAgIGZpZWxkTmFtZVB0cjogbnVtYmVyLFxyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsXHJcbiAgICBnZXR0ZXJTaWduYXR1cmVQdHI6IG51bWJlcixcclxuICAgIGdldHRlckluZGV4OiBudW1iZXIsXHJcbiAgICBnZXR0ZXJDb250ZXh0OiBudW1iZXIsXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLFxyXG4gICAgc2V0dGVyU2lnbmF0dXJlUHRyOiBudW1iZXIsXHJcbiAgICBzZXR0ZXJJbmRleDogbnVtYmVyLFxyXG4gICAgc2V0dGVyQ29udGV4dDogbnVtYmVyXHJcbik6IHZvaWQge1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgZmllbGROYW1lUHRyLCBhc3luYyAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICBjb25zdCBnZXQgPSBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb248KCkgPT4gdW5rbm93bj4odGhpcywgYCR7bmFtZX1fZ2V0dGVyYCwgZ2V0dGVyUmV0dXJuVHlwZUlkLCBbXSwgZ2V0dGVyU2lnbmF0dXJlUHRyLCBnZXR0ZXJJbmRleCwgZ2V0dGVyQ29udGV4dCk7XHJcbiAgICAgICAgY29uc3Qgc2V0ID0gc2V0dGVySW5kZXggPyBhd2FpdCBjcmVhdGVHbHVlRnVuY3Rpb248KHZhbHVlOiB1bmtub3duKSA9PiB2b2lkPih0aGlzLCBgJHtuYW1lfV9zZXR0ZXJgLCAwLCBbc2V0dGVyQXJndW1lbnRUeXBlSWRdLCBzZXR0ZXJTaWduYXR1cmVQdHIsIHNldHRlckluZGV4LCBzZXR0ZXJDb250ZXh0KSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KChFbWJvdW5kQ2xhc3Nlc1tyYXdDbGFzc1R5cGVJZF0ucHJvdG90eXBlIGFzIHVua25vd24pLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIGdldCxcclxuICAgICAgICAgICAgc2V0LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuIiwgIlxyXG5pbXBvcnQgeyByZWdpc3RlckVtYm91bmQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9nZXQtdHlwZS1pbmZvLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlLCBXaXJlVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgbmFtZVB0cjogbnVtYmVyLCB0eXBlUHRyOiBudW1iZXIsIHZhbHVlQXNXaXJlVHlwZTogV2lyZVR5cGVzKTogdm9pZCB7XHJcblxyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKGNvbnN0TmFtZSkgPT4ge1xyXG4gICAgICAgIC8vIFdhaXQgdW50aWwgd2Uga25vdyBob3cgdG8gcGFyc2UgdGhlIHR5cGUgdGhpcyBjb25zdGFudCByZWZlcmVuY2VzLlxyXG4gICAgICAgIGNvbnN0IFt0eXBlXSA9IGF3YWl0IGdldFR5cGVJbmZvPFtFbWJvdW5kUmVnaXN0ZXJlZFR5cGVdPih0eXBlUHRyKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB0aGUgY29uc3RhbnQgZnJvbSBpdHMgd2lyZSByZXByZXNlbnRhdGlvbiB0byBpdHMgSlMgcmVwcmVzZW50YXRpb24uXHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0eXBlLmZyb21XaXJlVHlwZSh2YWx1ZUFzV2lyZVR5cGUpO1xyXG5cclxuICAgICAgICAvLyBBZGQgdGhpcyBjb25zdGFudCB2YWx1ZSB0byB0aGUgYGVtYmluZGAgb2JqZWN0LlxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZCh0aGlzLCBjb25zdE5hbWUsIHZhbHVlLmpzVmFsdWUpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9lbXZhbCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBfdHlwZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAvLyBUT0RPLi4uXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW12YWxfdGFrZV92YWx1ZSh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBfcmF3VHlwZVB0cjogbnVtYmVyLCBfcHRyOiBudW1iZXIpOiB1bmtub3duIHtcclxuICAgIC8vIFRPRE8uLi5cclxuICAgIHJldHVybiAwO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiBfZW12YWxfZGVjcmVmKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIF9oYW5kbGU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAvLyBUT0RPLi4uXHJcbiAgICByZXR1cm4gMDtcclxufVxyXG4iLCAiaW1wb3J0IHsgZmluYWxpemVUeXBlLCByZWdpc3RlckVtYm91bmQgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5jb25zdCBBbGxFbnVtczogUmVjb3JkPG51bWJlciwgUmVjb3JkPHN0cmluZywgbnVtYmVyPj4gPSB7fTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2VudW0odGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIF9zaXplOiBudW1iZXIsIF9pc1NpZ25lZDogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgdGhlIGVudW0gb2JqZWN0IHRoYXQgdGhlIHVzZXIgd2lsbCBpbnNwZWN0IHRvIGxvb2sgZm9yIGVudW0gdmFsdWVzXHJcbiAgICAgICAgQWxsRW51bXNbdHlwZVB0cl0gPSB7fTtcclxuXHJcbiAgICAgICAgLy8gTWFyayB0aGlzIHR5cGUgYXMgcmVhZHkgdG8gYmUgdXNlZCBieSBvdGhlciB0eXBlcyBcclxuICAgICAgICAvLyAoZXZlbiBpZiB3ZSBkb24ndCBoYXZlIHRoZSBlbnVtIHZhbHVlcyB5ZXQsIGVudW0gdmFsdWVzXHJcbiAgICAgICAgLy8gdGhlbXNlbHZlcyBhcmVuJ3QgdXNlZCBieSBhbnkgcmVnaXN0cmF0aW9uIGZ1bmN0aW9ucy4pXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgbnVtYmVyPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlOiAod2lyZVZhbHVlKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZSwganNWYWx1ZTogd2lyZVZhbHVlIH07IH0sXHJcbiAgICAgICAgICAgIHRvV2lyZVR5cGU6IChqc1ZhbHVlKSA9PiB7IHJldHVybiB7IHdpcmVWYWx1ZToganNWYWx1ZSwganNWYWx1ZSB9IH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gTWFrZSB0aGlzIHR5cGUgYXZhaWxhYmxlIGZvciB0aGUgdXNlclxyXG4gICAgICAgIHJlZ2lzdGVyRW1ib3VuZCh0aGlzLCBuYW1lIGFzIG5ldmVyLCBBbGxFbnVtc1t0eXBlUHRyXSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3RW51bVR5cGU6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBlbnVtVmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG4gICAgICAgIC8vIEp1c3QgYWRkIHRoaXMgbmFtZSdzIHZhbHVlIHRvIHRoZSBleGlzdGluZyBlbnVtIHR5cGUuXHJcbiAgICAgICAgQWxsRW51bXNbcmF3RW51bVR5cGVdW25hbWVdID0gZW51bVZhbHVlO1xyXG4gICAgfSlcclxufSIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIF9ieXRlV2lkdGg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCBuYW1lUHRyLCAobmFtZSkgPT4ge1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIG51bWJlcj4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHZhbHVlKSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZSB9KSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKHZhbHVlKSA9PiAoeyB3aXJlVmFsdWU6IHZhbHVlLCBqc1ZhbHVlOiB2YWx1ZSB9KSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBjcmVhdGVHbHVlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2NyZWF0ZS1nbHVlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRBcnJheU9mVHlwZXMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlYWQtYXJyYXktb2YtdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG4vKipcclxuICogXHJcbiAqIEBwYXJhbSBuYW1lUHRyIEEgcG9pbnRlciB0byB0aGUgbnVsbC10ZXJtaW5hdGVkIG5hbWUgb2YgdGhpcyBleHBvcnQuXHJcbiAqIEBwYXJhbSBhcmdDb3VudCBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0aGUgV0FTTSBmdW5jdGlvbiB0YWtlc1xyXG4gKiBAcGFyYW0gcmF3QXJnVHlwZXNQdHIgQSBwb2ludGVyIHRvIGFuIGFycmF5IG9mIG51bWJlcnMsIGVhY2ggcmVwcmVzZW50aW5nIGEgVHlwZUlELiBUaGUgMHRoIHZhbHVlIGlzIHRoZSByZXR1cm4gdHlwZSwgdGhlIHJlc3QgYXJlIHRoZSBhcmd1bWVudHMgdGhlbXNlbHZlcy5cclxuICogQHBhcmFtIHNpZ25hdHVyZSBBIHBvaW50ZXIgdG8gYSBudWxsLXRlcm1pbmF0ZWQgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgV0FTTSBzaWduYXR1cmUgb2YgdGhlIGZ1bmN0aW9uOyBlLmcuIFwiYHBgXCIsIFwiYGZwcGBcIiwgXCJgdnBgXCIsIFwiYGZwZmZmYFwiLCBldGMuXHJcbiAqIEBwYXJhbSByYXdJbnZva2VyUHRyIFRoZSBwb2ludGVyIHRvIHRoZSBmdW5jdGlvbiBpbiBXQVNNLlxyXG4gKiBAcGFyYW0gZnVuY3Rpb25JbmRleCBUaGUgaW5kZXggb2YgdGhlIGZ1bmN0aW9uIGluIHRoZSBgV2ViQXNzZW1ibHkuVGFibGVgIHRoYXQncyBleHBvcnRlZC5cclxuICogQHBhcmFtIGlzQXN5bmMgVW51c2VkLi4ucHJvYmFibHlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX2Z1bmN0aW9uKFxyXG4gICAgdGhpczogSW5zdGFudGlhdGVkV2FzbSxcclxuICAgIG5hbWVQdHI6IG51bWJlcixcclxuICAgIGFyZ0NvdW50OiBudW1iZXIsXHJcbiAgICByYXdBcmdUeXBlc1B0cjogbnVtYmVyLFxyXG4gICAgc2lnbmF0dXJlOiBudW1iZXIsXHJcbiAgICByYXdJbnZva2VyUHRyOiBudW1iZXIsXHJcbiAgICBmdW5jdGlvbkluZGV4OiBudW1iZXIsXHJcbiAgICBfaXNBc3luYzogYm9vbGVhblxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IFtyZXR1cm5UeXBlSWQsIC4uLmFyZ1R5cGVJZHNdID0gcmVhZEFycmF5T2ZUeXBlcyh0aGlzLCBhcmdDb3VudCwgcmF3QXJnVHlwZXNQdHIpO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgbmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuICAgICAgICB0aGlzLmVtYmluZFtuYW1lIGFzIG5ldmVyXSA9IGF3YWl0IGNyZWF0ZUdsdWVGdW5jdGlvbih0aGlzLCBuYW1lLCByZXR1cm5UeXBlSWQsIGFyZ1R5cGVJZHMsIHNpZ25hdHVyZSwgcmF3SW52b2tlclB0ciwgZnVuY3Rpb25JbmRleCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbiIsICJpbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRW1ib3VuZFJlZ2lzdGVyZWRUeXBlIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlcih0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCB0eXBlUHRyOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgYnl0ZVdpZHRoOiBudW1iZXIsIG1pblZhbHVlOiBudW1iZXIsIF9tYXhWYWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGlzVW5zaWduZWRUeXBlID0gKG1pblZhbHVlID09PSAwKTtcclxuICAgICAgICBjb25zdCBmcm9tV2lyZVR5cGUgPSBpc1Vuc2lnbmVkVHlwZSA/IGZyb21XaXJlVHlwZVUoYnl0ZVdpZHRoKSA6IGZyb21XaXJlVHlwZVMoYnl0ZVdpZHRoKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogbWluL21heFZhbHVlIGFyZW4ndCB1c2VkIGZvciBib3VuZHMgY2hlY2tpbmcsXHJcbiAgICAgICAgLy8gYnV0IGlmIHRoZXkgYXJlLCBtYWtlIHN1cmUgdG8gYWRqdXN0IG1heFZhbHVlIGZvciB0aGUgc2FtZSBzaWduZWQvdW5zaWduZWQgdHlwZSBpc3N1ZVxyXG4gICAgICAgIC8vIG9uIDMyLWJpdCBzaWduZWQgaW50IHR5cGVzOlxyXG4gICAgICAgIC8vIG1heFZhbHVlID0gZnJvbVdpcmVUeXBlKG1heFZhbHVlKTtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlPG51bWJlciwgbnVtYmVyPih0aGlzLCBuYW1lLCB7XHJcbiAgICAgICAgICAgIHR5cGVJZDogdHlwZVB0cixcclxuICAgICAgICAgICAgZnJvbVdpcmVUeXBlLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoanNWYWx1ZTogbnVtYmVyKSA9PiAoeyB3aXJlVmFsdWU6IGpzVmFsdWUsIGpzVmFsdWUgfSlcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuLy8gV2UgbmVlZCBhIHNlcGFyYXRlIGZ1bmN0aW9uIGZvciB1bnNpZ25lZCBjb252ZXJzaW9uIGJlY2F1c2UgV0FTTSBvbmx5IGhhcyBzaWduZWQgdHlwZXMsIFxyXG4vLyBldmVuIHdoZW4gbGFuZ3VhZ2VzIGhhdmUgdW5zaWduZWQgdHlwZXMsIGFuZCBpdCBleHBlY3RzIHRoZSBjbGllbnQgdG8gbWFuYWdlIHRoZSB0cmFuc2l0aW9uLlxyXG4vLyBTbyB0aGlzIGlzIHVzLCBtYW5hZ2luZyB0aGUgdHJhbnNpdGlvbi5cclxuZnVuY3Rpb24gZnJvbVdpcmVUeXBlVShieXRlV2lkdGg6IG51bWJlcik6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxudW1iZXIsIG51bWJlcj5bXCJmcm9tV2lyZVR5cGVcIl0ge1xyXG4gICAgLy8gU2hpZnQgb3V0IGFsbCB0aGUgYml0cyBoaWdoZXIgdGhhbiB3aGF0IHdvdWxkIGZpdCBpbiB0aGlzIGludGVnZXIgdHlwZSxcclxuICAgIC8vIGJ1dCBpbiBwYXJ0aWN1bGFyIG1ha2Ugc3VyZSB0aGUgbmVnYXRpdmUgYml0IGdldHMgY2xlYXJlZCBvdXQgYnkgdGhlID4+PiBhdCB0aGUgZW5kLlxyXG4gICAgY29uc3Qgb3ZlcmZsb3dCaXRDb3VudCA9IDMyIC0gOCAqIGJ5dGVXaWR0aDtcclxuICAgIHJldHVybiBmdW5jdGlvbiAod2lyZVZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6ICgod2lyZVZhbHVlIDw8IG92ZXJmbG93Qml0Q291bnQpID4+PiBvdmVyZmxvd0JpdENvdW50KSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmcm9tV2lyZVR5cGVTKGJ5dGVXaWR0aDogbnVtYmVyKTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPG51bWJlciwgbnVtYmVyPltcImZyb21XaXJlVHlwZVwiXSB7XHJcbiAgICAvLyBTaGlmdCBvdXQgYWxsIHRoZSBiaXRzIGhpZ2hlciB0aGFuIHdoYXQgd291bGQgZml0IGluIHRoaXMgaW50ZWdlciB0eXBlLlxyXG4gICAgY29uc3Qgb3ZlcmZsb3dCaXRDb3VudCA9IDMyIC0gOCAqIGJ5dGVXaWR0aDtcclxuICAgIHJldHVybiBmdW5jdGlvbiAod2lyZVZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4geyB3aXJlVmFsdWUsIGpzVmFsdWU6ICgod2lyZVZhbHVlIDw8IG92ZXJmbG93Qml0Q291bnQpID4+IG92ZXJmbG93Qml0Q291bnQpIH07XHJcbiAgICB9XHJcbn0iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBfZXg6IHVua25vd24pOiB2b2lkIHtcclxuICAgIC8vIFRPRE9cclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgSXM2NCB9IGZyb20gXCIuL2lzLTY0LmpzXCI7XHJcbmltcG9ydCB7IFBvaW50ZXJTaXplIH0gZnJvbSBcIi4vcG9pbnRlci5qc1wiO1xyXG5cclxuY29uc3QgU2l6ZVRTaXplOiA0IHwgOCA9IFBvaW50ZXJTaXplO1xyXG5leHBvcnQgY29uc3Qgc2V0U2l6ZVQ6IFwic2V0QmlnVWludDY0XCIgfCBcInNldFVpbnQzMlwiID0gKElzNjQgPyBcInNldEJpZ1VpbnQ2NFwiIDogXCJzZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgY29uc3QgZ2V0U2l6ZVQ6IFwiZ2V0QmlnVWludDY0XCIgfCBcImdldFVpbnQzMlwiID0gKElzNjQgPyBcImdldEJpZ1VpbnQ2NFwiIDogXCJnZXRVaW50MzJcIikgc2F0aXNmaWVzIGtleW9mIERhdGFWaWV3O1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2l6ZVRTaXplKF9pbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSk6IDQgeyByZXR1cm4gU2l6ZVRTaXplIGFzIDQ7IH1cclxuXHJcbiIsICJpbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgZ2V0U2l6ZVQgfSBmcm9tIFwiLi9zaXpldC5qc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTYW1lIGFzIGByZWFkVWludDMyYCwgYnV0IHR5cGVkIGZvciBzaXplX3QgdmFsdWVzLCBhbmQgZnV0dXJlLXByb29mcyBhZ2FpbnN0IDY0LWJpdCBhcmNoaXRlY3R1cmVzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTaXplVChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIpOiBudW1iZXIgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tnZXRTaXplVF0ocHRyLCB0cnVlKSBhcyBudW1iZXI7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBzZXRTaXplVCB9IGZyb20gXCIuL3NpemV0LmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTaXplVChpbnN0YW5jZTogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIHZhbHVlOiBudW1iZXIpOiB2b2lkIHsgaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlld1tzZXRTaXplVF0ocHRyLCB2YWx1ZSBhcyBuZXZlciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDE2KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50MTYocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDMyKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgdmFsdWU6IG51bWJlcik6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRVaW50MzIocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDgoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IHJldHVybiBpbnN0YW5jZS5jYWNoZWRNZW1vcnlWaWV3LnNldFVpbnQ4KHB0ciwgdmFsdWUpOyB9XHJcbiIsICJpbXBvcnQgeyByZWFkU2l6ZVQgfSBmcm9tIFwiLi4vLi4vdXRpbC9yZWFkLXNpemV0LmpzXCI7XHJcbmltcG9ydCB7IGdldFNpemVUU2l6ZSB9IGZyb20gXCIuLi8uLi91dGlsL3NpemV0LmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlU2l6ZVQgfSBmcm9tIFwiLi4vLi4vdXRpbC93cml0ZS1zaXpldC5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQxNiB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQxNi5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQzMiB9IGZyb20gXCIuLi8uLi91dGlsL3dyaXRlLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQ4IH0gZnJvbSBcIi4uLy4uL3V0aWwvd3JpdGUtdWludDguanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uLy4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgc3RyaW5nVG9VdGYxNiwgc3RyaW5nVG9VdGYzMiwgc3RyaW5nVG9VdGY4LCB1dGYxNlRvU3RyaW5nTCwgdXRmMzJUb1N0cmluZ0wsIHV0ZjhUb1N0cmluZ0wgfSBmcm9tIFwiLi4vc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi9yZWdpc3Rlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFdpcmVDb252ZXJzaW9uUmVzdWx0IH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcclxuXHJcbi8vIFNoYXJlZCBiZXR3ZWVuIHN0ZDo6c3RyaW5nIGFuZCBzdGQ6OndzdHJpbmdcclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZ19hbnkoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBjaGFyV2lkdGg6IDEgfCAyIHwgNCwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcblxyXG4gICAgY29uc3QgdXRmVG9TdHJpbmdMID0gKGNoYXJXaWR0aCA9PSAxKSA/IHV0ZjhUb1N0cmluZ0wgOiAoY2hhcldpZHRoID09IDIpID8gdXRmMTZUb1N0cmluZ0wgOiB1dGYzMlRvU3RyaW5nTDtcclxuICAgIGNvbnN0IHN0cmluZ1RvVXRmID0gKGNoYXJXaWR0aCA9PSAxKSA/IHN0cmluZ1RvVXRmOCA6IChjaGFyV2lkdGggPT0gMikgPyBzdHJpbmdUb1V0ZjE2IDogc3RyaW5nVG9VdGYzMjtcclxuICAgIGNvbnN0IFVpbnRBcnJheSA9IChjaGFyV2lkdGggPT0gMSkgPyBVaW50OEFycmF5IDogKGNoYXJXaWR0aCA9PSAyKSA/IFVpbnQxNkFycmF5IDogVWludDMyQXJyYXk7XHJcbiAgICBjb25zdCB3cml0ZVVpbnQgPSAoY2hhcldpZHRoID09IDEpID8gd3JpdGVVaW50OCA6IChjaGFyV2lkdGggPT0gMikgPyB3cml0ZVVpbnQxNiA6IHdyaXRlVWludDMyO1xyXG5cclxuXHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKGltcGwsIG5hbWVQdHIsIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZyb21XaXJlVHlwZSA9IChwdHI6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAvLyBUaGUgd2lyZSB0eXBlIGlzIGEgcG9pbnRlciB0byBhIFwic3RydWN0XCIgKG5vdCByZWFsbHkgYSBzdHJ1Y3QgaW4gdGhlIHVzdWFsIHNlbnNlLi4uXHJcbiAgICAgICAgICAgIC8vIGV4Y2VwdCBtYXliZSBpbiBuZXdlciBDIHZlcnNpb25zIEkgZ3Vlc3MpIHdoZXJlIFxyXG4gICAgICAgICAgICAvLyB0aGUgZmlyc3QgZmllbGQgaXMgYSBzaXplX3QgcmVwcmVzZW50aW5nIHRoZSBsZW5ndGgsXHJcbiAgICAgICAgICAgIC8vIEFuZCB0aGUgc2Vjb25kIFwiZmllbGRcIiBpcyB0aGUgc3RyaW5nIGRhdGEgaXRzZWxmLFxyXG4gICAgICAgICAgICAvLyBmaW5hbGx5IGFsbCBlbmRlZCB3aXRoIGFuIGV4dHJhIG51bGwgYnl0ZS5cclxuICAgICAgICAgICAgY29uc3QgbGVuZ3RoID0gcmVhZFNpemVUKGltcGwsIHB0cik7XHJcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSBwdHIgKyBnZXRTaXplVFNpemUoaW1wbCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlY29kZVN0YXJ0UHRyID0gcGF5bG9hZDtcclxuICAgICAgICAgICAgY29uc3Qgc3RyID0gdXRmVG9TdHJpbmdMKGltcGwsIGRlY29kZVN0YXJ0UHRyLCBsZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGpzVmFsdWU6IHN0cixcclxuICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tEZXN0cnVjdG9yOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBjYWxsIHRvIF9mcmVlIGhhcHBlbnMgYmVjYXVzZSBFbWJpbmQgY2FsbHMgbWFsbG9jIGR1cmluZyBpdHMgdG9XaXJlVHlwZSBmdW5jdGlvbi5cclxuICAgICAgICAgICAgICAgICAgICAvLyBTdXJlbHkgdGhlcmUncyBhIHdheSB0byBhdm9pZCB0aGlzIGNvcHkgb2YgYSBjb3B5IG9mIGEgY29weSB0aG91Z2gsIHJpZ2h0PyBSaWdodD9cclxuICAgICAgICAgICAgICAgICAgICBpbXBsLmV4cG9ydHMuZnJlZShwdHIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHRvV2lyZVR5cGUgPSAoc3RyOiBzdHJpbmcpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxudW1iZXIsIHN0cmluZz4gPT4ge1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdmFsdWVBc0FycmF5QnVmZmVySW5KUyA9IG5ldyBVaW50QXJyYXkoc3RyaW5nVG9VdGYoc3RyKSk7XHJcblxyXG4gICAgICAgICAgICAvLyBJcyBpdCBtb3JlIG9yIGxlc3MgY2xlYXIgd2l0aCBhbGwgdGhlc2UgdmFyaWFibGVzIGV4cGxpY2l0bHkgbmFtZWQ/XHJcbiAgICAgICAgICAgIC8vIEhvcGVmdWxseSBtb3JlLCBhdCBsZWFzdCBzbGlnaHRseS5cclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aG91dE51bGwgPSB2YWx1ZUFzQXJyYXlCdWZmZXJJbkpTLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgY2hhckNvdW50V2l0aE51bGwgPSBjaGFyQ291bnRXaXRob3V0TnVsbCArIDE7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRob3V0TnVsbCA9IGNoYXJDb3VudFdpdGhvdXROdWxsICogY2hhcldpZHRoO1xyXG4gICAgICAgICAgICBjb25zdCBieXRlQ291bnRXaXRoTnVsbCA9IGNoYXJDb3VudFdpdGhOdWxsICogY2hhcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgLy8gMS4gKG0pYWxsb2NhdGUgc3BhY2UgZm9yIHRoZSBzdHJ1Y3QgYWJvdmVcclxuICAgICAgICAgICAgY29uc3Qgd2FzbVN0cmluZ1N0cnVjdCA9IGltcGwuZXhwb3J0cy5tYWxsb2MoZ2V0U2l6ZVRTaXplKGltcGwpICsgYnl0ZUNvdW50V2l0aE51bGwpO1xyXG5cclxuICAgICAgICAgICAgLy8gMi4gV3JpdGUgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nIHRvIHRoZSBzdHJ1Y3RcclxuICAgICAgICAgICAgY29uc3Qgc3RyaW5nU3RhcnQgPSB3YXNtU3RyaW5nU3RydWN0ICsgZ2V0U2l6ZVRTaXplKGltcGwpO1xyXG4gICAgICAgICAgICB3cml0ZVNpemVUKGltcGwsIHdhc21TdHJpbmdTdHJ1Y3QsIGNoYXJDb3VudFdpdGhvdXROdWxsKTtcclxuXHJcbiAgICAgICAgICAgIC8vIDMuIFdyaXRlIHRoZSBzdHJpbmcgZGF0YSB0byB0aGUgc3RydWN0XHJcbiAgICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gbmV3IFVpbnRBcnJheShpbXBsLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgc3RyaW5nU3RhcnQsIGJ5dGVDb3VudFdpdGhvdXROdWxsKTtcclxuICAgICAgICAgICAgZGVzdGluYXRpb24uc2V0KHZhbHVlQXNBcnJheUJ1ZmZlckluSlMpO1xyXG5cclxuICAgICAgICAgICAgLy8gNC4gV3JpdGUgYSBudWxsIGJ5dGVcclxuICAgICAgICAgICAgd3JpdGVVaW50KGltcGwsIHN0cmluZ1N0YXJ0ICsgYnl0ZUNvdW50V2l0aG91dE51bGwsIDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4gaW1wbC5leHBvcnRzLmZyZWUod2FzbVN0cmluZ1N0cnVjdCksXHJcbiAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHdhc21TdHJpbmdTdHJ1Y3QsXHJcbiAgICAgICAgICAgICAgICBqc1ZhbHVlOiBzdHJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmaW5hbGl6ZVR5cGUoaW1wbCwgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHR5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZSxcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55IH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9yZWdpc3Rlci1zdGQtc3RyaW5nLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHR5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICByZXR1cm4gX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSh0aGlzLCB0eXBlUHRyLCAxLCBuYW1lUHRyKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nX2FueSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItc3RkLXN0cmluZy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcodGhpczogSW5zdGFudGlhdGVkV2FzbSwgdHlwZVB0cjogbnVtYmVyLCBjaGFyV2lkdGg6IDIgfCA0LCBuYW1lUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHJldHVybiBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmdfYW55KHRoaXMsIHR5cGVQdHIsIGNoYXJXaWR0aCwgbmFtZVB0cik7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIC4uLl9hcmdzOiBudW1iZXJbXSk6IHZvaWQge1xyXG4gICAgLy8gVE9ETy4uLlxyXG59IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vLi4vd2FzbS5qc1wiO1xyXG5pbXBvcnQgeyBnZXRUYWJsZUZ1bmN0aW9uIH0gZnJvbSBcIi4vZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IGdldFR5cGVJbmZvIH0gZnJvbSBcIi4vZ2V0LXR5cGUtaW5mby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEVtYm91bmRSZWdpc3RlcmVkVHlwZSwgV2lyZUNvbnZlcnNpb25SZXN1bHQsIFdpcmVUeXBlcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFdUPiA9IChnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHB0cjogbnVtYmVyKSA9PiBXVDtcclxuZXhwb3J0IHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlcjxXVD4gPSAoc2V0dGVyQ29udGV4dDogbnVtYmVyLCBwdHI6IG51bWJlciwgd2lyZVR5cGU6IFdUKSA9PiB2b2lkO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzPiB7XHJcbiAgICBuYW1lUHRyOiBudW1iZXI7XHJcbiAgICBfY29uc3RydWN0b3IoKTogbnVtYmVyO1xyXG4gICAgX2Rlc3RydWN0b3IocHRyOiBXVCk6IHZvaWQ7XHJcbiAgICBlbGVtZW50czogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1Q+W107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXM+IHtcclxuXHJcbiAgICAvKiogVGhlIFwicmF3XCIgZ2V0dGVyLCBleHBvcnRlZCBmcm9tIEVtYmluZC4gTmVlZHMgY29udmVyc2lvbiBiZXR3ZWVuIHR5cGVzLiAqL1xyXG4gICAgd2FzbUdldHRlcjogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXVD47XHJcblxyXG4gICAgLyoqIFRoZSBcInJhd1wiIHNldHRlciwgZXhwb3J0ZWQgZnJvbSBFbWJpbmQuIE5lZWRzIGNvbnZlcnNpb24gYmV0d2VlbiB0eXBlcy4gKi9cclxuICAgIHdhc21TZXR0ZXI6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V1Q+O1xyXG5cclxuICAgIC8qKiBUaGUgbnVtZXJpYyB0eXBlIElEIG9mIHRoZSB0eXBlIHRoZSBnZXR0ZXIgcmV0dXJucyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFRoZSBudW1lcmljIHR5cGUgSUQgb2YgdGhlIHR5cGUgdGhlIHNldHRlciBhY2NlcHRzICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyO1xyXG5cclxuICAgIC8qKiBVbmtub3duOyB1c2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBlbWJpbmQgZ2V0dGVyICovXHJcbiAgICBnZXR0ZXJDb250ZXh0OiBudW1iZXI7XHJcblxyXG4gICAgLyoqIFVua25vd247IHVzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIGVtYmluZCBzZXR0ZXIgKi9cclxuICAgIHNldHRlckNvbnRleHQ6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V1QgZXh0ZW5kcyBXaXJlVHlwZXMsIFQ+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1Q+IHtcclxuICAgIC8qKiBBIHZlcnNpb24gb2YgYHdhc21HZXR0ZXJgIHRoYXQgaGFuZGxlcyB0eXBlIGNvbnZlcnNpb24gKi9cclxuICAgIHJlYWQocHRyOiBXVCk6IFdpcmVDb252ZXJzaW9uUmVzdWx0PFdULCBUPjtcclxuXHJcbiAgICAvKiogQSB2ZXJzaW9uIG9mIGB3YXNtU2V0dGVyYCB0aGF0IGhhbmRsZXMgdHlwZSBjb252ZXJzaW9uICovXHJcbiAgICB3cml0ZShwdHI6IG51bWJlciwgdmFsdWU6IFQpOiBXaXJlQ29udmVyc2lvblJlc3VsdDxXVCwgVD47XHJcblxyXG4gICAgLyoqIGBnZXR0ZXJSZXR1cm5UeXBlSWQsIGJ1dCByZXNvbHZlZCB0byB0aGUgcGFyc2VkIHR5cGUgaW5mbyAqL1xyXG4gICAgZ2V0dGVyUmV0dXJuVHlwZTogRW1ib3VuZFJlZ2lzdGVyZWRUeXBlPFdULCBUPjtcclxuXHJcbiAgICAvKiogYHNldHRlclJldHVyblR5cGVJZCwgYnV0IHJlc29sdmVkIHRvIHRoZSBwYXJzZWQgdHlwZSBpbmZvICovXHJcbiAgICBzZXR0ZXJBcmd1bWVudFR5cGU6IEVtYm91bmRSZWdpc3RlcmVkVHlwZTxXVCwgVD47XHJcbn1cclxuXHJcbi8vIFRlbXBvcmFyeSBzY3JhdGNoIG1lbW9yeSB0byBjb21tdW5pY2F0ZSBiZXR3ZWVuIHJlZ2lzdHJhdGlvbiBjYWxscy5cclxuZXhwb3J0IGNvbnN0IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnM6IE1hcDxudW1iZXIsIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm88V2lyZVR5cGVzPj4gPSBuZXcgTWFwKCk7XHJcblxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGUoaW1wbDogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBuYW1lUHRyOiBudW1iZXIsIGNvbnN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0NvbnN0cnVjdG9yOiBudW1iZXIsIGRlc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3RGVzdHJ1Y3RvcjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zLnNldChyYXdUeXBlUHRyLCB7XHJcbiAgICAgICAgbmFtZVB0cixcclxuICAgICAgICBfY29uc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbzxXaXJlVHlwZXM+W1wiX2NvbnN0cnVjdG9yXCJdPihpbXBsLCBjb25zdHJ1Y3RvclNpZ25hdHVyZSwgcmF3Q29uc3RydWN0b3IpLFxyXG4gICAgICAgIF9kZXN0cnVjdG9yOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm88V2lyZVR5cGVzPltcIl9kZXN0cnVjdG9yXCJdPihpbXBsLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yKSxcclxuICAgICAgICBlbGVtZW50czogW10sXHJcbiAgICB9KTtcclxuXHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzPEkgZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V2lyZVR5cGVzLCB1bmtub3duPj4oZWxlbWVudHM6IENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdpcmVUeXBlcz5bXSk6IFByb21pc2U8SVtdPiB7XHJcbiAgICBjb25zdCBkZXBlbmRlbmN5SWRzID0gWy4uLmVsZW1lbnRzLm1hcCgoZWx0KSA9PiBlbHQuZ2V0dGVyUmV0dXJuVHlwZUlkKSwgLi4uZWxlbWVudHMubWFwKChlbHQpID0+IGVsdC5zZXR0ZXJBcmd1bWVudFR5cGVJZCldO1xyXG5cclxuICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IGF3YWl0IGdldFR5cGVJbmZvKC4uLmRlcGVuZGVuY3lJZHMpO1xyXG4gICAgY29uc29sZS5hc3NlcnQoZGVwZW5kZW5jaWVzLmxlbmd0aCA9PSBlbGVtZW50cy5sZW5ndGggKiAyKTtcclxuXHJcbiAgICBjb25zdCBmaWVsZFJlY29yZHMgPSBlbGVtZW50cy5tYXAoKGZpZWxkLCBpKTogQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdpcmVUeXBlcywgdW5rbm93bj4gPT4ge1xyXG4gICAgICAgIGNvbnN0IGdldHRlclJldHVyblR5cGUgPSBkZXBlbmRlbmNpZXNbaV0hO1xyXG4gICAgICAgIGNvbnN0IHNldHRlckFyZ3VtZW50VHlwZSA9IGRlcGVuZGVuY2llc1tpICsgZWxlbWVudHMubGVuZ3RoXSE7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWQocHRyOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGdldHRlclJldHVyblR5cGUuZnJvbVdpcmVUeXBlKGZpZWxkLndhc21HZXR0ZXIoZmllbGQuZ2V0dGVyQ29udGV4dCwgcHRyKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlKHB0cjogbnVtYmVyLCBvOiB1bmtub3duKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IHNldHRlckFyZ3VtZW50VHlwZS50b1dpcmVUeXBlKG8pO1xyXG4gICAgICAgICAgICBmaWVsZC53YXNtU2V0dGVyKGZpZWxkLnNldHRlckNvbnRleHQsIHB0ciwgcmV0LndpcmVWYWx1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXQ7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlLFxyXG4gICAgICAgICAgICBzZXR0ZXJBcmd1bWVudFR5cGUsXHJcbiAgICAgICAgICAgIHJlYWQsXHJcbiAgICAgICAgICAgIHdyaXRlLFxyXG4gICAgICAgICAgICAuLi5maWVsZFxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBmaWVsZFJlY29yZHMgYXMgSVtdO1xyXG59IiwgImltcG9ydCB7IHJ1bkRlc3RydWN0b3JzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC9kZXN0cnVjdG9ycy5qc1wiO1xyXG5pbXBvcnQgeyBmaW5hbGl6ZVR5cGUgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2ZpbmFsaXplLmpzXCI7XHJcbmltcG9ydCB7IGdldFRhYmxlRnVuY3Rpb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2dldC10YWJsZS1mdW5jdGlvbi5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX2ZpbmFsaXplX2NvbXBvc2l0ZV9lbGVtZW50cywgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGUsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlciwgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbywgdHlwZSBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0UsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvblNldHRlciwgY29tcG9zaXRlUmVnaXN0cmF0aW9ucyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZVxyXG5pbnRlcmZhY2UgQXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVCBleHRlbmRzIFdpcmVUeXBlcz4gZXh0ZW5kcyBDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uSW5mbzxXVD4geyB9XHJcbmludGVyZmFjZSBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCBleHRlbmRzIFdpcmVUeXBlcywgVD4gZXh0ZW5kcyBBcnJheUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvPFdUPiwgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FPFdULCBUPiB7IH1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX2FycmF5KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyLCBjb25zdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdDb25zdHJ1Y3RvcjogbnVtYmVyLCBkZXN0cnVjdG9yU2lnbmF0dXJlOiBudW1iZXIsIHJhd0Rlc3RydWN0b3I6IG51bWJlcik6IHZvaWQge1xyXG4gICAgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9jb21wb3NpdGUodGhpcywgcmF3VHlwZVB0ciwgbmFtZVB0ciwgY29uc3RydWN0b3JTaWduYXR1cmUsIHJhd0NvbnN0cnVjdG9yLCBkZXN0cnVjdG9yU2lnbmF0dXJlLCByYXdEZXN0cnVjdG9yKTtcclxuXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9hcnJheV9lbGVtZW50KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R1cGxlVHlwZTogbnVtYmVyLCBnZXR0ZXJSZXR1cm5UeXBlSWQ6IG51bWJlciwgZ2V0dGVyU2lnbmF0dXJlOiBudW1iZXIsIGdldHRlcjogbnVtYmVyLCBnZXR0ZXJDb250ZXh0OiBudW1iZXIsIHNldHRlckFyZ3VtZW50VHlwZUlkOiBudW1iZXIsIHNldHRlclNpZ25hdHVyZTogbnVtYmVyLCBzZXR0ZXI6IG51bWJlciwgc2V0dGVyQ29udGV4dDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBjb21wb3NpdGVSZWdpc3RyYXRpb25zLmdldChyYXdUdXBsZVR5cGUpIS5lbGVtZW50cy5wdXNoKHtcclxuICAgICAgICBnZXR0ZXJDb250ZXh0LFxyXG4gICAgICAgIHNldHRlckNvbnRleHQsXHJcbiAgICAgICAgZ2V0dGVyUmV0dXJuVHlwZUlkLFxyXG4gICAgICAgIHNldHRlckFyZ3VtZW50VHlwZUlkLFxyXG4gICAgICAgIHdhc21HZXR0ZXI6IGdldFRhYmxlRnVuY3Rpb248Q29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkdldHRlcjxXaXJlVHlwZXM+Pih0aGlzLCBnZXR0ZXJTaWduYXR1cmUsIGdldHRlciksXHJcbiAgICAgICAgd2FzbVNldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uU2V0dGVyPFdpcmVUeXBlcz4+KHRoaXMsIHNldHRlclNpZ25hdHVyZSwgc2V0dGVyKVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX2FycmF5KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29uc3QgcmVnID0gY29tcG9zaXRlUmVnaXN0cmF0aW9ucy5nZXQocmF3VHlwZVB0cikhO1xyXG4gICAgY29tcG9zaXRlUmVnaXN0cmF0aW9ucy5kZWxldGUocmF3VHlwZVB0cik7XHJcblxyXG4gICAgX2VtYmluZF9yZWdpc3Rlcih0aGlzLCByZWcubmFtZVB0ciwgYXN5bmMgKG5hbWUpID0+IHtcclxuXHJcbiAgICAgICAgY29uc3QgZmllbGRSZWNvcmRzID0gYXdhaXQgX2VtYmluZF9maW5hbGl6ZV9jb21wb3NpdGVfZWxlbWVudHM8QXJyYXlFbGVtZW50UmVnaXN0cmF0aW9uSW5mb0U8V2lyZVR5cGVzLCB1bmtub3duPj4ocmVnLmVsZW1lbnRzKTtcclxuXHJcblxyXG4gICAgICAgIGZpbmFsaXplVHlwZTxXaXJlVHlwZXMsIHVua25vd25bXT4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKHB0cikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudERlc3RydWN0b3JzOiAoKCkgPT4gdm9pZClbXSA9IFtdXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXQ6ICh1bmtub3duW10pID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWcuZWxlbWVudHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZFJlY29yZHNbaV0ucmVhZChwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IGpzVmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogcmV0LFxyXG4gICAgICAgICAgICAgICAgICAgIHdpcmVWYWx1ZTogcHRyLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAobykgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudERlc3RydWN0b3JzOiAoKCkgPT4gdm9pZClbXSA9IFtdXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdHIgPSByZWcuX2NvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIGZpZWxkUmVjb3Jkcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsganNWYWx1ZSwgd2lyZVZhbHVlLCBzdGFja0Rlc3RydWN0b3IgfSA9IGZpZWxkLndyaXRlKHB0ciwgb1tpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudERlc3RydWN0b3JzLnB1c2goKCkgPT4gc3RhY2tEZXN0cnVjdG9yPy4oanNWYWx1ZSwgd2lyZVZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lyZVZhbHVlOiBwdHIsXHJcbiAgICAgICAgICAgICAgICAgICAganNWYWx1ZTogbyxcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG4iLCAiaW1wb3J0IHsgcnVuRGVzdHJ1Y3RvcnMgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL2Rlc3RydWN0b3JzLmpzXCI7XHJcbmltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgZ2V0VGFibGVGdW5jdGlvbiB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZ2V0LXRhYmxlLWZ1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzLCBjb21wb3NpdGVSZWdpc3RyYXRpb25zLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25HZXR0ZXIsIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm8sIHR5cGUgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm9FLCB0eXBlIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXIsIHR5cGUgQ29tcG9zaXRlUmVnaXN0cmF0aW9uSW5mbyB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXItY29tcG9zaXRlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXIgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW1iaW5kL3JlZ2lzdGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgV2lyZVR5cGVzIH0gZnJvbSBcIi4uL19wcml2YXRlL2VtYmluZC90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyByZWFkTGF0aW4xU3RyaW5nIH0gZnJvbSBcIi4uL19wcml2YXRlL3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RSZWdpc3RyYXRpb25JbmZvPFdUIGV4dGVuZHMgV2lyZVR5cGVzPiBleHRlbmRzIENvbXBvc2l0ZVJlZ2lzdHJhdGlvbkluZm88V1Q+IHtcclxuICAgIGVsZW1lbnRzOiBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88V1Q+W107XHJcbn1cclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm88V1QgZXh0ZW5kcyBXaXJlVHlwZXM+IGV4dGVuZHMgQ29tcG9zaXRlRWxlbWVudFJlZ2lzdHJhdGlvbkluZm88V1Q+IHtcclxuICAgIC8qKiBUaGUgbmFtZSBvZiB0aGlzIGZpZWxkICovXHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTdHJ1Y3RGaWVsZFJlZ2lzdHJhdGlvbkluZm9FPFdUIGV4dGVuZHMgV2lyZVR5cGVzLCBUPiBleHRlbmRzIFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mbzxXVD4sIENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25JbmZvRTxXVCwgVD4geyB9XHJcblxyXG4vKipcclxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgZmlyc3QsIHRvIHN0YXJ0IHRoZSByZWdpc3RyYXRpb24gb2YgYSBzdHJ1Y3QgYW5kIGFsbCBpdHMgZmllbGRzLiBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlOiBudW1iZXIsIG5hbWVQdHI6IG51bWJlciwgY29uc3RydWN0b3JTaWduYXR1cmU6IG51bWJlciwgcmF3Q29uc3RydWN0b3I6IG51bWJlciwgZGVzdHJ1Y3RvclNpZ25hdHVyZTogbnVtYmVyLCByYXdEZXN0cnVjdG9yOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMuc2V0KHJhd1R5cGUsIHtcclxuICAgICAgICBuYW1lUHRyLFxyXG4gICAgICAgIF9jb25zdHJ1Y3RvcjogZ2V0VGFibGVGdW5jdGlvbjwoKSA9PiBudW1iZXI+KHRoaXMsIGNvbnN0cnVjdG9yU2lnbmF0dXJlLCByYXdDb25zdHJ1Y3RvciksXHJcbiAgICAgICAgX2Rlc3RydWN0b3I6IGdldFRhYmxlRnVuY3Rpb248KCkgPT4gdm9pZD4odGhpcywgZGVzdHJ1Y3RvclNpZ25hdHVyZSwgcmF3RGVzdHJ1Y3RvciksXHJcbiAgICAgICAgZWxlbWVudHM6IFtdLFxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmNlIHBlciBmaWVsZCwgYWZ0ZXIgYF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0YCBhbmQgYmVmb3JlIGBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdGAuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgcmF3VHlwZVB0cjogbnVtYmVyLCBmaWVsZE5hbWU6IG51bWJlciwgZ2V0dGVyUmV0dXJuVHlwZUlkOiBudW1iZXIsIGdldHRlclNpZ25hdHVyZTogbnVtYmVyLCBnZXR0ZXI6IG51bWJlciwgZ2V0dGVyQ29udGV4dDogbnVtYmVyLCBzZXR0ZXJBcmd1bWVudFR5cGVJZDogbnVtYmVyLCBzZXR0ZXJTaWduYXR1cmU6IG51bWJlciwgc2V0dGVyOiBudW1iZXIsIHNldHRlckNvbnRleHQ6IG51bWJlcik6IHZvaWQge1xyXG4gICAgKGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMuZ2V0KHJhd1R5cGVQdHIpIGFzIFN0cnVjdFJlZ2lzdHJhdGlvbkluZm88V2lyZVR5cGVzPikuZWxlbWVudHMucHVzaCh7XHJcbiAgICAgICAgbmFtZTogcmVhZExhdGluMVN0cmluZyh0aGlzLCBmaWVsZE5hbWUpLFxyXG4gICAgICAgIGdldHRlckNvbnRleHQsXHJcbiAgICAgICAgc2V0dGVyQ29udGV4dCxcclxuICAgICAgICBnZXR0ZXJSZXR1cm5UeXBlSWQsXHJcbiAgICAgICAgc2V0dGVyQXJndW1lbnRUeXBlSWQsXHJcbiAgICAgICAgd2FzbUdldHRlcjogZ2V0VGFibGVGdW5jdGlvbjxDb21wb3NpdGVFbGVtZW50UmVnaXN0cmF0aW9uR2V0dGVyPFdpcmVUeXBlcz4+KHRoaXMsIGdldHRlclNpZ25hdHVyZSwgZ2V0dGVyKSxcclxuICAgICAgICB3YXNtU2V0dGVyOiBnZXRUYWJsZUZ1bmN0aW9uPENvbXBvc2l0ZUVsZW1lbnRSZWdpc3RyYXRpb25TZXR0ZXI8V2lyZVR5cGVzPj4odGhpcywgc2V0dGVyU2lnbmF0dXJlLCBzZXR0ZXIpLFxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgYWZ0ZXIgYWxsIG90aGVyIG9iamVjdCByZWdpc3RyYXRpb24gZnVuY3Rpb25zIGFyZSBjYWxsZWQ7IHRoaXMgY29udGFpbnMgdGhlIGFjdHVhbCByZWdpc3RyYXRpb24gY29kZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCByYXdUeXBlUHRyOiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGNvbnN0IHJlZyA9IGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMuZ2V0KHJhd1R5cGVQdHIpITtcclxuICAgIGNvbXBvc2l0ZVJlZ2lzdHJhdGlvbnMuZGVsZXRlKHJhd1R5cGVQdHIpO1xyXG5cclxuICAgIF9lbWJpbmRfcmVnaXN0ZXIodGhpcywgcmVnLm5hbWVQdHIsIGFzeW5jIChuYW1lKSA9PiB7XHJcblxyXG4gICAgICAgIGNvbnN0IGZpZWxkUmVjb3JkcyA9IGF3YWl0IF9lbWJpbmRfZmluYWxpemVfY29tcG9zaXRlX2VsZW1lbnRzPFN0cnVjdEZpZWxkUmVnaXN0cmF0aW9uSW5mb0U8V2lyZVR5cGVzLCB1bmtub3duPj4ocmVnLmVsZW1lbnRzKTtcclxuXHJcbiAgICAgICAgZmluYWxpemVUeXBlKHRoaXMsIG5hbWUsIHtcclxuICAgICAgICAgICAgdHlwZUlkOiByYXdUeXBlUHRyLFxyXG4gICAgICAgICAgICBmcm9tV2lyZVR5cGU6IChwdHIpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnREZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10gPSBbXVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmV0ID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWcuZWxlbWVudHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZCA9IGZpZWxkUmVjb3Jkc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZFJlY29yZHNbaV0ucmVhZChwdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIGZpZWxkLm5hbWUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGpzVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIE9iamVjdC5mcmVlemUocmV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzVmFsdWU6IHJldCxcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBzdGFja0Rlc3RydWN0b3I6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuRGVzdHJ1Y3RvcnMoZWxlbWVudERlc3RydWN0b3JzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnLl9kZXN0cnVjdG9yKHB0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdG9XaXJlVHlwZTogKG8pID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHB0ciA9IHJlZy5fY29uc3RydWN0b3IoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnREZXN0cnVjdG9yczogKCgpID0+IHZvaWQpW10gPSBbXVxyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBmaWVsZCBvZiBmaWVsZFJlY29yZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGpzVmFsdWUsIHdpcmVWYWx1ZSwgc3RhY2tEZXN0cnVjdG9yIH0gPSBmaWVsZC53cml0ZShwdHIsIG9bZmllbGQubmFtZSBhcyBuZXZlcl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnREZXN0cnVjdG9ycy5wdXNoKCgpID0+IHN0YWNrRGVzdHJ1Y3Rvcj8uKGpzVmFsdWUsIHdpcmVWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB3aXJlVmFsdWU6IHB0cixcclxuICAgICAgICAgICAgICAgICAgICBqc1ZhbHVlOiBvLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrRGVzdHJ1Y3RvcjogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5EZXN0cnVjdG9ycyhlbGVtZW50RGVzdHJ1Y3RvcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWcuX2Rlc3RydWN0b3IocHRyKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxufVxyXG5cclxuIiwgImltcG9ydCB7IGZpbmFsaXplVHlwZSB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvZmluYWxpemUuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3RlciB9IGZyb20gXCIuLi9fcHJpdmF0ZS9lbWJpbmQvcmVnaXN0ZXIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX2VtYmluZF9yZWdpc3Rlcl92b2lkKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIHJhd1R5cGVQdHI6IG51bWJlciwgbmFtZVB0cjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZW1iaW5kX3JlZ2lzdGVyKHRoaXMsIG5hbWVQdHIsIG5hbWUgPT4ge1xyXG4gICAgICAgIGZpbmFsaXplVHlwZTxudW1iZXIsIHVuZGVmaW5lZD4odGhpcywgbmFtZSwge1xyXG4gICAgICAgICAgICB0eXBlSWQ6IHJhd1R5cGVQdHIsXHJcbiAgICAgICAgICAgIGZyb21XaXJlVHlwZTogKCkgPT4gKHsganNWYWx1ZTogdW5kZWZpbmVkISwgd2lyZVZhbHVlOiB1bmRlZmluZWQhIH0pLFxyXG4gICAgICAgICAgICB0b1dpcmVUeXBlOiAoKSA9PiAoeyBqc1ZhbHVlOiB1bmRlZmluZWQhLCB3aXJlVmFsdWU6IHVuZGVmaW5lZCEgfSlcclxuICAgICAgICB9KTtcclxuICAgIH0pXHJcblxyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZW1vcnlHcm93dGhFdmVudERldGFpbCB7XHJcbiAgICByZWFkb25seSBpbmRleDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWVtb3J5R3Jvd3RoRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxNZW1vcnlHcm93dGhFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IoX2ltcGw6IEluc3RhbnRpYXRlZFdhc20sIGluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcIk1lbW9yeUdyb3d0aEV2ZW50XCIsIHsgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogeyBpbmRleCB9IH0pXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGluZGV4OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIHRoaXMuY2FjaGVkTWVtb3J5VmlldyA9IG5ldyBEYXRhVmlldyh0aGlzLmV4cG9ydHMubWVtb3J5LmJ1ZmZlcik7XHJcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IE1lbW9yeUdyb3d0aEV2ZW50KHRoaXMsIGluZGV4KSk7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNlZ2ZhdWx0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcihcIlNlZ21lbnRhdGlvbiBmYXVsdFwiKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gVXNlZCBieSBTQUZFX0hFQVBcclxuZXhwb3J0IGZ1bmN0aW9uIHNlZ2ZhdWx0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20pOiBuZXZlciB7XHJcbiAgICB0aHJvdyBuZXcgU2VnZmF1bHRFcnJvcigpO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IEVtc2NyaXB0ZW5FeGNlcHRpb24gfSBmcm9tIFwiLi4vZW52L3Rocm93X2V4Y2VwdGlvbl93aXRoX3N0YWNrX3RyYWNlLmpzXCI7XHJcbmltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyByZWFkUG9pbnRlciB9IGZyb20gXCIuLi91dGlsL3JlYWQtcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuaW1wb3J0IHsgdXRmOFRvU3RyaW5nWiB9IGZyb20gXCIuL3N0cmluZy5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGNlcHRpb25NZXNzYWdlKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIGV4OiBFbXNjcmlwdGVuRXhjZXB0aW9uKTogW3N0cmluZywgc3RyaW5nXSB7XHJcbiAgICBjb25zdCBwdHIgPSBnZXRDcHBFeGNlcHRpb25UaHJvd25PYmplY3RGcm9tV2ViQXNzZW1ibHlFeGNlcHRpb24oaW1wbCwgZXgpO1xyXG4gICAgcmV0dXJuIGdldEV4Y2VwdGlvbk1lc3NhZ2VDb21tb24oaW1wbCwgcHRyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q3BwRXhjZXB0aW9uVGhyb3duT2JqZWN0RnJvbVdlYkFzc2VtYmx5RXhjZXB0aW9uKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIGV4OiBFbXNjcmlwdGVuRXhjZXB0aW9uKSB7XHJcbiAgICAvLyBJbiBXYXNtIEVILCB0aGUgdmFsdWUgZXh0cmFjdGVkIGZyb20gV2ViQXNzZW1ibHkuRXhjZXB0aW9uIGlzIGEgcG9pbnRlclxyXG4gICAgLy8gdG8gdGhlIHVud2luZCBoZWFkZXIuIENvbnZlcnQgaXQgdG8gdGhlIGFjdHVhbCB0aHJvd24gdmFsdWUuXHJcbiAgICBjb25zdCB1bndpbmRfaGVhZGVyOiBudW1iZXIgPSBleC5nZXRBcmcoKGltcGwuZXhwb3J0cykuX19jcHBfZXhjZXB0aW9uLCAwKTtcclxuICAgIHJldHVybiAoaW1wbC5leHBvcnRzKS5fX3Rocm93bl9vYmplY3RfZnJvbV91bndpbmRfZXhjZXB0aW9uKHVud2luZF9oZWFkZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdGFja1NhdmUoaW1wbDogSW5zdGFudGlhdGVkV2FzbSkge1xyXG4gICAgcmV0dXJuIGltcGwuZXhwb3J0cy5lbXNjcmlwdGVuX3N0YWNrX2dldF9jdXJyZW50KCk7XHJcbn1cclxuZnVuY3Rpb24gc3RhY2tBbGxvYyhpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBzaXplOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBpbXBsLmV4cG9ydHMuX2Vtc2NyaXB0ZW5fc3RhY2tfYWxsb2Moc2l6ZSk7XHJcbn1cclxuZnVuY3Rpb24gc3RhY2tSZXN0b3JlKGltcGw6IEluc3RhbnRpYXRlZFdhc20sIHN0YWNrUG9pbnRlcjogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gaW1wbC5leHBvcnRzLl9lbXNjcmlwdGVuX3N0YWNrX3Jlc3RvcmUoc3RhY2tQb2ludGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RXhjZXB0aW9uTWVzc2FnZUNvbW1vbihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlcik6IFtzdHJpbmcsIHN0cmluZ10ge1xyXG4gICAgY29uc3Qgc3AgPSBzdGFja1NhdmUoaW1wbCk7XHJcbiAgICBjb25zdCB0eXBlX2FkZHJfYWRkciA9IHN0YWNrQWxsb2MoaW1wbCwgZ2V0UG9pbnRlclNpemUoaW1wbCkpO1xyXG4gICAgY29uc3QgbWVzc2FnZV9hZGRyX2FkZHIgPSBzdGFja0FsbG9jKGltcGwsIGdldFBvaW50ZXJTaXplKGltcGwpKTtcclxuICAgIGltcGwuZXhwb3J0cy5fX2dldF9leGNlcHRpb25fbWVzc2FnZShwdHIsIHR5cGVfYWRkcl9hZGRyLCBtZXNzYWdlX2FkZHJfYWRkcik7XHJcbiAgICBjb25zdCB0eXBlX2FkZHIgPSByZWFkUG9pbnRlcihpbXBsLCB0eXBlX2FkZHJfYWRkcik7XHJcbiAgICBjb25zdCBtZXNzYWdlX2FkZHIgPSByZWFkUG9pbnRlcihpbXBsLCBtZXNzYWdlX2FkZHJfYWRkcik7XHJcbiAgICBjb25zdCB0eXBlID0gdXRmOFRvU3RyaW5nWihpbXBsLCB0eXBlX2FkZHIpO1xyXG4gICAgaW1wbC5leHBvcnRzLmZyZWUodHlwZV9hZGRyKTtcclxuICAgIGxldCBtZXNzYWdlID0gXCJcIjtcclxuICAgIGlmIChtZXNzYWdlX2FkZHIpIHtcclxuICAgICAgICBtZXNzYWdlID0gdXRmOFRvU3RyaW5nWihpbXBsLCBtZXNzYWdlX2FkZHIpO1xyXG4gICAgICAgIGltcGwuZXhwb3J0cy5mcmVlKG1lc3NhZ2VfYWRkcik7XHJcbiAgICB9XHJcbiAgICBzdGFja1Jlc3RvcmUoaW1wbCwgc3ApO1xyXG4gICAgcmV0dXJuIFt0eXBlLCBtZXNzYWdlXTtcclxufVxyXG5cclxuIiwgImltcG9ydCB7IGdldEV4Y2VwdGlvbk1lc3NhZ2UgfSBmcm9tIFwiLi4vX3ByaXZhdGUvZXhjZXB0aW9uLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYkFzc2VtYmx5RXhjZXB0aW9uRXZlbnREZXRhaWwgeyBleGNlcHRpb246IFdlYkFzc2VtYmx5LkV4Y2VwdGlvbiB9XHJcblxyXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxyXG5kZWNsYXJlIG5hbWVzcGFjZSBXZWJBc3NlbWJseSB7XHJcbiAgICBjbGFzcyBFeGNlcHRpb24ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKHRhZzogbnVtYmVyLCBwYXlsb2FkOiBudW1iZXJbXSwgb3B0aW9ucz86IHsgdHJhY2VTdGFjaz86IGJvb2xlYW4gfSk7XHJcbiAgICAgICAgZ2V0QXJnKGV4Y2VwdGlvblRhZzogbnVtYmVyLCBpbmRleDogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVtc2NyaXB0ZW5FeGNlcHRpb24gZXh0ZW5kcyBXZWJBc3NlbWJseS5FeGNlcHRpb24ge1xyXG4gICAgbWVzc2FnZTogW3N0cmluZywgc3RyaW5nXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZXg6IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29uc3QgdCA9IG5ldyBXZWJBc3NlbWJseS5FeGNlcHRpb24oKHRoaXMuZXhwb3J0cykuX19jcHBfZXhjZXB0aW9uLCBbZXhdLCB7IHRyYWNlU3RhY2s6IHRydWUgfSkgYXMgRW1zY3JpcHRlbkV4Y2VwdGlvbjtcclxuICAgIHQubWVzc2FnZSA9IGdldEV4Y2VwdGlvbk1lc3NhZ2UodGhpcywgdCk7XHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L29ubHktdGhyb3ctZXJyb3JcclxuICAgIHRocm93IHQ7XHJcbn1cclxuIiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF90enNldF9qcyh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBfdGltZXpvbmU6IG51bWJlciwgX2RheWxpZ2h0OiBudW1iZXIsIF9zdGRfbmFtZTogbnVtYmVyLCBfZHN0X25hbWU6IG51bWJlcik6IHZvaWQge1xyXG4gIC8vIFRPRE9cclxufSIsICJcclxuLy8gVGhlc2UgY29uc3RhbnRzIGFyZW4ndCBkb25lIGFzIGFuIGVudW0gYmVjYXVzZSA5NSUgb2YgdGhlbSBhcmUgbmV2ZXIgcmVmZXJlbmNlZCxcclxuLy8gYnV0IHRoZXknZCBhbG1vc3QgY2VydGFpbmx5IG5ldmVyIGJlIHRyZWUtc2hha2VuIG91dC5cclxuXHJcbi8qKiBObyBlcnJvciBvY2N1cnJlZC4gU3lzdGVtIGNhbGwgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gKi8gICBleHBvcnQgY29uc3QgRVNVQ0NFU1MgPSAwO1xyXG4vKiogQXJndW1lbnQgbGlzdCB0b28gbG9uZy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEUyQklHID0gMTtcclxuLyoqIFBlcm1pc3Npb24gZGVuaWVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUNDRVMgPSAyO1xyXG4vKiogQWRkcmVzcyBpbiB1c2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSSU5VU0UgPSAzO1xyXG4vKiogQWRkcmVzcyBub3QgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRERSTk9UQVZBSUwgPSA0O1xyXG4vKiogQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVBRk5PU1VQUE9SVCA9IDU7XHJcbi8qKiBSZXNvdXJjZSB1bmF2YWlsYWJsZSwgb3Igb3BlcmF0aW9uIHdvdWxkIGJsb2NrLiAqLyAgICAgICAgICBleHBvcnQgY29uc3QgRUFHQUlOID0gNjtcclxuLyoqIENvbm5lY3Rpb24gYWxyZWFkeSBpbiBwcm9ncmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFQUxSRUFEWSA9IDc7XHJcbi8qKiBCYWQgZmlsZSBkZXNjcmlwdG9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUJBREYgPSA4O1xyXG4vKiogQmFkIG1lc3NhZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCQURNU0cgPSA5O1xyXG4vKiogRGV2aWNlIG9yIHJlc291cmNlIGJ1c3kuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVCVVNZID0gMTA7XHJcbi8qKiBPcGVyYXRpb24gY2FuY2VsZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNBTkNFTEVEID0gMTE7XHJcbi8qKiBObyBjaGlsZCBwcm9jZXNzZXMuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNISUxEID0gMTI7XHJcbi8qKiBDb25uZWN0aW9uIGFib3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5BQk9SVEVEID0gMTM7XHJcbi8qKiBDb25uZWN0aW9uIHJlZnVzZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5SRUZVU0VEID0gMTQ7XHJcbi8qKiBDb25uZWN0aW9uIHJlc2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUNPTk5SRVNFVCA9IDE1O1xyXG4vKiogUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVERUFETEsgPSAxNjtcclxuLyoqIERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFREVTVEFERFJSRVEgPSAxNztcclxuLyoqIE1hdGhlbWF0aWNzIGFyZ3VtZW50IG91dCBvZiBkb21haW4gb2YgZnVuY3Rpb24uICovICAgICAgICAgIGV4cG9ydCBjb25zdCBFRE9NID0gMTg7XHJcbi8qKiBSZXNlcnZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRURRVU9UID0gMTk7XHJcbi8qKiBGaWxlIGV4aXN0cy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUVYSVNUID0gMjA7XHJcbi8qKiBCYWQgYWRkcmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUZBVUxUID0gMjE7XHJcbi8qKiBGaWxlIHRvbyBsYXJnZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUZCSUcgPSAyMjtcclxuLyoqIEhvc3QgaXMgdW5yZWFjaGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSE9TVFVOUkVBQ0ggPSAyMztcclxuLyoqIElkZW50aWZpZXIgcmVtb3ZlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSURSTSA9IDI0O1xyXG4vKiogSWxsZWdhbCBieXRlIHNlcXVlbmNlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTFNFUSA9IDI1O1xyXG4vKiogT3BlcmF0aW9uIGluIHByb2dyZXNzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVJTlBST0dSRVNTID0gMjY7XHJcbi8qKiBJbnRlcnJ1cHRlZCBmdW5jdGlvbi4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlOVFIgPSAyNztcclxuLyoqIEludmFsaWQgYXJndW1lbnQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU5WQUwgPSAyODtcclxuLyoqIEkvTyBlcnJvci4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSU8gPSAyOTtcclxuLyoqIFNvY2tldCBpcyBjb25uZWN0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFSVNDT05OID0gMzA7XHJcbi8qKiBJcyBhIGRpcmVjdG9yeS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUlTRElSID0gMzE7XHJcbi8qKiBUb28gbWFueSBsZXZlbHMgb2Ygc3ltYm9saWMgbGlua3MuICovICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRUxPT1AgPSAzMjtcclxuLyoqIEZpbGUgZGVzY3JpcHRvciB2YWx1ZSB0b28gbGFyZ2UuICovICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTUZJTEUgPSAzMztcclxuLyoqIFRvbyBtYW55IGxpbmtzLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTUxJTksgPSAzNDtcclxuLyoqIE1lc3NhZ2UgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTVNHU0laRSA9IDM1O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVNVUxUSUhPUCA9IDM2O1xyXG4vKiogRmlsZW5hbWUgdG9vIGxvbmcuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOQU1FVE9PTE9ORyA9IDM3O1xyXG4vKiogTmV0d29yayBpcyBkb3duLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVORVRET1dOID0gMzg7XHJcbi8qKiBDb25uZWN0aW9uIGFib3J0ZWQgYnkgbmV0d29yay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVFJFU0VUID0gMzk7XHJcbi8qKiBOZXR3b3JrIHVucmVhY2hhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5FVFVOUkVBQ0ggPSA0MDtcclxuLyoqIFRvbyBtYW55IGZpbGVzIG9wZW4gaW4gc3lzdGVtLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTkZJTEUgPSA0MTtcclxuLyoqIE5vIGJ1ZmZlciBzcGFjZSBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9CVUZTID0gNDI7XHJcbi8qKiBObyBzdWNoIGRldmljZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PREVWID0gNDM7XHJcbi8qKiBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PRU5UID0gNDQ7XHJcbi8qKiBFeGVjdXRhYmxlIGZpbGUgZm9ybWF0IGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU5PRVhFQyA9IDQ1O1xyXG4vKiogTm8gbG9ja3MgYXZhaWxhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0xDSyA9IDQ2O1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT0xJTksgPSA0NztcclxuLyoqIE5vdCBlbm91Z2ggc3BhY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9NRU0gPSA0ODtcclxuLyoqIE5vIG1lc3NhZ2Ugb2YgdGhlIGRlc2lyZWQgdHlwZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9NU0cgPSA0OTtcclxuLyoqIFByb3RvY29sIG5vdCBhdmFpbGFibGUuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFTk9QUk9UT09QVCA9IDUwO1xyXG4vKiogTm8gc3BhY2UgbGVmdCBvbiBkZXZpY2UuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1NQQyA9IDUxO1xyXG4vKiogRnVuY3Rpb24gbm90IHN1cHBvcnRlZC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1NZUyA9IDUyO1xyXG4vKiogVGhlIHNvY2tldCBpcyBub3QgY29ubmVjdGVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RDT05OID0gNTM7XHJcbi8qKiBOb3QgYSBkaXJlY3Rvcnkgb3IgYSBzeW1ib2xpYyBsaW5rIHRvIGEgZGlyZWN0b3J5LiAqLyAgICAgICBleHBvcnQgY29uc3QgRU5PVERJUiA9IDU0O1xyXG4vKiogRGlyZWN0b3J5IG5vdCBlbXB0eS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RFTVBUWSA9IDU1O1xyXG4vKiogU3RhdGUgbm90IHJlY292ZXJhYmxlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RSRUNPVkVSQUJMRSA9IDU2O1xyXG4vKiogTm90IGEgc29ja2V0LiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RTT0NLID0gNTc7XHJcbi8qKiBOb3Qgc3VwcG9ydGVkLCBvciBvcGVyYXRpb24gbm90IHN1cHBvcnRlZCBvbiBzb2NrZXQuICovICAgICBleHBvcnQgY29uc3QgRU5PVFNVUCA9IDU4O1xyXG4vKiogSW5hcHByb3ByaWF0ZSBJL08gY29udHJvbCBvcGVyYXRpb24uICovICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RUWSA9IDU5O1xyXG4vKiogTm8gc3VjaCBkZXZpY2Ugb3IgYWRkcmVzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOWElPID0gNjA7XHJcbi8qKiBWYWx1ZSB0b28gbGFyZ2UgdG8gYmUgc3RvcmVkIGluIGRhdGEgdHlwZS4gKi8gICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU9WRVJGTE9XID0gNjE7XHJcbi8qKiBQcmV2aW91cyBvd25lciBkaWVkLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRU9XTkVSREVBRCA9IDYyO1xyXG4vKiogT3BlcmF0aW9uIG5vdCBwZXJtaXR0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVQRVJNID0gNjM7XHJcbi8qKiBCcm9rZW4gcGlwZS4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVBJUEUgPSA2NDtcclxuLyoqIFByb3RvY29sIGVycm9yLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE8gPSA2NTtcclxuLyoqIFByb3RvY29sIG5vdCBzdXBwb3J0ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE9OT1NVUFBPUlQgPSA2NjtcclxuLyoqIFByb3RvY29sIHdyb25nIHR5cGUgZm9yIHNvY2tldC4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFUFJPVE9UWVBFID0gNjc7XHJcbi8qKiBSZXN1bHQgdG9vIGxhcmdlLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVJBTkdFID0gNjg7XHJcbi8qKiBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0uICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnQgY29uc3QgRVJPRlMgPSA2OTtcclxuLyoqIEludmFsaWQgc2Vlay4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1BJUEUgPSA3MDtcclxuLyoqIE5vIHN1Y2ggcHJvY2Vzcy4gKi8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFU1JDSCA9IDcxO1xyXG4vKiogUmVzZXJ2ZWQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVTVEFMRSA9IDcyO1xyXG4vKiogQ29ubmVjdGlvbiB0aW1lZCBvdXQuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVUSU1FRE9VVCA9IDczO1xyXG4vKiogVGV4dCBmaWxlIGJ1c3kuICovICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVUWFRCU1kgPSA3NDtcclxuLyoqIENyb3NzLWRldmljZSBsaW5rLiAqLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydCBjb25zdCBFWERFViA9IDc1O1xyXG4vKiogRXh0ZW5zaW9uOiBDYXBhYmlsaXRpZXMgaW5zdWZmaWNpZW50LiAqLyAgICAgICAgICAgICAgICAgICAgZXhwb3J0IGNvbnN0IEVOT1RDQVBBQkxFID0gNzY7IiwgImltcG9ydCB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVWludDY0KGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBwdHI6IG51bWJlciwgdmFsdWU6IGJpZ2ludCk6IHZvaWQgeyByZXR1cm4gaW5zdGFuY2UuY2FjaGVkTWVtb3J5Vmlldy5zZXRCaWdVaW50NjQocHRyLCB2YWx1ZSwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IEVJTlZBTCwgRU5PU1lTLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVVpbnQ2NCB9IGZyb20gXCIuLi91dGlsL3dyaXRlLXVpbnQ2NC5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBlbnVtIENsb2NrSWQge1xyXG4gICAgUkVBTFRJTUUgPSAwLFxyXG4gICAgTU9OT1RPTklDID0gMSxcclxuICAgIFBST0NFU1NfQ1BVVElNRV9JRCA9IDIsXHJcbiAgICBUSFJFQURfQ1BVVElNRV9JRCA9IDNcclxufVxyXG5cclxuY29uc3QgcCA9IChnbG9iYWxUaGlzLnBlcmZvcm1hbmNlKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbG9ja190aW1lX2dldCh0aGlzOiBJbnN0YW50aWF0ZWRXYXNtLCBjbGtfaWQ6IG51bWJlciwgX3ByZWNpc2lvbjogbnVtYmVyLCBvdXRQdHI6IG51bWJlcik6IG51bWJlciB7XHJcblxyXG4gICAgbGV0IG5vd01zOiBudW1iZXI7XHJcbiAgICBzd2l0Y2ggKGNsa19pZCkge1xyXG4gICAgICAgIGNhc2UgK0Nsb2NrSWQuUkVBTFRJTUU6XHJcbiAgICAgICAgICAgIG5vd01zID0gRGF0ZS5ub3coKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSArQ2xvY2tJZC5NT05PVE9OSUM6XHJcbiAgICAgICAgICAgIGlmIChwID09IG51bGwpIHJldHVybiBFTk9TWVM7ICAgLy8gVE9ETzogUG9zc2libGUgdG8gYmUgbnVsbCBpbiBXb3JrbGV0cz9cclxuICAgICAgICAgICAgbm93TXMgPSBwLm5vdygpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlICtDbG9ja0lkLlBST0NFU1NfQ1BVVElNRV9JRDpcclxuICAgICAgICBjYXNlICtDbG9ja0lkLlRIUkVBRF9DUFVUSU1FX0lEOlxyXG4gICAgICAgICAgICByZXR1cm4gRU5PU1lTO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHJldHVybiBFSU5WQUw7XHJcbiAgICB9XHJcbiAgICBjb25zdCBub3dOcyA9IEJpZ0ludChNYXRoLnJvdW5kKG5vd01zICogMTAwMCAqIDEwMDApKTtcclxuICAgIHdyaXRlVWludDY0KHRoaXMsIG91dFB0ciwgbm93TnMpO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufSIsICJpbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW52aXJvbkdldEV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogQSBsaXN0IG9mIGVudmlyb25tZW50IHZhcmlhYmxlIHR1cGxlczsgYSBrZXkgYW5kIGEgdmFsdWUuIFxyXG4gICAgICogVGhpcyBhcnJheSBpcyBtdXRhYmxlOyB3aGVuIGV2ZW50IGRpc3BhdGNoIGVuZHMsIHRoZSBmaW5hbCBcclxuICAgICAqIHZhbHVlIG9mIHRoaXMgYXJyYXkgd2lsbCBiZSB1c2VkIHRvIHBvcHVsYXRlIGVudmlyb25tZW50IHZhcmlhYmxlcy5cclxuICAgICAqL1xyXG4gICAgc3RyaW5nczogW2tleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nXVtdO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRW52aXJvbkdldEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RW52aXJvbkdldEV2ZW50RGV0YWlsPiB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcihcImVudmlyb25fZ2V0XCIsIHsgY2FuY2VsYWJsZTogZmFsc2UsIGRldGFpbDogeyBzdHJpbmdzOiBbXSB9IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBFbnZpcm9uSW5mb1N5bWJvbCA9IFN5bWJvbCgpO1xyXG5leHBvcnQgaW50ZXJmYWNlIEVudmlyb25JbmZvIHtcclxuICAgIGJ1ZmZlclNpemU6IG51bWJlcjtcclxuICAgIHN0cmluZ3M6IFVpbnQ4QXJyYXlbXTtcclxufVxyXG5pbnRlcmZhY2UgV2l0aEVudmlyb25JbmZvIHtcclxuICAgIFtFbnZpcm9uSW5mb1N5bWJvbF06IEVudmlyb25JbmZvO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbihpbXBsOiBJbnN0YW50aWF0ZWRXYXNtKTogRW52aXJvbkluZm8ge1xyXG4gICAgcmV0dXJuIChpbXBsIGFzIHVua25vd24gYXMgV2l0aEVudmlyb25JbmZvKVtFbnZpcm9uSW5mb1N5bWJvbF0gPz89ICgoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgdCA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG4gICAgICAgIGNvbnN0IGUgPSBuZXcgRW52aXJvbkdldEV2ZW50KCk7XHJcbiAgICAgICAgaW1wbC5kaXNwYXRjaEV2ZW50KGUpO1xyXG4gICAgICAgIGNvbnN0IHN0cmluZ3MgPSBlLmRldGFpbC5zdHJpbmdzO1xyXG4gICAgICAgIGxldCBidWZmZXJTaXplID0gMDtcclxuICAgICAgICBjb25zdCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBzdHJpbmdzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHV0ZjggPSB0LmVuY29kZShgJHtrZXl9PSR7dmFsdWV9XFx4MDBgKTtcclxuICAgICAgICAgICAgYnVmZmVyU2l6ZSArPSB1dGY4Lmxlbmd0aCArIDE7XHJcbiAgICAgICAgICAgIGJ1ZmZlcnMucHVzaCh1dGY4KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgYnVmZmVyU2l6ZSwgc3RyaW5nczogYnVmZmVycyB9XHJcbiAgICB9KSgpXHJcblxyXG59XHJcblxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3B5VG9XYXNtKGluc3RhbmNlOiBJbnN0YW50aWF0ZWRXYXNtLCBkZXN0aW5hdGlvbkFkZHJlc3M6IG51bWJlciwgc291cmNlRGF0YTogVWludDhBcnJheSB8IEludDhBcnJheSk6IHZvaWQge1xyXG4gICAgKG5ldyBVaW50OEFycmF5KGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXcuYnVmZmVyLCBkZXN0aW5hdGlvbkFkZHJlc3MsIHNvdXJjZURhdGEuYnl0ZUxlbmd0aCkpLnNldChzb3VyY2VEYXRhKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcbmltcG9ydCB7IHNldFBvaW50ZXIgfSBmcm9tIFwiLi9wb2ludGVyLmpzXCI7XHJcblxyXG4vKipcclxuICogU2FtZSBhcyBgd3JpdGVVaW50MzJgLCBidXQgdHlwZWQgZm9yIHBvaW50ZXJzLCBhbmQgZnV0dXJlLXByb29mcyBhZ2FpbnN0IDY0LWJpdCBhcmNoaXRlY3R1cmVzLlxyXG4gKiBcclxuICogVGhpcyBpcyAqbm90KiB0aGUgc2FtZSBhcyBkZXJlZmVyZW5jaW5nIGEgcG9pbnRlci4gVGhpcyBpcyBhYm91dCB3cml0aW5nIGEgcG9pbnRlcidzIG51bWVyaWNhbCB2YWx1ZSB0byBhIHNwZWNpZmllZCBhZGRyZXNzIGluIG1lbW9yeS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVBvaW50ZXIoaW5zdGFuY2U6IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7IGluc3RhbmNlLmNhY2hlZE1lbW9yeVZpZXdbc2V0UG9pbnRlcl0ocHRyLCB2YWx1ZSBhcyBuZXZlciwgdHJ1ZSk7IH1cclxuIiwgImltcG9ydCB7IGdldEVudmlyb24gfSBmcm9tIFwiLi4vX3ByaXZhdGUvZW52aXJvbi5qc1wiO1xyXG5pbXBvcnQgeyBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgeyBjb3B5VG9XYXNtIH0gZnJvbSBcIi4uL3V0aWwvY29weS10by13YXNtLmpzXCI7XHJcbmltcG9ydCB7IGdldFBvaW50ZXJTaXplIH0gZnJvbSBcIi4uL3V0aWwvcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgeyB3cml0ZVBvaW50ZXIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi93YXNtLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW52aXJvbl9nZXQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZW52aXJvbjogbnVtYmVyLCBlbnZpcm9uQnVmZmVyOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgY29uc3QgeyBzdHJpbmdzIH0gPSBnZXRFbnZpcm9uKHRoaXMpO1xyXG5cclxuICAgIGxldCBjdXJyZW50QnVmZmVyUHRyID0gZW52aXJvbkJ1ZmZlcjtcclxuICAgIGxldCBjdXJyZW50RW52aXJvblB0ciA9IGVudmlyb247XHJcbiAgICBmb3IgKGNvbnN0IHN0cmluZyBvZiBzdHJpbmdzKSB7XHJcbiAgICAgICAgd3JpdGVQb2ludGVyKHRoaXMsIGN1cnJlbnRFbnZpcm9uUHRyLCBjdXJyZW50QnVmZmVyUHRyKTtcclxuICAgICAgICBjb3B5VG9XYXNtKHRoaXMsIGN1cnJlbnRCdWZmZXJQdHIsIHN0cmluZyk7XHJcbiAgICAgICAgY3VycmVudEJ1ZmZlclB0ciArPSBzdHJpbmcuYnl0ZUxlbmd0aCArIDE7XHJcbiAgICAgICAgY3VycmVudEVudmlyb25QdHIgKz0gZ2V0UG9pbnRlclNpemUodGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIEVTVUNDRVNTO1xyXG59XHJcbiIsICJpbXBvcnQgeyBnZXRFbnZpcm9uIH0gZnJvbSBcIi4uL19wcml2YXRlL2Vudmlyb24uanNcIjtcclxuaW1wb3J0IHsgRVNVQ0NFU1MgfSBmcm9tIFwiLi4vZXJybm8uanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZW52aXJvbl9zaXplc19nZXQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZW52aXJvbkNvdW50T3V0cHV0OiBudW1iZXIsIGVudmlyb25TaXplT3V0cHV0OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgY29uc3QgeyBidWZmZXJTaXplLCBzdHJpbmdzIH0gPSBnZXRFbnZpcm9uKHRoaXMpO1xyXG5cclxuICAgIHdyaXRlVWludDMyKHRoaXMsIGVudmlyb25Db3VudE91dHB1dCwgc3RyaW5ncy5sZW5ndGgpO1xyXG4gICAgd3JpdGVVaW50MzIodGhpcywgZW52aXJvblNpemVPdXRwdXQsIGJ1ZmZlclNpemUpO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgeyBGaWxlRGVzY3JpcHRvciB9IGZyb20gXCIuLi90eXBlcy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JDbG9zZUV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYC4gXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIpIHtcclxuICAgICAgICBzdXBlcihcImZkX2Nsb3NlXCIsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IGZpbGVEZXNjcmlwdG9yIH0gfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQT1NJWCBjbG9zZSAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfY2xvc2UodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZmQ6IEZpbGVEZXNjcmlwdG9yKTogdm9pZCB7XHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvckNsb3NlRXZlbnQoZmQpO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICAvLyBUT0RPKG1heWJlPyk6IGRlZmF1bHQgYmVoYXZpb3JcclxuICAgIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgZ2V0UG9pbnRlclNpemUgfSBmcm9tIFwiLi4vdXRpbC9wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRQb2ludGVyIH0gZnJvbSBcIi4uL3V0aWwvcmVhZC1wb2ludGVyLmpzXCI7XHJcbmltcG9ydCB7IHJlYWRVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC9yZWFkLXVpbnQzMi5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJb3ZlYyB7XHJcbiAgICBidWZmZXJTdGFydDogbnVtYmVyO1xyXG4gICAgYnVmZmVyTGVuZ3RoOiBudW1iZXI7XHJcbiAgICB1aW50ODogVWludDhBcnJheTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKGluZm86IEluc3RhbnRpYXRlZFdhc20sIHB0cjogbnVtYmVyKTogSW92ZWMge1xyXG4gICAgY29uc3QgYnVmZmVyU3RhcnQgPSByZWFkUG9pbnRlcihpbmZvLCBwdHIpO1xyXG4gICAgY29uc3QgYnVmZmVyTGVuZ3RoID0gcmVhZFVpbnQzMihpbmZvLCBwdHIgKyBnZXRQb2ludGVyU2l6ZShpbmZvKSk7XHJcbiAgICBjb25zdCB1aW50OCA9IG5ldyBVaW50OEFycmF5KGluZm8uY2FjaGVkTWVtb3J5Vmlldy5idWZmZXIsIGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGgpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBidWZmZXJTdGFydCxcclxuICAgICAgICBidWZmZXJMZW5ndGgsXHJcbiAgICAgICAgdWludDhcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQXJyYXkoaW5mbzogSW5zdGFudGlhdGVkV2FzbSwgcHRyOiBudW1iZXIsIGNvdW50OiBudW1iZXIpOiBJb3ZlY1tdIHtcclxuICAgIGNvbnN0IHNpemVvZlN0cnVjdCA9IGdldFBvaW50ZXJTaXplKGluZm8pICsgNDtcclxuICAgIGNvbnN0IHJldDogSW92ZWNbXSA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XHJcbiAgICAgICAgcmV0LnB1c2gocGFyc2UoaW5mbywgcHRyICsgKGkgKiBzaXplb2ZTdHJ1Y3QpKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmV0O1xyXG59XHJcbiIsICJpbXBvcnQgeyBwYXJzZUFycmF5IH0gZnJvbSBcIi4uL19wcml2YXRlL2lvdmVjLmpzXCI7XHJcbmltcG9ydCB7IEVCQURGLCBFU1VDQ0VTUyB9IGZyb20gXCIuLi9lcnJuby5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVEZXNjcmlwdG9yIH0gZnJvbSBcIi4uL3R5cGVzLmpzXCI7XHJcbmltcG9ydCB7IHdyaXRlU2l6ZVQgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS1zaXpldC5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGVzY3JpcHRvclJlYWRFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqIFxyXG4gICAgICogSXQncyBtb3JlLW9yLWxlc3MgW3VuaXZlcnNhbGx5IGV4cGVjdGVkXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdGFuZGFyZF9zdHJlYW0pIHRoYXQgMCBpcyBmb3IgaW5wdXQsIDEgZm9yIG91dHB1dCwgYW5kIDIgZm9yIGVycm9ycyxcclxuICAgICAqIHNvIHlvdSBjYW4gbWFwIDEgdG8gYGNvbnNvbGUubG9nYCBhbmQgMiB0byBgY29uc29sZS5lcnJvcmAsIHdpdGggb3RoZXJzIGhhbmRsZWQgd2l0aCB0aGUgdmFyaW91cyBmaWxlLW9wZW5pbmcgY2FsbHMuIFxyXG4gICAgICovXHJcbiAgICByZWFkb25seSBmaWxlRGVzY3JpcHRvcjogbnVtYmVyO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGRhdGEgeW91IHdhbnQgdG8gd3JpdGUgdG8gdGhpcyBmaWxlRGVzY3JpcHRvciBpZiBgcHJldmVudERlZmF1bHRgIGlzIGNhbGxlZC5cclxuICAgICAqIFxyXG4gICAgICogSWYgaXQgaXMgbG9uZ2VyIHRoYW4gdGhlIGJ1ZmZlcnMgYWxsb3csIHRoZW4gdGhlIG5leHQgdGltZVxyXG4gICAgICogdGhpcyBldmVudCBpcyBkaXNwYXRjaGVkLCBgZGF0YWAgd2lsbCBiZSBwcmUtZmlsbGVkIHdpdGhcclxuICAgICAqIHdoYXRldmVyIHdhcyBsZWZ0b3Zlci4gWW91IGNhbiB0aGVuIGFkZCBtb3JlIGlmIHlvdSB3YW50LlxyXG4gICAgICogXHJcbiAgICAgKiBPbmNlIGFsbCBvZiBgZGF0YWAgaGFzIGJlZW4gcmVhZCAoa2VlcGluZyBpbiBtaW5kIGhvdyBuZXdsaW5lc1xyXG4gICAgICogY2FuIFwicGF1c2VcIiB0aGUgcmVhZGluZyBvZiBgZGF0YWAgdW50aWwgc29tZSB0aW1lIGluIHRoZSBmdXR1cmVcclxuICAgICAqIGFuZCBvdGhlciBmb3JtYXR0ZWQgaW5wdXQgcXVpcmtzKSwgaW5jbHVkaW5nIGlmIG5vIGRhdGEgaXMgZXZlclxyXG4gICAgICogYWRkZWQgaW4gdGhlIGZpcnN0IHBsYWNlLCBpdCdzIHVuZGVyc3Rvb2QgdG8gYmUgRU9GLlxyXG4gICAgICovXHJcbiAgICByZWFkb25seSBkYXRhOiAoVWludDhBcnJheSB8IHN0cmluZylbXTtcclxufVxyXG5cclxuXHJcbmNvbnN0IEZkUmVhZEluZm9TeW1ib2wgPSBTeW1ib2woKTtcclxuaW50ZXJmYWNlIEZkUmVhZEluZm8ge1xyXG4gICAgZGF0YTogKFVpbnQ4QXJyYXkgfCBzdHJpbmcpW107XHJcbn1cclxuaW50ZXJmYWNlIFdpdGhGZFJlYWRJbmZvIHtcclxuICAgIFtGZFJlYWRJbmZvU3ltYm9sXTogRmRSZWFkSW5mbztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JSZWFkRXZlbnREZXRhaWw+IHtcclxuXHJcblxyXG4gICAgY29uc3RydWN0b3IoZmlsZURlc2NyaXB0b3I6IG51bWJlciwgZGF0YTogKFVpbnQ4QXJyYXkgfCBzdHJpbmcpW10pIHtcclxuICAgICAgICBzdXBlcihcImZkX3JlYWRcIiwge1xyXG4gICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcclxuICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICAgICAgICBmaWxlRGVzY3JpcHRvcixcclxuICAgICAgICAgICAgICAgIGRhdGFcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogUE9TSVggcmVhZHYgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZkX3JlYWQodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZmQ6IEZpbGVEZXNjcmlwdG9yLCBpb3Y6IG51bWJlciwgaW92Y250OiBudW1iZXIsIHBudW06IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBsZXQgbldyaXR0ZW4gPSAwO1xyXG4gICAgY29uc3QgYnVmZmVycyA9IHBhcnNlQXJyYXkodGhpcywgaW92LCBpb3ZjbnQpO1xyXG5cclxuICAgIGNvbnN0IHRoaXMyID0gKCh0aGlzIGFzIHVua25vd24gYXMgV2l0aEZkUmVhZEluZm8pW0ZkUmVhZEluZm9TeW1ib2xdID8/PSB7IGRhdGE6IFtdIH0pO1xyXG5cclxuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEZpbGVEZXNjcmlwdG9yUmVhZEV2ZW50KGZkLCB0aGlzMi5kYXRhKTtcclxuICAgIGlmICh0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XHJcbiAgICAgICAgaWYgKGZkID09PSAwKSB7XHJcbiAgICAgICAgICAgIGlmIChldmVudC5kZXRhaWwuZGF0YS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCBiZWhhdmlvciBmb3Igc3RkaW4tLXVzZSB3aW5kb3cucHJvbXB0LlxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogV0FTTSBwcm9taXNlcyB3aGVuIHRob3NlIGFyZSBhdmFpbGFibGVcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KGV2ZW50LmRldGFpbC5kYXRhLmxlbmd0aCA9PSAwKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0ciA9ICh3aW5kb3cucHJvbXB0KCkgPz8gXCJcIikgKyBcIlxcblwiO1xyXG4gICAgICAgICAgICAgICAgZXZlbnQuZGV0YWlsLmRhdGEucHVzaChzdHIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gRUJBREY7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFdyaXRlIHRoZSB1c2VyLXByb3ZpZGVkIGRhdGEgdG8gdGhlIGJ1ZmZlclxyXG4gICAgbGV0IG91dEJ1ZmZJbmRleCA9IDA7XHJcbiAgICBsZXQgaW5CdWZmSW5kZXggPSAwO1xyXG4gICAgbGV0IG91dEJ1ZmY6IFVpbnQ4QXJyYXkgPSBidWZmZXJzW291dEJ1ZmZJbmRleF0udWludDg7XHJcbiAgICBsZXQgaW5CdWZmOiBVaW50OEFycmF5IHwgc3RyaW5nID0gZXZlbnQuZGV0YWlsLmRhdGFbaW5CdWZmSW5kZXhdO1xyXG5cclxuICAgIHdoaWxlICh0cnVlKSB7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2YgaW5CdWZmID09IFwic3RyaW5nXCIpXHJcbiAgICAgICAgICAgIGluQnVmZiA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShpbkJ1ZmYpO1xyXG5cclxuICAgICAgICBpZiAob3V0QnVmZiA9PSBudWxsIHx8IGluQnVmZiA9PSBudWxsKVxyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLy8gV3JpdGUgd2hhdCB3ZSBjYW4gZnJvbSBpbkJ1ZmYgdG8gb3V0QnVmZi5cclxuXHJcbiAgICAgICAgY29uc3QgbGVuZ3RoUmVtYWluaW5nVG9Xcml0ZSA9IGluQnVmZi5ieXRlTGVuZ3RoO1xyXG4gICAgICAgIGNvbnN0IGxlbmd0aEF2YWlsYWJsZVRvV3JpdGUgPSBvdXRCdWZmLmJ5dGVMZW5ndGg7XHJcbiAgICAgICAgY29uc3QgbGVuZ3RoVG9Xcml0ZSA9IE1hdGgubWluKGxlbmd0aEF2YWlsYWJsZVRvV3JpdGUsIGxlbmd0aFJlbWFpbmluZ1RvV3JpdGUpO1xyXG4gICAgICAgIG91dEJ1ZmYuc2V0KGluQnVmZi5zdWJhcnJheSgwLCBsZW5ndGhUb1dyaXRlKSk7XHJcblxyXG4gICAgICAgIC8vIE5vdyBcImRpc2NhcmRcIiB3aGF0IHdlIHdyb3RlXHJcbiAgICAgICAgLy8gKHRoaXMgZG9lc24ndCBhY3R1YWxseSBkbyBhbnkgaGVhdnkgbWVtb3J5IG1vdmVzIG9yIGFueXRoaW5nLFxyXG4gICAgICAgIC8vIGl0J3MganVzdCBjcmVhdGluZyBuZXcgdmlld3Mgb3ZlciB0aGUgc2FtZSBgQXJyYXlCdWZmZXJgcykuXHJcbiAgICAgICAgaW5CdWZmID0gaW5CdWZmLnN1YmFycmF5KGxlbmd0aFRvV3JpdGUpO1xyXG4gICAgICAgIG91dEJ1ZmYgPSBvdXRCdWZmLnN1YmFycmF5KGxlbmd0aFRvV3JpdGUpO1xyXG5cclxuICAgICAgICAvLyBOb3cgc2VlIHdoZXJlIHdlJ3JlIGF0IHdpdGggZWFjaCBidWZmZXIuXHJcbiAgICAgICAgLy8gSWYgd2UgcmFuIG91dCBvZiBpbnB1dCBkYXRhLCBtb3ZlIHRvIHRoZSBuZXh0IGlucHV0IGJ1ZmZlci5cclxuICAgICAgICBpZiAobGVuZ3RoUmVtYWluaW5nVG9Xcml0ZSA8IGxlbmd0aEF2YWlsYWJsZVRvV3JpdGUpIHtcclxuICAgICAgICAgICAgKytpbkJ1ZmZJbmRleDtcclxuICAgICAgICAgICAgaW5CdWZmID0gZXZlbnQuZGV0YWlsLmRhdGFbaW5CdWZmSW5kZXhdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSWYgd2UgcmFuIG91dCBvZiBvdXRwdXQgc3BhY2UsIG1vdmUgdG8gdGhlIG5leHQgb3V0cHV0IGJ1ZmZlci5cclxuICAgICAgICBpZiAobGVuZ3RoQXZhaWxhYmxlVG9Xcml0ZSA8IGxlbmd0aFJlbWFpbmluZ1RvV3JpdGUpIHtcclxuICAgICAgICAgICAgKytvdXRCdWZmSW5kZXg7XHJcbiAgICAgICAgICAgIG91dEJ1ZmYgPSBidWZmZXJzW291dEJ1ZmZJbmRleF0/LnVpbnQ4O1xyXG4gICAgICAgIH1cclxuICAgICAgICBuV3JpdHRlbiArPSBsZW5ndGhUb1dyaXRlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGQ6IChzdHJpbmcgfCBVaW50OEFycmF5KVtdID0gW107XHJcbiAgICBpZiAoaW5CdWZmICYmIGluQnVmZi5ieXRlTGVuZ3RoKVxyXG4gICAgICAgIGQucHVzaChpbkJ1ZmYpO1xyXG4gICAgaWYgKGV2ZW50LmRldGFpbC5kYXRhLmxlbmd0aCA+IDApXHJcbiAgICAgICAgZC5wdXNoKC4uLmV2ZW50LmRldGFpbC5kYXRhLnNsaWNlKGluQnVmZkluZGV4ICsgMSkpO1xyXG5cclxuICAgIHRoaXMyLmRhdGEgPSBkO1xyXG5cclxuICAgIHdyaXRlU2l6ZVQodGhpcywgcG51bSwgbldyaXR0ZW4pO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufVxyXG4iLCAiaW1wb3J0IHsgRUJBREYsIEVJTlZBTCwgRU9WRVJGTE9XLCBFU1BJUEUsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVQb2ludGVyIH0gZnJvbSBcIi4uL3V0aWwvd3JpdGUtcG9pbnRlci5qc1wiO1xyXG5pbXBvcnQgdHlwZSB7IEluc3RhbnRpYXRlZFdhc20gfSBmcm9tIFwiLi4vd2FzbS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGVzY3JpcHRvclNlZWtFdmVudERldGFpbCB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBbZmlsZSBkZXNjcmlwdG9yXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaWxlX2Rlc2NyaXB0b3IpLCBhIDAtaW5kZXhlZCBudW1iZXIgZGVzY3JpYmluZyB3aGVyZSB0aGUgZGF0YSBpcyBnb2luZyB0by9jb21pbmcgZnJvbS5cclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgZmlsZURlc2NyaXB0b3I6IG51bWJlcjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBudW1iZXIgb2YgYnl0ZXMgdG8gbW92ZSB0aGUgY3VycmVudCBwb3NpdGlvbiBieVxyXG4gICAgICovXHJcbiAgICByZWFkb25seSBvZmZzZXQ6IG51bWJlcjtcclxuXHJcbiAgICAvKiogXHJcbiAgICAgKiBXaGV0aGVyIHRvIG1vdmUgLi4uXHJcbiAgICAgKiAqIC4uLnRvIGFuIGFic29sdXRlIHBvc2l0aW9uIChXSEVOQ0VfU0VUKVxyXG4gICAgICogKiAuLi5yZWxhdGl2ZSB0byB0aGUgY3VycmVudCBwb3NpdGlvbiAoV0hFTkNFX0NVUilcclxuICAgICAqICogLi4ucmVsYXRpdmUgdG8gdGhlIGVuZCBvZiB0aGUgZmlsZSAoV0hFTkNFX0VORClcclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgd2hlbmNlOiBTZWVrV2hlbmNlO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSWYgeW91IHNldCB0aGlzIHZhbHVlIGFuZCBjYWxsIGBwcmV2ZW50RGVmYXVsdGAsIGl0IHdpbGwgYmUgcmV0dXJuZWQgYnkgYGZkX3NlZWtgLiBPdGhlcndpc2UgRVNVQ0NFU1Mgd2lsbCBiZSByZXR1cm5lZFxyXG4gICAgICovXHJcbiAgICBlcnJvcj86IEZpbGVTZWVrRXJyb3JzO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSWYgYHByZXZlbnREZWZhdWx0YCBpcyBjYWxsZWQsIHRoaXMgbXVzdCBiZSBzZXQgdG8gdGhlIG5ldyBwb3NpdGlvbiBpbiB0aGUgZmlsZSAob3IgYGVycm9yYCBtdXN0IGJlIHNldCkuXHJcbiAgICAgKi9cclxuICAgIG5ld1Bvc2l0aW9uOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIEZpbGVTZWVrRXJyb3JzID0gdHlwZW9mIEVTUElQRSB8IHR5cGVvZiBFQkFERiB8IHR5cGVvZiBFSU5WQUwgfCB0eXBlb2YgRU9WRVJGTE9XIHwgdHlwZW9mIEVTVUNDRVNTO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVEZXNjcmlwdG9yU2Vla0V2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8RmlsZURlc2NyaXB0b3JTZWVrRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIsIG9mZnNldDogbnVtYmVyLCB3aGVuY2U6IFNlZWtXaGVuY2UpIHtcclxuICAgICAgICBzdXBlcihcImZkX3NlZWtcIiwgeyBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZmlsZURlc2NyaXB0b3IsIG9mZnNldCwgd2hlbmNlLCBuZXdQb3NpdGlvbjogMCwgZXJyb3I6IHVuZGVmaW5lZCB9IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgV0hFTkNFX1NFVCA9IDA7XHJcbmV4cG9ydCBjb25zdCBXSEVOQ0VfQ1VSID0gMTtcclxuZXhwb3J0IGNvbnN0IFdIRU5DRV9FTkQgPSAyO1xyXG5leHBvcnQgdHlwZSBTZWVrV2hlbmNlID0gdHlwZW9mIFdIRU5DRV9TRVQgfCB0eXBlb2YgV0hFTkNFX0NVUiB8IHR5cGVvZiBXSEVOQ0VfRU5EO1xyXG5cclxuLyoqIFBPU0lYIGxzZWVrICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmZF9zZWVrKHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGZkOiBGaWxlRGVzY3JpcHRvciwgb2Zmc2V0OiBudW1iZXIsIHdoZW5jZTogU2Vla1doZW5jZSwgb2Zmc2V0T3V0OiBudW1iZXIpOiBGaWxlU2Vla0Vycm9ycyB7XHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvclNlZWtFdmVudChmZCwgb2Zmc2V0LCB3aGVuY2UpO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBzd2l0Y2ggKGZkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiBFU1BJUEU7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiBFQkFERjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB3cml0ZVBvaW50ZXIodGhpcywgb2Zmc2V0T3V0LCBldmVudC5kZXRhaWwubmV3UG9zaXRpb24pO1xyXG4gICAgICAgIHJldHVybiBldmVudC5kZXRhaWwuZXJyb3IgPz8gRVNVQ0NFU1M7XHJcbiAgICB9XHJcbn1cclxuIiwgImltcG9ydCB7IHBhcnNlQXJyYXkgfSBmcm9tIFwiLi4vX3ByaXZhdGUvaW92ZWMuanNcIjtcclxuaW1wb3J0IHsgRUJBREYsIEVTVUNDRVNTIH0gZnJvbSBcIi4uL2Vycm5vLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRmlsZURlc2NyaXB0b3IgfSBmcm9tIFwiLi4vdHlwZXMuanNcIjtcclxuaW1wb3J0IHsgd3JpdGVVaW50MzIgfSBmcm9tIFwiLi4vdXRpbC93cml0ZS11aW50MzIuanNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZURlc2NyaXB0b3JXcml0ZUV2ZW50RGV0YWlsIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFtmaWxlIGRlc2NyaXB0b3JdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ZpbGVfZGVzY3JpcHRvciksIGEgMC1pbmRleGVkIG51bWJlciBkZXNjcmliaW5nIHdoZXJlIHRoZSBkYXRhIGlzIGdvaW5nIHRvL2NvbWluZyBmcm9tLlxyXG4gICAgICogXHJcbiAgICAgKiBJdCdzIG1vcmUtb3ItbGVzcyBbdW5pdmVyc2FsbHkgZXhwZWN0ZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1N0YW5kYXJkX3N0cmVhbSkgdGhhdCAwIGlzIGZvciBpbnB1dCwgMSBmb3Igb3V0cHV0LCBhbmQgMiBmb3IgZXJyb3JzLFxyXG4gICAgICogc28geW91IGNhbiBtYXAgMSB0byBgY29uc29sZS5sb2dgIGFuZCAyIHRvIGBjb25zb2xlLmVycm9yYCwgd2l0aCBvdGhlcnMgaGFuZGxlZCB3aXRoIHRoZSB2YXJpb3VzIGZpbGUtb3BlbmluZyBjYWxscy4gXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IGZpbGVEZXNjcmlwdG9yOiBudW1iZXI7XHJcblxyXG4gICAgcmVhZG9ubHkgZGF0YTogVWludDhBcnJheVtdO1xyXG5cclxuICAgIGFzU3RyaW5nKGxhYmVsOiBzdHJpbmcpOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnQgZXh0ZW5kcyBDdXN0b21FdmVudDxGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnREZXRhaWw+IHtcclxuICAgIGNvbnN0cnVjdG9yKGZpbGVEZXNjcmlwdG9yOiBudW1iZXIsIGRhdGE6IFVpbnQ4QXJyYXlbXSkge1xyXG4gICAgICAgIHN1cGVyKFwiZmRfd3JpdGVcIiwge1xyXG4gICAgICAgICAgICBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7XHJcbiAgICAgICAgICAgICAgICBkYXRhLFxyXG4gICAgICAgICAgICAgICAgZmlsZURlc2NyaXB0b3IsXHJcbiAgICAgICAgICAgICAgICBhc1N0cmluZyhsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhLm1hcCgoZCwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZCA9IHR5cGVvZiBkID09IFwic3RyaW5nXCIgPyBkIDogZ2V0VGV4dERlY29kZXIobGFiZWwpLmRlY29kZShkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlY29kZWQgPT0gXCJcXDBcIiAmJiBpbmRleCA9PSB0aGlzLmRhdGEubGVuZ3RoIC0gMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlZDtcclxuICAgICAgICAgICAgICAgICAgICB9KS5qb2luKFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5oYW5kbGVkRmlsZVdyaXRlRXZlbnQgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihmZDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3VwZXIoYFVuaGFuZGxlZCB3cml0ZSB0byBmaWxlIGRlc2NyaXB0b3IgIyR7ZmR9LmApO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqIFBPU0lYIHdyaXRldiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmRfd3JpdGUodGhpczogSW5zdGFudGlhdGVkV2FzbSwgZmQ6IEZpbGVEZXNjcmlwdG9yLCBpb3Y6IG51bWJlciwgaW92Y250OiBudW1iZXIsIHBudW06IG51bWJlcik6IHR5cGVvZiBFU1VDQ0VTUyB8IHR5cGVvZiBFQkFERiB7XHJcblxyXG4gICAgbGV0IG5Xcml0dGVuID0gMDtcclxuICAgIGNvbnN0IGdlbiA9IHBhcnNlQXJyYXkodGhpcywgaW92LCBpb3ZjbnQpO1xyXG5cclxuICAgIC8vIEdldCBhbGwgdGhlIGRhdGEgdG8gd3JpdGUgaW4gaXRzIHNlcGFyYXRlIGJ1ZmZlcnNcclxuICAgIGNvbnN0IGFzVHlwZWRBcnJheXMgPSBnZW4ubWFwKCh7IGJ1ZmZlclN0YXJ0LCBidWZmZXJMZW5ndGggfSkgPT4ge1xyXG4gICAgICAgIG5Xcml0dGVuICs9IGJ1ZmZlckxlbmd0aDtcclxuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodGhpcy5jYWNoZWRNZW1vcnlWaWV3LmJ1ZmZlciwgYnVmZmVyU3RhcnQsIGJ1ZmZlckxlbmd0aCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IG5ldyBGaWxlRGVzY3JpcHRvcldyaXRlRXZlbnQoZmQsIGFzVHlwZWRBcnJheXMpO1xyXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcclxuICAgICAgICBjb25zdCBzdHIgPSBldmVudC5kZXRhaWwuYXNTdHJpbmcoXCJ1dGYtOFwiKTtcclxuICAgICAgICBpZiAoZmQgPT0gMSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coc3RyKTtcclxuICAgICAgICBlbHNlIGlmIChmZCA9PSAyKVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHN0cik7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gRUJBREY7XHJcbiAgICB9XHJcblxyXG4gICAgd3JpdGVVaW50MzIodGhpcywgcG51bSwgbldyaXR0ZW4pO1xyXG5cclxuICAgIHJldHVybiBFU1VDQ0VTUztcclxufVxyXG5cclxuXHJcbmNvbnN0IHRleHREZWNvZGVycyA9IG5ldyBNYXA8c3RyaW5nLCBUZXh0RGVjb2Rlcj4oKTtcclxuZnVuY3Rpb24gZ2V0VGV4dERlY29kZXIobGFiZWw6IHN0cmluZykge1xyXG4gICAgbGV0IHJldDogVGV4dERlY29kZXIgfCB1bmRlZmluZWQgPSB0ZXh0RGVjb2RlcnMuZ2V0KGxhYmVsKTtcclxuICAgIGlmICghcmV0KSB7XHJcbiAgICAgICAgcmV0ID0gbmV3IFRleHREZWNvZGVyKGxhYmVsKTtcclxuICAgICAgICB0ZXh0RGVjb2RlcnMuc2V0KGxhYmVsLCByZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQ7XHJcbn0iLCAiaW1wb3J0IHR5cGUgeyBJbnN0YW50aWF0ZWRXYXNtIH0gZnJvbSBcIi4uL3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFByb2NFeGl0RXZlbnREZXRhaWwge1xyXG4gICAgLyoqIFxyXG4gICAgICogVGhlIHZhbHVlIHBhc3NlZCB0byBgc3RkOjpleGl0YCBcclxuICAgICAqIChhbmQvb3IgdGhlIHZhbHVlIHJldHVybmVkIGZyb20gYG1haW5gKSBcclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgY29kZTogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogVGhpcyBldmVudCBpcyBjYWxsZWQgd2hlbiBgc3RkOjpleGl0YCBpcyBjYWxsZWQsIGluY2x1ZGluZyB3aGVuXHJcbiAqIGBtYWluYCBlbmRzLCBpZiB5b3UgaGF2ZSBvbmUuXHJcbiAqIFxyXG4gKiBXaGF0IHlvdSBjaG9vc2UgdG8gZG8gd2l0aCB0aGlzIGV2ZW50IGlzIHVwIHRvIHlvdSwgYnV0XHJcbiAqIGtub3cgdGhhdCB0aGUgbmV4dCBXQVNNIGluc3RydWN0aW9uIG9uY2UgZXZlbnQgZGlzcGF0Y2ggZW5kcyBpcyBgdW5yZWFjaGFibGVgLlxyXG4gKiBcclxuICogSXQncyByZWNvbW1lbmRlZCB0byB0aHJvdyB5b3VyIG93biBgRXJyb3JgLCB3aGljaCBpcyB3aGF0IEVtc2NyaXB0ZW4gZG9lcy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBQcm9jRXhpdEV2ZW50IGV4dGVuZHMgQ3VzdG9tRXZlbnQ8UHJvY0V4aXRFdmVudERldGFpbD4ge1xyXG4gICAgY29uc3RydWN0b3IocHVibGljIGNvZGU6IG51bWJlcikge1xyXG4gICAgICAgIHN1cGVyKFwicHJvY19leGl0XCIsIHsgYnViYmxlczogZmFsc2UsIGNhbmNlbGFibGU6IGZhbHNlLCBkZXRhaWw6IHsgY29kZSB9IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvY19leGl0KHRoaXM6IEluc3RhbnRpYXRlZFdhc20sIGNvZGU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBQcm9jRXhpdEV2ZW50KGNvZGUpKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgYWxpZ25mYXVsdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9hbGlnbmZhdWx0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50IH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9ib29sIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9ib29sLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2NvbnN0cnVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24gfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfcHJvcGVydHkgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX3Byb3BlcnR5LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2NvbnN0YW50LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsIF9lbXZhbF9kZWNyZWYsIF9lbXZhbF90YWtlX3ZhbHVlIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9lbXZhbC5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX2VudW0sIF9lbWJpbmRfcmVnaXN0ZXJfZW51bV92YWx1ZSwgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX2VudW0uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mbG9hdCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9mdW5jdGlvbiB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24uanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZyB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2VtYmluZF9yZWdpc3Rlcl9zdGRfd3N0cmluZy5qc1wiO1xyXG5pbXBvcnQgeyBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdXNlcl90eXBlLmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfZmluYWxpemVfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXkuanNcIjtcclxuaW1wb3J0IHsgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9vYmplY3QsIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LCBfZW1iaW5kX3JlZ2lzdGVyX3ZhbHVlX29iamVjdF9maWVsZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LmpzXCI7XHJcbmltcG9ydCB7IF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi9lbWJpbmRfcmVnaXN0ZXJfdm9pZC5qc1wiO1xyXG5pbXBvcnQgeyBlbXNjcmlwdGVuX25vdGlmeV9tZW1vcnlfZ3Jvd3RoIH0gZnJvbSBcIi4uLy4uL2Rpc3QvZW52L2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGguanNcIjtcclxuaW1wb3J0IHsgc2VnZmF1bHQgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvc2VnZmF1bHQuanNcIjtcclxuaW1wb3J0IHsgX190aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZSB9IGZyb20gXCIuLi8uLi9kaXN0L2Vudi90aHJvd19leGNlcHRpb25fd2l0aF9zdGFja190cmFjZS5qc1wiO1xyXG5pbXBvcnQgeyBfdHpzZXRfanMgfSBmcm9tIFwiLi4vLi4vZGlzdC9lbnYvdHpzZXRfanMuanNcIjtcclxuaW1wb3J0IHsgY2xvY2tfdGltZV9nZXQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2Nsb2NrX3RpbWVfZ2V0LmpzXCI7XHJcbmltcG9ydCB7IGVudmlyb25fZ2V0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9lbnZpcm9uX2dldC5qc1wiO1xyXG5pbXBvcnQgeyBlbnZpcm9uX3NpemVzX2dldCB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZW52aXJvbl9zaXplc19nZXQuanNcIjtcclxuaW1wb3J0IHsgZmRfY2xvc2UgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX2Nsb3NlLmpzXCI7XHJcbmltcG9ydCB7IGZkX3JlYWQgfSBmcm9tIFwiLi4vLi4vZGlzdC93YXNpX3NuYXBzaG90X3ByZXZpZXcxL2ZkX3JlYWQuanNcIjtcclxuaW1wb3J0IHsgZmRfc2VlayB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfc2Vlay5qc1wiO1xyXG5pbXBvcnQgeyBmZF93cml0ZSB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc2lfc25hcHNob3RfcHJldmlldzEvZmRfd3JpdGUuanNcIjtcclxuaW1wb3J0IHsgcHJvY19leGl0IH0gZnJvbSBcIi4uLy4uL2Rpc3Qvd2FzaV9zbmFwc2hvdF9wcmV2aWV3MS9wcm9jX2V4aXQuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFudGlhdGVkV2FzbSB9IGZyb20gXCIuLi8uLi9kaXN0L3dhc20uanNcIjtcclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFN0cnVjdFRlc3Qge1xyXG4gICAgc3RyaW5nOiBzdHJpbmc7XHJcbiAgICBudW1iZXI6IG51bWJlcjtcclxuICAgIHRyaXBsZTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdO1xyXG59XHJcblxyXG5leHBvcnQgZGVjbGFyZSBjbGFzcyBUZXN0Q2xhc3MgaW1wbGVtZW50cyBEaXNwb3NhYmxlIHtcclxuICAgIHB1YmxpYyB4OiBudW1iZXI7XHJcbiAgICBwdWJsaWMgeTogc3RyaW5nO1xyXG4gICAgY29uc3RydWN0b3IoeDogbnVtYmVyLCB5OiBzdHJpbmcpO1xyXG4gICAgaW5jcmVtZW50WCgpOiBUZXN0Q2xhc3M7XHJcblxyXG4gICAgZ2V0WCgpOiBudW1iZXI7XHJcbiAgICBzZXRYKHg6IG51bWJlcik6IHZvaWQ7XHJcblxyXG4gICAgc3RhdGljIGdldFN0cmluZ0Zyb21JbnN0YW5jZShpbnN0YW5jZTogVGVzdENsYXNzKTogc3RyaW5nO1xyXG5cclxuICAgIHN0YXRpYyBjcmVhdGUoKTogVGVzdENsYXNzO1xyXG5cclxuICAgIHN0YXRpYyBpZGVudGl0eUNvbnN0UG9pbnRlcihpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5UG9pbnRlcihpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5UmVmZXJlbmNlKGlucHV0OiBUZXN0Q2xhc3MpOiBUZXN0Q2xhc3M7XHJcbiAgICBzdGF0aWMgaWRlbnRpdHlDb25zdFJlZmVyZW5jZShpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG4gICAgc3RhdGljIGlkZW50aXR5Q29weShpbnB1dDogVGVzdENsYXNzKTogVGVzdENsYXNzO1xyXG5cclxuICAgIFtTeW1ib2wuZGlzcG9zZV0oKTogdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbWJvdW5kVHlwZXMge1xyXG5cclxuICAgIGlkZW50aXR5X3U4KG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X2k4KG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X3UxNihuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV9pMTYobjogbnVtYmVyKTogbnVtYmVyO1xyXG4gICAgaWRlbnRpdHlfdTMyKG46IG51bWJlcik6IG51bWJlcjtcclxuICAgIGlkZW50aXR5X2kzMihuOiBudW1iZXIpOiBudW1iZXI7XHJcbiAgICBpZGVudGl0eV91NjQobjogYmlnaW50KTogYmlnaW50O1xyXG4gICAgaWRlbnRpdHlfaTY0KG46IGJpZ2ludCk6IGJpZ2ludDtcclxuICAgIGlkZW50aXR5X3N0cmluZyhuOiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICBpZGVudGl0eV93c3RyaW5nKG46IHN0cmluZyk6IHN0cmluZztcclxuICAgIGlkZW50aXR5X29sZF9lbnVtKG46IGFueSk6IHN0cmluZztcclxuICAgIGlkZW50aXR5X25ld19lbnVtKG46IGFueSk6IHN0cmluZztcclxuICAgIGlkZW50aXR5X3N0cnVjdF9wb2ludGVyKG46IFN0cnVjdFRlc3QpOiBTdHJ1Y3RUZXN0O1xyXG4gICAgc3RydWN0X2NyZWF0ZSgpOiBTdHJ1Y3RUZXN0O1xyXG4gICAgc3RydWN0X2NvbnN1bWUobjogU3RydWN0VGVzdCk6IHZvaWQ7XHJcbiAgICBpZGVudGl0eV9zdHJ1Y3RfY29weShuOiBTdHJ1Y3RUZXN0KTogU3RydWN0VGVzdDtcclxuICAgIHRlc3RDbGFzc0FycmF5KCk6IG51bWJlcjtcclxuICAgIG5vd1N0ZWFkeSgpOiBudW1iZXI7XHJcbiAgICBub3dTeXN0ZW0oKTogbnVtYmVyO1xyXG4gICAgdGhyb3dzRXhjZXB0aW9uKCk6IG5ldmVyO1xyXG4gICAgY2F0Y2hlc0V4Y2VwdGlvbigpOiBuZXZlcjtcclxuICAgIGdldGVudihrZXk6IHN0cmluZyk6IHN0cmluZztcclxuICAgIGlkZW50aXR5X3N0ZG91dCgpOiB2b2lkO1xyXG4gICAgcmV0dXJuX3N0ZGluKCk6IHN0cmluZztcclxuXHJcbiAgICBUZXN0Q2xhc3M6IHR5cGVvZiBUZXN0Q2xhc3M7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgS25vd25JbnN0YW5jZUV4cG9ydHMge1xyXG4gICAgcHJpbnRUZXN0KCk6IG51bWJlcjtcclxuICAgIHJldmVyc2VJbnB1dCgpOiBudW1iZXI7XHJcbiAgICBnZXRSYW5kb21OdW1iZXIoKTogbnVtYmVyO1xyXG4gICAgZ2V0S2V5KCk6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlKHdoZXJlOiBzdHJpbmcsIHVuaW5zdGFudGlhdGVkPzogQXJyYXlCdWZmZXIpOiBQcm9taXNlPEluc3RhbnRpYXRlZFdhc208S25vd25JbnN0YW5jZUV4cG9ydHMsIEVtYm91bmRUeXBlcz4+IHtcclxuXHJcbiAgICBsZXQgd2FzbSA9IG5ldyBJbnN0YW50aWF0ZWRXYXNtPEtub3duSW5zdGFuY2VFeHBvcnRzLCBFbWJvdW5kVHlwZXM+KCk7XHJcbiAgICB3YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJlbnZpcm9uX2dldFwiLCBlID0+IHtcclxuICAgICAgICBlLmRldGFpbC5zdHJpbmdzID0gW1xyXG4gICAgICAgICAgICBbXCJrZXlfMVwiLCBcInZhbHVlXzFcIl0sXHJcbiAgICAgICAgICAgIFtcImtleV8yXCIsIFwidmFsdWVfMlwiXSxcclxuICAgICAgICAgICAgW1wia2V5XzNcIiwgXCJ2YWx1ZV8zXCJdXHJcbiAgICAgICAgXVxyXG4gICAgfSk7XHJcbiAgICAvKndhc20uYWRkRXZlbnRMaXN0ZW5lcihcImZkX3JlYWRcIiwgZSA9PiB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGxldCBzdHIgPSBcIlRoaXNfaXNfYV90ZXN0X3N0cmluZ1xcblwiO1xyXG4gICAgICAgIGxldCBwb3MgPSAwO1xyXG4gICAgICAgIGUuZGV0YWlsLndyaXRlID0gKGlucHV0KSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnZ2VyO1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSAobmV3IFRleHRFbmNvZGVyKS5lbmNvZGVJbnRvKHN0ci5zdWJzdHJpbmcocG9zKSwgaW5wdXQpO1xyXG4gICAgICAgICAgICBwb3MgKz0gcmVzdWx0LnJlYWQ7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQud3JpdHRlbjtcclxuICAgICAgICB9XHJcbiAgICB9KTsqL1xyXG4gICAgYXdhaXQgd2FzbS5pbnN0YW50aWF0ZSh1bmluc3RhbnRpYXRlZCA/PyBmZXRjaChuZXcgVVJMKFwid2FzbS53YXNtXCIsIGltcG9ydC5tZXRhLnVybCkpLCB7XHJcbiAgICAgICAgZW52OiB7XHJcbiAgICAgICAgICAgIF9fdGhyb3dfZXhjZXB0aW9uX3dpdGhfc3RhY2tfdHJhY2UsXHJcbiAgICAgICAgICAgIGVtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdm9pZCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9ib29sLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfYmlnaW50LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3N0ZF9zdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZW12YWwsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfZnVuY3Rpb24sXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfY29uc3RhbnQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXksXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfYXJyYXlfZWxlbWVudCxcclxuICAgICAgICAgICAgX2VtYmluZF9maW5hbGl6ZV92YWx1ZV9hcnJheSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl92YWx1ZV9vYmplY3RfZmllbGQsXHJcbiAgICAgICAgICAgIF9lbWJpbmRfcmVnaXN0ZXJfdmFsdWVfb2JqZWN0LFxyXG4gICAgICAgICAgICBfZW1iaW5kX2ZpbmFsaXplX3ZhbHVlX29iamVjdCxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzcyxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19wcm9wZXJ0eSxcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbixcclxuICAgICAgICAgICAgX2VtYmluZF9yZWdpc3Rlcl9lbnVtLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX2VudW1fdmFsdWUsXHJcbiAgICAgICAgICAgIF9lbXZhbF90YWtlX3ZhbHVlLFxyXG4gICAgICAgICAgICBfZW12YWxfZGVjcmVmLFxyXG4gICAgICAgICAgICBfZW1iaW5kX3JlZ2lzdGVyX3VzZXJfdHlwZSxcclxuICAgICAgICAgICAgX3R6c2V0X2pzLFxyXG4gICAgICAgICAgICBzZWdmYXVsdCxcclxuICAgICAgICAgICAgYWxpZ25mYXVsdCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdhc2lfc25hcHNob3RfcHJldmlldzE6IHtcclxuICAgICAgICAgICAgZmRfY2xvc2UsXHJcbiAgICAgICAgICAgIGZkX3JlYWQsXHJcbiAgICAgICAgICAgIGZkX3NlZWssXHJcbiAgICAgICAgICAgIGZkX3dyaXRlLFxyXG4gICAgICAgICAgICBlbnZpcm9uX2dldCxcclxuICAgICAgICAgICAgZW52aXJvbl9zaXplc19nZXQsXHJcbiAgICAgICAgICAgIHByb2NfZXhpdCxcclxuICAgICAgICAgICAgY2xvY2tfdGltZV9nZXRcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICB3YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJmZF93cml0ZVwiLCBlID0+IHtcclxuICAgICAgICBpZiAoZS5kZXRhaWwuZmlsZURlc2NyaXB0b3IgPT0gMSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZS5kZXRhaWwuYXNTdHJpbmcoXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYCR7d2hlcmV9OiAke3ZhbHVlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB3YXNtO1xyXG59XHJcbiIsICIvL2ltcG9ydCBcImNvcmUtanNcIjtcclxuXHJcbmltcG9ydCB7IHdyYXAgfSBmcm9tIFwiY29tbGlua1wiO1xyXG5pbXBvcnQgeyB9IGZyb20gXCIuLi8uLi9kaXN0L2luZGV4LmpzXCI7XHJcbmltcG9ydCB7IGluc3RhbnRpYXRlLCBTdHJ1Y3RUZXN0IH0gZnJvbSBcIi4vaW5zdGFudGlhdGUuanNcIjtcclxuXHJcbmNvbnN0IHdhc20gPSBhd2FpdCBpbnN0YW50aWF0ZShcIk1haW5cIik7XHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVhZHktbWFpblwiKSEuaW5uZXJIVE1MID0gXCJcdTI3MTRcdUZFMEZcIjtcclxuXHJcblxyXG5jb25zdCBzdHJ1Y3RUZXN0OiBTdHJ1Y3RUZXN0ID0ge1xyXG4gICAgc3RyaW5nOiBcIlRlc3Qgc3RyaW5nIG9mIGEgbGVuZ3RoIGxvbmcgZW5vdWdoIHRvIGhvcGVmdWxseSBjYXVzZSBpc3N1ZXMgaWYgc29tZXRoaW5nIGdvZXMgd3JvbmdcIixcclxuICAgIG51bWJlcjogMHhGRkZGLFxyXG4gICAgdHJpcGxlOiBbMTAsIDEwMCwgMTAwMF1cclxufVxyXG5cclxuY29uc3QgbWFpbkVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5cIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcbmNvbnN0IHdvcmtlckVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndvcmtlclwiKSBhcyBIVE1MRGl2RWxlbWVudDtcclxuY29uc3Qgd29ya2xldEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndvcmtsZXRcIikgYXMgSFRNTERpdkVsZW1lbnQ7XHJcblxyXG5jb25zdCB3ID0gbmV3IFdvcmtlcihcIi4vanMvd29ya2VyLmpzXCIsIHsgdHlwZTogXCJtb2R1bGVcIiB9KTtcclxuY29uc3Qgd29ya2VyID0gd3JhcDx7IGV4ZWN1dGUoZnVuYzogc3RyaW5nKTogdW5rbm93biB9Pih3KTtcclxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWFkeS13b3JrZXJcIikhLmlubmVySFRNTCA9IFwiXHUyNzE0XHVGRTBGXCI7XHJcbihnbG9iYWxUaGlzIGFzIGFueSkuX3dvcmtlciA9IHdvcmtlcjtcclxuKGdsb2JhbFRoaXMgYXMgYW55KS5fd2FzbSA9IHdhc207XHJcbi8qXHJcbl93YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJmZF9yZWFkXCIsIGUgPT4ge1xyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZS5kZXRhaWwuZGF0YS5wdXNoKFZlcnlMb25nU3RyaW5nLCBWZXJ5TG9uZ1N0cmluZywgVmVyeUxvbmdTdHJpbmcsIFwiXFxuXCIpO1xyXG59KTtcclxuY29uc29sZS5sb2coX3dhc20uZW1iaW5kLnJldHVybl9zdGRpbigpKTtcclxuZGVidWdnZXI7XHJcbmNvbnNvbGUubG9nKF93YXNtLmVtYmluZC5yZXR1cm5fc3RkaW4oKSk7XHJcbmNvbnNvbGUubG9nKF93YXNtLmVtYmluZC5yZXR1cm5fc3RkaW4oKSk7Ki9cclxuXHJcbi8qX3dhc20uYWRkRXZlbnRMaXN0ZW5lcihcImZkX3JlYWRcIiwgZSA9PiB7XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBpZiAoIWUuZGV0YWlsLmVvZiAmJiBlLmRldGFpbC5kYXRhLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIGUuZGV0YWlsLmRhdGEucHVzaChWZXJ5TG9uZ1N0cmluZyk7XHJcbiAgICB9XHJcbiAgfSlcclxuICBjb25zb2xlLmxvZyggX3dhc20uZW1iaW5kLnJldHVybl9zdGRpbigpKTtcclxuICBjb25zb2xlLmxvZyggX3dhc20uZW1iaW5kLnJldHVybl9zdGRpbigpKTtcclxuICBjb25zb2xlLmxvZyggX3dhc20uZW1iaW5kLnJldHVybl9zdGRpbigpKTsqL1xyXG4vL3dhc20uZW1iaW5kLmlkZW50aXR5X3N0ZG91dCgpO1xyXG4vKndhc20uYWRkRXZlbnRMaXN0ZW5lcihcIldlYkFzc2VtYmx5RXhjZXB0aW9uRXZlbnRcIiwgKGV2ZW50KSA9PiB7ZGVidWdnZXI7IGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IHRocm93IG5ldyAoV2ViQXNzZW1ibHkgYXMgYW55KS5FeGNlcHRpb24oXCJIaVwiKX0pO1xyXG50cnkge1xyXG53YXNtLmVtYmluZC50aHJvd3NFeGNlcHRpb24oKTtcclxufVxyXG5jYXRjaCAoZXgpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xyXG59Ki9cclxuY29uc3QgY2xzID0gbmV3IHdhc20uZW1iaW5kLlRlc3RDbGFzcyg1LCBcInRlc3RcIik7XHJcbmNscy54ID0gMTA7XHJcbmNscy5nZXRYKCk7XHJcbmNsc1tTeW1ib2wuZGlzcG9zZV0oKTtcclxud2FzbS5lbWJpbmQuc3RydWN0X2NvbnN1bWUoc3RydWN0VGVzdClcclxuY29uc3QgcyA9IHdhc20uZW1iaW5kLnN0cnVjdF9jcmVhdGUoKTtcclxuLy9jb25zb2xlLmxvZyhzKTtcclxuLy9zW1N5bWJvbC5kaXNwb3NlXSgpO1xyXG53YXNtLmVtYmluZC5pZGVudGl0eV9zdHJpbmcoXCJ0ZXN0IHN0cmluZ1wiKTtcclxuKChnbG9iYWxUaGlzIGFzIGFueSkuX21lbW9yeUdyb3d0aCkgPSAwO1xyXG53YXNtLmFkZEV2ZW50TGlzdGVuZXIoXCJNZW1vcnlHcm93dGhFdmVudFwiLCAoKSA9PiB7ICgoZ2xvYmFsVGhpcyBhcyBhbnkpLl9tZW1vcnlHcm93dGgpICs9IDEgfSk7XHJcblxyXG4vKlxyXG5zZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICBjb25zdCBub3dTdGVhZHlDID0gd2FzbS5lbWJpbmQubm93U3RlYWR5KCk7XHJcbiAgICBjb25zdCBub3dTeXN0ZW1DID0gd2FzbS5lbWJpbmQubm93U3lzdGVtKCk7XHJcbiAgICBjb25zdCBub3dTdGVhZHlKID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcbiAgICBjb25zdCBub3dTeXN0ZW1KID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnNvbGUubG9nKGAke25vd1N0ZWFkeUN9PT0ke25vd1N0ZWFkeUp9OyR7bm93U3lzdGVtQ309PSR7bm93U3lzdGVtSn1gKTtcclxufSwgMTAwMCkqL1xyXG5cclxuYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDI1MCkpOyAgICAvLyBUT0RPKD8pOiBDb21saW5rIHRpbWluZyBpc3N1ZVxyXG5tYWluRWxlbWVudC5pbm5lclRleHQgPSB3YXNtLmV4cG9ydHMuZ2V0S2V5KCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XHJcbndvcmtlckVsZW1lbnQuaW5uZXJUZXh0ID0gYCR7YXdhaXQgd29ya2VyLmV4ZWN1dGUoXCJyZXR1cm4gd2FzbS5leHBvcnRzLmdldEtleSgpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpXCIpfWA7XHJcblxyXG4oYXN5bmMgKCkgPT4ge1xyXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDI1MCkpOyAgICAvLyBBdWRpb0NvbnRleHQgY2xpY2sgdGltaW5nIGlzc3VlKD8/Pz8pXHJcbiAgICBjb25zdCB7IHByb21pc2UsIHJlc29sdmUgfSA9IFByb21pc2Uud2l0aFJlc29sdmVyczx2b2lkPigpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBlID0+IHtcclxuICAgICAgICByZXNvbHZlKCk7XHJcbiAgICB9LCB7IG9uY2U6IHRydWUgfSlcclxuICAgIGF3YWl0IHByb21pc2U7XHJcbiAgICBjb25zdCBhdWRpb0NvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XHJcbiAgICBjb25zdCBzb3VyY2VOb2RlTCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVDb25zdGFudFNvdXJjZSgpO1xyXG4gICAgY29uc3Qgc291cmNlTm9kZVIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQ29uc3RhbnRTb3VyY2UoKTtcclxuICAgIGNvbnN0IG1lcmdlck5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlQ2hhbm5lbE1lcmdlcigyKTtcclxuXHJcblxyXG4gICAgYXdhaXQgYXVkaW9Db250ZXh0LnJlc3VtZSgpO1xyXG4gICAgYXdhaXQgYXVkaW9Db250ZXh0LmF1ZGlvV29ya2xldC5hZGRNb2R1bGUobmV3IFVSTChcIi4vd29ya2xldC5qc1wiLCBpbXBvcnQubWV0YS51cmwpKTtcclxuICAgIGNvbnN0IHJhbmRvbU5vaXNlTm9kZSA9IG5ldyBBdWRpb1dvcmtsZXROb2RlKFxyXG4gICAgICAgIGF1ZGlvQ29udGV4dCxcclxuICAgICAgICBcInJhbmRvbS1ub2lzZS1wcm9jZXNzb3JcIixcclxuICAgICk7XHJcblxyXG5cclxuICAgIGNvbnN0IGMgPSB3cmFwPHsgZXhlY3V0ZShmdW5jOiBzdHJpbmcpOiB1bmtub3duLCBwcm92aWRlV2FzbShkYXRhOiBBcnJheUJ1ZmZlcik6IHZvaWQgfT4ocmFuZG9tTm9pc2VOb2RlLnBvcnQpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWFkeS13b3JrbGV0XCIpIS5pbm5lckhUTUwgPSBcIlx1MjcxNFx1RkUwRlwiO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWFkeVwiKSEuaW5uZXJIVE1MID0gXCJcdTI3MTRcdUZFMEZcIjtcclxuXHJcblxyXG4gICAgc291cmNlTm9kZUwuY29ubmVjdChtZXJnZXJOb2RlLCAwLCAwKTtcclxuICAgIHNvdXJjZU5vZGVSLmNvbm5lY3QobWVyZ2VyTm9kZSwgMCwgMSk7XHJcbiAgICBtZXJnZXJOb2RlLmNvbm5lY3QocmFuZG9tTm9pc2VOb2RlKTtcclxuICAgIHJhbmRvbU5vaXNlTm9kZS5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XHJcblxyXG4gICAgY29uc3QgYWIgPSBhd2FpdCAoYXdhaXQgZmV0Y2gobmV3IFVSTChcIi4vd2FzbS53YXNtXCIsIGltcG9ydC5tZXRhLnVybCkpKS5hcnJheUJ1ZmZlcigpO1xyXG4gICAgYXdhaXQgYy5wcm92aWRlV2FzbShhYik7XHJcblxyXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDI1MCkpO1xyXG4gICAgd29ya2xldEVsZW1lbnQuaW5uZXJUZXh0ID0gYCR7YXdhaXQgYy5leGVjdXRlKFwicmV0dXJuIHdhc20uZXhwb3J0cy5nZXRLZXkoKS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKVwiKX1gO1xyXG59KSgpXHJcblxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0lBaUJhLGNBQWMsT0FBTyxlQUFlO0lBQ3BDLGlCQUFpQixPQUFPLGtCQUFrQjtJQUMxQyxlQUFlLE9BQU8sc0JBQXNCO0lBQzVDLFlBQVksT0FBTyxtQkFBbUI7QUFFbkQsSUFBTSxjQUFjLE9BQU8sZ0JBQWdCO0FBdUozQyxJQUFNLFdBQVcsQ0FBQyxRQUNmLE9BQU8sUUFBUSxZQUFZLFFBQVEsUUFBUyxPQUFPLFFBQVE7QUFrQzlELElBQU0s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QUFHLENBQUM7QUFDckQsUUFBTSxFQUFFLFNBQVMsUUFBUSxJQUFJLFFBQVEsY0FBb0I7QUFDekQsU0FBTyxpQkFBaUIsU0FBUyxPQUFLO0FBQ2xDLFlBQVE7QUFBQSxFQUNaLEdBQUcsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUNqQixRQUFNO0FBQ04sUUFBTSxlQUFlLElBQUksYUFBYTtBQUN0QyxRQUFNLGNBQWMsYUFBYSxxQkFBcUI7QUFDdEQsUUFBTSxjQUFjLGFBQWEscUJBQXFCO0FBQ3RELFFBQU0sYUFBYSxhQUFhLG9CQUFvQixDQUFDO0FBR3JELFFBQU0sYUFBYSxPQUFPO0FBQzFCLFFBQU0sYUFBYSxhQUFhLFVBQVUsSUFBSSxJQUFJLGdCQUFnQixZQUFZLEdBQUcsQ0FBQztBQUNsRixRQUFNLGtCQUFrQixJQUFJO0FBQUEsSUFDeEI7QUFBQSxJQUNBO0FBQUEsRUFDSjtBQUdBLFFBQU0sSUFBSSxLQUErRSxnQkFBZ0IsSUFBSTtBQUM3RyxXQUFTLGVBQWUsZUFBZSxFQUFHLFlBQVk7QUFDdEQsV0FBUyxlQUFlLE9BQU8sRUFBRyxZQUFZO0FBRzlDLGNBQVksUUFBUSxZQUFZLEdBQUcsQ0FBQztBQUNwQyxjQUFZLFFBQVEsWUFBWSxHQUFHLENBQUM7QUFDcEMsYUFBVyxRQUFRLGVBQWU7QUFDbEMsa0JBQWdCLFFBQVEsYUFBYSxXQUFXO0FBRWhELFFBQU0sS0FBSyxPQUFPLE1BQU0sTUFBTSxJQUFJLElBQUksZUFBZSxZQUFZLEdBQUcsQ0FBQyxHQUFHLFlBQVk7QUFDcEYsUUFBTSxFQUFFLFlBQVksRUFBRTtBQUV0QixRQUFNLElBQUksUUFBUSxDQUFBQSxhQUFXLFdBQVdBLFVBQVMsR0FBRyxDQUFDO0FBQ3JELGlCQUFlLFlBQVksR0FBRyxNQUFNLEVBQUUsUUFBUSx5REFBeUQsQ0FBQztBQUM1RyxHQUFHOyIsCiAgIm5hbWVzIjogWyJvYmoiLCAicmV0dXJuVmFsdWUiLCAicHJveHkiLCAicCIsICJwIiwgImpzVmFsdWUiLCAid2lyZVZhbHVlIiwgInN0YWNrRGVzdHJ1Y3RvciIsICJDbG9ja0lkIiwgIndhc20iLCAicmVzb2x2ZSJdCn0K
