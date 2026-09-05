import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 21;

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

/**
 * Neither `contact-create`, `text-send` nor `webhook-create` accept any kind of
 * dedupe/idempotency key in JustCall's documented request bodies — a retry of
 * any of these creates a second real object (a duplicate contact, a second SMS
 * actually sent, a second webhook subscription).
 */
Deno.test("index: create/send actions with no documented dedupe key are not idempotent", () => {
  for (const key of ["contact-create", "text-send", "webhook-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: replace/delete-shaped performs are marked idempotent", () => {
  for (
    const key of [
      "call-update",
      "contact-update",
      "contact-update-status",
      "contact-delete",
      "user-update-availability",
      "webhook-delete-url",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
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

/** Strip comments so the sandbox guards below scan CODE, not prose. */
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
    assert(!/api[_-]?secret/i.test(src), `${a.key}: touches the API secret`);
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
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/justcall\.io/.test(src), `${a.key}: contains a JustCall host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?secret|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth ------------------------------------------------------------------

/**
 * The auth type is pinned to `custom` because JustCall's own `-u
 * "api_key:api_secret"` example describes HTTP Basic auth's pairing without
 * actually being Basic auth (no Base64 encoding, no `Basic ` prefix) — a
 * `type: "basic"` declaration would send the wrong header. See `auth/api-key.ts`.
 */
Deno.test("index: the auth method is type custom, not basic", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "custom");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: nothing in auth/health declares a Basic-auth style header", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/["'`]Basic /.test(src), `${dir}/${entry.name}: builds a Basic-auth header`);
      assert(!/\bbtoa\s*\(/.test(src), `${dir}/${entry.name}: Base64-encodes the credential`);
    }
  }
});

// --- health ------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the API key/secret. */
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

// --- manifest ----------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.justcall");
  assert(manifest.w6w.network.allow.includes("api.justcall.io"));
  assert(!manifest.w6w.network.allow.includes("status.justcall.io"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's own mark, isolated from its wordmark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Isolated verbatim from the icon glyph paths inside
  // https://cdn.justcall.io/assets-marketing/images/svg/justcall-logo-black.svg
  // (fetched 2026-09-05) — the wordmark's letterform paths were dropped, the
  // four glyph paths kept byte-for-byte — then re-framed onto the pack's
  // shared `0 0 100 100` canvas by `_tools/icon-normalize.ts`, which nests the
  // original artwork inside a re-scaled inner `<svg>` rather than touching the
  // path data itself.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("#101828"), "vendor colour missing — the mark was redrawn");
  assert(
    svg.includes("M15.6451 13.67"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assertEquals((svg.match(/<path/g) ?? []).length, 4, "expected exactly the 4 glyph paths");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
