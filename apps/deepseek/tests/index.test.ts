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

Deno.test("index: every action declares a valid type, a title, and params", () => {
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

Deno.test("index: perform actions are explicitly marked non-idempotent", () => {
  // Retrying a chat completion or a FIM completion is not safe (a new, possibly
  // different response each time), so both `perform` actions opt out.
  for (const key of ["chat-complete", "fim-complete"]) {
    const action = app.actions.find((a) => a.key === key);
    assert(action, `missing action ${key}`);
    assertEquals(action!.idempotent, false, `${key} must be marked non-idempotent`);
  }
});

Deno.test("index: package.json declares only api.deepseek.com in network.allow", async () => {
  // The status host lives on the `service` health check's OWN network.allow
  // (health/service.ts), never here — an action must never be able to reach a
  // third-party status page.
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.deepseek.com"]);
});
