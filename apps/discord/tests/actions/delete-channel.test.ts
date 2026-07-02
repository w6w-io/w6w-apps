import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-channel.ts";

Deno.test("delete-channel: DELETEs /channels/{id}", async () => {
  const body = { id: "c1", name: "gone" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ channelId: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/channels/c1");
  assertEquals(result, body);
});
