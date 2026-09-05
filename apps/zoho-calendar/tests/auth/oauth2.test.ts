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
 * Canada breaks the naming pattern on BOTH the accounts host AND the API host — see
 * `lib/regions.ts`. `oauth2-ca` must authorize against `accounts.zohocloud.ca`, and its `test`
 * hook (checked further down) must address `calendar.zohocloud.ca`, not the pattern-consistent
 * but nonexistent `accounts.zoho.ca` / `calendar.zoho.ca`.
 */
Deno.test("oauth2-ca: authorizes against accounts.zohocloud.ca, not accounts.zoho.ca", () => {
  const ca = findRegion("oauth2-ca");
  assertEquals(ca.oauth2?.authorizationUrl, "https://accounts.zohocloud.ca/oauth/v2/auth");
});

Deno.test("oauth2: every method requests the offline+consent params and the four scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, [
      "ZohoCalendar.calendar.ALL",
      "ZohoCalendar.event.ALL",
      "ZohoCalendar.search.ALL",
      "ZohoCalendar.freebusy.ALL",
    ]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const us = findRegion("oauth2-us");
  const request = {
    method: "GET",
    url: "https://calendar.zoho.com/api/v1/calendars",
    headers: {},
  };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://calendar.zoho.com/api/v1/calendars");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when /calendars answers", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([{ body: { calendars: [{ uid: "abc" }] } }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/calendars");
  assertEquals(new URL(calls[0].url).host, "calendar.zoho.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([{ body: { calendars: [] } }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "calendar.zoho.eu");
});

Deno.test("oauth2-ca: test addresses calendar.zohocloud.ca, not calendar.zoho.ca", async () => {
  const ca = findRegion("oauth2-ca");
  const { ctx, calls } = mockCtx([{ body: { calendars: [] } }]);
  await ca.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "calendar.zohocloud.ca");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([]);
  const result = await us.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Zoho Calendar's two documented codes are two different problems: no usable token reached the
 * request at all (`INVALID_TICKET`) versus a token that reached it but was rejected
 * (`INVALID_OAUTHTOKEN`). Collapsing them into one bare 4xx message is how "the token expired"
 * gets misreported as "no credential configured", or vice versa.
 */
Deno.test("oauth2-us: an unsigned request is reported as INVALID_TICKET", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error: [{
        description: "Invalid ticket.",
        error_code: "INVALID_TICKET",
        message: "INVALID_TICKET",
      }],
    },
  }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/INVALID_TICKET/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a dead token is reported as INVALID_OAUTHTOKEN", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error: [{
        description: "Invalid OAuth token.",
        error_code: "INVALID_OAUTHTOKEN",
        message: "INVALID_OAUTHTOKEN",
      }],
    },
  }]);
  const result = await us.test!({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/INVALID_OAUTHTOKEN/.test(result.message ?? ""), result.message);
  assert(/reconnect/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: afterConnect records apiHost/region", () => {
  const us = findRegion("oauth2-us");
  const display = us.afterConnect!({ credential: {} }, {} as never);
  assertEquals(display, { apiHost: "calendar.zoho.com", region: "United States" });
});

Deno.test("oauth2-ca: afterConnect records calendar.zohocloud.ca", () => {
  const ca = findRegion("oauth2-ca");
  const display = ca.afterConnect!({ credential: {} }, {} as never);
  assertEquals(display, { apiHost: "calendar.zohocloud.ca", region: "Canada" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
    assertEquals(typeof method.afterConnect, "function");
  }
});
