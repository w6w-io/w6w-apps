import { assertEquals } from "@std/assert";
import messageGet from "../../actions/message-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-get: fetches /messages/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", subject: "Thank you!" }) }]);
  const out = await messageGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/messages/1");
  assertEquals(out, { id: "1", subject: "Thank you!" });
});
