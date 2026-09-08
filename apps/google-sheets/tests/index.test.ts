import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares two auth methods and the expected action/health-check counts", () => {
  assertEquals(app.auth?.length, 2);
  assertEquals(app.auth?.map((a) => a.key), ["oauth2", "service-account"]);
  assertEquals(app.actions.length, 12);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: every action has a title, type and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.type, "string");
    assertEquals(typeof action.execute, "function");
  }
});

Deno.test("index: health checks are keyed service and quota", () => {
  const keys = app.healthChecks?.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});

/**
 * INVERTED relative to mailgun/pagerduty/posthog's own copy of this guard
 * (T2.2.1, D-7): `ParamsForm` now renders a `type: "group"` with a non-empty
 * `children` as a nested form (T1.1.1), so the remaining unreachable shape is
 * a group with MISSING or EMPTY `children`, which still falls back to the
 * JSON editor. google-sheets' own `sheets` group on `spreadsheet-create` is a
 * legitimate group and must pass this guard, not fail it.
 */
Deno.test('index: no `type: "group"` param is missing or has empty `children`', () => {
  const childless: string[] = [];
  const walk = (actionKey: string, list: unknown) => {
    for (const entry of (list ?? []) as Array<Record<string, unknown>>) {
      if (
        entry?.type === "group" && !(Array.isArray(entry.children) && entry.children.length > 0)
      ) {
        childless.push(`${actionKey}.${String(entry.key)}`);
      }
      walk(actionKey, entry?.children);
    }
  };
  for (const a of app.actions) walk(a.key, a.params);
  assertEquals(childless, []);
});

Deno.test("index: the childless-group guard actually flags a childless group", () => {
  const childless: string[] = [];
  const walk = (actionKey: string, list: unknown) => {
    for (const entry of (list ?? []) as Array<Record<string, unknown>>) {
      if (
        entry?.type === "group" && !(Array.isArray(entry.children) && entry.children.length > 0)
      ) {
        childless.push(`${actionKey}.${String(entry.key)}`);
      }
      walk(actionKey, entry?.children);
    }
  };
  walk("synthetic", [{ key: "bad", type: "group" }]);
  assertEquals(childless, ["synthetic.bad"]);
});
