import { expect } from "@playwright/test";
import { test } from "./fixture.js";




test('Memory growth works', async ({ page, wasm: { output } }) => {
  let grown = false;
  const growPromise = page.evaluate(() => new Promise<void>(resolve => { (window as any)._wasm.addEventListener("MemoryGrowthEvent", () => resolve()); }));
  growPromise.then(p => { grown = true });

  for (let i = 10; i < 32; ++i) {
    await page.evaluate((i) => (window as any).output.innerHTML = `Allocated ${toHexOrNull(1 << i, 4)} bytes at ${toHexOrNull((globalThis as any)._wasm.exports.malloc(0x1 << i), 4)}`, i);
    if (grown)
      break;
  }
  await growPromise;
  expect(grown).toBe(true);
});

// This is mostly about ensuring that the
// "Passing/returning X does not leak memory" tests
// would fail even if they leaked a single byte each iteration.
// It's mostly testing that `OOMIterations` is large enough.
test("Leaks in tests are detectable (test env. test)", async ({ page, wasm: { output } }) => {
  await page.evaluate(() => {
    for (let i = 0; i < OOMIterations; ++i) {
      (globalThis as any)._wasm.exports.malloc(1);
    }
  },);
  const grown = await (page.evaluate(() => ((globalThis as any)._memoryGrowth) > 0));
  expect(grown).toBe(true);
});

// This is a test to ensure that, if any code elsewhere double-frees, 
// that whichever test references it will fail.
test("Double-freeing aborts (test env. test)", async ({ page, wasm: { output } }) => {

  expect(await page.evaluate(() => {
    const m = (globalThis as any)._wasm.exports.malloc(100);
    (globalThis as any)._wasm.exports.free(m);
    try {
      (globalThis as any)._wasm.exports.free(m);
      return false;
    }
    catch (ex) {
      return (ex instanceof WebAssembly.RuntimeError);
    }
  })).toBe(true);
});

test("Passing/returning strings does not leak memory", async ({ page, wasm: { output } }) => {

  const str = "Test string of a length long enough to hopefully cause issues if something goes wrong";

  await page.evaluate(str => {
    for (let i = 0; i < OOMIterations; ++i) {
      (globalThis as any)._wasm.embind.identity_string(str);
    }
  }, str);
  const grown = await (page.evaluate(() => ((globalThis as any)._memoryGrowth) > 0));
  expect(grown).toBe(false);
});

test("Passing/returning structs does not leak memory", async ({ page, wasm: { output } }) => {

  const structTest: StructTest = {
    string: "Test string of a length long enough to hopefully cause issues if something goes wrong",
    number: 0xFFFF,
    triple: [10, 100, 1000]
  }
  const json = JSON.stringify(structTest);

  await page.evaluate(json => {
    for (let i = 0; i < OOMIterations; ++i) {
      const parsed = JSON.parse(json);
      const returned = (globalThis as any)._wasm.embind.identity_struct_copy(parsed);
      returned[Symbol.dispose]();
    }
  }, json);
  const grown = await (page.evaluate(() => ((globalThis as any)._memoryGrowth)));
  expect(grown).toBe(0);
});

test("Passing/returning classes does not leak memory", async ({ page, wasm: { output } }) => {

  await page.evaluate(() => {
    const T = ((globalThis as any)._wasm.embind.TestClass as typeof TestClass);
    const cls = new T(5, "test");
    for (let i = 0; i < OOMIterations; ++i) {
      const returned = T.identityCopy(cls);
      if (returned == cls)
          throw new Error("Expected copy to return a different instance of the class");
      returned[Symbol.dispose]();
    }
    cls[Symbol.dispose]();
  });
  const grown = await (page.evaluate(() => ((globalThis as any)._memoryGrowth)));
  expect(grown).toBe(0);
})

test("Passing/returning class pointers does not leak memory", async ({ page, wasm: { output } }) => {

  await page.evaluate(() => {
    const T = ((globalThis as any)._wasm.embind.TestClass as typeof TestClass);
    const cls = new T(5, "test");
    for (let i = 0; i < OOMIterations; ++i) {
      const returned = T.identityPointer(cls);
      if (returned != cls)
          throw new Error("Expected identity to return the same instance of the class");
    }
    cls[Symbol.dispose]();
  });
  const grown = await (page.evaluate(() => ((globalThis as any)._memoryGrowth)));
  expect(grown).toBe(0);
})




declare class TestClass implements Disposable {
  constructor(x: number, y: string);

  incrementX(): TestClass

  getX(): number;
  setX(x_: number): void;
  static identityCopy(value: TestClass): TestClass;
  static identityPointer(value: TestClass): TestClass;

  [Symbol.dispose](): void;
}


declare function toHexOrNull(n: number, width?: 1 | 2 | 4 | 8): number;
interface StructTest {
  string: string;
  number: number;
  triple: [number, number, number];
}
declare const OOMIterations: number;