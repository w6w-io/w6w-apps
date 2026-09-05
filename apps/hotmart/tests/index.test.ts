import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("app - declares 17 unique actions", () => {
  assertEquals(app.actions.length, 17);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("app - declares exactly one auth method, custom client-credentials", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "client-credentials");
  assertEquals(app.auth?.[0].type, "custom");
});

Deno.test("app - declares service (unavailable) and quota health checks", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});

Deno.test("app - every perform action states idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} must state idempotent`);
    }
  }
});

Deno.test("app - every action has a unique kebab-case key", () => {
  for (const action of app.actions) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), true, action.key);
  }
});
