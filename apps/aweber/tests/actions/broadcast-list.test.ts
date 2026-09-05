import { assertEquals } from "@std/assert";
import broadcastList from "../../actions/broadcast-list.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("broadcast-list: requires and sends a status filter — there is no 'all broadcasts' call", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ broadcast_id: "1" }]) }]);
  await broadcastList.execute({ accountId: "1", listId: "2", status: "sent" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts");
  assertEquals(queryOf(calls[0].url).status, "sent");
});

Deno.test("broadcast-list: status is a required param on the action definition", () => {
  const statusParam = broadcastList.params?.find((p) => p.key === "status");
  assertEquals(statusParam?.required, true);
});
