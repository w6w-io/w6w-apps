import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, pathOf, problemBody } from "../_helpers.ts";

const TOKEN = "cog_unitTestFixtureNotARealToken0000000000";
const ORG = "org-abc123def456";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.devin.ai/v3/organizations/org-x/sessions",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: TOKEN, orgId: ORG } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.devin.ai/v3/organizations/org-x/sessions");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-key: test passes when /v3/self answers and org_id matches", async () => {
  const { ctx, calls } = mockCtx([{ body: { principal_type: "service_user", org_id: ORG } }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN, orgId: ORG } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/self");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-key: test passes when self reports no org_id (PAT / enterprise service user)", async () => {
  const { ctx } = mockCtx([{ body: { principal_type: "pat_user", org_id: null } }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN, orgId: ORG } }, ctx);
  assertEquals(result, { ok: true });
});

Deno.test("api-key: test fails when self's org_id does not match the configured org", async () => {
  const { ctx } = mockCtx([{ body: { principal_type: "service_user", org_id: "org-different" } }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN, orgId: ORG } }, ctx);

  assertEquals(result.ok, false);
  assert(/scoped to organization org-different/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: test fails with no apiKey, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { orgId: ORG } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test fails with no orgId, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a rejected token is reported as such, not as a generic failure", async () => {
  const { ctx } = mockCtx([{ status: 403, body: problemBody(403, "Forbidden", "Unauthorized") }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage", orgId: ORG } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN, orgId: ORG } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect echoes orgId and, when available, the principal's name", async () => {
  const { ctx } = mockCtx([{
    body: { principal_type: "service_user", service_user_name: "ci-bot" },
  }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: TOKEN, orgId: ORG } }, ctx);
  assertEquals(display, { orgId: ORG, principalName: "ci-bot" });
});

Deno.test("api-key: afterConnect still echoes orgId when the self probe fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: problemBody(403, "Forbidden") }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: TOKEN, orgId: ORG } }, ctx);
  assertEquals(display, { orgId: ORG });
});
