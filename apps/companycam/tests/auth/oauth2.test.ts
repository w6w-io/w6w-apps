import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: declares the vendor's endpoints, scopes and rotation URL", () => {
  assertEquals(oauth2.key, "oauth2");
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://app.companycam.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://app.companycam.com/oauth/token");
  assertEquals(oauth2.oauth2?.refreshUrl, "https://app.companycam.com/oauth/token");
  assertEquals(oauth2.oauth2?.scopes, ["read", "write", "destroy"]);
  assertEquals(oauth2.oauth2?.pkce, false);
  // No user-entered fields: the host runs the flow and stores the token.
  assertEquals(oauth2.fields, undefined);
});

Deno.test("oauth2: the OAuth hosts are not the API host", () => {
  const apiHost = "api.companycam.com";
  for (const url of [oauth2.oauth2!.authorizationUrl, oauth2.oauth2!.tokenUrl]) {
    assert(!url.includes(apiHost), `${url} points at the API host`);
    assertEquals(new URL(url).hostname, "app.companycam.com");
  }
});

Deno.test("oauth2: sign stamps the same bearer header as an access token", () => {
  const request = {
    url: "https://api.companycam.com/v2/photos",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  oauth2.sign!({ request, credential: { accessToken: "oauth_tok" } }, {
    fetch: () => {
      throw new Error("sign must not reach the network");
    },
    log: () => {},
  } as never);
  assertEquals(request.headers.authorization, "Bearer oauth_tok");
});

Deno.test("oauth2: test probes /users/current with the token", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", email_address: "a@b.com" } }]);
  assertEquals(await oauth2.test({ credential: { accessToken: "tok" } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/users/current");
  assertEquals(calls[0].headers.authorization, "Bearer tok");
});

Deno.test("oauth2: a missing token fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: a rejected token reports the same explanation as the access-token method", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  const result = await oauth2.test({ credential: { accessToken: "expired" } }, ctx);
  assertEquals(result.ok, false);
  assert(/401/.test(result.message!), result.message);
  assert(!result.message!.includes("expired"), "the probe echoed the credential");
});

Deno.test("oauth2: afterConnect relies on the host to sign and publishes only the label", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "9", company_id: "8", email_address: "a@b.com", first_name: "A", last_name: "B" },
  }]);
  const label = await oauth2.afterConnect!({ credential: {} }, ctx) as {
    user: Record<string, unknown>;
  };
  assertEquals(calls[0].headers.authorization, undefined, "afterConnect must not sign by hand");
  assertEquals(label.user, { id: "9", email: "a@b.com", name: "A B", companyId: "8" });
});
