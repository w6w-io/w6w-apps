import { assertEquals } from "@std/assert";
import peopleSearch from "../../actions/people-search.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("people-search: array filters use bracket notation, and it is a POST", async () => {
  const { ctx, calls } = mockCtx([{ body: { people: [{ id: "p1" }], total_entries: 1 } }]);
  const out = await peopleSearch.execute(
    { person_titles: "CEO, CTO", q_keywords: "sales" },
    ctx,
  ) as { people: unknown[]; total_entries: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/mixed_people/api_search");
  assertEquals(queryAllOf(calls[0].url, "person_titles[]"), ["CEO", "CTO"]);
  assertEquals(queryOf(calls[0].url).q_keywords, "sales");
  assertEquals(calls[0].body, null);
  assertEquals(out.total_entries, 1);
});

Deno.test("people-search: a revenue range is sent as revenue_range[min]/[max]", async () => {
  const { ctx, calls } = mockCtx([{ body: { people: [], total_entries: 0 } }]);
  await peopleSearch.execute({ revenue_min: 1000000, revenue_max: 5000000 }, ctx);
  assertEquals(queryOf(calls[0].url)["revenue_range[min]"], "1000000");
  assertEquals(queryOf(calls[0].url)["revenue_range[max]"], "5000000");
});

Deno.test("people-search: extraFilters merges arbitrary keys into the same query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { people: [], total_entries: 0 } }]);
  await peopleSearch.execute({ extraFilters: { q_organization_job_titles: ["engineer"] } }, ctx);
  assertEquals(queryAllOf(calls[0].url, "q_organization_job_titles[]"), ["engineer"]);
});

Deno.test("people-search: accepts a real array (not just a comma string) for a multi-value param", async () => {
  const { ctx, calls } = mockCtx([{ body: { people: [], total_entries: 0 } }]);
  await peopleSearch.execute({ person_titles: ["Head of Sales"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "person_titles[]"), ["Head of Sales"]);
});

Deno.test("people-search: an empty response defaults to an empty array and zero total", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await peopleSearch.execute({}, ctx) as { people: unknown[]; total_entries: number };
  assertEquals(out.people, []);
  assertEquals(out.total_entries, 0);
});
