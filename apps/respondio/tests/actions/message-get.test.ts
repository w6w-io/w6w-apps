import { assertEquals, assertRejects } from "@std/assert";
import messageGet from "../../actions/message-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-get: GETs /contact/{identifier}/message/{messageId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 987654, contactId: 1 } }]);
  const out = await messageGet.execute(
    { identifier: "id:1", messageId: 987654 },
    ctx,
  ) as { messageId: number };

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/message/987654");
  assertEquals(out.messageId, 987654);
});

Deno.test("message-get: a missing messageId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await messageGet.execute(
        { identifier: "id:1", messageId: undefined as unknown as number },
        ctx,
      ),
    Error,
    "Message ID is required",
  );
  assertEquals(calls.length, 0);
});
