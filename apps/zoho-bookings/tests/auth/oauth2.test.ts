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

Deno.test("oauth2: every method requests the offline+consent params and the single documented scope", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, ["zohobookings.data.CREATE"]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const us = findRegion("oauth2-us");
  const request = {
    method: "GET",
    url: "https://www.zohoapis.com/bookings/v1/json/workspaces",
    headers: {},
  };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://www.zohoapis.com/bookings/v1/json/workspaces");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when /workspaces answers a success envelope", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([
    { body: { response: { status: "success", returnvalue: { data: [] } } } },
  ]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/bookings/v1/json/workspaces");
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([
    { body: { response: { status: "success", returnvalue: { data: [] } } } },
  ]);
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
 * Zoho Bookings gives NO distinguishing JSON body on an auth failure — both
 * cases answer a generic "Zoho Creator" HTML gateway page (see
 * `lib/client.ts` module docs). HTTP status is therefore the only usable
 * signal, the one deliberate exception in this app to classifying from the
 * response body.
 */
Deno.test("oauth2-us: no Authorization header reaching the request is reported as HTTP 400", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 400,
    headers: { "content-type": "text/html;charset=UTF-8" },
    body: "<html>Something went wrong</html>",
  }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 400/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a dead token is reported as HTTP 401, distinct from the 400 case", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/html;charset=UTF-8" },
    body: "<html>Something went wrong</html>",
  }]);
  const result = await us.test!({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 401/.test(result.message ?? ""), result.message);
  assert(/reconnect/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 500 is reported as its own HTTP status", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 500,
    headers: { "content-type": "text/html" },
    body: "upstream exploded",
  }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 2xx without a success envelope is reported, not silently accepted", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ body: { response: { status: "failure" } } }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/without a success status/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: afterConnect records apiHost/region even when it cannot reach the API", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([]);
  const display = await us.afterConnect!({ credential: {} }, ctx);
  assertEquals(display, { apiHost: "www.zohoapis.com", region: "United States" });
});

Deno.test("oauth2-us: afterConnect records the first workspace's id and name", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([
    {
      body: {
        response: {
          status: "success",
          returnvalue: {
            data: [
              { id: "3848021000000027004", name: "Chennai" },
              { id: "3848021000000027005", name: "Tenkasi" },
            ],
          },
        },
      },
    },
  ]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/bookings/v1/json/workspaces");
  assertEquals(display, {
    apiHost: "www.zohoapis.com",
    region: "United States",
    workspaceId: "3848021000000027004",
    primaryWorkspaceName: "Chennai",
  });
});

Deno.test("oauth2-us: afterConnect stays on the base display when the whoami fails", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/html" },
    body: "<html>oops</html>",
  }]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(display, { apiHost: "www.zohoapis.com", region: "United States" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
  }
});
