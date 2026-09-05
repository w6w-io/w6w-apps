import { assertEquals } from "@std/assert";
import createChannel from "../../actions/create-channel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-channel: PUT /channels with required fields plus list params split", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await createChannel.execute(
    {
      name: "random",
      isPrivate: true,
      channelCategoryID: "cat1",
      invitedUsers: "a@b.com,c@d.com",
      channelType: "CHAT",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/channels");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "random",
    isPrivate: true,
    channelCategoryID: "cat1",
    invitedUsers: ["a@b.com", "c@d.com"],
    channelType: "CHAT",
  });
});

Deno.test("create-channel: is not idempotent", () => {
  assertEquals(createChannel.idempotent, false);
});
