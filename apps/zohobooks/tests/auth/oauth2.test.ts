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

/** Canada's accounts host does NOT follow the api host's naming pattern — see lib/regions.ts. */
Deno.test("oauth2-ca: authorizes against accounts.zohocloud.ca, not accounts.zoho.ca", () => {
  const ca = findRegion("oauth2-ca");
  assertEquals(ca.oauth2?.authorizationUrl, "https://accounts.zohocloud.ca/oauth/v2/auth");
});

Deno.test("oauth2: every method requests the offline+consent params and the four scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, [
      "ZohoBooks.contacts.ALL",
      "ZohoBooks.settings.ALL",
      "ZohoBooks.invoices.ALL",
      "ZohoBooks.estimates.ALL",
    ]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const us = findRegion("oauth2-us");
  const request = {
    method: "GET",
    url: "https://www.zohoapis.com/books/v3/organizations",
    headers: {},
  };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://www.zohoapis.com/books/v3/organizations");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when /organizations answers", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([
    { body: { code: 0, message: "success", organizations: [{ organization_id: "1" }] } },
  ]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/organizations");
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([{ body: { code: 0, message: "success", organizations: [] } }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.eu");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([]);
  const result = await us.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Zoho Books' two documented codes are two different problems: no usable
 * token reached the request at all (`14`) versus a token that reached it but
 * was rejected (`57`). Collapsing them into one bare 401 message is how "the
 * token expired" gets misreported as "no credential configured", or vice
 * versa.
 */
Deno.test("oauth2-us: a missing/unsigned request is reported as code 14", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      code: 14,
      message: "The request could not be authenticated as the authentication value you entered " +
        "is invalid. Enter a valid authentication value and try again.",
    },
  }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/code 14/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a dead token is reported as code 57", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 57, message: "You are not authorized to perform this operation" },
  }]);
  const result = await us.test!({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/code 57/.test(result.message ?? ""), result.message);
  assert(/reconnect/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: afterConnect records apiHost/region even when it cannot reach the API", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([]);
  const display = await us.afterConnect!({ credential: {} }, ctx);
  assertEquals(display, { apiHost: "www.zohoapis.com", region: "United States" });
});

Deno.test("oauth2-us: afterConnect records the default organization's id and name", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([
    {
      body: {
        code: 0,
        message: "success",
        organizations: [
          { organization_id: "10234695", name: "Zillum", is_default_org: true },
          { organization_id: "10234696", name: "Other Org", is_default_org: false },
        ],
      },
    },
  ]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/books/v3/organizations");
  assertEquals(display, {
    apiHost: "www.zohoapis.com",
    region: "United States",
    organizationId: "10234695",
    primaryOrganizationName: "Zillum",
  });
});

Deno.test("oauth2-us: afterConnect stays on the base display when the whoami fails", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 401, body: { code: 57, message: "not authorized" } }]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(display, { apiHost: "www.zohoapis.com", region: "United States" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
  }
});
