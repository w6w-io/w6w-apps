import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-file-send.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("message-file-send: POSTs /conversations/messages/fileViaUrl with only the set fields", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { message: { id: "1", type: "file", status: "sent" } } }],
    conn,
  );
  const out = await action.execute(
    { target: "123456789:1415552671", fileUrl: "https://example.com/example.jpg" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/conversations/messages/fileViaUrl",
  );
  assertEquals(
    JSON.parse(calls[0].body!),
    { target: "123456789:1415552671", file_url: "https://example.com/example.jpg" },
  );
  assertEquals(out, { message: { id: "1", type: "file", status: "sent" } });
});

Deno.test("message-file-send: includes caption and isBot when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: {} } }], conn);
  await action.execute(
    {
      target: "123456789:1415552671",
      fileUrl: "https://example.com/example.jpg",
      caption: "Example File",
      isBot: false,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    target: "123456789:1415552671",
    file_url: "https://example.com/example.jpg",
    caption: "Example File",
    is_bot: false,
  });
});

Deno.test("message-file-send: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
