import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listConversations from "../../actions/list-conversations.ts";

Deno.test("list-conversations: builds the paged URL and passes through filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: [] } }], "site_1");
  await listConversations.execute({
    pageNumber: 2,
    perPage: 30,
    searchQuery: "billing",
    searchType: "text",
    filterUnread: true,
    filterResolved: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversations/2");
  assertEquals(url.searchParams.get("per_page"), "30");
  assertEquals(url.searchParams.get("search_query"), "billing");
  assertEquals(url.searchParams.get("search_type"), "text");
  assertEquals(url.searchParams.get("filter_unread"), "1");
  assertEquals(url.searchParams.get("filter_resolved"), "0");
});

Deno.test("list-conversations: omits unset optional filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: [] } }], "site_1");
  await listConversations.execute({ pageNumber: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("filter_unread"), false);
  assertEquals(url.searchParams.has("search_query"), false);
});

Deno.test("list-conversations: is a search action, page number required and defaulted to 1", () => {
  assertEquals(listConversations.type, "search");
  const page = listConversations.params?.find((p) => p.key === "pageNumber");
  assertEquals(page?.required, true);
  assertEquals(page?.default, 1);
});
