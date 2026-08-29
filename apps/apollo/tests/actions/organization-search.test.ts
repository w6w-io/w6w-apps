import { assertEquals } from "@std/assert";
import organizationSearch from "../../actions/organization-search.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("organization-search: POSTs with filters as query params, including funding ranges", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "o1" }],
        pagination: { page: 1, per_page: 25, total_entries: 1 },
      },
    },
  ]);
  const out = await organizationSearch.execute(
    { q_organization_domains_list: "apollo.io,microsoft.com", total_funding_min: 1000000 },
    ctx,
  ) as { organizations: unknown[]; pagination: { total_entries: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/mixed_companies/search");
  assertEquals(queryAllOf(calls[0].url, "q_organization_domains_list[]"), [
    "apollo.io",
    "microsoft.com",
  ]);
  assertEquals(queryOf(calls[0].url)["total_funding_range[min]"], "1000000");
  assertEquals(out.pagination.total_entries, 1);
});

Deno.test("organization-search: extraFilters merges into the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizations: [] } }]);
  await organizationSearch.execute({ extraFilters: { q_organization_name: "Apollo" } }, ctx);
  assertEquals(queryOf(calls[0].url).q_organization_name, "Apollo");
});

Deno.test("organization-search: missing pagination in the response defaults to an empty object", async () => {
  const { ctx } = mockCtx([{ body: { organizations: [] } }]);
  const out = await organizationSearch.execute({}, ctx) as { pagination: unknown };
  assertEquals(out.pagination, {});
});
