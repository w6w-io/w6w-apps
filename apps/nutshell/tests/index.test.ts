import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 13 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, 13);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z][a-z0-9-]*$/.test(key), `bad key: ${key}`);
});

Deno.test("index: every action has a description", () => {
  for (const action of app.actions) {
    assert(action.description && action.description.length > 0, `${action.key}: no description`);
  }
});

Deno.test("index: exactly one auth method, key 'basic'", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "basic");
  assertEquals(app.auth?.[0].type, "basic");
});

Deno.test("index: declares service and quota health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys.sort(), ["quota", "service"]);
});

Deno.test("index: perform actions declare idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key}: idempotent not set`);
    }
  }
});
