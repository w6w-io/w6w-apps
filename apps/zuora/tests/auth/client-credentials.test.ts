import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("client-credentials: exchange mints a token with a form-encoded body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { access_token: "tok-1", expires_in: 3600, token_type: "bearer" },
  }]);
  const cred = await auth.exchange!(
    { fields: { clientId: "cid", clientSecret: "csecret", region: "us-cloud2" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://rest.zuora.com/oauth/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const params = new URLSearchParams(calls[0].body!);
  assertEquals(params.get("grant_type"), "client_credentials");
  assertEquals(params.get("client_id"), "cid");
  assertEquals(params.get("client_secret"), "csecret");
  assertEquals(cred.accessToken, "tok-1");
  assert(!("authorization" in calls[0].headers), "must not set auth headers on the token call");
});

Deno.test("client-credentials: exchange resolves the region to its own host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { access_token: "t", expires_in: 3600 } }]);
  await auth.exchange!({ fields: { clientId: "c", clientSecret: "s", region: "eu" } }, ctx);
  assertEquals(calls[0].url, "https://rest.eu.zuora.com/oauth/token");
});

Deno.test("client-credentials: exchange rejects an unknown region before making a call", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await auth.exchange!({ fields: { clientId: "c", clientSecret: "s", region: "mars" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/unknown Zuora region/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: exchange rejects a missing client id or secret", async () => {
  const { ctx } = mockCtx([]);
  let threw = false;
  try {
    await auth.exchange!({ fields: { clientId: "", clientSecret: "s" } }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("client-credentials: refresh mints a new token from the stored id/secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { access_token: "tok-2", expires_in: 3600 },
  }]);
  const cred = await auth.refresh!(
    { credential: { clientId: "cid", clientSecret: "csecret", region: "us-cloud2" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://rest.zuora.com/oauth/token");
  assertEquals(cred.accessToken, "tok-2");
});

Deno.test("client-credentials: sign stamps a bearer authorization header", async () => {
  const request = { headers: {} as Record<string, string>, method: "GET", url: "https://x" };
  const { ctx } = mockCtx([]);
  const out = await auth.sign!({ request, credential: { accessToken: "tok-1" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok-1");
});

Deno.test("client-credentials: test succeeds on a 200 from the cheap Object Query probe", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const result = await auth.test(
    { credential: { accessToken: "tok-1", region: "us-cloud2" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://rest.zuora.com/object-query/accounts?pageSize=1");
  assertEquals(result.ok, true);
});

Deno.test("client-credentials: test reports a rejected token distinctly from a missing one", async () => {
  const { ctx: ctxMissing } = mockCtx([]);
  const missing = await auth.test({ credential: {} }, ctxMissing);
  assertEquals(missing.ok, false);
  assert(/missing accessToken/.test(missing.message!));

  const { ctx: ctx401 } = mockCtx([{ status: 401, body: { message: "invalid token" } }]);
  const rejected = await auth.test({ credential: { accessToken: "bad" } }, ctx401);
  assertEquals(rejected.ok, false);
  assert(/rejected/.test(rejected.message!));
});

Deno.test("client-credentials: afterConnect records the region key and its display label", () => {
  const result = auth.afterConnect!({ credential: { region: "eu" } }, mockCtx([]).ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.region, "eu");
  assertEquals(result.regionLabel, "EU Production");
});
