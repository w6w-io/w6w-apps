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

/** Zoho Sheet has no Canadian API host at all — see lib/regions.ts. */
Deno.test("regions: Canada is excluded", () => {
  assertEquals(REGIONS.find((r) => r.key === "ca"), undefined);
  assertEquals(REGIONS.length, 7);
});

Deno.test("oauth2: every method requests the offline+consent params and both scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, ["ZohoSheet.dataAPI.READ", "ZohoSheet.dataAPI.UPDATE"]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const us = findRegion("oauth2-us");
  const request = {
    method: "GET",
    url: "https://sheet.zoho.com/api/v2/workbooks",
    headers: {},
  };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://sheet.zoho.com/api/v2/workbooks");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when workbook.list answers success", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([{
    body: { status: "success", method: "workbook.list", workbooks: [] },
  }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/workbooks");
  assertEquals(new URL(calls[0].url).host, "sheet.zoho.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(calls[0].method, "POST");
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([{ body: { status: "success", workbooks: [] } }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "sheet.zoho.eu");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([]);
  const result = await us.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Zoho Sheet gives ONE error_code (2401) for both "no Authorization header"
 * and "dead token" — unlike Zoho Books' split 14/57 — so this only asserts
 * the code is surfaced, not which flavor of failure it was.
 */
Deno.test("oauth2-us: a rejected token is reported with error_code 2401", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error_message: "Valid [OAUTHTOKEN] is required for processing the request.",
      error_code: 2401,
    },
  }]);
  const result = await us.test!({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/2401/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 500 is reported as an HTTP failure", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: afterConnect records this region's fixed apiHost", () => {
  const us = findRegion("oauth2-us");
  const display = us.afterConnect!({ credential: {} }, {} as never);
  assertEquals(display, { apiHost: "sheet.zoho.com", region: "United States" });
});

Deno.test("oauth2-jp: afterConnect records the Japan apiHost", () => {
  const jp = findRegion("oauth2-jp");
  const display = jp.afterConnect!({ credential: {} }, {} as never);
  assertEquals(display, { apiHost: "sheet.zoho.jp", region: "Japan" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
  }
});
