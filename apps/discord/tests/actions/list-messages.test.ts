import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-messages.ts";

Deno.test("list-messages: applies default limit=50", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ channelId: "c1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v10/channels/c1/messages");
  assertEquals(url.searchParams.get("limit"), "50");
});

Deno.test("list-messages: forwards before/after/around cursors", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!(
    { channelId: "c1", limit: 25, before: "b", after: "a", around: "ar" },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "25");
  assertEquals(params.get("before"), "b");
  assertEquals(params.get("after"), "a");
  assertEquals(params.get("around"), "ar");
});

Deno.test("list-messages: omits undefined optional cursors", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ channelId: "c1" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("before"));
  assert(!params.has("after"));
  assert(!params.has("around"));
});

Deno.test("list-messages: wraps the response under `messages`", async () => {
  const body = [{ id: "m1" }, { id: "m2" }];
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ channelId: "c1" }, ctx);
  assertEquals(result, { messages: body });
});
