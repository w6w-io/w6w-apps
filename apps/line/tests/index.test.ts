import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 17;

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
 * LINE's message-sending endpoints do offer a real idempotency key
 * (`X-Line-Retry-Key`), but it is a caller-minted UUID this app leaves as an opt-in pass-through
 * rather than deriving from the host's own (non-UUID-shaped) invocation id — see
 * `lib/params.ts`'s `retryKeyParam`. So none of them is unconditionally safe to auto-retry.
 */
Deno.test("index: no message-sending action is marked idempotent", () => {
  for (const key of ["message-reply", "message-push", "message-multicast", "message-broadcast"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: rich-menu link/unlink/set-default/delete each converge on the same end state no
 * matter how many times they run, so they are genuinely safe to retry.
 */
Deno.test("index: the rich-menu link/unlink/default/delete actions are marked idempotent", () => {
  for (
    const key of [
      "rich-menu-delete",
      "rich-menu-set-default",
      "rich-menu-link-to-user",
      "rich-menu-unlink-from-user",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

/** A rich menu image can only ever be uploaded once — a second call fails outright. */
Deno.test("index: rich-menu-image-upload and rich-menu-create are not idempotent", () => {
  for (const key of ["rich-menu-image-upload", "rich-menu-create"]) {
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
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc comment explaining
 * `Authorization: Bearer` in `sign` must not trip a check meant to catch an ACTION setting one.
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
    assert(
      !/["'\`]?authorization["'\`]?\s*[\]:=]/i.test(src),
      `${a.key}: sets the auth header itself`,
    );
    assert(!/channelAccessToken/.test(src), `${a.key}: touches the channel access token`);
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
 * The two API hosts (`api.line.me`, `api-data.line.me`) live in `lib/client.ts` and nowhere else —
 * an action referencing either directly could bypass the client's shared error handling. A `hint`
 * pointing at `developers.line.biz` documentation is fine; that host is never called.
 */
Deno.test("index: no action hard-codes an API host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api(-data)?\.line\.me/.test(src), `${a.key}: contains a LINE API host literal`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|channel_?access_?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: the auth probe is /v2/bot/info", async () => {
  const src = code(
    await Deno.readTextFile(new URL("../auth/channel-access-token.ts", import.meta.url)),
  );
  assert(src.includes('"/v2/bot/info"'), "auth probe no longer hits /v2/bot/info");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "channel-access-token");
  assertEquals(method.type, "bearer");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
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

Deno.test("index: the manifest allows both LINE hosts and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.line");
  assert(manifest.w6w.network.allow.includes("api.line.me"));
  assert(manifest.w6w.network.allow.includes("api-data.line.me"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("api.line-status.info"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from simple-icons on 2026-09-05: 1176 bytes, single black path, "LINE" title.
  assertEquals(svg.length, 1176);
  assert(
    svg.includes("<title>LINE</title>"),
    "icon.svg lost its <title>LINE</title> — was it edited?",
  );
  assert(
    svg.startsWith('<svg role="img" viewBox="0 0 24 24"'),
    "icon.svg is no longer the verbatim simple-icons export",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
