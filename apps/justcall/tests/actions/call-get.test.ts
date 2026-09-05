import { assertEquals } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-get: hits GET /v2.1/calls/{id} and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 123456, call_sid: "CA0247..." }) }]);
  const out = await callGet.execute({ id: 123456 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/calls/123456");
  assertEquals(out.id, 123456);
});
