import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 12;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
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

/**
 * LGL documents both reads and writes (unlike a read-only vendor) — this app
 * covers search/read plus create for the resources it wires up.
 */
Deno.test("index: the action set covers read, search and perform, matching LGL's documented CRUD surface", () => {
  const types = new Set(app.actions.map((a) => a.type));
  assertEquals(types, new Set(["read", "search", "perform"]));
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
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
 * comment explaining *why* an action never touches the credential must not
 * trip the assertion.
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
    assert(!/\btoken\b\s*[:=]/i.test(src), `${a.key}: builds an auth token itself`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/littlegreenlight\.com/.test(src), `${a.key}: contains an LGL host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is /constituents.json", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/bearer-token.ts", import.meta.url)));
  assert(src.includes("/constituents.json"), "auth probe no longer hits /constituents.json");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "bearer-token");
  assertEquals(method.type, "bearer");
  const secretFields = method.fields?.filter((f) => f.key === "token") ?? [];
  assert(secretFields.length === 1);
  for (const f of secretFields) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every declared-unavailable health check is informational severity", () => {
  for (const h of app.healthChecks) {
    if (h.unavailable) {
      assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
    }
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only the API host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.littlegreenlight");
  assertEquals(manifest.w6w.network.allow, ["api.littlegreenlight.com"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

Deno.test("index: the icon is the vendor's real mark", async () => {
  const text = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(text.trim().startsWith("<svg"), "icon.svg does not start with an <svg> tag");
  assert(text.length > 500, "icon.svg is suspiciously small for the vendor's real mark");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
