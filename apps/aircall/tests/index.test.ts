import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 38;

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
 * The runtime may retry an action marked idempotent. Each of these either bills
 * something, rings a phone, or has no upsert and no idempotency key, so marking
 * any of them `true` turns one dropped connection into a duplicate.
 *
 * `user-call-start` is the sharpest case: it places a real outbound call.
 * `contact-create` is the vendor's own worked example of the failure — "Duplicate
 * calls to POST /v1/contacts with the same payload will create duplicate
 * contacts."
 */
Deno.test("index: nothing that bills, rings or duplicates is marked idempotent", () => {
  for (
    const key of [
      "user-call-start",
      "call-transfer",
      "call-comment",
      "call-tag",
      "contact-create",
      "tag-create",
      "webhook-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just blanket caution: these
 * genuinely do reach the same state on a replay, and saying so is what lets the
 * runtime recover from a dropped connection instead of failing a run.
 */
Deno.test("index: the genuinely-retryable performs are marked idempotent", () => {
  for (
    const key of [
      "call-recording-pause",
      "call-recording-resume",
      "user-dial",
      "contact-update",
      "contact-delete",
      "team-user-add",
      "team-user-remove",
      "tag-update",
      "tag-delete",
      "webhook-update",
      "webhook-delete",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

/**
 * Every `perform` is accounted for by one of the two lists above. Derived from
 * the action set rather than eyeballed, so a new `perform` fails here until
 * someone decides which side it is on.
 */
Deno.test("index: the two idempotency lists partition every perform action", () => {
  const performs = app.actions.filter((a) => a.type === "perform").map((a) => a.key).sort();
  assertEquals(performs.length, 18, `expected 18 perform actions, found ${performs.length}`);
  const retryable = app.actions.filter((a) => a.type === "perform" && a.idempotent).length;
  const notRetryable = app.actions.filter((a) => a.type === "perform" && !a.idempotent).length;
  assertEquals(retryable, 11);
  assertEquals(notRetryable, 7);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

Deno.test("index: every action declares a resource for editor grouping", () => {
  for (const a of app.actions) {
    assert(
      typeof a.resource === "string" && a.resource.length > 0,
      `${a.key}: no resource`,
    );
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
    assert(!/api[_-]?(key|id|token)/i.test(src), `${a.key}: touches an API key`);
    assert(
      !/\bbtoa\b/.test(src),
      `${a.key}: base64-encodes something that looks like a Basic pair`,
    );
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
 * Remove the *values* of user-facing prose fields, so the egress guard below
 * scans what an action REQUESTS rather than what it tells a human.
 *
 * This is not a convenience: `webhook-create`'s `placeholder` is a URL, and it
 * has to be, because the field it labels is the delivery endpoint **Aircall**
 * calls — a value the user supplies, on a host this app never touches. Treating
 * it as egress would be a category error.
 *
 * The derivation is copied from the pack's own auditor
 * (`_tools/audit.ts#scanSources`), which strips exactly these six field values
 * before extracting host literals — so this mirrors an already-reviewed rule
 * rather than inventing a looser one for the single file that trips it.
 */
function withoutProse(src: string): string {
  return src.replace(
    /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
    "",
  );
}

/**
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 *
 * The Aircall-host half runs over the WHOLE source, prose included: there is no
 * legitimate reason for an action to name `aircall.io` even in a hint, and a
 * host literal smuggled into a `placeholder` is exactly the sort of thing this
 * is for. Only the generic absolute-URL half is scoped to code.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/aircall\./.test(src), `${a.key}: contains an Aircall host literal`);
    assert(!/https?:\/\//.test(withoutProse(src)), `${a.key}: builds an absolute URL in code`);
  }
});

/**
 * The prose stripper has to remove prose and nothing else, or the guard above is
 * blind. Both directions are asserted, because a stripper that ate everything
 * would make that test pass vacuously.
 */
Deno.test("index: the prose stripper removes hints but not code", () => {
  assertEquals(withoutProse('placeholder: "https://example.com/hook",').trim(), ",");
  assertEquals(
    withoutProse('hint: "call https://x.example.com" + " twice",').trim(),
    ",",
  );
  const code = 'const url = "https://api.aircall.io/v1/calls";';
  assertEquals(withoutProse(code), code, "a URL in real code must survive the stripper");
  assert(
    /https?:\/\//.test(withoutProse('const u = "https://evil.example.com";')),
    "the guard must still catch a URL built in code",
  );
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?id|api_?token|token|company)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the webhook-secret invariant, derived rather than listed ----------------

/**
 * Which resource envelopes an action unwraps, read off its own source.
 *
 * Aircall wraps each single-entity response under a key named for the resource
 * (`{"webhook": …}`) and each list under its plural (`{"webhooks": […]}`), and
 * both reach the client as a bare string argument — so the envelopes an action
 * returns are derivable rather than hand-listed.
 *
 * The `resource:` declaration is stripped first: it names the same noun for
 * editor grouping and is not a response envelope, so counting it would wrongly
 * flag `webhook-delete`, which returns only an HTTP status.
 */
function webhookEnvelopes(src: string): string[] {
  const body = src.replace(/resource:\s*"[a-z-]+"\s*,/g, "");
  return [...body.matchAll(/"(webhooks?)"/g)].map((m) => m[1]);
}

/**
 * `GET /v1/webhooks` returns every webhook's `token` — the shared secret a
 * receiver authenticates Aircall's deliveries with — for up to 100 webhooks at
 * once. Every action that hands a webhook entity back to a workflow step must
 * therefore strip it, because a step's result is persisted, logged and
 * previewed.
 *
 * `webhook-create` is the one deliberate exception: it *issues* the secret, for
 * the webhook this very step created, and Aircall publishes no way to re-read
 * it. Naming the exception here is what stops it from quietly becoming two.
 *
 * Because the candidate set is derived from every action's own source, adding a
 * new action that returns a webhook without stripping fails here rather than
 * shipping.
 */
Deno.test("index: exactly the webhook-returning actions strip the token, bar the issuer", async () => {
  const returning: string[] = [];
  const stripping: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (webhookEnvelopes(src).length > 0) returning.push(a.key);
    if (/\bstripWebhookTokens?\s*\(/.test(src)) stripping.push(a.key);
  }

  // A derivation that found nothing would pass vacuously and prove nothing.
  assertEquals(
    returning.sort(),
    ["webhook-create", "webhook-get", "webhook-list", "webhook-update"],
    `actions returning a webhook entity: ${returning.join(", ")}`,
  );
  assertEquals(
    stripping.sort(),
    returning.filter((k) => k !== "webhook-create"),
    `actions stripping the token: ${stripping.join(", ")}`,
  );
});

Deno.test("index: the envelope derivation actually finds envelopes", async () => {
  assertEquals(webhookEnvelopes(await actionSource("webhook-list")), ["webhooks"]);
  assertEquals(webhookEnvelopes(await actionSource("webhook-get")), ["webhook"]);
  // The `resource:` declaration alone must NOT count as an envelope, or
  // webhook-delete would be demanded to strip a body it never returns.
  assertEquals(webhookEnvelopes('resource: "webhook",\nconst x = 1;'), []);
  assertEquals(webhookEnvelopes(await actionSource("webhook-delete")), []);
});

// --- auth -------------------------------------------------------------------

/**
 * The probe is pinned by path.
 *
 * Choosing it is the step where a credential most easily leaks back out, and
 * Aircall's obvious alternative is exactly the leaky one: `GET /v1/webhooks`
 * returns every webhook's shared authentication token. `/v1/ping` requires a
 * credential (401 without one, 403 with a bad one — both measured), needs no
 * scope, and answers `{"ping":"pong"}`. If someone swaps it, this makes them do
 * it deliberately.
 */
Deno.test("index: the auth probe is /ping, and reaches no listing endpoint", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/basic.ts", import.meta.url)));
  assert(/PROBE_PATH\s*=\s*"\/ping"/.test(src), "the auth probe is no longer /v1/ping");
  for (const listing of ["/webhooks", "/company", "/users", "/calls", "/contacts"]) {
    assert(
      !new RegExp(`["'\`]${listing}["'\`]`).test(src),
      `the auth probe was pointed at ${listing}`,
    );
  }
});

/** Nothing in `auth/` or `health/` may reach a listing endpoint either. */
Deno.test("index: no auth or health hook probes an endpoint that returns a secret", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/["'`]\/webhooks["'`]/.test(src), `${dir}/${entry.name}: probes /webhooks`);
    }
  }
});

Deno.test("index: both credential fields are declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "basic");
  assertEquals(method.type, "basic");
  assertEquals((method.fields ?? []).length, 2);
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
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
 * `unknown` outranks `ok` in the roll-up, so any check whose steady state can be
 * `unknown` has to be `informational` or it pins the App's verdict forever. The
 * quota check is exactly that case: Aircall documents its rate-limit headers as
 * present only "when the rate limit has been reached".
 */
Deno.test("index: the quota check is informational, because unknown is its steady state", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota");
  assertEquals(quota?.severity, "informational");
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

// --- manifest ---------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.aircall");
  assertEquals(manifest.w6w.network.allow, ["api.aircall.io"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.aircall.com"));
  assert(!manifest.w6w.network.allow.includes("status.aircall.io"));
  // `127.0.0.1` is a template leftover: this app never calls a local endpoint,
  // and an allowlist entry nothing uses is egress nobody reviewed.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from https://www.aircall.io/favicon.svg on 2026-08-11
  // (which 301s to https://aircall.io/favicon.svg): 2,740 bytes,
  // md5 8e491a6537a43d75a6433f11aad7e1d9, a 96x96 square of four paths. Not a
  // wordmark — it carries no <text> element at all.
  assertEquals(svg.length, 2740, "icon.svg is no longer the 2,740-byte vendor file");
  assert(svg.includes('viewBox="0 0 96 96"'), "the mark is no longer the square 96x96 glyph");
  assert(!/<text|<tspan/.test(svg), "the icon became a wordmark");
  for (const colour of ["#00bd82", "#fff"]) {
    assert(svg.includes(colour), `vendor colour ${colour} missing — the mark was redrawn`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
