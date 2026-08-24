import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 41;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth!.length, 1);
  assertEquals(app.healthChecks!.length, 1);
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
 * Every resource-creating call in this app starts real, possibly billable or
 * user-visible side effects (a new tag, a sent-eligible newsletter, an
 * enrollment) with no idempotency-key mechanism documented anywhere in the
 * OpenAPI schema. A retried create is a second resource, not a no-op.
 */
Deno.test("index: no create action is marked idempotent", () => {
  for (
    const key of [
      "contact-create",
      "tag-create",
      "contact-field-create",
      "funnel-create",
      "campaign-create",
      "newsletter-create",
      "webhook-create",
      "enrollment-create",
      "membership-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: updates, deletes and the two tag-assignment toggles are safe
 * to retry — a merge-patch/replace/delete/(un)assign lands at the same end
 * state no matter how many times it runs.
 */
Deno.test("index: updates, deletes and tag toggles are marked idempotent", () => {
  for (
    const key of [
      "contact-update",
      "contact-delete",
      "contact-tag-add",
      "contact-tag-remove",
      "tag-update",
      "tag-delete",
      "contact-field-update",
      "contact-field-delete",
      "campaign-update",
      "campaign-delete",
      "newsletter-update",
      "webhook-update",
      "webhook-delete",
      "enrollment-delete",
      "membership-delete",
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

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — several
 * doc comments in this app explain *why* an action never touches the
 * credential, and that explanation itself contains the word "credential".
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
    assert(!/x-api-key/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/apiKey\b/.test(src), `${a.key}: touches the connection's api key`);
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
 * hard-coded a host — or accepted one as a param — could be pointed
 * somewhere the manifest never allowlisted.
 *
 * This checks for the actual network literal (`api.systeme.io`), not a bare
 * mention of the vendor name — several actions' user-facing `description`
 * text legitimately says things like "on systeme.io's side" or "systeme.io
 * dashboard", and that is prose, not a hard-coded fetch target.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.systeme\.io/.test(src), `${a.key}: contains the api.systeme.io host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * The converse of the above: confirms the "bare mention" carve-out is real
 * and not accidentally matching everything — several actions' description
 * text does say "systeme.io" without that being a network literal.
 */
Deno.test("index: description prose may mention systeme.io without tripping the host-literal guard", async () => {
  const mentioning = ["contact-create", "webhook-create", "funnel-create"];
  let sawMention = false;
  for (const key of mentioning) {
    const src = await actionSource(key);
    if (/systeme\.io/.test(src)) sawMention = true;
  }
  assert(sawMention, "no action mentions systeme.io in prose — this test would pass vacuously");
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

/**
 * The auth probe is pinned by path. Choosing it is the step where a
 * credential most easily leaks back out — this app has no `/me`-shaped
 * endpoint at all, but pinning it stops a future edit from swapping in
 * `/api/contacts`, which returns real contact PII on every check.
 */
Deno.test("index: the auth probe is /api/contact_fields", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/api/contact_fields"), "auth probe no longer hits /api/contact_fields");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth!;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: the apiKey config matches the vendor's own header name", () => {
  const [method] = app.auth!;
  assertEquals(method.apiKey, { in: "header", name: "X-API-Key" });
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks!) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App's verdict at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks!.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host, and only that host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
      categories: string[];
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.systemeio");
  assertEquals(manifest.w6w.network.allow, ["api.systeme.io"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

Deno.test("index: the icon is on the pack's normalized canvas and keeps the vendor's colours", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Extracted from systeme.io's own header wordmark SVG (systemelogo.svg) on
  // 2026-08-24: the roundel-and-S mark, with the surrounding wordmark letters
  // dropped. `_tools/icon-normalize.ts` re-frames every mark onto one square
  // canvas, so the file's outer shape is the tool's; the path data and fill
  // colours inside are the vendor's, verbatim.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(
    svg.includes("M16,0A16,16,0,1,0,32,16,16,16,0,0,0,16,0Z"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assert(svg.includes("#02a1ff"), "vendor colour #02a1ff missing — the mark was redrawn");
  assert(svg.includes("#fff"), "the white background circle is missing");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
