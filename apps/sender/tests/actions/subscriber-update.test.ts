import { assertEquals } from "@std/assert";
import subscriberUpdate from "../../actions/subscriber-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-update: PATCHes /v2/subscribers/{identifier}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Success", data: [] } }]);
  await subscriberUpdate.execute(
    { identifier: "o1", subscriberStatus: "UNSUBSCRIBED", groups: ["g1", "g2"] },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers/o1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subscriber_status, "UNSUBSCRIBED");
  assertEquals(body.groups, ["g1", "g2"]);
});
