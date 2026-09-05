import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("client-credentials: collects a Client ID and Client Secret", () => {
  assertEquals(auth.key, "client-credentials");
  // `custom`: the client_credentials grant has no browser redirect/PKCE, so it
  // isn't the `oauth2` type's authorization-code flow.
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["clientId", "clientSecret"]);
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[1].type, "secret");
});

Deno.test("client-credentials: exchange mints a token with the client_credentials grant", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok", expires_in: 7200 } }]);
  const cred = await auth.exchange!(
    { fields: { clientId: "cid", clientSecret: "sec" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.ebay.com/identity/v1/oauth2/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("cid:sec")}`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    calls[0].body,
    "grant_type=client_credentials&scope=" +
      encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  );

  assertEquals(cred.accessToken, "tok");
  assertEquals(cred.clientId, "cid");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("client-credentials: the recorded expiry leaves headroom before eBay's", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "tok", expires_in: 7200 } }]);
  const cred = await auth.exchange!(
    { fields: { clientId: "c", clientSecret: "s" } },
    ctx,
  ) as { expiresAt: string };
  const ttlMs = new Date(cred.expiresAt).getTime() - Date.now();
  assert(ttlMs < 7200_000, "must expire before eBay's own token does");
  assert(ttlMs > 7_100_000, "but not so early that it churns");
});

Deno.test("client-credentials: exchange refuses missing fields without a request", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => auth.exchange!({ fields: { clientId: "c" } }, ctx), Error, "required");
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: exchange surfaces eBay's rejection reason", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_client", error_description: "client authentication failed" },
  }]);
  await assertRejects(
    () => Promise.resolve(auth.exchange!({ fields: { clientId: "c", clientSecret: "s" } }, ctx)),
    Error,
    "client authentication failed",
  );
});

Deno.test("client-credentials: refresh re-mints from the stored client id/secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok2", expires_in: 7200 } }]);
  const cred = await auth.refresh!(
    { credential: { clientId: "cid", clientSecret: "sec", accessToken: "old" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.ebay.com/identity/v1/oauth2/token");
  assertEquals(cred.accessToken, "tok2");
});

Deno.test("client-credentials: sign stamps the current token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.ebay.com/buy/browse/v1/item_summary/search",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("client-credentials: test re-runs the exchange and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok", expires_in: 7200 } }]);
  const result = await auth.test(
    { credential: { clientId: "c", clientSecret: "s" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls.length, 1);
});

Deno.test("client-credentials: test tells the user to reconnect when credentials are missing", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing clientId or clientSecret — reconnect",
  });
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: test reports failure without throwing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid_client" } }]);
  const result = await auth.test({ credential: { clientId: "c", clientSecret: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
