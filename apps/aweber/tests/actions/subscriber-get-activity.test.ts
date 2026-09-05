import { assertEquals } from "@std/assert";
import subscriberGetActivity from "../../actions/subscriber-get-activity.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-get-activity: reads a subscriber's event history with ws.op=getActivity", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ type: "subscribed" }]) }]);
  const out = await subscriberGetActivity.execute(
    { accountId: "1", listId: "2", subscriberId: "789", start: 0, size: 25 },
    ctx,
  ) as { entries: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers/789");
  const q = queryOf(calls[0].url);
  assertEquals(q["ws.op"], "getActivity");
  assertEquals(q["ws.size"], "25");
  assertEquals(out.entries.length, 1);
});
