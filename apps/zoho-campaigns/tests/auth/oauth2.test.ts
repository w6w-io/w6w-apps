import { assert, assertEquals } from "@std/assert";
import oauth2Methods from "../../auth/oauth2.ts";
import { REGIONS } from "../../lib/regions.ts";
import { mockCtx } from "../_helpers.ts";

const TOKEN = "1000.unitTestFixtureNotARealToken.abcdef0123456789";

function findRegion(key: string) {
  return oauth2Methods.find((m) => m.key === key)!;
}

Deno.test("oauth2: one AuthDefinition per region, each keyed and hosted correctly", () => {
  assertEquals(oauth2Methods.length, REGIONS.length);
  const keys = oauth2Methods.map((m) => m.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate auth key");
  for (const region of REGIONS) {
    const method = oauth2Methods.find((m) => m.key === `oauth2-${region.key}`);
    assert(method, `no auth method for region ${region.key}`);
    assertEquals(method!.type, "oauth2");
    assertEquals(method!.oauth2?.authorizationUrl, `https://${region.accountsHost}/oauth/v2/auth`);
    assertEquals(method!.oauth2?.tokenUrl, `https://${region.accountsHost}/oauth/v2/token`);
  }
});

/**
 * Canada's accounts host does NOT follow the api host's naming pattern, and
 * neither does its API host — see `lib/regions.ts`.
 */
Deno.test("oauth2-ca: authorizes against accounts.zohocloud.ca, not accounts.zoho.ca", () => {
  const ca = findRegion("oauth2-ca");
  assertEquals(ca.oauth2?.authorizationUrl, "https://accounts.zohocloud.ca/oauth/v2/auth");
});

Deno.test("oauth2: every method requests the offline+consent params and both scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, [
      "ZohoCampaigns.contact.ALL",
      "ZohoCampaigns.campaign.ALL",
    ]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const us = findRegion("oauth2-us");
  const request = {
    method: "GET",
    url: "https://campaigns.zoho.com/api/v1.1/getmailinglists",
    headers: {},
  };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://campaigns.zoho.com/api/v1.1/getmailinglists");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when /getmailinglists answers", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([{ body: { status: "success", code: "0", list_of_details: [] } }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/api/v1.1/getmailinglists");
  assertEquals(new URL(calls[0].url).host, "campaigns.zoho.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([{ body: { status: "success", code: "0", list_of_details: [] } }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "campaigns.zoho.eu");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([]);
  const result = await us.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Unlike `zoho-invoice`'s two distinct codes (14 vs 57), Zoho Campaigns
 * answers the SAME code (1007) for a missing token and a dead one —
 * confirmed live. This test locks in that the message reports what actually
 * happened (a rejection) rather than inventing a distinction the vendor
 * itself does not draw.
 */
Deno.test("oauth2-us: a rejected request is reported with the vendor's own code and message", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: "error", Code: "1007", message: "Unauthorized request." },
  }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/code 1007/.test(result.message ?? ""), result.message);
  assert(/Unauthorized request/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: afterConnect records apiHost/region, with no per-account discovery call", async () => {
  const us = findRegion("oauth2-us");
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, {} as never);
  assertEquals(display, { apiHost: "campaigns.zoho.com", region: "United States" });
});

Deno.test("oauth2-eu: afterConnect records the EU region's own host", async () => {
  const eu = findRegion("oauth2-eu");
  const display = await eu.afterConnect!({ credential: {} }, {} as never);
  assertEquals(display, { apiHost: "campaigns.zoho.eu", region: "Europe" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
  }
});
