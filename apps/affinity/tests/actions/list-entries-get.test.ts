import { assertEquals } from "@std/assert";
import listEntriesGet from "../../actions/list-entries-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-entries-get: calls GET /lists/{id}/list-entries/{entryId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 16367, list_id: 450 } }]);
  await listEntriesGet.execute({ listId: 450, listEntryId: 16367 }, ctx);
  assertEquals(pathOf(calls[0].url), "/lists/450/list-entries/16367");
});
