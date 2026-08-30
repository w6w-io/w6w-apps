import { assertEquals } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-send: POSTs /v1/messages with content/from/to and optional fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { data: { id: "AC1", status: "queued" } },
  }]);
  const out = await messageSend.execute(
    { content: "hi", from: "PN1", to: ["+15555555555"], userId: "US1", setInboxStatus: "done" },
    ctx,
  ) as { data: { id: string } };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/messages");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, "hi");
  assertEquals(body.from, "PN1");
  assertEquals(body.to, ["+15555555555"]);
  assertEquals(body.userId, "US1");
  assertEquals(body.setInboxStatus, "done");
  assertEquals(out.data.id, "AC1");
});

Deno.test("message-send: omits optional fields when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: { id: "AC1" } } }]);
  await messageSend.execute({ content: "hi", from: "PN1", to: ["+15555555555"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("userId" in body, false);
  assertEquals("setInboxStatus" in body, false);
});

Deno.test("message-send: is a non-idempotent perform action", () => {
  assertEquals(messageSend.type, "perform");
  assertEquals(messageSend.idempotent, false);
});
