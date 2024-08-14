import { expect } from "@playwright/test";
import { test } from "./fixture.js";

test('Class constructor', async ({ page, wasm: { output } }) => {
  await page.evaluate((i) => {
    const cls = new _wasm.embind.TestClass(5, "test");
  });
});

test('Class destructor', async ({ page, wasm: { output } }) => {
  await page.evaluate((i) => {
    const cls = new _wasm.embind.TestClass(5, "test");
    cls[Symbol.dispose]();
  });
});

test('Class property getter', async ({ page, wasm: { output } }) => {
  expect(await page.evaluate((i) => {
    const cls = new _wasm.embind.TestClass(5, "test");
    return cls.x;
  })).toBe(5);
});

test('Class property setter', async ({ page, wasm: { output } }) => {
  expect(await page.evaluate((i) => {
    const cls = new _wasm.embind.TestClass(5, "test");
    cls.x = 10;
    return cls.x;
  })).toBe(10);
});

test('Class member function', async ({ page, wasm: { output } }) => {
  expect(await page.evaluate((i) => {
    const cls = new _wasm.embind.TestClass(5, "test");
    cls.incrementX().incrementX().incrementX();
    return cls.x;
  })).toBe(8);
});


test('Static class function', async ({ page, wasm: { output } }) => {
  expect(await page.evaluate((i) => {
    const cls = _wasm.embind.TestClass.create();
    cls.x = 15;
    return cls.x;
  })).toBe(15);
});

