import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import app from "../index.ts";
import oauthAuth, {
  AUTHORIZATION_URL,
  basecampAccounts,
  bearerFrom,
  PROBE_URL,
  TOKEN_URL,
} from "../auth/oauth.ts";
import {
  accountIdFromConnection,
  BasecampClient,
  compact,
  formatBasecampError,
  toIdList,
  truncate,
  USER_AGENT,
} from "../lib/client.ts";
import service, {
  BASECAMP_COMPONENT,
  componentId,
  mapComponentStatus,
  STATUS_URL,
} from "../health/service.ts";
import quota from "../health/quota.ts";
import { BASE, identity, mockBasecampCtx, mockCtx, TOKEN } from "./_helpers.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assertEquals(app.actions.length, 11);
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

/** Each of these posts to real people; Basecamp has no idempotency key. */
Deno.test("index: the posting actions are not idempotent", () => {
  for (const key of ["todo-create", "message-create", "comment-create", "campfire-line-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
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

Deno.test("index: no action reads a credential, calls global fetch, or names a host", async () => {
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

/**
 * The account id is half the connection's identity — it selects whose Basecamp
 * this is. An action taking one could point a single Connection at two
 * different companies.
 */
Deno.test("index: the account id is never an action param", () => {
  const banned = /^(account_?id|account|token|access_?token|host|origin|base_?url)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) assert(!banned.test(p.key), `${a.key}/${p.key}`);
  }
});

Deno.test("client: builds against the connection's account, and says so when it is missing", () => {
  const { ctx } = mockBasecampCtx();
  assertEquals(accountIdFromConnection(ctx.connection), "999999999");
  assertThrows(() => accountIdFromConnection(undefined), Error, "records no account id");
});

/** Basecamp documents the User-Agent as required, not as a nicety. */
Deno.test("client: sends the required User-Agent, with a contact address", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: [] }]);
  await new BasecampClient(ctx).request("/projects.json");
  assertEquals(calls[0].url, `${BASE}/projects.json`);
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  assert(/https?:\/\/|@/.test(USER_AGENT), "the User-Agent must carry a way to make contact");
  assertEquals(calls[0].headers["authorization"], undefined, "signing is the auth hook's job");
});

