import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 28;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 4);
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
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.length, 4, "expected 4 perform actions");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Twitch offers no idempotency key of any kind, and three of the four writes
 * create a NEW thing each call: a clip captures a fresh window, a marker stamps
 * "now", an announcement posts again. The runtime may retry anything marked
 * idempotent, so marking these true would double-post on one dropped
 * connection.
 */
Deno.test("index: only the true replacement write is marked idempotent", () => {
  const byKey = (k: string) => app.actions.find((a) => a.key === k);
  for (const key of ["create-clip", "create-stream-marker", "send-chat-announcement"]) {
    assertEquals(byKey(key)?.idempotent, false, key);
  }
  // Modify Channel Information sets the named fields to the given values, so
  // running it twice leaves the channel exactly as running it once does.
  assertEquals(byKey("modify-channel-information")?.idempotent, true);
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
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * The credential-isolation invariant, checked over every action's source.
 *
 * It bites harder on Twitch than on most vendors: an action here needs TWO
 * headers to reach the API, and the tempting shortcut — "just pass the client
 * id in as a param and set the header here" — would put half the credential in
 * the action sandbox. `client-id` is therefore banned from actions alongside
 * the bearer token.
 */
Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/client[_-]?id/i.test(src), `${a.key}: touches the Client-Id header`);
    assert(!/access[_-]?token/i.test(src), `${a.key}: touches an access token`);
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
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/twitch\.tv/.test(src), `${a.key}: contains a Twitch host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned =
    /^(host|origin|domain|base_?url|api_?key|client_?id|client_?secret|access_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the Helix path surface, derived rather than hand-listed -----------------

/**
 * Every request path an action builds, with `${…}` interpolations collapsed to
 * `{}` — derived from the source rather than hand-listed, so a new action is
 * covered the moment it is written.
 */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

Deno.test("index: the request-path derivation actually finds paths", () => {
  assertEquals(requestPaths('const p = "/users";'), ["/users"]);
  assertEquals(requestPaths("const p = `/channels/${id}/x`;"), ["/channels/{}/x"]);
});

/**
 * Twitch's reference marks two endpoints as returning an empty array since
 * 2023-02-28 and a 410 since 2023-07-13: `/tags/streams` (Get All Stream Tags)
 * and `/streams/tags` (Get Stream Tags). Neither is shipped, and this makes
 * adding one a deliberate act rather than an oversight.
 */
Deno.test("index: no action calls a Twitch endpoint documented as deprecated", async () => {
  const deprecated = new Set(["/tags/streams", "/streams/tags"]);
  for (const a of app.actions) {
    for (const path of requestPaths(await actionSource(a.key))) {
      assert(!deprecated.has(path), `${a.key}: calls the deprecated ${path}`);
    }
  }
});

/** The HTTP verb an action's source declares. Helix's default is GET. */
function requestMethod(src: string): string {
  return src.match(/method:\s*"([A-Z]+)"/)?.[1] ?? "GET";
}

/**
 * Every action reaches exactly one Helix path, and no `(path, verb)` pair is
 * reached twice.
 *
 * Both halves are derived from the sources rather than transcribed, so this is
 * a census and not a hand table. The `(path, verb)` form is what makes it an
 * invariant rather than a count: Twitch genuinely multiplexes two operations
 * onto one path twice — `/channels` is GET Get Channel Information and PATCH
 * Modify Channel Information, `/clips` is GET Get Clips and POST Create Clip —
 * so a bare "all paths are distinct" would be false, while "all paths are
 * distinct once you include the verb" catches an action silently pointed at an
 * endpoint another already covers.
 *
 * The duplicated paths are asserted to be exactly those two, so a future
 * collision has to be argued for rather than absorbed.
 */
Deno.test("index: each action builds exactly one Helix path, and no path+verb pair repeats", async () => {
  const byAction = new Map<string, { path: string; method: string }>();
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    const found = requestPaths(src);
    assertEquals(found.length, 1, `${a.key}: expected one request path, found ${found.join(", ")}`);
    byAction.set(a.key, { path: found[0], method: requestMethod(src) });
  }
  assertEquals(byAction.size, ACTION_COUNT);

  const pairs = [...byAction.values()].map((v) => `${v.method} ${v.path}`);
  assertEquals(
    new Set(pairs).size,
    ACTION_COUNT,
    `duplicate path+verb: ${pairs.sort().join(", ")}`,
  );

  // Which paths carry more than one operation, derived — not listed.
  const counts = new Map<string, number>();
  for (const { path } of byAction.values()) counts.set(path, (counts.get(path) ?? 0) + 1);
  const shared = [...counts.entries()].filter(([, n]) => n > 1).map(([p]) => p).sort();
  assertEquals(shared, ["/channels", "/clips"]);
  assertEquals(
    new Set([...byAction.values()].map((v) => v.path)).size,
    ACTION_COUNT - shared.length,
  );
});

// --- auth -------------------------------------------------------------------

/**
 * The probe is pinned by URL. Choosing it is the step where a credential most
 * easily leaks back out, and `/oauth2/validate` is the one endpoint that needs
 * the credential, needs no scope, and returns neither the token nor the secret.
 * If someone swaps it, this makes them do it deliberately.
 */
Deno.test("index: both auth methods probe id.twitch.tv/oauth2/validate", async () => {
  const shared = code(await Deno.readTextFile(new URL("../auth/shared.ts", import.meta.url)));
  assert(shared.includes("/oauth2/validate"), "the probe URL left auth/shared.ts");

  for (const name of ["app-access-token", "user-access-token"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${name}.ts`, import.meta.url)));
    assert(/validateToken\(/.test(src), `${name}: does not use the shared validate probe`);
    // A Helix read as the probe would need a scope a legitimate token may lack.
    assert(!/\/helix\//.test(src), `${name}: probes a Helix endpoint instead of /oauth2/validate`);
  }
});

