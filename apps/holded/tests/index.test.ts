import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 22;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Every create-shaped write mints a fresh id with no idempotency key
 * documented anywhere in the CRM API spec, so a retry must not be treated as
 * safe.
 */
Deno.test("index: no create-shaped action is marked idempotent", () => {
  for (
    const key of [
      "funnel-create",
      "lead-create",
      "lead-note-create",
      "lead-task-create",
      "event-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: no action or auth hook contains a credential-shaped field name", () => {
  // A cheap grep-in-memory guard: nothing outside auth/api-key.ts should ever
  // reference the credential's own field name.
  for (const a of app.actions) {
    const src = a.execute.toString();
    assert(!/credential/i.test(src), `${a.key}: execute references a credential`);
  }
});

Deno.test("index: no runtime dependency beyond @w6w/types", async () => {
  const denoJson = JSON.parse(await Deno.readTextFile(new URL("../deno.json", import.meta.url)));
  const imports = Object.keys(denoJson.imports ?? {});
  for (const spec of imports) {
    assert(
      spec === "@w6w/types" || spec === "@std/assert",
      `unexpected import map entry: ${spec}`,
    );
  }
});
