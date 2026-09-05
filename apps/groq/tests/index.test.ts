import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly one auth method (api-key, bearer)", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.auth?.[0].type, "bearer");
});

Deno.test("index: every action has a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assert(/^[a-z][a-z0-9-]*$/.test(key), `"${key}" is not kebab-case`);
  }
});

Deno.test("index: every action declares a valid type and a title", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform"].includes(action.type), `${action.key} has bad type`);
    assert(action.title && action.title.length > 0, `${action.key} needs a title`);
    assert(Array.isArray(action.params), `${action.key} needs a params array`);
  }
});

Deno.test("index: declares both a service and a quota health check", () => {
  const keys = app.healthChecks?.map((h) => h.key) ?? [];
  assertEquals(keys.includes("service"), true);
  assertEquals(keys.includes("quota"), true);
});

Deno.test("index: delete/cancel actions are explicitly marked idempotent", () => {
  // Retrying a delete or a cancel is safe (same end state); retrying a chat
  // completion, an upload, or a batch-create is not, so only these opt in.
  for (const key of ["files-delete", "batch-cancel"]) {
    const action = app.actions.find((a) => a.key === key);
    assert(action, `missing action ${key}`);
    assertEquals(action!.idempotent, true, `${key} must be marked idempotent`);
  }
});
