import { assertEquals } from "@std/assert";
import contactSearch from "../../actions/contact-search.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-search: POSTs a JSON body to /contacts/search", async () => {
  const { ctx, calls } = mockCtx([
    { body: { contacts: [{ id: "c1" }], pagination: { total_entries: 1 } } },
  ]);
  const out = await contactSearch.execute({ q_keywords: "sales", per_page: 10 }, ctx) as {
    contacts: unknown[];
    pagination: { total_entries: number };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/search");
  assertEquals(JSON.parse(calls[0].body!), { q_keywords: "sales", per_page: 10 });
  assertEquals(out.pagination.total_entries, 1);
});
