import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const EXPECTED = [
  "form-get-many",
  "form-get",
  "form-create",
  "form-update",
  "form-delete",
  "field-get-many",
  "entry-get-many",
  "entry-get",
  "entry-create",
  "entry-update",
  "entry-delete",
  "stats-get",
  "style-get-many",
  "form-style-assign",
  "view-get-many",
];

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.sort(), [...EXPECTED].sort());
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: declares the basic auth method only", () => {
  assertEquals(app.auth?.map((a) => a.key), ["basic"]);
});

Deno.test("index: declares the service, site and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service", "site"]);
});

Deno.test("index: every action declares a valid type and a title/description", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type), action.key);
    assert(action.title.length > 0, action.key);
    assert((action.description ?? "").length > 0, action.key);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", action.key);
    }
  }
});

Deno.test("index: every action is grouped under a documented resource", () => {
  const resources = ["form", "field", "entry", "stats", "style", "view"];
  for (const action of app.actions) {
    assert(resources.includes(action.resource ?? ""), action.key);
  }
});

Deno.test("index: action keys are kebab-case", () => {
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), action.key);
  }
});

Deno.test("index: every param key is unique within its action", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, action.key);
  }
});

Deno.test("index: every destructive action requires explicit confirmation", () => {
  for (const action of app.actions) {
    if (action.key.endsWith("-delete")) {
      const keys = (action.params ?? []).map((p) => p.key);
      assert(keys.includes("confirm"), action.key);
    }
  }
});

Deno.test("index: no action touches a credential header", () => {
  for (const action of app.actions) {
    assertEquals(
      /authorization|credential/i.test(action.execute.toString()),
      false,
      `${action.key} mentions a credential`,
    );
  }
});

Deno.test("index: no action calls the global fetch or a denied global", () => {
  for (const action of app.actions) {
    const src = action.execute.toString();
    assertEquals(/(^|[^.\w])fetch\s*\(/.test(src), false, `${action.key} calls global fetch`);
    assertEquals(/\bDeno\.[A-Za-z]/.test(src), false, `${action.key} touches Deno.*`);
  }
});
