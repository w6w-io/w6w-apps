import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 31;

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
 * Apify's run endpoints accept no idempotency key of any kind, so every call
 * starts and bills a new run. The runtime may retry an action marked
 * idempotent; marking any of these `true` would turn one transient network
 * error into two paid crawls.
 */
Deno.test("index: no run-starting action is marked idempotent", () => {
  for (
    const key of [
      "actor-run",
      "actor-run-sync-get-items",
      "task-run",
      "task-run-sync-get-items",
      "run-resurrect",
      "dataset-items-push",
      "dataset-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these four
 * genuinely are safe to retry, and saying so is what lets the runtime recover
 * from a dropped connection instead of failing the run.
 */
Deno.test("index: the four genuinely-retryable performs are marked idempotent", () => {
  for (const key of ["run-abort", "record-set", "webhook-create", "webhook-delete"]) {
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
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/apify\.com/.test(src), `${a.key}: contains an Apify host literal`);
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

// --- the redaction invariant, derived rather than listed ---------------------

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

/**
 * The paths whose responses carry a live credential, read off Apify's OpenAPI
 * schemas: `UserPrivateInfo.proxy.password`, `Dataset.urlSigningSecretKey` and
 * `KeyValueStore.urlSigningSecretKey`. The two collection paths are included
 * because `POST` to them returns the full entity and because a future widening
 * of the list projection must not silently start leaking.
 */
const SECRET_BEARING_PATHS = new Set([
  "/users/me",
  "/datasets",
  "/datasets/{}",
  "/key-value-stores",
  "/key-value-stores/{}",
]);

/**
 * The invariant, both ways: an action that touches a secret-bearing path MUST
 * strip, and an action that strips MUST have a reason to. The second half is
 * what stops the rule decaying into a decorative call nobody can justify.
 *
 * Because the candidate set is derived from every action's own source, adding
 * `GET /v2/key-value-stores/{id}` in a new file without `stripSecrets` fails
 * here rather than shipping.
 */
Deno.test("index: exactly the actions touching a secret-bearing path strip secrets", async () => {
  const touching: string[] = [];
  const stripping: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (requestPaths(src).some((p) => SECRET_BEARING_PATHS.has(p))) touching.push(a.key);
    if (/\bstripSecrets\s*\(/.test(src)) stripping.push(a.key);
  }
  assertEquals(
    touching.slice().sort(),
    stripping.slice().sort(),
    `actions touching a secret-bearing path: ${touching.sort().join(", ")} · ` +
      `actions stripping: ${stripping.sort().join(", ")}`,
  );
  // A derivation that found nothing would pass vacuously and prove nothing.
  // Six, because `/datasets` and `/key-value-stores` are each shared by a list
  // and a create: account-get, dataset-list, dataset-get, dataset-create,
  // key-value-store-list, key-value-store-get.
  assertEquals(touching.length, 6, `expected 6 secret-bearing actions, found ${touching.length}`);
});

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("dataset-get");
  assert(
    requestPaths(src).includes("/datasets/{}"),
    "requestPaths no longer recognises a template-literal path — the invariant above is blind",
  );
  assertEquals(requestPaths('const p = "/users/me";'), ["/users/me"]);
  assertEquals(requestPaths("const p = `/datasets/${id}/items`;"), ["/datasets/{}/items"]);
});

// --- auth ------------------------------------------------------------------

/**
 * The auth probe is pinned by path.
 *
 * Choosing it is the step where a credential most easily leaks back out. Apify's
 * obvious whoami, `GET /v2/users/me`, returns `proxy.password` — the account's
 * Apify Proxy credential — so it can never be the probe. `/v2/users/me/limits`
 * requires a credential, is reachable by a scoped token, and returns only plan
 * ceilings and usage numbers. If someone swaps it, this makes them do it
 * deliberately.
 */
Deno.test("index: the auth probe is /users/me/limits", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-token.ts", import.meta.url)));
  assert(src.includes("/users/me/limits"), "auth probe no longer hits /users/me/limits");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/users\/me["'`]/.test(src),
    "the probe was pointed at the whoami, which returns the account's proxy password",
  );
});

/**
 * The rejected probe, kept rejected. `GET /v2/store` answers 200 with no
 * credential at all (measured 2026-08-11), so a Connection whose token never
 * got attached would pass a probe against it.
 */
Deno.test("index: nothing in auth or health probes /store, which answers unauthenticated", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/["'`]\/store["'`]/.test(src), `${dir}/${entry.name}: probes /store`);
    }
  }
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

// --- health ----------------------------------------------------------------

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

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.apify");
  assert(manifest.w6w.network.allow.includes("api.apify.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.apify.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from apify.com/favicon.svg on 2026-08-11: 774 bytes,
  // a 1080x1080 square of three coloured paths.
  assertEquals(svg.length, 774, "icon.svg is no longer the 774-byte vendor file");
  assert(svg.includes('viewBox="0 0 1080 1080"'));
  for (const colour of ["#246DFF", "#20A34E", "#F86606"]) {
    assert(svg.includes(colour), `vendor colour ${colour} missing — the mark was redrawn`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
