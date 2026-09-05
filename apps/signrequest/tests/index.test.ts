import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports one auth method and every action has a unique key", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");

  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(app.actions.length, 26);
});

Deno.test("index: every action has a title, a valid type, and an execute function", () => {
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
  const quotaCheck = app.healthChecks?.find((h) => h.key === "quota");
  assertEquals(quotaCheck?.unavailable !== undefined, true);
});

Deno.test("index: no api-tokens action — see index.ts module doc for why", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.includes("api-token-list"), false);
  assertEquals(keys.includes("api-token-create"), false);
});

Deno.test("index: no team-admin actions (create/update/delete/invite)", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.includes("team-create"), false);
  assertEquals(keys.includes("team-update"), false);
  assertEquals(keys.includes("team-delete"), false);
  assertEquals(keys.includes("team-invite-member"), false);
});
