import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import app from "../index.ts";
import accessTokenAuth, { authHeaders, PROBE_PATH } from "../auth/access-token.ts";
import {
  asJson,
  asOptionalJson,
  BASE_URL,
  compact,
  flag,
  formatFormstackError,
  FormstackClient,
  LEGACY_BASE_URL,
  truncate,
} from "../lib/client.ts";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../health/service.ts";
import quota from "../health/quota.ts";
import { BASE, errorBody, mockCtx, mockFormstackCtx, TOKEN } from "./_helpers.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, 9);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert((a.description ?? "").length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency, and creating one does not claim it", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  // A form submission is a real response from a real person; a retry records two.
  assertEquals(app.actions.find((a) => a.key === "submission-create")?.idempotent, false);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert((p.key ?? "").length > 0, `${a.key}: param without a key`);
      assert((p.label ?? "").length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/** Strip comments so the sandbox guards below scan CODE, not prose. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential or calls global fetch", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
  }
});

Deno.test("index: the credential is never an action param", () => {
  const banned = /^(access_?token|api_?key|token|host|origin|base_?url)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(!banned.test(p.key), `${a.key}/${p.key}`);
  }
});

/**
 * The two generations are both live and both answer 401 unauthenticated, so a
 * credential for the wrong one presents as a rejected token. The bases must stay
 * distinct and the app must target V2025.
 */
Deno.test("client: targets V2025, and the legacy base is named but never used", async () => {
  assertEquals(BASE_URL, "https://www.formstack.com/api/v2025");
  assertEquals(LEGACY_BASE_URL, "https://www.formstack.com/api/v2");
  for (const a of app.actions) {
    assert(!(await actionSource(a.key)).includes("v2/"), `${a.key}: reaches the legacy generation`);
  }
});

Deno.test("compact / flag / truncate: the small helpers behave", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  // Formstack's boolean query parameters are string flags, not JSON booleans.
  assertEquals(flag(true), "true");
  assertEquals(flag(false), "false");
  assertEquals(flag(undefined), undefined);
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

Deno.test("asJson / asOptionalJson: parse strings, pass objects, name the field", () => {
  assertEquals(asJson({ a: 1 }, "Field values"), { a: 1 });
  assertEquals(asJson('{"a":1}', "Field values"), { a: 1 });
  assertThrows(() => asJson("{nope", "Field values"), Error, "Field values is not valid JSON");
  assertThrows(() => asJson("", "Field values"), Error, "Field values is required");
  assertEquals(asOptionalJson("", "Field search"), undefined);
});

/**
 * A 429 here is a DAY-long wall, not a moment's throttling, so the message must
 * not invite a retry.
 */
Deno.test("formatFormstackError: a 429 explains the daily window", () => {
  const msg = formatFormstackError(429, "GET", "/api/v2025/forms", errorBodyJson("Rate limited"));
  assert(msg.includes("daily API quota"), msg);
  assert(msg.includes("retrying shortly will not help"), msg.toLowerCase());
});

function errorBodyJson(error: string): string {
  return JSON.stringify(errorBody(error));
}

Deno.test("formatFormstackError: surfaces the vendor's error string, or the raw body", () => {
  const msg = formatFormstackError(401, "GET", "/api/v2025/forms", errorBodyJson("Unauthorized"));
  assert(msg.includes("401"), msg);
  assert(msg.includes("Unauthorized"), msg);
  const raw = formatFormstackError(502, "GET", "/api/v2025/forms", "<html>bad gateway</html>");
  assert(raw.includes("bad gateway"), raw);
});

Deno.test("client: sends JSON with an explicit content-type, since url-encoded is the default", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: {} }, { body: {} }]);
  const client = new FormstackClient(ctx);
  await client.request("/forms/1/submissions", { method: "POST", body: { "123": "Ada" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"123":"Ada"}');
  await client.request("/forms");
  assertEquals(calls[1].headers["content-type"], undefined);
  assertEquals(calls[1].url, `${BASE}/forms`);
});

Deno.test("client: drops empty query values, and never sets an auth header", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: {} }]);
  await new FormstackClient(ctx).request("/forms", {
    query: { a: undefined, b: "", c: 0, d: false },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("b"), null);
  assertEquals(url.searchParams.get("c"), "0");
  assertEquals(url.searchParams.get("d"), "false");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a non-2xx throws with Formstack's own error text", async () => {
  const { ctx } = mockFormstackCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  await assertRejects(
    async () => {
      await new FormstackClient(ctx).request("/forms");
    },
    Error,
    "Unauthorized",
  );
});

