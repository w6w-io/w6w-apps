import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 14;

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
 * comment explaining why an action never touches the credential would
 * otherwise trip the same assertion it is documenting.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/\bcredential\b/i.test(src), `${a.key}: references a credential`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?token/i.test(src), `${a.key}: touches an API token`);
  }
});

/**
 * A hand-set `Authorization` header is only legal inside `auth/` — but
 * `webhook-upsert` legitimately forwards a vendor-documented `authorization`
 * FIELD (the workflow author's own receiver secret, never the Feedly API
 * token), so the check must target an assignment site, not the bare word.
 * See that action's own test for the narrower, per-file version of this rule.
 */
Deno.test("index: no action assigns a literal authorization: header/field", async () => {
  const RE_AUTH_ASSIGNMENT = /["'`]?authorization["'`]?\s*[\]:=]/i;
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!RE_AUTH_ASSIGNMENT.test(src), `${a.key}: assigns a literal authorization field/header`);
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
 * The API origin (`api.feedly.com`) lives in `lib/client.ts` and nowhere
 * else — every action reaches it only through `FeedlyClient`'s relative
 * paths. This does NOT ban the word "feedly.com" outright: several hints
 * legitimately show an example stream id in the vendor's own opaque format
 * (`feed/https://feedly.com/f/alert/<uuid>`), which is user-facing copy, not
 * a request target. What must never appear is the actual API host or a
 * direct `ctx.fetch` call bypassing the client.
 */
Deno.test("index: no action hard-codes the API host or calls ctx.fetch directly", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.feedly\.com/.test(src), `${a.key}: contains the API host literal`);
    assert(
      !/ctx\.fetch\s*\(/.test(src),
      `${a.key}: calls ctx.fetch directly instead of FeedlyClient`,
    );
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is /v3/profile, not the enterprise-admin-gated endpoints", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/bearer-token.ts", import.meta.url)));
  assert(src.includes("/v3/profile"), "auth probe no longer hits /v3/profile");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/v3\/enterprise/.test(src),
    "the probe was pointed at an admin-only enterprise endpoint",
  );
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "bearer-token");
  assertEquals(method.type, "bearer");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check declares a check hook", () => {
  for (const h of app.healthChecks) {
    assertEquals(typeof h.check, "function", `${h.key}: no check hook`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.feedly");
  assert(manifest.w6w.network.allow.includes("api.feedly.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.feedly.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark (matching Feedly's own declared brand green)", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  // The re-frame trims the mark to its ink box; the path data itself — the
  // thing a redraw would change — is untouched.
  assert(
    svg.includes("M13.85995 1.98852a2.60906 2.60906 0 00-3.72608 0L.76766 11.52674"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  // #2BB24C matches feedly.com's own <link rel="mask-icon" color="#2bb24c">.
  assert(/#2BB24C/i.test(svg), "vendor brand colour missing — the mark was recoloured");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
