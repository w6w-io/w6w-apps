import { assertEquals } from "@std/assert";
import broadcastClicks from "../../actions/broadcast-clicks.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("broadcast-clicks: pages with the before cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ email: "a@b.com" }]) }]);
  await broadcastClicks.execute(
    { accountId: "1", listId: "2", broadcastId: "1", before: "cursor-xyz" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts/1/clicks");
  assertEquals(queryOf(calls[0].url).before, "cursor-xyz");
});