Deno.test("index: every credential field is declared secret, except the public client id", () => {
  for (const method of app.auth) {
    assertEquals(method.type, "custom", `${method.key}: see auth/user-access-token.ts for why`);
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
    assertEquals(typeof method.refresh, "function", `${method.key}: no refresh hook`);
    const fields = method.fields ?? [];
    assert(fields.length > 0, `${method.key}: no fields`);
    for (const f of fields) {
      if (f.key === "clientId") {
        // Not a secret: Twitch broadcasts it in a header on every request.
        assertEquals(f.type, "string", "clientId should stay a plain string");
      } else {
        assertEquals(f.type, "secret", `${method.key}/${f.key}: credential field is not secret`);
      }
    }
  }
});

// --- health -----------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence pins
 * the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 1, "expected exactly one declared absence");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees a token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assertEquals(widening.length, 1, "expected exactly one check to widen egress");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest ---------------------------------------------------------------

Deno.test("index: the manifest allows the two hosts the app calls, and no others", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };

  assertEquals(manifest.w6w.id, "io.w6w.twitch");
  // api.twitch.tv for the actions, id.twitch.tv for the auth hooks. Nothing else.
  assertEquals(manifest.w6w.network.allow.sort(), ["api.twitch.tv", "id.twitch.tv"]);
  // The status host belongs to the health check's own allowlist, not the app's,
  // and the redirecting `.tv` spelling must never appear anywhere.
  assert(!manifest.w6w.network.allow.some((h) => h.startsWith("status.")));
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"), "loopback in the allowlist");
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

/**
 * `status.twitch.tv` 302-redirects to `status.twitch.com`, and a redirect is
 * followed without a second allowlist check — so the `.tv` spelling must not
 * appear anywhere in the app.
 */
Deno.test("index: nothing anywhere references the redirecting status.twitch.tv host", async () => {
  const dirs = ["actions", "auth", "lib", "health"];
  let scanned = 0;
  for (const dir of dirs) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      scanned++;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      assert(
        !/["'`]https:\/\/status\.twitch\.tv/.test(src),
        `${dir}/${entry.name}: calls status.twitch.tv, which redirects to a host it never declares`,
      );
    }
  }
  assertEquals(
    scanned,
    37,
    `expected 37 source files across ${dirs.join(", ")}, scanned ${scanned}`,
  );
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from cdn.jsdelivr.net/npm/simple-icons@latest/icons/twitch.svg
  // on 2026-08-11: 292 bytes, md5 dea70bc60b3dcc91f3433cd9ec3de68c.
  assertEquals(svg.length, 292, "icon.svg is no longer the 292-byte vendor file");
  assert(svg.includes('viewBox="0 0 24 24"'));
  assert(svg.includes("<title>Twitch</title>"));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// client-id\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
