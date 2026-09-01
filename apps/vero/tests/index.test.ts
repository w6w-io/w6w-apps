import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares one auth method and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.actions.length, 7);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(
    new Set(keys),
    new Set([
      "identify",
      "track",
      "edit-tags",
      "alias",
      "delete",
      "resubscribe",
      "unsubscribe",
    ]),
  );
});

Deno.test("index: every action has a title, type and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(action.type, "perform");
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: health checks are keyed service and quota", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});
