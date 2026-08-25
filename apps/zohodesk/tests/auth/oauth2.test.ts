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

Deno.test("oauth2: ten regions, including Singapore and UAE which zohobooks/zoho do not list", () => {
  assertEquals(REGIONS.length, 10);
  assert(REGIONS.some((r) => r.key === "sg"), "missing Singapore");
  assert(REGIONS.some((r) => r.key === "ae"), "missing UAE");
});

Deno.test("oauth2: every method requests the offline+consent params and the full scope set", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, [
      "Desk.tickets.ALL",
      "Desk.contacts.READ",
      "Desk.contacts.CREATE",
      "Desk.contacts.UPDATE",
      "Desk.contacts.DELETE",
      "Desk.accounts.READ",
      "Desk.accounts.CREATE",
      "Desk.accounts.UPDATE",
      "Desk.accounts.DELETE",
      "Desk.agents.READ",
      "Desk.departments.READ",
      "Desk.basic.READ",
      "Desk.organization.READ",
      "Desk.search.READ",
    ]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const us = findRegion("oauth2-us");
  const request = {
    method: "GET",
    url: "https://desk.zoho.com/api/v1/organizations",
    headers: {},
  };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://desk.zoho.com/api/v1/organizations");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when /organizations answers, with no orgId header sent", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "1" }] } }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/organizations");
  assertEquals(new URL(calls[0].url).host, "desk.zoho.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(calls[0].headers.orgid, undefined);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "desk.zoho.eu");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([]);
  const result = await us.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Zoho Desk's two documented codes are two different problems: no usable
 * token reached the request at all (`UNAUTHORIZED`) versus a token that
 * reached it but was rejected (`INVALID_OAUTH`). Collapsing them into one
 * bare 401 message is how "the token expired" gets misreported as "no
 * credential configured", or vice versa.
 */
Deno.test("oauth2-us: a missing/unsigned request is reported as UNAUTHORIZED", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errorCode: "UNAUTHORIZED",
      message: "You are not authenticated to perform this operation.",
    },
  }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/UNAUTHORIZED/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a dead token is reported as INVALID_OAUTH", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorCode: "INVALID_OAUTH", message: "The OAuth Token you provided is invalid." },
  }]);
  const result = await us.test!({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/INVALID_OAUTH/.test(result.message ?? ""), result.message);
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
  assertEquals(display, { apiHost: "desk.zoho.com", region: "United States" });
});

Deno.test("oauth2-us: afterConnect records the default organization's orgId and companyName", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([
    {
      body: {
        data: [
          { id: "2389290", companyName: "Zylker INC.", isDefault: "true" },
          { id: "2389291", companyName: "Other Org", isDefault: "false" },
        ],
      },
    },
  ]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v1/organizations");
  assertEquals(display, {
    apiHost: "desk.zoho.com",
    region: "United States",
    orgId: "2389290",
    primaryOrgName: "Zylker INC.",
  });
});

Deno.test("oauth2-us: afterConnect stays on the base display when the whoami fails", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 401, body: { errorCode: "INVALID_OAUTH" } }]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(display, { apiHost: "desk.zoho.com", region: "United States" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
  }
});
