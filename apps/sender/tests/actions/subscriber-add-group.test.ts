import { assertEquals } from "@std/assert";
import subscriberAddGroup from "../../actions/subscriber-add-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-add-group: POSTs to /v2/subscribers/groups/{groupId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Success" } }]);
  await subscriberAddGroup.execute(
    { groupId: "g1", subscribers: ["a@b.com"], triggerAutomation: false },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), {
    subscribers: ["a@b.com"],
    trigger_automation: false,
  });
});
