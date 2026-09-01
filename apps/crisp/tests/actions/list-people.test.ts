import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listPeople from "../../actions/list-people.ts";

Deno.test("list-people: builds the paged URL with sort + search params", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: [] } }], "site_1");
  await listPeople.execute({
    pageNumber: 3,
    perPage: 50,
    sortField: "nickname",
    sortOrder: "asc",
    searchText: "acme",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/people/profiles/3");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("sort_field"), "nickname");
  assertEquals(url.searchParams.get("sort_order"), "asc");
  assertEquals(url.searchParams.get("search_text"), "acme");
});

Deno.test("list-people: search action, defaults page to 1", () => {
  assertEquals(listPeople.type, "search");
  assertEquals(listPeople.params?.find((p) => p.key === "pageNumber")?.default, 1);
});
