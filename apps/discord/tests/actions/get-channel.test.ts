import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-channel.ts";

Deno.test("get-channel: GETs /channels/{id}", async () => {
  const body = { id: "chan-1", name: "general" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ channelId: "chan-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/channels/chan-1");
  assertEquals(result, body);
});
