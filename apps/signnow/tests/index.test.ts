import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports one auth method and every action has a unique key", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "oauth2-password");

  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(app.actions.length > 0, true);
});

Deno.test("index: every action has a title, type and no bare `execute` missing", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: declares two health checks — service (live) and quota (declared absent)", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys.includes("service"), true);
  assertEquals(keys.includes("quota"), true);
  const quota = app.healthChecks?.find((h) => h.key === "quota");
  assertEquals(quota?.unavailable !== undefined, true);
});

Deno.test("index: no document-upload action — see index.ts module doc for why", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.includes("document-upload"), false);
});
