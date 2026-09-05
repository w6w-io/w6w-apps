import { assertEquals } from "@std/assert";
import viewMessage from "../../actions/view-message.ts";
import { APP_ID, mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("view-message: reads one message by id, scoped by app_id query", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { status: 200, body: { id: "msg-1", successful: 10, failed: 0 } },
  ]);
  const out = await viewMessage.execute({ messageId: "msg-1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/notifications/msg-1");
  assertEquals(queryOf(calls[0].url), { app_id: APP_ID });
  assertEquals(out, { id: "msg-1", successful: 10, failed: 0 });
});
