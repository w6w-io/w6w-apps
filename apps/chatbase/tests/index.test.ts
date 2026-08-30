import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 35;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
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
 * Every one of these creates a new record or a new side effect (a message, a
 * training job, a ticket reply, a WhatsApp send) each time it is called. The
 * runtime may retry an action marked idempotent; marking any of these `true`
 * would turn one transient network error into a duplicate message or ticket.
 */
Deno.test("index: no create/send/train-shaped action is marked idempotent", () => {
  for (
    const key of [
      "agent-create",
      "agent-delete",
      "agent-train",
      "agent-clone",
      "agent-chat",
      "message-retry",
      "tool-result-submit",
      "source-create",
      "source-delete",
      "source-restore",
      "ticket-create",
      "ticket-message-add",
      "whatsapp-template-send",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/** Setting the same fields to the same values twice is a safe no-op for all four. */
Deno.test("index: the genuinely-retryable updates are marked idempotent", () => {
  for (
    const key of [
      "agent-update",
      "agent-auto-retrain-toggle",
      "source-update",
      "message-feedback-update",
      "ticket-update",
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
 * Strip comments so the sandbox guards below scan CODE, not prose — this
 * app's own doc comments discuss "apiKey", "bearer", and "credential" at
 * length.
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
 * The API origin lives in `lib/client.ts` and nowhere else — an action that
 * hard-coded a host, including `files.chatbase.co` (the host this app
 * deliberately does not call), could be pointed somewhere the manifest never
 * allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/chatbase\.co/.test(src), `${a.key}: contains a Chatbase host literal`);
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

// --- auth --------------------------------------------------------------------

/**
 * The auth probe is pinned by path. Chatbase's unauthenticated `/health`
 * cannot tell a live key from a missing one, so this app deliberately does
 * NOT probe it for credential liveness — only for the `service` health check.
 */
Deno.test("index: the auth probe is /agents, not the unauthenticated /health", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('"/agents"'), "auth probe no longer hits /agents");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "bearer");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: the service check is unsigned; the quota check is signed", () => {
  const service = app.healthChecks?.find((h) => h.key === "service");
  const quota = app.healthChecks?.find((h) => h.key === "quota");
  assertEquals(service?.credential, "none");
  assertEquals(quota?.credential, "signed");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows exactly the one Chatbase host both API versions share", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.chatbase");
  assertEquals(manifest.w6w.network.allow, ["www.chatbase.co"]);
  // files.chatbase.co is the file-upload host this app deliberately doesn't call.
  assert(!manifest.w6w.network.allow.includes("files.chatbase.co"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, on the pack's normalized canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from www.chatbase.co/images/chatbase-logo.svg on
  // 2026-08-29 (514 bytes), then run through _tools/icon-normalize.ts, which
  // re-frames every mark onto one square canvas without touching its geometry.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(
    svg.includes(
      "M86.9983 37.3802L76.4802 47.8982L86.9983 58.4165V95.7974H12.9114C5.7807 95.7974",
    ),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assert(svg.includes("#09090B"), "vendor colour missing — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
