import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 15;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assert(/^[a-z][a-z0-9-]*$/.test(key), `action key "${key}" is not kebab-case`);
  }
});

Deno.test("index: every action has a title, type and execute function", () => {
  for (const action of app.actions) {
    assert(action.title.length > 0, `action "${action.key}" has no title`);
    assert(["read", "search", "perform"].includes(action.type), `action "${action.key}" bad type`);
    assert(typeof action.execute === "function", `action "${action.key}" has no execute`);
  }
});

Deno.test("index: the auth method is a bearer token with sign and test hooks", () => {
  const [auth] = app.auth;
  assertEquals(auth.type, "bearer");
  assert(typeof auth.sign === "function");
  assert(typeof auth.test === "function");
});

Deno.test("index: health checks declare a kind and either a check hook or an unavailable reason", () => {
  for (const check of app.healthChecks ?? []) {
    assert(["service", "credential", "quota", "dependency"].includes(check.kind));
    assert(typeof check.check === "function" || check.unavailable, `check "${check.key}" is bare`);
  }
});
