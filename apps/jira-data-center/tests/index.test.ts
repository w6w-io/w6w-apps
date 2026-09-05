import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 15;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 2);
  assertEquals(app.healthChecks?.length, 3);
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

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment explaining "no credential reaches this action" would otherwise trip
 * its own assertion.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bpassword\b/i.test(src), `${a.key}: touches a password`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * The instance origin lives in `lib/client.ts`, resolved from the redacted
 * Connection, and nowhere else. An action that hard-coded a host or accepted
 * one as a param could be pointed somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host or absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|password)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: no action uses Atlassian Document Format or accountId — those are Cloud-only", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(
      !/\baccountId\b/i.test(src),
      `${a.key}: uses Cloud's accountId, not Data Center's username`,
    );
    assert(
      !/\badf\(/i.test(src),
      `${a.key}: wraps text in ADF, which Data Center's v2 API rejects`,
    );
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: both auth methods require a baseUrl field and a secret credential field", () => {
  for (const method of app.auth ?? []) {
    const fields = method.fields ?? [];
    const baseUrlField = fields.find((f) => f.key === "baseUrl");
    assert(baseUrlField?.required, `${method.key}: baseUrl is not required`);
    const secretFields = fields.filter((f) => f.type === "secret");
    assert(secretFields.length > 0, `${method.key}: no secret field`);
    for (const f of secretFields) assert(f.required, `${method.key}/${f.key}: secret not required`);
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
  }
});

Deno.test("index: the recommended auth method is a bearer Personal Access Token", () => {
  const [first] = app.auth ?? [];
  assertEquals(first.key, "personal-access-token");
  assertEquals(first.type, "bearer");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

Deno.test("index: the instance check is unsigned and connection-scoped", () => {
  const instance = (app.healthChecks ?? []).find((h) => h.key === "instance");
  assert(instance, "no instance health check");
  assertEquals(instance!.credential, "context");
  assertEquals(instance!.scope, "connection");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest declares a wildcard allowlist, matching the self-hosted posture", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } };
  };
  assertEquals(manifest.w6w.id, "io.w6w.jira-data-center");
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is byte-identical to the sibling Cloud app's verified mark", async () => {
  const [thisIcon, jiraIcon] = await Promise.all([
    Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url)),
    Deno.readTextFile(new URL("../../jira/assets/icon.svg", import.meta.url)),
  ]);
  assertEquals(thisIcon, jiraIcon);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
