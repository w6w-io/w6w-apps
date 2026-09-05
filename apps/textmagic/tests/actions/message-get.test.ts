import { assertEquals } from "@std/assert";
import messageGet from "../../actions/message-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-get: GETs /messages/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4991, status: "d", text: "I love Textmagic!" } }]);
  const out = await messageGet.execute({ id: 4991 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/messages/4991");
  assertEquals(out, { id: 4991, status: "d", text: "I love Textmagic!" });
});
