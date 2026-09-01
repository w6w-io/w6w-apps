import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares every action with a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `${key} must be kebab-case`);
  }
  assertEquals(keys.sort(), [
    "answer",
    "create-webset",
    "delete-webset",
    "find-similar",
    "get-contents",
    "get-webset",
    "list-webset-items",
    "list-websets",
    "search",
  ]);
});

Deno.test("index: declares exactly one auth method, api-key", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
});

Deno.test("index: declares service + quota + credits health checks alongside the derived auth check", () => {
  const keys = app.healthChecks?.map((h) => h.key).sort();
  assertEquals(keys, ["credits", "quota", "service"]);
});

Deno.test("index: every action exports an execute function", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.execute, "function");
  }
});
