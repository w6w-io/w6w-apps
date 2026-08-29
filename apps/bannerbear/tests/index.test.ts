import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 61;

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
 * Every render/tool/workflow-run action creates a new billable resource with
 * no idempotency key the vendor accepts — a retry would double-render (and
 * double-bill), so none of them may be marked safe to retry.
 */
Deno.test("index: no render/create/install action is marked idempotent", () => {
  for (
    const key of [
      "image-create",
      "batch-create",
      "animation-create",
      "image-template-create",
      "animation-template-create",
      "webhook-create",
      "instant-url-create",
      "publication-install",
      "workflow-run-create",
      "tool-remove-bg",
      "tool-generate-ai-image",
      "tool-generate-voiceover",
      "tool-subtitle-video",
      "tool-create-pdf",
      "tool-trim-video",
      "tool-concat-videos",
      "tool-resize-video",
      "tool-crop-video",
      "tool-overlay-video",
      "tool-overlay-image",
      "tool-add-audio",
      "tool-add-cover-art",
      "tool-create-video-slideshow",
      "tool-apply-color-filter",
      "tool-soften-video",
      "tool-create-gif-preview",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: deletes and updates are safe to retry (Bannerbear replaces or
 * 404s harmlessly on a repeat), and `asset-upload` de-duplicates by content
 * hash. Saying so is what lets the runtime recover from a dropped connection
 * instead of failing the run.
 */
Deno.test("index: deletes, updates, and the content-addressed upload are marked idempotent", () => {
  for (
    const key of [
      "image-template-update",
      "image-template-delete",
      "animation-template-update",
      "animation-template-delete",
      "webhook-update",
      "webhook-delete",
      "instant-url-update",
      "instant-url-delete",
      "asset-upload",
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
 * action docs quote the word "credential" or "bearer" while explaining why
 * they never touch one.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * `account-get` is the one documented exception to the last rule: `GET
 * /account` returns the CALLING key's own metadata block, named `api_key` in
 * the vendor's own schema (`{name, scopes, allowed_origins}` — never the key
 * value), and this action's whole job is to report it. Every other action
 * must stay clear of the word entirely.
 */
Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    if (a.key !== "account-get") {
      assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
    }
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
 *
 * `image-create`'s `useSyncHost` param `hint` names `sync.api.bannerbear.com`
 * in prose so a user understands the toggle — it is a string shown in a form,
 * never a fetch target (the actual host swap goes through `SYNC_API_BASE`
 * from `lib/client.ts`). Every other action must contain no host literal.
 */
Deno.test("index: no action hard-codes a Bannerbear host outside a param hint", async () => {
  for (const a of app.actions) {
    if (a.key === "image-create") continue;
    const src = await actionSource(a.key);
    assert(!/bannerbear\.com/.test(src), `${a.key}: contains a Bannerbear host literal`);
  }
});

/**
 * `webhook-create`'s `placeholder: "https://example.com/..."` is a form
 * hint, not a request target — it never reaches `ctx.fetch`. Every other
 * action must contain no absolute URL at all.
 */
Deno.test("index: no action contains an absolute URL outside a param placeholder", async () => {
  for (const a of app.actions) {
    if (a.key === "webhook-create") continue;
    const src = await actionSource(a.key);
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
 * `instant-url-create` is the ONE action allowed to carry `signing_key` in
 * its output — the vendor returns it exactly once, at creation. No other
 * action may reference it: that would mean an update/get/list path started
 * echoing a secret the API itself never repeats.
 */
Deno.test("index: signing_key is referenced only by instant-url-create", async () => {
  for (const a of app.actions) {
    if (a.key === "instant-url-create") continue;
    const src = await actionSource(a.key);
    assert(!/signing_key/.test(src), `${a.key}: references signing_key`);
  }
  const src = await actionSource("instant-url-create");
  assert(/signing_key/.test(src), "instant-url-create no longer surfaces signing_key");
});

// --- auth --------------------------------------------------------------

/**
 * The auth probe is pinned by path. Choosing it is the step where a
 * credential most easily leaks back out or a scope requirement creeps in.
 */
Deno.test("index: the auth probe is /account", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/bearer-token.ts", import.meta.url)));
  assert(src.includes('"/account"'), "auth probe no longer hits /account");
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

/** A check that widens egress must be unsigned — a status host never sees the key. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows both API hosts and no others", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.bannerbear");
  assertEquals(
    new Set(manifest.w6w.network.allow),
    new Set(["api.bannerbear.com", "sync.api.bannerbear.com"]),
  );
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, embedded verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Bannerbear's own apple-touch-icon.png (1060x1060), downloaded from
  // www.bannerbear.com/images/touchicon.png on 2026-08-29 and downsized with
  // ImageMagick to 128x128 for a reasonable asset size — the artwork itself
  // is untouched, only re-encoded.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"'),
    "icon.svg is not on the expected canvas",
  );
  assert(svg.includes('href="data:image/png;base64,'), "icon.svg is not an embedded PNG");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
