import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import accessToken from "../../auth/access-token.ts";
import { envelope, errorEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("access-token: sign stamps the access-token header, lowercase, and returns the request", async () => {
  const request: SignableRequest = {
    url: "https://business-api.tiktok.com/open_api/v1.3/lead/get/",
    method: "GET",
    headers: {},
  };
  const signed = await accessToken.sign!(
    { request, credential: { appId: "a", appSecret: "s", accessToken: "tok-123" } },
    { fetch, log: () => {} },
  );
  assertEquals(signed.headers["access-token"], "tok-123");
});

Deno.test("access-token: test() calls oauth2/advertiser/get with app_id + secret query params and the header", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ list: [{ advertiser_id: "1" }] }) }]);

  const result = await accessToken.test(
    { credential: { appId: "app-1", appSecret: "secret-1", accessToken: "tok-1" } },
    ctx,
  );

  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url).endsWith("/oauth2/advertiser/get/"), true);
  const query = queryOf(calls[0].url);
  assertEquals(query.app_id, "app-1");
  assertEquals(query.secret, "secret-1");
  assertEquals(calls[0].headers["access-token"], "tok-1");
});

Deno.test("access-token: test() reports a clear message for a revoked/incorrect token (40105)", async () => {
  const { ctx } = mockCtx([
    { body: errorEnvelope(40105, "Access token is incorrect or has been revoked.") },
  ]);
  const result = await accessToken.test(
    { credential: { appId: "app-1", appSecret: "secret-1", accessToken: "bad" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message?.includes("40105"));
});

Deno.test("access-token: test() reports a clear message for a bad app id/secret pair", async () => {
  const { ctx } = mockCtx([
    { body: errorEnvelope(40002, "Missing required field(s): app_id.") },
  ]);
  const result = await accessToken.test(
    { credential: { appId: "", appSecret: "secret-1", accessToken: "tok-1" } },
    ctx,
  );
  assertEquals(result.ok, false);
});

Deno.test("access-token: test() fails fast when a field is missing, without calling fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await accessToken.test(
    { credential: { appId: "", appSecret: "", accessToken: "" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: every credential field is declared secret except the app id", () => {
  const fields = accessToken.fields ?? [];
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  assertEquals(byKey.appId.type, "string");
  assertEquals(byKey.appSecret.type, "secret");
  assertEquals(byKey.accessToken.type, "secret");
});

Deno.test("access-token: declares apiKey type with the Access-Token header name", () => {
  assertEquals(accessToken.type, "apiKey");
  assertEquals(accessToken.apiKey?.name, "Access-Token");
  assertEquals(accessToken.apiKey?.in, "header");
});