Deno.test("client: a JSON body is sent with a content-type, a GET is not", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: {} }, { body: [] }]);
  const client = new BasecampClient(ctx);
  await client.request("/todolists/1/todos.json", { method: "POST", body: { content: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  await client.request("/projects.json");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: a 204 resolves to undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockBasecampCtx([{ status: 204 }]);
  assertEquals(
    await new BasecampClient(ctx).request("/todos/1/completion.json", { method: "POST" }),
    undefined,
  );
});

Deno.test("compact / toIdList / truncate: the small helpers behave", () => {
  assertEquals(compact({ a: 1, b: undefined, c: "", d: false }), { a: 1, d: false });
  assertEquals(toIdList("1, 2 ,3", "Assignee IDs"), [1, 2, 3]);
  assertEquals(toIdList("", "Assignee IDs"), undefined);
  assertThrows(() => toIdList("1,abc", "Assignee IDs"), Error, '"abc" is not an id');
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

/**
 * Basecamp's window is ten seconds, so a 429 really does clear in moments —
 * unlike the daily allowances elsewhere in this pack, the advice is to wait.
 */
Deno.test("formatBasecampError: a 429 names the short window and the Retry-After", () => {
  const msg = formatBasecampError(429, "GET", "/999/projects.json", "{}", "7");
  assert(msg.includes("50 requests per 10 seconds"), msg);
  assert(msg.includes("Retry after 7s"), msg);
});

/** With flat routes, a 404 is as often "not your account" as "no such id". */
Deno.test("formatBasecampError: a 404 raises the access explanation, not just the id", () => {
  const msg = formatBasecampError(404, "GET", "/999/todos/1.json", "");
  assert(msg.includes("may not have access"), msg);
});

Deno.test("formatBasecampError: surfaces the vendor's error string, or the raw body", () => {
  const msg = formatBasecampError(403, "POST", "/999/messages.json", '{"error":"Nope"}');
  assert(msg.includes("Nope"), msg);
  const raw = formatBasecampError(502, "GET", "/999/projects.json", "<html>bad gateway</html>");
  assert(raw.includes("bad gateway"), raw);
});

Deno.test("client: a non-2xx throws with Basecamp's own error text", async () => {
  const { ctx } = mockBasecampCtx([{ status: 403, body: { error: "Forbidden" } }]);
  await assertRejects(
    async () => {
      await new BasecampClient(ctx).request("/projects.json");
    },
    Error,
    "Forbidden",
  );
});

Deno.test("auth: declares the OAuth endpoints the vendor documents", () => {
  assertEquals(oauthAuth.type, "oauth2");
  assertEquals(AUTHORIZATION_URL, "https://launchpad.37signals.com/authorization/new");
  assertEquals(TOKEN_URL, "https://launchpad.37signals.com/authorization/token");
  assertEquals(oauthAuth.oauth2?.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(oauthAuth.oauth2?.tokenUrl, TOKEN_URL);
  // Basecamp has no API keys, so there is no second, simpler method to offer.
  assertEquals(app.auth.length, 1);
});

Deno.test("sign: stamps the bearer and the required User-Agent", () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: `${BASE}/projects.json`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = oauthAuth.sign!(
    { request, credential: { accessToken: TOKEN } } as never,
    ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], `Bearer ${TOKEN}`);
  assertEquals(signed.headers["user-agent"], USER_AGENT);
});

Deno.test("bearerFrom: accepts either spelling the host may have stored", () => {
  assertEquals(bearerFrom({ accessToken: TOKEN }), TOKEN);
  assertEquals(bearerFrom({ access_token: TOKEN }), TOKEN);
  assertEquals(bearerFrom({}), "");
});

/**
 * The filter that stops a HEY-only identity from producing a Connection that
 * 404s on everything: only `product: "bc3"` speaks this API.
 */
Deno.test("basecampAccounts: keeps only Basecamp 5 accounts", () => {
  const accounts = basecampAccounts(
    identity([
      { id: 1, product: "hey", name: "HEY" },
      { id: 2, product: "bc3", name: "Acme" },
      { id: 3, product: "bcx", name: "Old Basecamp" },
    ]) as never,
  );
  assertEquals(accounts.map((a) => a.id), [2]);
  assertEquals(basecampAccounts(null), []);
});

Deno.test("test: probes Launchpad's identity endpoint, with the User-Agent", async () => {
  const { ctx, calls } = mockCtx([
    { body: identity([{ id: 999999999, product: "bc3", name: "Acme" }]) },
  ]);
  const result = await oauthAuth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
});

/** A 37signals ID with only HEY on it authenticates perfectly and cannot be used. */
Deno.test("test: an identity with no Basecamp 5 account is unusable, and says what it has", async () => {
  const { ctx } = mockCtx([{ body: identity([{ id: 1, product: "hey", name: "HEY" }]) }]);
  const result = await oauthAuth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("no Basecamp 5 account"), result.message);
  assert(result.message!.includes("hey"), result.message);
});

Deno.test("test: a 401 explains that Basecamp tokens expire", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "unauthorized" } }]);
  const result = await oauthAuth.test!({ credential: { accessToken: TOKEN } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("expire"), result.message);
});

Deno.test("test: a missing token is reported without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await oauthAuth.test!({ credential: {} } as never, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records the account id every URL needs", async () => {
  const { ctx } = mockCtx([
    { body: identity([{ id: 999999999, product: "bc3", name: "Acme" }]) },
  ]);
  const display = await oauthAuth.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.accountId, 999999999);
  assertEquals(display.account, { id: 999999999, name: "Acme" });
  // One account: nothing was chosen, so nothing to disclose.
  assertEquals(display.accounts, undefined);
});

/** When several Basecamps are reachable the choice should be visible, not silent. */
Deno.test("afterConnect: several accounts means the first is used and the rest are listed", async () => {
  const { ctx } = mockCtx([{
    body: identity([
      { id: 111, product: "bc3", name: "Acme" },
      { id: 222, product: "hey", name: "HEY" },
      { id: 333, product: "bc3", name: "Globex" },
    ]),
  }]);
  const display = await oauthAuth.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.accountId, 111);
  assertEquals(display.accounts, [{ id: 111, name: "Acme" }, { id: 333, name: "Globex" }]);
});

/** The display block is shown wherever the Connection is. */
Deno.test("afterConnect: publishes no token and no personal email", async () => {
  const { ctx } = mockCtx([
    { body: identity([{ id: 999999999, product: "bc3", name: "Acme" }]) },
  ]);
  const display = await oauthAuth.afterConnect!(
    { credential: { accessToken: TOKEN } } as never,
    ctx,
  );
  const json = JSON.stringify(display);
  assert(!json.includes(TOKEN), "republished the token");
  assert(!json.includes("ada@example.com"), "republished the person's email");
});