Deno.test("auth: a single bearer secret, and the probe is the forms list", async () => {
  assertEquals(accessTokenAuth.type, "bearer");
  assertEquals((accessTokenAuth.fields ?? []).map((f) => f.key), ["accessToken"]);
  assertEquals(accessTokenAuth.fields![0].type, "secret");
  assertEquals(authHeaders({ accessToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
  assertEquals(PROBE_PATH, "/forms");

  const { ctx, calls } = mockCtx([{ body: { data: [], total: 3 } }]);
  const result = await accessTokenAuth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result, { ok: true });
  // pageSize=1 keeps the probe cheap on an account with thousands of forms.
  assertEquals(calls[0].url, `${BASE}/forms?pageSize=1`);
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
});

/**
 * An account with no forms yet is a valid connection — the token is not *scoped*
 * to forms, unlike `apps/baserow`'s database token, so an empty account must not
 * block a first-run setup.
 */
Deno.test("auth: an empty account is a valid connection, not a broken one", async () => {
  const { ctx } = mockCtx([{ body: { data: [], total: 0 } }]);
  assertEquals(
    await accessTokenAuth.test!({ credential: { accessToken: TOKEN } } as never, ctx),
    { ok: true },
  );
});

Deno.test("auth: a 401 points at the generation mix-up, which is the likely cause", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  const result = await accessTokenAuth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("V2025"), result.message);
  assert(result.message!.includes("/api/v2"), result.message);
});

/** A 429 at connect time is a day-long quota, not a bad credential. */
Deno.test("auth: a 429 is reported as the daily quota, not as a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody("Too Many Requests") }]);
  const result = await accessTokenAuth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("daily"), result.message);
});

Deno.test("auth: afterConnect publishes a count, never the token or the form names", async () => {
  const { ctx } = mockCtx([{
    body: { data: [{ id: "1", name: "Secret intake form" }], total: 42 },
  }]);
  const display = await accessTokenAuth.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  );
  assertEquals(display, { account: { forms: 42 } });
  const json = JSON.stringify(display);
  assert(!json.includes(TOKEN));
  assert(!json.includes("Secret intake form"));
});

/**
 * The status page belongs to Intellistack, the parent brand — `status.formstack.com`
 * is a catch-all that serves the same HTML for every path.
 */
Deno.test("service: probes the Intellistack page, and declares only that host", () => {
  assertEquals(STATUS_URL, "https://www.intellistackstatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["www.intellistackstatus.com"]);
  assertEquals(service.credential, "none");
});

/** 87 components across a whole portfolio — an unrelated product must not drag this down. */
Deno.test("service: is informational, because the page covers the whole portfolio", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.scope, "app");
});

Deno.test("mapComponentStatus / mapIndicator: cover Statuspage's vocabularies", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("brand_new"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

/** The portfolio page repeats display names, so the vendor id is the key. */
Deno.test("componentKey: prefers the vendor id, because names repeat across products", () => {
  const a = { id: "c1", name: "Main Application" };
  const b = { id: "c2", name: "Main Application" };
  assert(componentKey(a, 0) !== componentKey(b, 1));
  assertEquals(componentKey({ name: "Formstack ID (FSID)" }, 3), "formstack-id-fsid-3");
});

Deno.test("service: reads the page indicator and reports each component", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "z9vl5j7rxtz7", name: "Intellistack", url: "https://www.intellistackstatus.com" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c1", name: "Main Application", status: "operational" },
        { id: "c2", name: "Formstack ID (FSID)", status: "operational" },
      ],
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).sort(), ["c1", "c2"]);
});

Deno.test("service: a degraded component is named in the message", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Intellistack", url: "https://www.intellistackstatus.com" },
      status: { indicator: "minor" },
      components: [{ id: "c1", name: "Main Application", status: "partial_outage" }],
      incidents: [{ name: "Elevated errors" }],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes("Main Application"), result.message);
});

/** It accepts either brand, because it has already followed one rebrand. */
Deno.test("service: accepts the Formstack or Intellistack identity, refuses anything else", async () => {
  const other = mockCtx([{
    body: {
      page: { name: "Someone Else", url: "https://status.example.com" },
      status: { indicator: "none" },
      components: [{ id: "c1", name: "API", status: "operational" }],
    },
  }]);
  const result = await service.check!({} as never, other.ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("no longer identifies"), result.message);
});

Deno.test("service: an unreachable status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("quota: is declared unavailable, informational, and names the daily window", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("daily"));
  assert(quota.unavailable!.reason.includes("per access token"));
});

Deno.test("index: the manifest names one fixed host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.formstack");
  assertEquals(manifest.w6w.network.allow, ["www.formstack.com"]);
  assert(!manifest.w6w.network.allow.includes("www.intellistackstatus.com"));
});

Deno.test("index: the comment stripper actually strips", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
