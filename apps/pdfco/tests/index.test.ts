import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 24;

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
 * Every `perform` action here calls a metered, credit-consuming endpoint —
 * retrying spends credits again even when the underlying operation is
 * otherwise deterministic. None is declared idempotent.
 */
Deno.test("index: no metered perform action is marked idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(a.idempotent, false, `${a.key}: unexpectedly marked idempotent`);
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
 * Strip comments so the sandbox guards below scan CODE, not prose (a doc
 * comment explaining why an action never touches the credential would
 * otherwise trip the same regex it's explaining).
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
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
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
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    // Deliberately narrower than "pdf.co" — the vendor's own brand name is
    // spelled with a dot, so a plain substring match would trip on every
    // human-readable title/description/hint in this app.
    assert(!/api\.pdf\.co/i.test(src), `${a.key}: contains the API host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
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

/**
 * Exactly one action is documented and implemented as 1-based page indexing
 * (`pdf-delete-pages`) — every other action that takes a `pages` param must
 * describe the 0-based convention instead. Getting this backwards is the
 * page-indexing trap this app's module doc warns about.
 */
Deno.test("index: only pdf-delete-pages documents 1-based page numbering", () => {
  const withPages = app.actions.filter((a) => (a.params ?? []).some((p) => p.key === "pages"));
  assert(withPages.length > 1, "no actions with a pages param — this test would pass vacuously");
  for (const a of withPages) {
    const pagesParam = (a.params ?? []).find((p) => p.key === "pages")!;
    const hint = String(pagesParam.hint ?? "");
    if (a.key === "pdf-delete-pages") {
      assert(/1-based/i.test(hint), `${a.key}: expected a 1-based hint`);
      assertEquals(pagesParam.required, true, `${a.key}: pages must be required`);
    } else {
      assert(/0-based/i.test(hint), `${a.key}: expected a 0-based hint`);
    }
  }
});

// --- auth --------------------------------------------------------------

/**
 * The auth probe is pinned by path. PDF.co returns `proxy`-style live
 * credential material from some endpoints (e.g. a presigned S3 write URL
 * from `/file/upload/get-presigned-url`) — the probe must stay on the
 * balance endpoint, which returns only a credit count.
 */
Deno.test("index: the auth probe is /v1/account/credit/balance", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/v1/account/credit/balance"), "auth probe moved off the balance endpoint");
  assert(
    !/get-presigned-url/.test(src),
    "the probe must not be a presigned-URL endpoint, which returns live write credentials",
  );
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  for (const f of method.fields ?? []) {
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

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not either status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.pdfco");
  assert(manifest.w6w.network.allow.includes("api.pdf.co"));
  assert(!manifest.w6w.network.allow.includes("status.pdf.co"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the icon is the vendor's own favicon, verbatim", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Downloaded verbatim from pdf.co/favicon.png (the site's own
  // apple-touch-icon target) on 2026-08-24: PNG, 180x180, 5,927 bytes.
  assertEquals(bytes.byteLength, 5927, "icon.png byte length changed — no longer verbatim");
  assertEquals(bytes[0], 0x89, "not a PNG (bad signature byte 0)");
  assertEquals(bytes[1], 0x50, "not a PNG (bad signature byte 1: 'P')");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
