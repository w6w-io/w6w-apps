import { assertEquals } from "@std/assert";
import action from "../../actions/message-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-get: a single id returns the documented bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: { id: "m1" } } }]);
  const out = await action.execute({ ids: "m1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/messages/m1");
  assertEquals(out, { messages: { id: "m1" } });
});

Deno.test("message-get: comma-separated ids join into one path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [{ id: "m1" }, { id: "m2" }] } }]);
  const out = await action.execute({ ids: "m1, m2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/messages/m1,m2");
  assertEquals(out, { messages: [{ id: "m1" }, { id: "m2" }] });
});
