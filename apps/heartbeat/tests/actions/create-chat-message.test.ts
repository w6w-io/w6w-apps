import { assertEquals } from "@std/assert";
import createChatMessage from "../../actions/create-chat-message.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-chat-message: PUT /chatChannel/{id}/message, 204 No Content handled cleanly", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await createChatMessage.execute(
    { channelID: "ch1", text: "<p>Hi</p>", from: "u1" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/chatChannel/ch1/message");
  assertEquals(JSON.parse(calls[0].body!), { text: "<p>Hi</p>", from: "u1" });
  assertEquals(out, {});
});

Deno.test("create-chat-message: `from` is required, unlike direct/thread authorship", () => {
  const from = createChatMessage.params?.find((p) => p.key === "from");
  assertEquals(from?.required, true);
});

Deno.test("create-chat-message: is not idempotent", () => {
  assertEquals(createChatMessage.idempotent, false);
});
