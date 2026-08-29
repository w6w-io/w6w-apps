import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 24;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
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
 * The four non-idempotent creates: no server-side dedupe key at all
 * (device-create, channel-create), or a dedupe key that is optional so a
 * blind retry cannot be assumed safe (push-create, text-create, guid) or is
 * undocumented (subscription-create, resubscribing).
 */
Deno.test("index: creates without a guaranteed dedupe key are marked non-idempotent", () => {
  for (
    const key of [
      "push-create",
      "device-create",
      "channel-create",
      "subscription-create",
      "text-create",
      "upload-request",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/** The converse: gets, updates and deletes settle into the same end state on retry. */
Deno.test("index: updates and deletes are marked idempotent", () => {
  for (
    const key of [
      "push-update",
      "push-delete",
      "push-delete-all",
      "device-update",
      "device-delete",
      "chat-create",
      "chat-update",
      "chat-delete",
      "subscription-update",
      "subscription-delete",
      "text-update",
      "text-delete",
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
    assert(!/access-token/i.test(src), `${a.key}: builds the auth header itself`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API host lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes the API host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/pushbullet\.com/.test(src), `${a.key}: contains a Pushbullet host literal`);
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

Deno.test("index: the auth wire format is the Access-Token header, not Authorization: Bearer", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/access-token.ts", import.meta.url)));
  assert(/access-token/i.test(src), "auth no longer sets the Access-Token header");
  assert(
    !/authorization["'\]]*\s*[:=]/.test(src),
    "the auth hook was pointed at Authorization instead of the vendor's bespoke header",
  );
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "access-token");
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

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned. This app declares none, and the test says so. */
Deno.test("index: no health check widens egress while signed", () => {
  for (const h of app.healthChecks) {
    if (h.network?.allow?.length) {
      assert(
        h.credential === "none" || h.credential === "context",
        `${h.key}: widens egress while signed`,
      );
    }
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only the API host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.pushbullet");
  assertEquals(manifest.w6w.network.allow, ["api.pushbullet.com"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, on the pack's canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // From simple-icons (cdn.jsdelivr.net/npm/simple-icons@latest/icons/pushbullet.svg),
  // downloaded 2026-08-29 — Pushbullet's own favicon.ico carries only raster PNG
  // frames (16x16/32x32), not vector artwork, so simple-icons' vector mark was used
  // per the house fallback order. `_tools/icon-normalize.ts` re-frames every mark
  // onto one square canvas.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Pushbullet</title>"));
  // The re-frame trims to the ink's bounding box in the ORIGINAL viewBox units —
  // this path fragment is from simple-icons' own data and untouched by the tool.
  assert(
    svg.includes("M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assert(svg.includes("#4AB367"), "brand colour missing — sourced from simple-icons' own hex");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
