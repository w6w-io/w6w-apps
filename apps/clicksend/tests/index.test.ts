import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 16;

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
 * Every send-* action starts a queue-then-bill call ClickSend has no
 * idempotency key for, so retrying a dropped connection resends and
 * double-bills. Cancel/create calls are safe: cancelling twice or creating the
 * same list/contact twice is either a no-op or an ordinary duplicate, not a
 * double send.
 */
Deno.test("index: no send-* action is marked idempotent", () => {
  for (const a of app.actions.filter((a) => a.key.startsWith("send-"))) {
    assertEquals(a.idempotent, false, a.key);
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

/** Only `countries-list` opts out — see its own module doc for why. */
Deno.test("index: only countries-list opts out of requiring auth", () => {
  const optedOut = app.actions.filter((a) => a.requiresAuth === false).map((a) => a.key);
  assertEquals(optedOut, ["countries-list"]);
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment explaining why an action never touches the credential would
 * otherwise trip the very assertion it is explaining.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * `account-get` is the one deliberate exception to "never touches an API key":
 * it deletes the literal `api_key` field ClickSend embeds in `_subaccount` (see
 * its own module doc), which requires naming that field. It still must never
 * reference `credential` or `authorization` — it has no business signing
 * anything, only redacting what the vendor already sent back.
 */
Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    if (a.key === "account-get") continue;
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

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/clicksend\.com/.test(src), `${a.key}: contains a ClickSend host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|username|password)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

/**
 * `GET /account`'s `_subaccount.api_key` is a live credential (see
 * `auth/basic-auth.ts`). `account-get` is the only action that reaches
 * `/account`, and it must strip that field before returning.
 */
Deno.test("index: account-get is the only action touching /account, and it strips api_key", async () => {
  const touching = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (/["'`]\/account["'`]/.test(src)) touching.push(a.key);
  }
  assertEquals(touching, ["account-get"]);
  const src = await actionSource("account-get");
  assert(/api_key/.test(src), "account-get no longer references api_key at all");
  assert(
    /\{\s*api_key\s*:\s*_\w+\s*,\s*\.\.\.\w+\s*\}/.test(src),
    "account-get no longer destructures api_key out of _subaccount",
  );
});

// --- auth --------------------------------------------------------------

/**
 * The auth probe is pinned by path. Choosing it is the step where a
 * credential most easily leaks back out: `GET /account` returns
 * `_subaccount.api_key`, a live credential, so it can never be the probe.
 */
Deno.test("index: the auth probe hits /account/usage/.../subaccount, never /account", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/basic-auth.ts", import.meta.url)));
  assert(src.includes("/account/usage/"), "auth probe no longer hits /account/usage");
  assert(src.includes("subaccount"), "auth probe no longer pins type=subaccount");
  assert(
    !/ctx\.fetch\(`?\$\{API_BASE\}\/account[`'"]/.test(src),
    "the probe was pointed at /account, which returns a live api_key",
  );
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "basic-auth");
  assertEquals(method.type, "basic");
  const secretFields = (method.fields ?? []).filter((f) => f.key === "apiKey");
  assertEquals(secretFields.length, 1);
  for (const f of secretFields) assertEquals(f.type, "secret");
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

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = (app.healthChecks ?? []).filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

Deno.test("index: the quota check is signed and the service check is unsigned", () => {
  const service = app.healthChecks?.find((h) => h.key === "service");
  const quota = app.healthChecks?.find((h) => h.key === "quota");
  assertEquals(service?.credential ?? "none", "none");
  assertEquals(quota?.credential, "signed");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only the API host, not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      displayName: string;
      network: { allow: string[] };
      appearance: { icon: { url?: string; svg?: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.clicksend");
  assertEquals(manifest.w6w.displayName, "ClickSend");
  assertEquals(manifest.w6w.network.allow, ["rest.clicksend.com"]);
  assert(!manifest.w6w.network.allow.includes("status.clicksend.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
