import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 47 actions", () => {
  assertEquals(app.actions.length, 47);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `bad key: ${key}`);
  }
});

Deno.test("index: declares exactly one auth method (the API key pair)", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-keys");
});

Deno.test("index: declares the three health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key).sort();
  assertEquals(keys, ["lines", "quota", "service"]);
});

Deno.test("index: every action has a type, title, and params array", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.type, "string");
    assertEquals(typeof action.title, "string");
    assertEquals(Array.isArray(action.params), true, `${action.key} has no params array`);
  }
});
