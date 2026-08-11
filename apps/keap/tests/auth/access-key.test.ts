import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import accessKey, { authHeaders } from "../../auth/access-key.ts";
import { faultBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("access-key: the wire format is the same bearer header as OAuth", () => {
  assertEquals(accessKey.type, "bearer");
  assertEquals(authHeaders({ accessKey: "KeapKey123" }), { authorization: "Bearer KeapKey123" });
});

Deno.test("access-key: the credential field is declared secret", () => {
  const fields = accessKey.fields ?? [];
  assertEquals(fields.length, 1);
  assertEquals(fields[0].key, "accessKey");
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
});

Deno.test("access-key: sign uses the same builder test does", () => {
  const request = {
    url: "https://api.infusionsoft.com/crm/rest/v2/tags",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = accessKey.sign!({ request, credential: { accessKey: "k" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers, authHeaders({ accessKey: "k" }));
});

Deno.test("access-key: test refuses an empty key before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await accessKey.test({ credential: { accessKey: "   " } }, ctx);
  assertEquals(out.ok, false);
  assertStringIncludes(out.message!, "accessKey");
  assertEquals(calls.length, 0);
});

/**
 * The probe cannot be a data read. A Personal Access Token "operates under the
 * user context of the user creating it, with that user's visibility and
 * editing permissions", so a restricted user's live key would fail a contact
 * read. The identity endpoint is what no permission can withhold.
 */
Deno.test("access-key: test probes the identity endpoint, not a contact or tag read", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com" } }]);
  assertEquals(await accessKey.test({ credential: { accessKey: "k" } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/oauth/connect/userinfo");
  assert(!calls[0].url.includes("/contacts"));
  assert(!calls[0].url.includes("/tags"));
});

Deno.test("access-key: test reports a missing credential differently from a rejected one", async () => {
  const { ctx: missing } = mockCtx([{
    status: 401,
    body: faultBody("oauth.v2.InvalidAccessToken", "Invalid access token"),
  }]);
  const { ctx: rejected } = mockCtx([{
    status: 401,
    body: faultBody("keymanagement.service.invalid_access_token", "Invalid Access Token"),
  }]);
  const a = await accessKey.test({ credential: { accessKey: "k" } }, missing);
  const b = await accessKey.test({ credential: { accessKey: "k" } }, rejected);
  assertEquals(a.ok, false);
  assertEquals(b.ok, false);
  assert(a.message !== b.message);
});

Deno.test("access-key: afterConnect publishes identity, never the key", async () => {
  const { ctx } = mockCtx([{
    body: { email: "a@b.com", given_name: "A", family_name: "B", tenant_id: "t9" },
  }]);
  const display = await accessKey.afterConnect!({ credential: { accessKey: "super-secret" } }, ctx);
  assertEquals(display.tenantId, "t9");
  assert(!JSON.stringify(display).includes("super-secret"));
});

Deno.test("access-key: the description states the tighter quota, which is the reason to choose it or not", () => {
  assertStringIncludes(accessKey.description!, "240/minute");
  assertStringIncludes(accessKey.description!, "30,000/day");
});

/**
 * Keap's legacy XML-RPC API keys still work when sent as a bearer token, and
 * are being deactivated. Offering them as a supported option would be building
 * in a future outage.
 */
Deno.test("access-key: legacy XML-RPC keys are not offered as an option", () => {
  const surface = JSON.stringify({ fields: accessKey.fields, description: accessKey.description });
  assert(!/legacy/i.test(surface), "a legacy key option leaked into the connect form");
});
