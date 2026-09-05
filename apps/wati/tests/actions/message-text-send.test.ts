import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-text-send.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("message-text-send: POSTs /conversations/messages/text", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { message: { id: "1", text: "Hello world", status: "sent" } } }],
    conn,
  );
  const out = await action.execute(
    { target: "123456789:1415552671", text: "Hello world", isBot: true },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/conversations/messages/text",
  );
  assertEquals(
    JSON.parse(calls[0].body!),
    { target: "123456789:1415552671", text: "Hello world", is_bot: true },
  );
  assertEquals(out, { message: { id: "1", text: "Hello world", status: "sent" } });
});

Deno.test("message-text-send: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
