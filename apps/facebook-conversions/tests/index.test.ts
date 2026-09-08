import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares two auth methods and the expected action/health-check counts", () => {
  assertEquals(app.auth?.map((a) => a.key), ["conversions-token", "oauth2"]);
  assertEquals(app.actions.length, 5);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: every action has a title, type, description, output and execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(typeof action.type, "string");
    assertEquals(typeof action.description, "string");
    assertEquals(typeof action.execute, "function");
    assert(Array.isArray(action.output), `${action.key} declares no output fields`);
  }
});

Deno.test("index: every perform action declares idempotent honestly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} does not declare idempotent`);
  }
});

Deno.test("index: covers the whole Conversions API surface and nothing more", () => {
  assertEquals(app.actions.map((a) => a.key), [
    "send-event",
    "send-events",
    "get-dataset",
    "get-dataset-quality",
    "list-diagnostics",
  ]);
});

Deno.test("index: does not duplicate the sibling Meta apps' surfaces", () => {
  const keys = app.actions.map((a) => a.key);
  // facebook (Pages) …
  for (const k of ["create-post", "list-posts", "get-page", "get-page-insights"]) {
    assertEquals(keys.includes(k), false);
  }
  // … and facebook-lead-ads.
  for (const k of ["list-forms", "list-recent-leads"]) {
    assertEquals(keys.includes(k), false);
  }
});

Deno.test("index: health checks are keyed service and quota", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

/**
 * INVERTED relative to mailgun/pagerduty/posthog's own copy of this guard
 * (T2.2.1, D-7): `ParamsForm` now renders a `type: "group"` with a non-empty
 * `children` as a nested form (T1.1.1), so the remaining unreachable shape is
 * a group with MISSING or EMPTY `children`, which still falls back to the
 * JSON editor. facebook-conversions' own group on `send-event` is a
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

Deno.test("index: every write action offers the hashing control", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    const hashing = action.params?.find((p) => p.key === "hashing");
    assert(hashing, `${action.key} has no hashing param`);
    assertEquals(hashing!.default, "auto");
  }
});
