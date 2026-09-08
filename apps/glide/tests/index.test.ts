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
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Endpoints Glide itself documents as carrying no idempotency key: creating a
 * table, adding rows, and both halves of the upload handshake each start
 * something new on every call.
 */
Deno.test("index: no-idempotency-key writes are marked not idempotent", () => {
  for (
    const key of ["table-create", "table-overwrite", "rows-add", "upload-create", "upload-complete"]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these are genuinely safe to retry — Glide's own docs state a
 * delete is a no-op on an already-missing target, and a PUT/PATCH with
 * explicit values converges to the same state on a retry.
 */
Deno.test("index: the genuinely-retryable writes are marked idempotent", () => {
  for (const key of ["row-update", "row-delete", "stash-data", "stash-delete"]) {
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

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/glideapps\.com/.test(src), `${a.key}: contains a Glide host literal`);
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
 * The upload flow's byte PUT to `uploadLocation` deliberately never happens in
 * this app (see `index.ts`'s header comment and `actions/upload-create.ts`) —
 * so no action may hold a second `ctx.fetch`-reaching client of any kind
 * beyond `GlideClient`, which only ever targets `api.glideapps.com`.
 */
Deno.test("index: upload-create never fetches uploadLocation itself", async () => {
  const src = await actionSource("upload-create");
  assert(
    !/ctx\.fetch/.test(src),
    "upload-create calls ctx.fetch directly rather than via GlideClient",
  );
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is GET /tables", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-token.ts", import.meta.url)));
  assert(src.includes('"/tables"'), "auth probe no longer hits /tables");
});

/**
 * The single fact this API's errors page insists on: a bad credential answers
 * 404, never 401. A probe that branched on 401 would never fire.
 */
Deno.test("index: nothing in auth branches on status 401 for credential rejection", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-token.ts", import.meta.url)));
  assert(!/status\s*===\s*401/.test(src), "auth probe checks status 401, which Glide never sends");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-token");
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

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

Deno.test("index: the service check is feed-backed and unsigned", () => {
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.feed?.url, "https://status.glideapps.com/history.atom");
  assertEquals(service.credential, "none");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only the API host, not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.glide");
  assert(manifest.w6w.network.allow.includes("api.glideapps.com"));
  assert(!manifest.w6w.network.allow.includes("status.glideapps.com"));
  assertEquals(manifest.w6w.network.allow.length, 1);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, on the pack's canvas, with a legible dark variant", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from simple-icons' `glide.svg` (source: brand.glide.page) on 2026-09-06:
  // 204 bytes, viewBox 0 0 24 24. `_tools/icon-normalize.ts` re-frames it onto the pack's square
  // canvas — the geometry below is the vendor's path data, untouched.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(
    svg.includes("M10.8 17.52a6.72 6.72 0 0 1 6.72-6.72H24L10.8 24ZM0 13.2 13.2 0v6.48"),
    "the vendor's geometry changed — the mark was redrawn",
  );

  // `_tools/icon-legibility.ts fix` generated the dark variant: a reversed (white) re-ink of the
  // same verbatim path data, since the vendor's mark is single-colour and fails the dark tile
  // as-is (ΔE 15.2 / contrast 1.34, measured 2026-09-06).
  const dark = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  assert(dark.includes('fill="#ffffff"'), "dark variant is not reversed to white");
  assert(
    dark.includes("M10.8 17.52a6.72 6.72 0 0 1 6.72-6.72H24L10.8 24ZM0 13.2 13.2 0v6.48"),
    "the dark variant's geometry does not match the light one",
  );

  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { appearance: { darkMode?: { icon?: { svg?: string } } } } };
  assertEquals(manifest.w6w.appearance.darkMode?.icon?.svg, "./assets/icon.dark.svg");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// bearer\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
