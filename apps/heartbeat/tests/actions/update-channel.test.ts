import { assertEquals } from "@std/assert";
import updateChannel from "../../actions/update-channel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-channel: plain field edit sends no restrictedTo", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateChannel.execute({ channelID: "ch1", name: "new-name" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v0/channels/ch1");
  assertEquals(JSON.parse(calls[0].body!), { name: "new-name" });
});

Deno.test("update-channel: makePublic sends restrictedTo: null", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateChannel.execute({ channelID: "ch1", makePublic: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { restrictedTo: null });
});

Deno.test("update-channel: invited lists build restrictedTo, and makePublic wins if both are set", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateChannel.execute({ channelID: "ch1", invitedUsers: "a@b.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    restrictedTo: { invitedUsers: ["a@b.com"] },
  });
});

Deno.test("update-channel: is idempotent", () => {
  assertEquals(updateChannel.idempotent, true);
});
