import { assertEquals } from "@std/assert";
import roomMessageList from "../../actions/room-message-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("room-message-list: force off omits the query param (matches the vendor default)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await roomMessageList.execute({ roomId: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/messages");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("room-message-list: force on sends force=1", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await roomMessageList.execute({ roomId: "5", force: true }, ctx);
  assertEquals(queryOf(calls[0].url), { force: "1" });
});

Deno.test("room-message-list: a 204 (nothing new since last read) normalises to []", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await roomMessageList.execute({ roomId: "5" }, ctx);
  assertEquals(out, []);
});

Deno.test("room-message-list: returns the message array unchanged", async () => {
  const messages = [{
    message_id: "5",
    body: "Hello Chatwork!",
    send_time: 1384242850,
    update_time: 0,
  }];
  const { ctx } = mockCtx([{ body: messages }]);
  const out = await roomMessageList.execute({ roomId: "5" }, ctx);
  assertEquals(out, messages);
});
