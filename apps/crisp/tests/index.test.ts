import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("app: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, `duplicate keys in ${keys}`);
});

Deno.test("app: every action declares a title, description and execute hook", () => {
  for (const action of app.actions) {
    assert(action.title, `${action.key} has no title`);
    assert(action.description, `${action.key} has no description`);
    assert(typeof action.execute === "function", `${action.key} has no execute`);
  }
});

Deno.test("app: every action's type is one of the four in the spec", () => {
  const valid = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assert(valid.has(action.type), `${action.key} has invalid type ${action.type}`);
  }
});

Deno.test("app: required params have hints or self-evident labels", () => {
  for (const action of app.actions) {
    for (const param of action.params ?? []) {
      assert(param.label, `${action.key}.${param.key} has no label`);
    }
  }
});

Deno.test("app: declares the single Website Token basic auth method", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "basic");
  assertEquals(app.auth?.[0].type, "basic");
});

Deno.test("app: declares both a service and a quota health check", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("app: every health check either probes or explains its absence", () => {
  for (const check of app.healthChecks ?? []) {
    const hasProbe = typeof check.check === "function";
    assert(
      hasProbe !== !!check.unavailable,
      `${check.key} must have exactly one of check or unavailable`,
    );
    if (check.unavailable) {
      assertEquals(
        check.severity,
        "informational",
        `${check.key} is unavailable and so reports unknown — it must be informational`,
      );
    }
  }
});

Deno.test("app: every perform action declares idempotent — it drives retry and dedupe", () => {
  for (const action of app.actions) {
    if (action.type !== "perform") continue;
    assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
  }
});

Deno.test("app: create/send actions are not marked idempotent — a retry would duplicate them", () => {
  for (const action of app.actions) {
    if (!action.key.startsWith("create-") && !action.key.startsWith("send-")) continue;
    assertEquals(action.idempotent, false, `${action.key} must not be retry-safe`);
  }
});

Deno.test("app: update/state actions are marked idempotent — repeating them converges", () => {
  for (const action of app.actions) {
    if (!action.key.startsWith("update-")) continue;
    assertEquals(action.idempotent, true, `${action.key} should be retry-safe`);
  }
});
