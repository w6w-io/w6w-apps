import { assertEquals } from "@std/assert";
import deleteChannel from "../../actions/delete-channel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-channel: DELETE /channels/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await deleteChannel.execute({ channelID: "ch1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v0/channels/ch1");
});

Deno.test("delete-channel: is idempotent", () => {
  assertEquals(deleteChannel.idempotent, true);
});
