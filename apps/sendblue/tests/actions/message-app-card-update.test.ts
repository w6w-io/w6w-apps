import { assertEquals } from "@std/assert";
import messageAppCardUpdate from "../../actions/message-app-card-update.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-app-card-update: POSTs to /api/messages/{handle}/update-app-card", async () => {
  const { ctx, calls } = mockCtx([{ body: { message_handle: "m2", status: "QUEUED" } }]);
  await messageAppCardUpdate.execute({
    messageHandle: "m1",
    layout: { caption: "Check this out" },
    interactive: true,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/messages/m1/update-app-card");
  assertEquals(jsonBodyOf(calls[0]), { layout: { caption: "Check this out" }, interactive: true });
});
