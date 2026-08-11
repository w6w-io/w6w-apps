import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 22;

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
 * ElevenLabs accepts no idempotency key of any kind, and every one of these
 * either bills characters/credits or consumes a voice slot. The runtime may
 * retry an action marked idempotent; marking any of these `true` would turn one
 * transient network error into two paid generations.
 */
Deno.test("index: no billing action is marked idempotent", () => {
  for (
    const key of [
      "text-to-speech",
      "text-to-speech-with-timestamps",
      "speech-to-text",
      "sound-generation",
      "voice-add-from-library",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these three
 * genuinely are safe to retry, and saying so is what lets the runtime recover
 * from a dropped connection instead of failing the run.
 */
Deno.test("index: the three genuinely-retryable performs are marked idempotent", () => {
  for (const key of ["voice-settings-edit", "voice-delete", "history-delete"]) {
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

Deno.test("index: every select param has at least two options", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      if (p.type !== "select") continue;
      assert(Array.isArray(p.options), `${a.key}/${p.key}: select without a static option list`);
      assert(p.options.length >= 2, `${a.key}/${p.key}: select with fewer than two options`);
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
    assert(!/xi-api-key/i.test(src), `${a.key}: sets the ElevenLabs key header`);
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
 * The host set is DERIVED from each action's source the same way the pack's
 * auditor derives it (strip comments, then strip user-facing prose fields),
 * rather than grepping for one known string: a new action reaching a new host
 * fails here without anyone remembering to add it to a list.
 */
function hostsIn(src: string): string[] {
  const codeOnly = src.replace(
    /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*")(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
    "",
  );
  return [...codeOnly.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) => m[1]);
}

Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const hosts = hostsIn(await actionSource(a.key));
    assertEquals(hosts, [], `${a.key}: contains host literal(s) ${hosts.join(", ")}`);
  }
});

Deno.test("index: the host derivation actually finds a host, so the guard is not vacuous", () => {
  assertEquals(hostsIn('const u = "https://api.elevenlabs.io/v1/user";'), ["api.elevenlabs.io"]);
  // A URL inside user-facing prose is documentation, not a request.
  assertEquals(hostsIn('hint: "see https://example.com/docs for more",'), []);
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
  for (const m of src.matchAll(/(?:`(\/v[12]\/[^`]*)`|"(\/v[12]\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

/**
 * The paths whose responses carry a live credential, read off ElevenLabs'
 * OpenAPI schemas: `UserResponseModel.xi_api_key`, documented as "The API key of
 * the user". It is the only field in the covered surface that does.
 */
const SECRET_BEARING_PATHS = new Set(["/v1/user"]);

/**
 * The invariant, both ways: an action that touches a secret-bearing path MUST
 * strip, and an action that strips MUST have a reason to. The second half is
 * what stops the rule decaying into a decorative call nobody can justify.
 *
 * Because the candidate set is derived from every action's own source, adding a
 * `GET /v1/user` read in a new file without `stripSecrets` fails here rather
 * than shipping.
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
  assertEquals(touching.length, 1, `expected 1 secret-bearing action, found ${touching.length}`);
});

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("voice-get");
  assert(
    requestPaths(src).includes("/v1/voices/{}"),
    "requestPaths no longer recognises a template-literal path — the invariant above is blind",
  );
  assertEquals(requestPaths('const p = "/v1/user";'), ["/v1/user"]);
  assertEquals(requestPaths("const p = `/v1/history/${id}/audio`;"), ["/v1/history/{}/audio"]);
});

// --- auth ------------------------------------------------------------------

/**
 * The auth probe is pinned by path.
 *
 * Choosing it is the step where a credential most easily leaks back out.
 * ElevenLabs' obvious whoami, `GET /v1/user`, returns `xi_api_key` — the
 * caller's own key — so it can never be the probe. `/v1/user/subscription`
 * requires a credential and returns only plan figures. If someone swaps it,
 * this makes them do it deliberately.
 */
Deno.test("index: the auth probe is /v1/user/subscription", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(
    /PROBE_PATH\s*=\s*"\/v1\/user\/subscription"/.test(src),
    "auth probe is no longer /v1/user/subscription",
  );
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/v1\/user["'`]/.test(src),
    "the probe was pointed at the whoami, which returns the caller's own API key",
  );
});

/**
 * The rejected probe, kept rejected. `GET /v1/voices` answers 200 with 102,976
 * bytes and no credential at all (measured 2026-08-11), so a Connection whose
 * key never got attached would pass a probe against it. `/v1/shared-voices` is
 * partially public for the same reason.
 */
Deno.test("index: nothing in auth or health probes a publicly-readable path", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      for (const path of ["/v1/voices", "/v1/shared-voices"]) {
        assert(!src.includes(`"${path}"`), `${dir}/${entry.name}: probes ${path}`);
        assert(!src.includes(`${path}\``), `${dir}/${entry.name}: probes ${path}`);
      }
    }
  }
});

Deno.test("index: the credential field is declared secret and sent as xi-api-key", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  assertEquals(method.apiKey?.in, "header");
  assertEquals(method.apiKey?.name, "xi-api-key");
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

/** A check that widens egress must be unsigned — a status host never sees the key. */
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
  assertEquals(manifest.w6w.id, "io.w6w.elevenlabs");
  assertEquals(manifest.w6w.network.allow, ["api.elevenlabs.io"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.elevenlabs.io"));
  // No loopback, ever: it is not a host this app calls.
  assert(!manifest.w6w.network.allow.some((h) => /127\.0\.0\.1|localhost/.test(h)));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from
  // cdn.jsdelivr.net/npm/simple-icons@latest/icons/elevenlabs.svg on 2026-08-11:
  // 158 bytes, md5 582f077cf9276d910bb367f43e41a62b.
  assertEquals(svg.length, 158, "icon.svg is no longer the 158-byte vendor file");
  assert(svg.includes("<title>ElevenLabs</title>"));
  assert(svg.includes('viewBox="0 0 24 24"'));
  assert(svg.includes("M4.6035 0v24h4.9317V0zm9.8613 0v24h4.9317V0z"), "the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// xi-api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
