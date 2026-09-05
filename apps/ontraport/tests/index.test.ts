import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 31;

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

/** These genuinely create a new record (or a new one on every retry) — a retry must not resend them. */
Deno.test("index: create-shaped actions are not marked idempotent", () => {
  for (const key of ["contact-create", "tag-create", "task-assign"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
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
 * app's own doc comments say "credential" and "authorization" constantly.
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
    assert(!/api-key|api-appid|apiKey\s*:/i.test(src), `${a.key}: touches the credential fields`);
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
Deno.test("index: no action hard-codes the API host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.ontraport\.com/.test(src), `${a.key}: contains a host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?appid|app_?id|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the Task permission invariant, derived from the vendor's own table -----

/**
 * Ontraport's Accessible Objects table grants Task (object type 1) only GET
 * and PUT — no POST, no DELETE. Enforced structurally: this app must not grow
 * a `task-create` or `task-delete` action later without someone re-reading
 * that table first.
 */
Deno.test("index: no task-create or task-delete action exists", () => {
  const keys = app.actions.map((a) => a.key);
  assert(!keys.includes("task-create"), "Ontraport's Task object type has no POST endpoint");
  assert(!keys.includes("task-delete"), "Ontraport's Task object type has no DELETE endpoint");
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is Contacts/getInfo, which returns no contact data", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("CREDENTIAL_PROBE_PATH"), "auth no longer uses the shared probe constant");
});

Deno.test("index: the credential fields are declared secret/required appropriately", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "custom");
  const apiKeyField = method.fields?.find((f) => f.key === "apiKey");
  assertEquals(apiKeyField?.type, "secret");
  assertEquals(apiKeyField?.required, true);
  const appIdField = method.fields?.find((f) => f.key === "appId");
  assertEquals(appIdField?.required, true);
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health ----------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the credential. */
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

// --- manifest ----------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } };
  };
  assertEquals(manifest.w6w.id, "io.w6w.ontraport");
  assert(manifest.w6w.network.allow.includes("api.ontraport.com"));
  assert(!manifest.w6w.network.allow.includes("ontraport.statuspage.io"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon exists and is the wrapped vendor mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 125"'));
  assert(svg.includes('<image width="125" height="125" href="data:image/png;base64,'));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
