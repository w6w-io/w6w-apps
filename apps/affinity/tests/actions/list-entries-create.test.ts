import { assertEquals } from "@std/assert";
import listEntriesCreate from "../../actions/list-entries-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-entries-create: POSTs entity_id to /lists/{id}/list-entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 53510, entity_id: 38706 } }]);
  await listEntriesCreate.execute({ listId: 450, entityId: 38706 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lists/450/list-entries");
  assertEquals(JSON.parse(calls[0].body!), { entity_id: 38706 });
});
