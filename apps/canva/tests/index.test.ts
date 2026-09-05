import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 29;

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
 * The four job-creating actions each mint a new job (and, on success, a new
 * design/asset) with no idempotency key of any kind — a retry after a
 * transient failure would create a duplicate rather than converge.
 */
Deno.test("index: no job-creating or design/folder-creating action is marked idempotent", () => {
  for (
    const key of [
      "create-design",
      "create-folder",
      "create-asset-upload-job",
      "create-url-asset-upload-job",
      "create-design-export-job",
      "create-design-autofill-job",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these mutate-in-place or delete-by-id, so retrying converges
 * on the same end state.
 */
Deno.test("index: update/delete/move actions are marked idempotent", () => {
  for (
    const key of [
      "update-folder",
      "delete-folder",
      "move-folder-item",
      "update-asset",
      "delete-asset",
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
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment explaining why an action never touches the credential must not
 * trip the assertion that it doesn't.
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
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
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
    assert(!/canva\.com/.test(src), `${a.key}: contains a Canva host literal`);
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

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is /rest/v1/users/me, not a scoped endpoint", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/oauth2.ts", import.meta.url)));
  assert(src.includes("/rest/v1/users/me`"), "auth probe no longer hits /rest/v1/users/me");
  // Isolate just the `test()` hook body (between its own signature and the
  // next hook) — `afterConnect()` legitimately calls the `/profile` endpoint
  // later in the file, so scanning the whole file would false-positive.
  const testBody = src.split(/async test\(/)[1]?.split(/async afterConnect\(/)[0] ?? "";
  assert(testBody.length > 0, "could not isolate test() body — fixture is stale");
  assert(
    !/["'`]\/rest\/v1\/users\/me\/profile["'`]/.test(testBody),
    "test() must not require the optional profile:read scope",
  );
});

Deno.test("index: the credential field type is never a plain string in fields", () => {
  const [method] = app.auth;
  assertEquals(method.key, "oauth2");
  assertEquals(method.type, "oauth2");
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
 * An `unavailable` entry always reports `unknown`, which outranks `ok` in
 * the roll-up — at any severity but `informational` a declared absence pins
 * the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
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

Deno.test("index: the manifest allows only the API host, not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } };
  };
  assertEquals(manifest.w6w.id, "io.w6w.canva");
  assertEquals(manifest.w6w.network.allow, ["api.canva.com"]);
  assert(!manifest.w6w.network.allow.includes("www.canvastatus.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, on the pack's normalized canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Extracted verbatim 2026-09-05 from the "Canva Developers" logo mark
  // rendered inline on https://www.canva.dev/docs/connect/api-reference/designs/list-designs/
  // (aria-label="Canva Developers logo") — Canva's own developer portal, not
  // a third-party icon set. `_tools/icon-normalize.ts` re-frames every mark
  // onto one square canvas; the geometry below is what has to survive that
  // unchanged.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes('aria-label="Canva"'), "icon lost its aria-label");
  // The re-frame trims the mark to its ink box and restates the viewBox, so
  // the wrapper's numbers are the tool's. The path data is untouched, and it
  // is what a redraw would change.
  assert(
    svg.includes("M79.444 18.096"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  for (const gradientColour of ["#6420FF", "#00C4CC", "#7D2AE7"]) {
    assert(
      svg.includes(gradientColour),
      `vendor colour ${gradientColour} missing — the mark was redrawn`,
    );
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
