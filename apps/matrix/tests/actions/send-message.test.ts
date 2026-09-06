import { assertEquals } from "@std/assert";
import sendMessage from "../../actions/send-message.ts";
import { HOMESERVER, mockCtx } from "../_helpers.ts";

const display = { homeserverUrl: HOMESERVER, userId: "@alice:example.org" };

Deno.test("send-message: PUTs /send/m.room.message/{txnId} using the invocation id as txnId", async () => {
  const { ctx, calls } = mockCtx([{ body: { event_id: "$evt1:example.org" } }], {
    display,
    invocationId: "inv-123",
  });
  const result = await sendMessage.execute({ roomId: "!x:example.org", body: "hello" }, ctx);
  assertEquals(
    calls[0].url,
    `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/send/m.room.message/inv-123`,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { msgtype: "m.text", body: "hello" });
  assertEquals(result, { eventId: "$evt1:example.org" });
});

Deno.test("send-message: a formatted body sets format to org.matrix.custom.html", async () => {
  const { ctx, calls } = mockCtx([{ body: { event_id: "$evt2:example.org" } }], {
    display,
    invocationId: "inv-124",
  });
  await sendMessage.execute(
    { roomId: "!x:example.org", body: "hi", formattedBody: "<b>hi</b>" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.format, "org.matrix.custom.html");
  assertEquals(body.formatted_body, "<b>hi</b>");
});

Deno.test("send-message: with no tracked invocation, a fresh random id is used each call", async () => {
  const first = mockCtx([{ body: { event_id: "$e1:example.org" } }], { display });
  await sendMessage.execute({ roomId: "!x:example.org", body: "one" }, first.ctx);
  const second = mockCtx([{ body: { event_id: "$e2:example.org" } }], { display });
  await sendMessage.execute({ roomId: "!x:example.org", body: "two" }, second.ctx);

  const txn1 = new URL(first.calls[0].url).pathname.split("/").pop();
  const txn2 = new URL(second.calls[0].url).pathname.split("/").pop();
  assertEquals(txn1 === txn2, false);
});

Deno.test("send-message: declares idempotent — the homeserver de-dupes retries by txnId", () => {
  assertEquals(sendMessage.idempotent, true);
});
