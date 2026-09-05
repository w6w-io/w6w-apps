import { assertEquals } from "@std/assert";
import subscriberRemoveGroup from "../../actions/subscriber-remove-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-remove-group: DELETEs /v2/subscribers/groups/{groupId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Removed tag" } }]);
  await subscriberRemoveGroup.execute({ groupId: "g1", subscribers: ["a@b.com"] }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), { subscribers: ["a@b.com"] });
});