/**
 * The trap this app exists to document: three plausible subdomains serve the
 * unclaimed-Statuspage shell. The real page is 37signals'.
 */
Deno.test("service: probes 37signals' page, not one of the unclaimed Basecamp subdomains", () => {
  assertEquals(STATUS_URL, "https://37signals.statuspage.io/api/v2/summary.json");
  assertEquals(service.network?.allow, ["37signals.statuspage.io"]);
  assertEquals(service.credential, "none");
});

Deno.test("index: nothing fetches an unclaimed basecamp statuspage subdomain", async () => {
  for (const dir of ["actions", "auth", "health", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(
        !/https?:\/\/(basecamp|basecamphq|bc3)\.statuspage\.io/.test(src),
        `${dir}/${entry.name}: builds a URL to an unclaimed statuspage subdomain`,
      );
    }
  }
});

/** There IS a component that means "this product", so the check can carry weight. */
Deno.test("service: keeps the degraded default, because one component speaks for Basecamp", () => {
  assertEquals(service.severity, undefined);
  assert(BASECAMP_COMPONENT.test("Basecamp 5"));
  assert(!BASECAMP_COMPONENT.test("Basecamp 2"));
  assert(!BASECAMP_COMPONENT.test("Basecamp Classic"));
});

Deno.test("mapComponentStatus / componentId: cover the vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("brand_new"), "unknown");
  assertEquals(componentId("Basecamp 5"), "basecamp-5");
});

function statusPage(components: Array<{ name: string; status: string }>, incidents = 0) {
  return {
    page: { id: "thc30769z1m9", name: "37signals", url: "https://www.37status.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: components.map((c, i) => ({ id: `c${i}`, name: c.name, status: c.status })),
    incidents: Array.from({ length: incidents }, (_, i) => ({ name: `Incident ${i}` })),
    scheduled_maintenances: [],
  };
}

Deno.test("service: takes its verdict from the Basecamp 5 component", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([
      { name: "Basecamp 5", status: "operational" },
      { name: "HEY", status: "operational" },
    ]),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).sort(), ["basecamp-5", "hey"]);
});

/**
 * The whole point of naming the component: another product's outage is reported
 * but must not change this app's verdict.
 */
Deno.test("service: another product's outage is reported, not counted", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([
      { name: "Basecamp 5", status: "operational" },
      { name: "HEY", status: "major_outage" },
    ]),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok", "HEY being down says nothing about Basecamp");
  assert(result.message!.includes("other 37signals products affected: HEY"), result.message);
  assertEquals(result.components!["hey"].state, "down");
});

Deno.test("service: a Basecamp 5 outage is down", async () => {
  const { ctx } = mockCtx([{
    body: statusPage([
      { name: "Basecamp 5", status: "major_outage" },
      { name: "HEY", status: "operational" },
    ], 1),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "down");
  assert(result.message!.includes("Basecamp 5: major_outage"), result.message);
  assert(result.message!.includes("1 open incident"), result.message);
});

/** A rename must be reported, not silently replaced by another product's health. */
Deno.test("service: a missing Basecamp 5 component is unknown, not inferred", async () => {
  const { ctx } = mockCtx([{ body: statusPage([{ name: "HEY", status: "operational" }]) }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("no longer lists a Basecamp 5 component"), result.message);
});

/** An unclaimed shell serves HTML — parsing it must report unknown, not a status. */
Deno.test("service: HTML instead of JSON is unknown, not a status", async () => {
  const { ctx } = mockCtx([{ body: "<!DOCTYPE html><html>…</html>" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: refuses a page that no longer self-identifies as 37signals'", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Someone Else", url: "https://status.example.com" },
      status: { indicator: "none" },
      components: [{ id: "c1", name: "Basecamp 5", status: "operational" }],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("self-identifies"), result.message);
});

Deno.test("quota: is declared unavailable, informational, and names the short window", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("50 requests per 10 seconds"));
});

Deno.test("index: the manifest allows the API host and Launchpad, and nothing else", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.basecamp");
  assertEquals(manifest.w6w.network.allow.sort(), [
    "3.basecampapi.com",
    "launchpad.37signals.com",
  ]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("37signals.statuspage.io"));
});

Deno.test("index: the comment stripper actually strips", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
