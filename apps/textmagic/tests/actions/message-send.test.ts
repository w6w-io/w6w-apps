import { assert, assertEquals } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-send: POSTs to /messages with a compacted body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: 10489, href: "/api/v2/sessions/10489", type: "session" } },
  ]);
  const out = await messageSend.execute(
    { text: "Hello, how are you?", phones: "447860021130,447860021131" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v2/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { text: "Hello, how are you?", phones: "447860021130,447860021131" },
  );
  assertEquals(out, { id: 10489, href: "/api/v2/sessions/10489", type: "session" });
});

Deno.test("message-send: never sends the deprecated sendingTime field", () => {
  const keys = messageSend.params?.map((p) => p.key) ?? [];
  assert(!keys.includes("sendingTime"), "sendingTime is deprecated by the vendor");
  assert(keys.includes("sendingDateTime"));
  assert(keys.includes("sendingTimezone"));
});

Deno.test("message-send: is not idempotent", () => {
  assertEquals(messageSend.idempotent, false);
});
