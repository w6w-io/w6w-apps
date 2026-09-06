import { assertEquals } from "@std/assert";
import app from "../index.ts";

const EXPECTED_ACTION_KEYS = [
  "single-check",
  "jobs-create",
  "jobs-parse",
  "jobs-start",
  "jobs-status",
  "jobs-results",
  "jobs-download",
  "jobs-delete",
  "jobs-search",
  "account-info",
];

Deno.test("index: declares one auth method and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.actions.length, EXPECTED_ACTION_KEYS.length);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and matches the expected set", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(new Set(keys), new Set(EXPECTED_ACTION_KEYS));
});

Deno.test("index: every action has a title, type and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.execute, "function");
    assertEquals(["read", "perform"].includes(action.type), true);
  }
});

Deno.test("index: health checks are service (live) and quota (live), both with a check hook", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
  for (const check of app.healthChecks ?? []) {
    assertEquals(typeof check.check, "function");
    assertEquals(check.unavailable, undefined);
  }
});
