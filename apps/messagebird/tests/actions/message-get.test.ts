import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/message-get.ts";

Deno.test("message-get: GETs /messages/{id}", async () => {
  const body = { id: "e8077d803532c0b5937c639b60216938", direction: "mt", body: "hi" };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!({ messageId: "e8077d803532c0b5937c639b60216938" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/messages/e8077d803532c0b5937c639b60216938");
  assertEquals(result, body);
});

Deno.test("message-get: URL-encodes the message id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ messageId: "abc def/x" }, ctx);
  assertEquals(pathOf(calls[0].url), "/messages/abc%20def%2Fx");
});
