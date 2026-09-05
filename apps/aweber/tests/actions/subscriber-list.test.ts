import { assertEquals } from "@std/assert";
import subscriberList from "../../actions/subscriber-list.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-list: lists subscribers with sort order and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 1 }]) }]);
  await subscriberList.execute(
    { accountId: "1", listId: "2", sortOrder: "desc", start: 0, size: 100 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers");
  assertEquals(queryOf(calls[0].url), { sort_order: "desc", "ws.start": "0", "ws.size": "100" });
});
