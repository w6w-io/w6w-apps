import { assertEquals } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-get: GETs /v1/calls/{callId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "call1" } } }]);
  await callGet.execute({ callId: "call1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/calls/call1");
});

Deno.test("call-get: is a read action", () => {
  assertEquals(callGet.type, "read");
});
