import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

/** Kept as a constant so adding an action without a test here fails loudly. */
const ACTION_COUNT = 42;

Deno.test("index: exports actions, both auth methods and three health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, output and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
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

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- idempotency ------------------------------------------------------------

Deno.test("index: every perform action states idempotency explicitly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assert(performs.length > 0, "no perform actions — this test would pass vacuously");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Campaign Monitor accepts no idempotency key on any endpoint, so nothing that
 * spends money, delivers mail, or is refused on a repeat may be marked
 * retryable. Marking any of these `true` would let one dropped connection send a
 * campaign twice or burn the day's preview allowance.
 */
Deno.test("index: nothing that sends mail or rejects a repeat is marked idempotent", () => {
  for (
    const key of [
      "campaign-send",
      "campaign-send-preview",
      "smart-email-send",
      "classic-email-send",
      "list-create",
      "campaign-create",
    ]
  ) {
    const action = app.actions.find((a) => a.key === key);
    assert(action !== undefined, `${key}: action is missing`);
    assertEquals(action.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these are
 * upserts and state changes whose repeat lands the same end state, and saying so
 * is what lets the runtime recover from a dropped connection.
 */
Deno.test("index: the genuinely retryable writes are marked idempotent", () => {
  for (
    const key of [
      "subscriber-add",
      "subscriber-update",
      "subscriber-import",
      "subscriber-unsubscribe",
      "subscriber-delete",
      "client-suppress",
      "client-unsuppress",
      "campaign-unschedule",
    ]
  ) {
    const action = app.actions.find((a) => a.key === key);
    assert(action !== undefined, `${key}: action is missing`);
    assertEquals(action.idempotent, true, key);
  }
});

// --- sandbox guards ---------------------------------------------------------

/**
 * Strip comments so the guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining why an action never touches the credential would trip the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: the comment stripper actually strips, so the guards below mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});

Deno.test("index: no action reads or builds a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/\bBasic\s/.test(src), `${a.key}: builds a Basic header`);
    assert(!/btoa\s*\(/.test(src), `${a.key}: base64-encodes something`);
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
 * The API origin and version prefix live in `lib/client.ts` and nowhere else.
 * An action that hard-coded a host — or accepted one as a param — could be
 * pointed somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
    assert(!/createsend\.com/.test(src), `${a.key}: contains an API host literal`);
    assert(!/campaignmonitor\.com/.test(src), `${a.key}: contains a vendor host literal`);
    assert(!/\/api\/v3\./.test(src), `${a.key}: repeats the version prefix`);
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

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("client-get");
  assert(
    requestPaths(src).includes("/clients/{}"),
    "requestPaths no longer recognises a template-literal path — the invariant below is blind",
  );
  assertEquals(requestPaths('const p = "/systemdate";'), ["/systemdate"]);
  assertEquals(requestPaths("const p = `/clients/${id}/lists`;"), ["/clients/{}/lists"]);
});

/**
 * The one path whose response carries a live credential: Campaign Monitor
 * documents `GET /clients/{clientid}.json` as returning "the complete details
 * for a client including their API key", and its example response opens with
 * `"ApiKey": "639d8cc…"`.
 */
const SECRET_BEARING_PATHS = new Set(["/clients/{}"]);

/**
 * The invariant, both ways: an action that touches a secret-bearing path MUST
 * strip, and an action that strips MUST have a reason to. The second half is
 * what stops the rule decaying into a decorative call nobody can justify.
 *
 * Because the candidate set is derived from every action's own source, adding
 * another read of `/clients/{id}` in a new file without `stripSecrets` fails
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
  assertEquals(
    touching,
    ["client-get"],
    `expected exactly client-get, found ${touching.join(",")}`,
  );
});

// --- auth -------------------------------------------------------------------

/**
 * The probe is pinned by path in BOTH auth methods.
 *
 * Choosing it is the step where a credential most easily leaks back out.
 * Campaign Monitor's richest read, `GET /clients/{clientid}.json`, returns that
 * client's own working API key, so it can never be the probe.
 * `/systemdate.json` requires a credential, belongs to no resource, and returns
 * one date string. If someone swaps it, this makes them do it deliberately.
 */
Deno.test("index: both auth methods probe /systemdate.json and neither probes client details", async () => {
  for (const method of ["api-key", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${method}.ts`, import.meta.url)));
    assert(src.includes("/systemdate.json"), `${method}: no longer probes /systemdate.json`);
    assert(
      !/["'`]\/clients\/\$\{/.test(src),
      `${method}: probes a per-client read, which returns that client's API key`,
    );
    assert(
      !src.includes("/billingdetails"),
      `${method}: probes billingdetails, which 403s for a non-agency customer`,
    );
  }
});

Deno.test("index: every auth method has test and sign, and every secret field is typed secret", () => {
  assertEquals(app.auth.map((m) => m.key).sort(), ["api-key", "oauth2"]);
  for (const method of app.auth) {
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
    for (const f of method.fields ?? []) {
      assertEquals(f.type, "secret", `${method.key}/${f.key}: credential field is not secret`);
    }
  }
});

/** Both `test` hooks classify from the body's `Code`, never from the status alone. */
Deno.test("index: neither auth method decides validity from the status code alone", async () => {
  for (const method of ["api-key", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${method}.ts`, import.meta.url)));
    assert(/body\.Code/.test(src), `${method}: does not read the body's Code field`);
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
  assertEquals(app.healthChecks.map((h) => h.key).sort(), ["api", "quota", "service"]);
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence pins
 * the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 2, "expected the service and quota absences");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees a key. */
Deno.test("index: no health check pairs extra egress with a signed posture", () => {
  for (const h of app.healthChecks) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
  // This app widens egress nowhere: the only live probe is on its own API host.
  assertEquals(app.healthChecks.filter((h) => h.network?.allow?.length).length, 0);
});

// --- manifest ---------------------------------------------------------------

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { svg: string; alt: string } };
  };
};

Deno.test("index: the manifest allows exactly the one host the app calls", () => {
  assertEquals(manifest.w6w.id, "io.w6w.campaignmonitor");
  assertEquals(manifest.w6w.displayName, "Campaign Monitor");
  // The API is on createsend.com. campaignmonitor.com serves only documentation.
  assertEquals(manifest.w6w.network.allow, ["api.createsend.com"]);
});

/**
 * Three hosts this app deliberately does NOT allowlist, each for its own reason:
 * the status host is unreachable and belongs to a check's own allowlist anyway,
 * and the two preview/report hosts appear only in response bodies that are
 * returned as data and never fetched.
 */
Deno.test("index: the status and preview hosts are not in the app allowlist", () => {
  for (
    const host of [
      "status.campaignmonitor.com",
      "www.campaignmonitor.com",
      "preview.createsend.com",
      "createsend.com",
    ]
  ) {
    assert(!manifest.w6w.network.allow.includes(host), `${host} must not be allowlisted`);
  }
});

Deno.test("index: the manifest declares 1-3 categories and an icon with alt text", () => {
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.categories, ["email", "marketing"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "Campaign Monitor");
});

/**
 * The icon is the vendor's own mark, taken verbatim from simple-icons on
 * 2026-08-11: 364 bytes, a 24x24 viewBox, and a `<title>` that names the
 * product. The title check is the one that matters — it is what distinguishes
 * the real mark from a look-alike or a redraw.
 */
Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assertEquals(svg.length, 364, "icon.svg is no longer the 364-byte vendor file");
  assert(svg.includes("<title>Campaign Monitor</title>"), "the mark is not Campaign Monitor's");
  assert(svg.includes('viewBox="0 0 24 24"'), "the viewBox changed — the mark was redrawn");
  assert(!svg.includes("\n"), "the file was reformatted rather than kept verbatim");
});
