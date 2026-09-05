import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 19;

Deno.test("index: exports actions, auth, and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assert(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: only one auth method, keyed api-key", () => {
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.auth?.[0].type, "custom");
});
