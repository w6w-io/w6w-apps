import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 11;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every auth method key is unique and kebab-case", () => {
  const keys = app.auth.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate auth key");
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

Deno.test("index: sending an invitation is not marked idempotent", () => {
  assertEquals(
    app.actions.find((a) => a.key === "invitation-send-email")?.idempotent,
    false,
  );
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
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc comment
 * explaining why an action never touches a credential must not trip the assertion.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential or sets auth headers itself", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/\bauthorization\b/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/\bapikey\b/i.test(src), `${a.key}: touches the apikey header`);
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
 * The two Trustpilot hosts live in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host could be pointed somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a Trustpilot host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/trustpilot\.com/.test(src), `${a.key}: contains a Trustpilot host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|client_?secret|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: api-key auth uses the header form, never a query parameter", () => {
  const method = app.auth.find((a) => a.key === "api-key")!;
  assertEquals(method.type, "apiKey");
  assertEquals(method.apiKey?.in, "header");
  assertEquals(method.apiKey?.name, "apikey");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: client-credentials auth is the custom, unattended-capable grant", () => {
  const method = app.auth.find((a) => a.key === "client-credentials")!;
  assertEquals(method.type, "custom");
  assertEquals(typeof method.exchange, "function");
  assertEquals(typeof method.refresh, "function");
  assertEquals(typeof method.sign, "function");
  assertEquals(typeof method.test, "function");
});

// --- health --------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

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

// --- manifest --------------------------------------------------------------------

Deno.test("index: the manifest allows both Trustpilot API hosts and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.trustpilot");
  assert(manifest.w6w.network.allow.includes("api.trustpilot.com"));
  assert(manifest.w6w.network.allow.includes("invitations-api.trustpilot.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.trustpilot.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.ico");
});

Deno.test("index: the icon is the vendor's own favicon, downloaded verbatim", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.ico", import.meta.url));
  // Downloaded verbatim from cdn.trustpilot.net/brand-assets/4.3.0/favicons/favicon.ico on
  // 2026-09-01: 15,086 bytes, a Windows .ico resource with three embedded icon sizes.
  assertEquals(bytes.byteLength, 15086);
  // The `MM` byte pair at offset 2-3 of the ICO header (image type 1 = icon) — a sanity
  // check that this is still an .ico file and not a redirect/error page saved by mistake.
  assertEquals(bytes[0], 0);
  assertEquals(bytes[1], 0);
  assertEquals(bytes[2], 1);
  assertEquals(bytes[3], 0);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// apikey\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
