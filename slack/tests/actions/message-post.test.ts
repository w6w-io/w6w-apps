import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-post.ts";

Deno.test("message-post: POSTs /chat.postMessage with channel + text", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, ts: "1.1" } }]);
  await action.execute!({ channel: "C1", text: "hello" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/chat.postMessage");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", text: "hello" });
});

Deno.test("message-post: routes to chat.postEphemeral when ephemeralUser is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channel: "C1", text: "hi", ephemeralUser: "U1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/chat.postEphemeral");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", text: "hi", user: "U1" });
});

Deno.test("message-post: maps threadTs → thread_ts and passes blocks through", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!(
    { channel: "C1", threadTs: "111.222", blocks: [{ type: "section" }] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.thread_ts, "111.222");
  assertEquals(body.blocks, [{ type: "section" }]);
});
