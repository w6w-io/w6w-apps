import { assertEquals } from "@std/assert";
import messageGet from "../../actions/message-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-get: GETs /v1/messages/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "AC1" } } }]);
  await messageGet.execute({ id: "AC1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/messages/AC1");
});

Deno.test("message-get: is a read action", () => {
  assertEquals(messageGet.type, "read");
});
