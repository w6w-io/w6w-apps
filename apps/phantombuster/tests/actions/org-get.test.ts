import { assertEquals, assertFalse } from "@std/assert";
import orgGet from "../../actions/org-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const ORG = {
  id: "org1",
  name: "acme",
  identityTokens: [{ token: "magic-link-token", expire_at: 123, magic_link: "https://x/y" }],
  qualificationFlow: {
    email: "a@b.com",
    sessionCookie: "raw-linkedin-session-cookie",
  },
};

Deno.test("org-get: calls GET /orgs/fetch with no with* query flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ORG }]);

  await orgGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/orgs/fetch");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("org-get: strips identityTokens entirely", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ORG }]);
  const out = await orgGet.execute({}, ctx) as Record<string, unknown>;
  assertFalse("identityTokens" in (out.org as Record<string, unknown>));
});

Deno.test("org-get: strips qualificationFlow.sessionCookie but keeps its other fields", async () => {
  const { ctx } = mockCtx([{ status: 200, body: ORG }]);
  const out = await orgGet.execute({}, ctx) as Record<string, unknown>;
  const qf = (out.org as Record<string, unknown>).qualificationFlow as Record<string, unknown>;
  assertFalse("sessionCookie" in qf);
  assertEquals(qf.email, "a@b.com");
});

Deno.test("org-get: never sets withProxies or withCrmIntegrations", () => {
  const keys = orgGet.params?.map((p) => p.key) ?? [];
  assertEquals(keys, []);
});

Deno.test("org-get: a response with no qualificationFlow is returned unchanged", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "org1", name: "acme" } }]);
  const out = await orgGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.org, { id: "org1", name: "acme" });
});
