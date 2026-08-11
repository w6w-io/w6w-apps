import { assert, assertEquals } from "@std/assert";
import databaseToken, { authHeaders, PROBE_PATH } from "../../auth/database-token.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const TOKEN = "abcdef0123456789abcdef0123456789";
const SITE = "https://baserow.example.com";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>): SignableRequest {
  const { ctx } = mockCtx([]);
  return databaseToken.sign!({ request, credential } as never, ctx) as SignableRequest;
}

Deno.test("auth: declares an apiKey scheme carrying the URL and the token", () => {
  assertEquals(databaseToken.key, "database-token");
  assertEquals(databaseToken.type, "apiKey");
  const fields = databaseToken.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["siteUrl", "token"]);
  // The token is masked; the URL is an address, not a secret, and masking it
  // would make a typo impossible to spot.
  assertEquals(fields.find((f) => f.key === "token")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "siteUrl")?.type, "string");
});

/**
 * The prefix is `Token`, not `Bearer`. Baserow answers a `Bearer`- or
 * `JWT`-prefixed value with "credentials were not provided", which reads like a
 * missing header rather than a wrong one — so this is pinned.
 */
Deno.test("authHeaders: uses the Token prefix Baserow's spec declares, not Bearer", () => {
  assertEquals(authHeaders({ token: TOKEN }), { authorization: `Token ${TOKEN}` });
  assertEquals(databaseToken.apiKey?.prefix, "Token ");
  assertEquals(databaseToken.apiKey?.name, "Authorization");
});

Deno.test("sign: stamps the Token header and leaves the URL alone", () => {
  const request = {
    url: `${SITE}/api/database/rows/table/1/`,
    headers: {} as Record<string, string>,
  };
  const signed = signWith(request, { siteUrl: SITE, token: TOKEN });
  assertEquals(signed.headers["authorization"], `Token ${TOKEN}`);
  assertEquals(signed.url, `${SITE}/api/database/rows/table/1/`);
});

/**
 * The probe is pinned by path: it is the only endpoint whose sole accepted
 * scheme is the database token, and the only one that needs none of the token's
 * four per-table permissions.
 */
Deno.test("test: probes all-tables on the instance the credential names", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Tasks", database_id: 42 }] }]);
  const result = await databaseToken.test!(
    { credential: { siteUrl: SITE, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, `${SITE}${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], `Token ${TOKEN}`);
});

Deno.test("test: a trailing /api in the pasted URL is normalised before probing", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  await databaseToken.test!({ credential: { siteUrl: `${SITE}/api`, token: TOKEN } } as never, ctx);
  assertEquals(calls[0].url, `${SITE}${PROBE_PATH}`);
});

Deno.test("test: reports a missing half of the credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    (await databaseToken.test!({ credential: { token: TOKEN } } as never, ctx)).ok,
    false,
  );
  assertEquals(
    (await databaseToken.test!({ credential: { siteUrl: SITE } } as never, ctx)).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

/** Baserow's own error code for a revoked or mistyped token. */
Deno.test("test: names an unknown token from ERROR_TOKEN_DOES_NOT_EXIST", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("ERROR_TOKEN_DOES_NOT_EXIST", "The provided token does not exist."),
    },
  ]);
  const result = await databaseToken.test!(
    { credential: { siteUrl: SITE, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("Settings → Database tokens"), result.message);
});

Deno.test("test: a 404 means nothing Baserow-shaped is routed at this URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await databaseToken.test!(
    { credential: { siteUrl: SITE, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("No Baserow at this URL"), result.message);
});

/**
 * Baserow is very commonly behind a reverse proxy, so a 200 that is not a table
 * list is a real case — a login page, a captive portal, a parked domain.
 */
Deno.test("test: a 200 that is not a table list is rejected", async () => {
  const { ctx } = mockCtx([{ body: { detail: "welcome" } }]);
  const result = await databaseToken.test!(
    { credential: { siteUrl: SITE, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("is this URL Baserow?"), result.message);
});

/** A valid token that can reach nothing is useless, and the fix is actionable. */
Deno.test("test: a token that can reach no tables is reported as not usable", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const result = await databaseToken.test!(
    { credential: { siteUrl: SITE, token: TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("can reach no tables"), result.message);
});

Deno.test("afterConnect: records the origin, the host and the token's reach", async () => {
  const { ctx } = mockCtx([
    {
      body: [
        { id: 1, name: "Tasks", database_id: 42 },
        { id: 2, name: "People", database_id: 42 },
      ],
    },
  ]);
  const display = await databaseToken.afterConnect!(
    { credential: { siteUrl: `${SITE}/`, token: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.siteUrl, SITE);
  assertEquals(display.site, { host: "baserow.example.com" });
  assertEquals(display.scope, { tableCount: 2, databaseIds: [42] });
});

/**
 * The display block is shown wherever the connection is. It must carry the
 * token's *reach*, not the customer's table inventory, and never the token.
 */
Deno.test("afterConnect: publishes counts, not the table list, and never the token", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1, name: "Salaries", database_id: 42 }] }]);
  const display = await databaseToken.afterConnect!(
    { credential: { siteUrl: SITE, token: TOKEN } } as never,
    ctx,
  );
  const json = JSON.stringify(display);
  assert(!json.includes(TOKEN), "republished the token");
  assert(!json.includes("Salaries"), "republished the customer's table names");
});

Deno.test("afterConnect: a failed lookup still records the URL", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("ERROR_TOKEN_DOES_NOT_EXIST", "no") }]);
  const display = await databaseToken.afterConnect!(
    { credential: { siteUrl: SITE, token: TOKEN } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.siteUrl, SITE);
  assertEquals(display.scope, undefined);
});
