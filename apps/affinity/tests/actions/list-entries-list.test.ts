import { assertEquals } from "@std/assert";
import listEntriesList from "../../actions/list-entries-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-entries-list: calls GET /lists/{id}/list-entries with a default page_size", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_entries: [], next_page_token: null } }]);
  await listEntriesList.execute({ listId: 450 }, ctx);
  assertEquals(pathOf(calls[0].url), "/lists/450/list-entries");
  assertEquals(queryOf(calls[0].url).page_size, "100");
});

Deno.test("list-entries-list: forwards an explicit page_token", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_entries: [], next_page_token: null } }]);
  await listEntriesList.execute({ listId: 450, pageSize: 5, pageToken: "tok123" }, ctx);
  assertEquals(queryOf(calls[0].url).page_size, "5");
  assertEquals(queryOf(calls[0].url).page_token, "tok123");
});
