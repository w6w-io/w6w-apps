import { assert, assertEquals } from "@std/assert";
import oauth2, { bearerHeader } from "../../auth/oauth2.ts";
import { mockCtx, pathOf, yelpError } from "../_helpers.ts";

const TOKEN = "unitTestFixtureAccessTokenNotReal0000000000000000000000000000";

Deno.test("oauth2: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.yelp.com/v3/leads/abc",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.yelp.com/v3/leads/abc");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2: bearerHeader is the single source of the wire format", () => {
  assertEquals(bearerHeader({ accessToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("oauth2: test probes partner-api.yelp.com/token/v1/businesses, not a Leads endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { business_ids: ["biz1"] } }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://partner-api.yelp.com/token/v1/businesses");
  assertEquals(pathOf(calls[0].url), "/token/v1/businesses");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: test fails with no access token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test surfaces Yelp's own rejection message on a bad token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: yelpError("TOKEN_INVALID", "Invalid API key or authorization header.") },
  ]);
  const result = await oauth2.test({ credential: { accessToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/TOKEN_INVALID/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect publishes only a business count, no credential material", async () => {
  const { ctx } = mockCtx([{ body: { business_ids: ["biz1", "biz2"] } }]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, { businessCount: 2 });
});

Deno.test("oauth2: afterConnect never throws when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, {});
});

Deno.test("oauth2: the token/authorization/revoke hosts are Yelp's documented endpoints", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://biz.yelp.com/oauth2/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.yelp.com/oauth2/token/v3");
  assertEquals(oauth2.oauth2?.refreshUrl, "https://api.yelp.com/oauth2/token/v3");
  assertEquals(oauth2.oauth2?.revokeUrl, "https://api.yelp.com/oauth2/revoke");
  assertEquals(oauth2.oauth2?.scopes, ["leads"]);
});

Deno.test("oauth2: the credential field list carries no user-collected fields (host-driven flow)", () => {
  assertEquals(oauth2.fields ?? [], []);
});
