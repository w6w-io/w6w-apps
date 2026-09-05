import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares exactly one auth method and two health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-token");
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, key);
  }
});

Deno.test("index: 39 actions covering subscribers, groups, segments, fields, events, campaigns and webhooks", () => {
  assertEquals(app.actions.length, 39);
});

Deno.test("index: no action ever declares requiresAuth false (every endpoint needs the bearer token)", () => {
  for (const action of app.actions) {
    assertEquals(action.requiresAuth, undefined, action.key);
  }
});
