import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 25;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 3);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assert(/^[a-z][a-z0-9-]*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: auth method is basic", () => {
  assertEquals(app.auth?.[0].key, "basic");
  assertEquals(app.auth?.[0].type, "basic");
});

Deno.test("index: health check keys are unique", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(new Set(keys).size, keys.length);
});
