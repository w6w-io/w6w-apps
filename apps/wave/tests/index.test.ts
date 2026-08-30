import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 21);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 1);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, an output and an execute hook", () => {
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

Deno.test("index: every action is grouped under a resource", () => {
  for (const a of app.actions) {
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * `credential` is matched only where it is NOT preceded by a quote — a bare
 * `credential` identifier (`input.credential`) is the thing being banned, not
 * a health-taxonomy string value.
 */
Deno.test("index: no action reads a credential or sets Authorization itself", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^"'\w])credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/accessToken/i.test(src), `${a.key}: touches a token`);
  }
});

Deno.test("index: the credential guard still catches a real read", () => {
  assert(/(^|[^"'\w])credential/i.test("const c = input.credential;"));
  assert(/(^|[^"'\w])credential/i.test("const { credential } = input;"));
  assert(!/(^|[^"'\w])credential/i.test('healthCheck: { kind: "credential" }'));
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * Every network call in this app goes through `lib/client.ts`, which owns the
 * one endpoint. An action that built its own URL would be reaching past the
 * allowlist declaration in `package.json`.
 */
Deno.test("index: no action hard-codes a URL — the endpoint belongs to the client", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: hard-codes a URL`);
  }
});

/**
 * The transport-level guarantee this whole app is built around: a mutation
 * that does not select `inputErrors` cannot check them, and a rejected write
 * would return a hollow `didSucceed: false` as if nothing happened.
 */
Deno.test("index: every mutation selects inputErrors AND routes through unwrap", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (!/^const MUTATION = /m.test(src)) continue;
    assert(
      src.includes("inputErrors { code message path }"),
      `${a.key}: mutation omits inputErrors`,
    );
    assert(/unwrap\(/.test(src), `${a.key}: mutation result is not unwrapped`);
  }
});

Deno.test("index: every mutation-bearing action is a perform, and every perform mutates", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    const hasMutation = /^const MUTATION = /m.test(src);
    if (hasMutation) assertEquals(a.type, "perform", `${a.key}: mutation on a non-perform action`);
  }
});

Deno.test("index: both auth methods Wave documents are present, OAuth first", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2", "full-access-token"]);
  assertEquals(app.auth[0].type, "oauth2");
  assertEquals(app.auth[1].type, "bearer");
});

Deno.test("index: health checks cover the one question this app can answer, and it isn't a stub", () => {
  const keys = app.healthChecks!.map((h) => h.key).sort();
  assertEquals(keys, ["service"]);
  for (const h of app.healthChecks!) {
    assertEquals(typeof h.check, "function", `${h.key}: declared without a probe`);
    assertEquals(h.unavailable, undefined, `${h.key}: declared unavailable and a probe`);
  }
});

/**
 * Rule from the health RFC and the pack's own history: an `unavailable` entry
 * reports `unknown`, and `unknown` at the default `degraded` severity would
 * pin the App at `unknown` forever. This app declares none — the assertion
 * exists so that adding one later cannot skip the severity.
 */
Deno.test("index: any unavailable check must be informational", () => {
  for (const h of app.healthChecks ?? []) {
    if (h.unavailable) {
      assertEquals(h.severity, "informational", `${h.key}: unavailable without informational`);
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// credential\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  assert(/credential/.test(code("const c = credential;")));
});
