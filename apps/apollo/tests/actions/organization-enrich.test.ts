import { assertEquals } from "@std/assert";
import organizationEnrich from "../../actions/organization-enrich.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("organization-enrich: GETs /organizations/enrich with filters as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { organization: { id: "o1", name: "Apollo" } } }]);
  const out = await organizationEnrich.execute({ domain: "apollo.io" }, ctx) as {
    organization: { name: string };
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/enrich");
  assertEquals(queryOf(calls[0].url).domain, "apollo.io");
  assertEquals(out.organization.name, "Apollo");
});

Deno.test("organization-enrich: no match returns null", async () => {
  const { ctx } = mockCtx([{ body: { organization: null } }]);
  const out = await organizationEnrich.execute({ name: "Nonexistent Co" }, ctx) as {
    organization: unknown;
  };
  assertEquals(out.organization, null);
});
