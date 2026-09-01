import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 44;

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
    assert(a.output!.length > 0, `${a.key}: empty output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Every action that starts a real-money movement or otherwise cannot be
 * blindly retried without a side effect duplicating.
 */
Deno.test("index: money-moving creates and captures are not marked idempotent", () => {
  for (
    const key of [
      "order-create",
      "payment-capture",
      "payment-refund-create",
      "customer-create",
      "payment-link-create",
      "item-create",
      "plan-create",
      "subscription-create",
      "qr-code-create",
      "invoice-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these are genuinely safe to retry (an update overwrites
 * fields, a cancel/close/accept's end state doesn't change on a second
 * call), and saying so is what lets the runtime recover from a dropped
 * connection instead of failing the run.
 */
Deno.test("index: pure state-transition performs are marked idempotent", () => {
  for (
    const key of [
      "payment-update",
      "customer-update",
      "payment-link-update",
      "payment-link-cancel",
      "subscription-cancel",
      "subscription-pause",
      "subscription-resume",
      "dispute-accept",
      "dispute-contest",
      "qr-code-close",
      "invoice-issue",
      "invoice-cancel",
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
 * Strip comments so the sandbox guards below scan CODE, not prose — several
 * action doc comments legitimately discuss "credential" or "authorization"
 * while explaining why the action never touches either.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * A bare `/authorization/i` scan is too blunt here: Razorpay's own domain
 * vocabulary legitimately uses the word for subscription *mandate*
 * authorization (`subscription-create`'s "Mandate authorization URL") and
 * for the `authorized` order filter — neither touches the HTTP header. What
 * must never appear in an action is the header itself being read or set: a
 * quoted `"authorization"` used as an object key, or a `.authorization`
 * property access/assignment.
 */
const SETS_AUTH_HEADER = /["'`]authorization["'`]|\.authorization\s*[:=]/i;

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!SETS_AUTH_HEADER.test(src), `${a.key}: sets the auth header itself`);
    assert(!/keySecret/.test(src), `${a.key}: touches the key secret`);
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
 * hard-coded a host — or accepted one as a param — could be pointed
 * somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/razorpay\.com/.test(src), `${a.key}: contains a Razorpay host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|key_?id|key_?secret|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is /payments — there is no dedicated ping/whoami", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/basic.ts", import.meta.url)));
  assert(src.includes('"/payments"'), "auth probe no longer hits /payments");
});

Deno.test("index: the credential fields are declared secret where sensitive", () => {
  const method = (app.auth ?? [])[0];
  assert(method, "no auth method declared");
  assertEquals(method.key, "basic");
  assertEquals(method.type, "basic");
  const secretFields = method.fields?.filter((f) => f.key === "keySecret") ?? [];
  assertEquals(secretFields.length, 1);
  assertEquals(secretFields[0].type, "secret");
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

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so a declared absence at any severity but
 * `informational` pins the app's verdict at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the credential. */
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

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.razorpay");
  assert(manifest.w6w.network.allow.includes("api.razorpay.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.razorpay.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, on the pack's canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Extracted verbatim from cdn.razorpay.com/logo.svg on 2026-09-01 (the icon
  // glyph's own two <path> subpaths, split before the wordmark letters
  // begin), then re-framed onto the pack's canvas by `_tools/icon-normalize.ts`.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(
    svg.includes("M122.63 105.7"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  for (const colour of ["#3395FF", "#072654"]) {
    assert(svg.includes(colour), `vendor colour ${colour} missing — the mark was redrawn`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
