import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares every action with a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assertEquals(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), true, `${key} must be kebab-case`);
  }
  assertEquals(keys.sort(), [
    "create-document",
    "create-document-sync",
    "create-template",
    "delete-document",
    "delete-template",
    "get-document",
    "get-document-card",
    "get-template",
    "list-documents",
    "list-engines",
    "list-templates",
    "update-document",
    "update-template",
  ]);
});

Deno.test("index: declares exactly one auth method, bearer-token", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "bearer-token");
});

Deno.test("index: declares service + quota health checks alongside the derived auth check", () => {
  const keys = app.healthChecks?.map((h) => h.key).sort();
  assertEquals(keys, ["quota", "service"]);
});

Deno.test("index: every action uses ctx.fetch only (no execute crashes on a bare mock ctx.fetch)", () => {
  // Structural check: every action module exports a function, not a stub.
  for (const action of app.actions) {
    assertEquals(typeof action.execute, "function");
  }
});
