import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 39;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 1);
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
 * The three genuinely destructive/one-shot performs, pinned by key so a future
 * edit that flips one to `true` fails loudly rather than quietly creating a
 * retry hazard (a second post-merge targeting an already-merged post, a
 * second change_status attaching a duplicate comment, a second post-create
 * minting a duplicate post).
 */
Deno.test("index: post-create, post-change-status, post-merge, comment-create, entry-create, category-create are not idempotent", () => {
  for (
    const key of [
      "post-create",
      "post-change-status",
      "post-merge",
      "comment-create",
      "entry-create",
      "category-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: Canny's own docs explicitly say these converge on the same
 * end state when repeated ("... or already exists" / "... or already doesn't
 * exist"), or are a plain delete/update, which this pack treats as safe to
 * retry.
 */
Deno.test("index: vote-create, vote-delete and tag-create are marked idempotent per Canny's own docs", () => {
  for (const key of ["vote-create", "vote-delete", "tag-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: every delete action is marked idempotent", () => {
  const deletes = app.actions.filter((a) => a.key.endsWith("-delete"));
  assert(deletes.length > 0, "no delete actions found — this test would pass vacuously");
  for (const a of deletes) {
    assertEquals(a.idempotent, true, a.key);
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
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation —
 * would leave a real violation just as invisible.
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
    assert(!/api[_-]?key\s*[:=]/i.test(src), `${a.key}: sets apiKey itself`);
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
 * The API host lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded it — or accepted one as a param — could be pointed somewhere the
 * manifest never allowlisted.
 */
Deno.test("index: no action hard-codes the canny.io host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/canny\.io/.test(src), `${a.key}: contains a Canny host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  // "domain" is deliberately not banned here — company-update's `domain` is a
  // real Canny field (the customer's own company website), unrelated to the
  // connection's own host, which is fixed at canny.io and never a param.
  const banned = /^(host|origin|base_?url|api_?key|api_?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth method is body-located apiKey, matching the client", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  assertEquals(method.apiKey, { in: "body", name: "apiKey" });
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/**
 * Pinned by path, for the same reason Apify's equivalent test exists in this
 * pack: choosing the probe is the step where a credential most easily leaks
 * or a scoped-away endpoint gets picked by accident. Canny has no scoping,
 * but pinning the endpoint still catches an unintended swap to something
 * that returns more than board metadata.
 */
Deno.test("index: the auth probe is /v1/boards/list", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/v1/boards/list"), "auth probe no longer hits /v1/boards/list");
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

Deno.test("index: the manifest allows canny.io and declares the vendor icon", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.canny");
  assertEquals(manifest.w6w.network.allow, ["canny.io"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, on the pack's canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Extracted verbatim from a base64 data-URI embedded in Canny's own
  // developers.canny.io/api-reference page HTML on 2026-08-29 (their brand
  // "C" mark, fill #525DF9), then re-framed onto the pack's shared
  // `0 0 100 100` canvas by `_tools/icon-normalize.ts`. The tool re-parents
  // the original artwork verbatim into a nested `<svg>`, so the geometry
  // below is untouched vendor path data.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(
    svg.includes("M463.4,371.2c-20.8-1.9-39,13.3-40.9,34"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assert(svg.includes("#525DF9"), "vendor colour #525DF9 missing — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
