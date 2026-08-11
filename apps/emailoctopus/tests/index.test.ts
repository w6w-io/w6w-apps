import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 25, "one action per v2 OpenAPI operation");
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, output and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  const count = (t: string) => app.actions.filter((a) => a.type === t).length;
  // 5 reads + 5 searches + 15 performs = the 25 operations the v2 spec publishes.
  assertEquals([count("read"), count("search"), count("perform")], [5, 5, 15]);
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: the three create endpoints that conflict on repeat are not idempotent", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  // POST /lists has no uniqueness constraint; POST contacts/tags 409 on repeat;
  // start-automation depends on a per-automation "allow repeat" setting.
  for (const key of ["create-list", "create-contact", "create-tag", "start-automation"]) {
    assertEquals(byKey.get(key)?.idempotent, false, `${key} should not claim idempotency`);
  }
  // The upsert genuinely is one.
  assertEquals(byKey.get("upsert-contact")?.idempotent, true);
});

Deno.test("index: every action declares a resource for editor grouping", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  for (const a of app.actions) assert(a.resource, `${a.key}: no resource`);
  assertEquals(
    [...resources].sort(),
    ["automation", "campaign", "contact", "field", "list", "tag"],
  );
});

Deno.test("index: every required param carries a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bapi[_-]?key\b/i.test(src), `${a.key}: mentions an api key`);
  }
});

Deno.test("index: no action or lib module calls the global fetch", async () => {
  for (const rel of [...app.actions.map((a) => `../actions/${a.key}.ts`), "../lib/client.ts"]) {
    const src = await Deno.readTextFile(new URL(rel, import.meta.url));
    for (const [i, line] of src.split("\n").entries()) {
      const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
      if (!/fetch\s*\(/.test(code)) continue;
      assert(/ctx\.fetch\s*\(/.test(code), `${rel}:${i + 1}: bare fetch — ${line.trim()}`);
    }
  }
});

Deno.test("index: every health check is either a live probe or a declared absence", () => {
  for (const c of app.healthChecks) {
    const live = typeof c.check === "function";
    const declared = c.unavailable !== undefined;
    assert(live !== declared, `${c.key}: must have exactly one of check/unavailable`);
    if (declared) {
      assertEquals(c.severity, "informational", `${c.key}: an absence must be informational`);
    }
  }
});

Deno.test("index: only unsigned health checks widen the egress allowlist", () => {
  for (const c of app.healthChecks) {
    if (!c.network?.allow?.length) continue;
    assert(
      c.credential === "none" || c.credential === "context",
      `${c.key}: widens egress while signed`,
    );
  }
});
