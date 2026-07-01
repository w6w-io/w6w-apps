import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the HubSpot authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://app.hubspot.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.hubapi.com/oauth/v1/token");
  assert(auth.oauth2?.scopes?.includes("crm.objects.contacts.read"));
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2: test with missing accessToken reports the failure", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2: test issues GET /crm/v3/objects/contacts?limit=1 with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await auth.test({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v3/objects/contacts");
  assertEquals(calls[0].headers["authorization"], "Bearer at-xyz");
});
