import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: sign injects a Bearer authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.atlassian.com/ex/jira/abc/rest/servicedeskapi/servicedesk",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test fails without a token that grants access to a site", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(calls[0].url, "https://api.atlassian.com/oauth/token/accessible-resources");
  assertEquals(result.ok, false);
});

Deno.test("oauth2: afterConnect resolves the cloud id and confirms JSM is licensed there", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: "cloud-1", name: "Acme", url: "https://acme.atlassian.net" }] },
    { body: { isLicensedForUse: true, version: "5.0.0" } },
  ]);
  const display = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(calls[1].url, "https://api.atlassian.com/ex/jira/cloud-1/rest/servicedeskapi/info");
  assertEquals(display, {
    cloudId: "cloud-1",
    siteName: "Acme",
    siteUrl: "https://acme.atlassian.net",
    jsmLicensed: true,
  });
});

Deno.test("oauth2: afterConnect surfaces jsmLicensed:false when the site has no JSM", async () => {
  const { ctx } = mockCtx([
    { body: [{ id: "cloud-1", name: "Acme", url: "https://acme.atlassian.net" }] },
    { body: { isLicensedForUse: false } },
  ]);
  const display = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(display.jsmLicensed, false);
});
