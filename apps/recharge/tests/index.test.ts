import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 29;

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

/**
 * Charges, subscriptions and one-time purchases each carry Recharge financial
 * consequences (a duplicate charge, a duplicate subscription, a re-registered
 * webhook), and the reference documents no request-level idempotency key for
 * any of them — a retried "create"/"skip"/"unskip"/"refund"/"cancel" is not
 * guaranteed to be a safe no-op.
 */
Deno.test("index: no create/skip/unskip/refund/cancel/activate action is marked idempotent", () => {
  for (
    const key of [
      "customer-create",
      "subscription-create",
      "subscription-cancel",
      "subscription-activate",
      "charge-skip",
      "charge-unskip",
      "charge-refund",
      "onetime-create",
      "webhook-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these updates and the delete converge to the same end state
 * regardless of how many times they run, so marking them idempotent lets the
 * runtime retry a dropped connection instead of failing the whole run.
 */
Deno.test("index: the genuinely-retryable performs are marked idempotent", () => {
  for (
    const key of [
      "customer-update",
      "address-update",
      "subscription-set-next-charge-date",
      "webhook-delete",
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
    assert(!/access-token/i.test(src), `${a.key}: builds the access-token header itself`);
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
    assert(!/rechargeapps\.com/.test(src), `${a.key}: contains a Recharge host literal`);
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

// --- payment methods: no invented redaction beyond what Recharge itself sends ---

/**
 * Recharge's own `payment_details` schema returns only brand/last4/exp
 * month/year — never a full card number — so this app has nothing to strip.
 * This guards against a future action route reaching for a raw-card field
 * that does not exist in the vendor's schema in the first place.
 */
Deno.test("index: no action references a raw card-number field", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/card_?number/i.test(src), `${a.key}: references a raw card number field`);
  }
});

// --- auth ------------------------------------------------------------------

Deno.test("index: the auth probe is /token_information, not a scoped whoami", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-token.ts", import.meta.url)));
  assert(src.includes("/token_information"), "auth probe no longer hits /token_information");
});

Deno.test("index: the credential field is declared secret, and sign/test are present", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-token");
  assertEquals(method.type, "apiKey");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: the apiKey config names the exact vendor header, with no Bearer prefix", () => {
  const [method] = app.auth;
  assertEquals(method.apiKey?.in, "header");
  assertEquals(method.apiKey?.name, "X-Recharge-Access-Token");
  assertEquals(method.apiKey?.prefix, undefined);
});

// --- health ------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: the service check widens egress only while unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

Deno.test("index: the quota check is signed and connection-scoped", () => {
  const quotaCheck = app.healthChecks.find((h) => h.key === "quota");
  assertEquals(quotaCheck?.credential, "signed");
  assertEquals(quotaCheck?.scope, "connection");
});

// --- manifest ----------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.recharge");
  assert(manifest.w6w.network.allow.includes("api.rechargeapps.com"));
  assertEquals(manifest.w6w.network.allow.length, 1, "no extra hosts in the app-level allowlist");
  assert(!manifest.w6w.network.allow.includes("status.getrecharge.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, on the pack's canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from getrecharge.com's own WordPress theme assets
  // (assets/img/brand/logos/recharge-mark.svg) on 2026-09-05, then run through
  // the pack's icon-normalize tool onto the shared 100x100 canvas.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  // The re-frame trims to the ink box and rescales; the path data itself is
  // untouched, and it is what a redraw would change.
  assert(
    svg.includes("M29.9,15c0,8.3-6.7,15-15,15S0,23.2,0,15,6.7,0,15,0s15,6.7,15,15"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assert(svg.includes("#3901f1"), "vendor colour #3901f1 missing — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// access-token\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
