import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 6 actions and 1 auth method", () => {
  assertEquals(app.actions.length, 6);
  assertEquals(app.auth?.length, 1);
});

Deno.test("index: every action has a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, key);
  }
});

Deno.test("index: declares exactly 2 health checks (service, quota)", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: the auth method is the Personal Access Token", () => {
  assertEquals(app.auth?.[0].key, "personal-access-token");
  assertEquals(app.auth?.[0].type, "basic");
});
